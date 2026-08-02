/**
 * Signs in to Content Studio the way the owner will, in a real browser.
 *
 * `verify:admin` proves the gate turns the wrong people away. That is only half
 * an answer — a gate that rejects everyone passes it perfectly. This drives the
 * actual login form: types the credentials, submits, follows the redirect, and
 * checks the dashboard rendered with live data.
 *
 * Needs ADMIN_EMAIL / ADMIN_PASSWORD (the same pair `db:seed` bootstrapped) and
 * a running server:
 *
 *   npx next start -p 3100
 *   npm run qa:admin
 */
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9229;
const BASE = (process.env.QA_ORIGIN ?? 'http://localhost:3100').replace(/\/$/, '');
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('ADMIN_EMAIL / ADMIN_PASSWORD not set — cannot test the sign-in path.');
  process.exit(1);
}

const profile = mkdtempSync(join(tmpdir(), 'cdp-admin-'));
const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  'about:blank',
]);
chrome.stderr.on('data', () => {});

async function waitForCdp() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) return (await r.json()).webSocketDebuggerUrl;
    } catch {
      /* not up */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('CDP never came up');
}

const ws = new WebSocket(await waitForCdp());
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = rej;
});
let id = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    if (m.error) p.reject(new Error(JSON.stringify(m.error)));
    else p.resolve(m.result);
  }
};
const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const i = ++id;
    pending.set(i, { resolve, reject });
    ws.send(JSON.stringify({ id: i, method, params, sessionId }));
  });

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);

let failures = 0;
const ok = (label, cond, detail = '') => {
  if (cond) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
};

async function go(path) {
  await send('Page.navigate', { url: BASE + path }, sessionId);
  await new Promise((r) => setTimeout(r, 1600));
}
async function evalIn(expr) {
  const { result, exceptionDetails } = await send(
    'Runtime.evaluate',
    { expression: expr, returnByValue: true, awaitPromise: true },
    sessionId
  );
  if (exceptionDetails) throw new Error(JSON.stringify(exceptionDetails));
  return result.value;
}

/**
 * Clicks the button whose label matches, and says what was on screen if none does.
 *
 * `[...].find(...).click()` throws "Cannot read properties of undefined" when
 * nothing matches, which names neither the button being looked for nor the ones
 * that exist — several minutes of a debugging session for one missing label.
 */
async function clickButton(pattern, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  let last = { seen: [] };

  // Polls rather than clicking once. A save runs inside `startTransition`, and
  // `isPending` stays true — so the button stays `loading`, therefore disabled —
  // for a moment after the status text has already changed to "Tersimpan".
  // Clicking on the first sight of that text raced the transition and hit a
  // disabled button. A person would simply wait until it was clickable.
  while (Date.now() < deadline) {
    const res = await evalIn(`(() => {
      const buttons = [...document.querySelectorAll('button')];
      const hit = buttons.find(b => ${pattern}.test(b.textContent));
      if (!hit) return { ok: false, seen: buttons.map(b => b.textContent.trim()) };
      if (hit.disabled) return { ok: false, disabled: true, seen: [hit.textContent.trim()] };
      hit.click();
      return { ok: true };
    })()`).catch(() => ({ ok: false, seen: ['(navigating)'] }));

    if (res.ok) return true;
    last = res;
    await new Promise((r) => setTimeout(r, 200));
  }

  throw new Error(
    last.disabled
      ? `button ${pattern} never became enabled — check for blocking validation issues`
      : `no button matching ${pattern}; on screen: [${last.seen.join(' | ')}]`
  );
}

/**
 * Polls until an expression is truthy.
 *
 * Discarding a draft ends in `location.reload()`, so a fixed sleep followed by
 * `Page.navigate` raced the reload and evaluated against a document that was
 * being torn down — the assertion failed while the feature worked, which is the
 * worst kind of test. Waiting on the condition rather than on the clock also
 * makes the whole suite faster than the sleeps it replaces.
 */
async function waitFor(expr, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if (await evalIn(expr)) return true;
    } catch {
      // Mid-navigation: the execution context is gone. Try again.
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

/**
 * Types into a React-controlled input.
 *
 * Setting `.value` directly does not notify React — it reads from its own
 * descriptor, so the field looks filled and submits empty. Going through the
 * native setter and then dispatching `input` is what makes React see it.
 */
const typeInto = (selector, value) => `(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return false;
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  set.call(el, ${JSON.stringify(value)});
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`;

console.log(`\nContent Studio sign-in — ${BASE}`);

/* ------------------------------------------------------------ the redirect */

console.log('\nreaching a protected page while signed out');

await go('/admin');
ok(
  'lands on the login form',
  (await evalIn('location.pathname')) === '/admin/login',
  `at ${await evalIn('location.pathname')}`
);
ok(
  'remembers where it was going',
  (await evalIn('new URLSearchParams(location.search).get("next")')) === '/admin',
  `next=${await evalIn('new URLSearchParams(location.search).get("next")')}`
);
ok('form has an email and a password field', await evalIn(
  '!!document.querySelector(\'input[type="email"]\') && !!document.querySelector(\'input[type="password"]\')'
));
ok(
  'password field is a real password field',
  await evalIn('document.querySelector(\'input[type="password"]\').autocomplete === "current-password"'),
  'password managers rely on this'
);

/* ------------------------------------------------------- a wrong password */

console.log('\nwrong credentials');

await evalIn(typeInto('input[type="email"]', EMAIL));
await evalIn(typeInto('input[type="password"]', 'definitely-not-the-password'));
await evalIn('document.querySelector("form").requestSubmit()');
await new Promise((r) => setTimeout(r, 2500));

ok('stays on the login form', (await evalIn('location.pathname')) === '/admin/login');
const alert = await evalIn('document.querySelector(\'[role="alert"]\')?.textContent ?? ""');
ok('shows an error', alert.length > 0, 'nothing was announced');
ok(
  'error does not reveal whether the account exists',
  !/tidak ditemukan|tidak terdaftar|belum ada/i.test(alert),
  `"${alert}"`
);
ok('the error is announced to assistive tech', await evalIn(
  '!!document.querySelector(\'[role="alert"]\')'
));

/* ------------------------------------------------------ the real password */

console.log('\ncorrect credentials');

await evalIn(typeInto('input[type="email"]', EMAIL));
await evalIn(typeInto('input[type="password"]', PASSWORD));
await evalIn('document.querySelector("form").requestSubmit()');
await new Promise((r) => setTimeout(r, 3000));

ok(
  'arrives at the dashboard',
  (await evalIn('location.pathname')) === '/admin',
  `at ${await evalIn('location.pathname')}`
);
ok(
  'the content list rendered real rows',
  (await evalIn('document.querySelectorAll(".cs-row").length')) > 0,
  'no entries — the query probably failed silently'
);
ok(
  'every row links to an editor',
  await evalIn('[...document.querySelectorAll(".cs-row")].every(a => /^\\/admin\\/(lokasi|artikel)\\//.test(new URL(a.href).pathname))'),
  'a row pointed somewhere unexpected'
);
ok(
  'the signed-in account is shown',
  (await evalIn('document.querySelector(".cs-topbar-end")?.textContent ?? ""')).includes(EMAIL),
  'no way to tell which account is in use'
);

/* -------------------------------------------------- the session persists */

console.log('\nsession');

await go('/admin');
ok(
  'a fresh navigation stays signed in',
  (await evalIn('location.pathname')) === '/admin',
  'the session did not survive a navigation'
);

// The site itself must be unaffected — the admin root layout is a separate
// document, and a signed-in session must not change what a landing page serves.
await go('/');
ok(
  'the public site still renders normally when signed in',
  (await evalIn('document.documentElement.lang')) === 'id' &&
    (await evalIn('!!document.querySelector("header")')),
  'admin chrome leaked into the public site'
);

/* ----------------------------------------------------------------- editing */

// Drives one full edit cycle against a real entry. The draft is discarded at
// the end, and nothing here can reach the live row — staging writes to
// `content_drafts`, and publishing does not exist yet.
console.log('\nediting a landing page');

await go('/admin');
const firstEditor = await evalIn(
  'new URL([...document.querySelectorAll(".cs-row")].find(a => a.href.includes("/admin/lokasi/")).href).pathname'
);
await go(firstEditor);

ok('the editor opens', (await evalIn('!!document.querySelector(".cs-editor")')), `at ${firstEditor}`);
ok(
  'it shows a Google preview',
  await evalIn('!!document.querySelector(".cs-serp-title")'),
  'no SERP preview rendered'
);
ok(
  'structural fields are not editable here',
  await evalIn('!document.querySelector(\'input[value="city"]\') && !!document.querySelector(".ar-badge")'),
  'template/variant appear to be editable'
);

// The counter has to react to typing, or it is decoration.
const beforeCount = await evalIn('document.querySelector(".cs-count span:last-child")?.textContent ?? ""');
const MARKER = `QA draft marker ${Date.now()}`;
await evalIn(`(() => {
  const inputs = [...document.querySelectorAll('input.ar-field__input')];
  const el = inputs.find(i => i.closest('div')?.querySelector('.cs-count'));
  if (!el) return false;
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  set.call(el, ${JSON.stringify(MARKER)});
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`);
await new Promise((r) => setTimeout(r, 400));
ok(
  'the character counter follows what is typed',
  (await evalIn('document.querySelector(".cs-count span:last-child")?.textContent ?? ""')) !== beforeCount,
  'the counter did not move'
);
ok(
  'unsaved changes are announced',
  /belum disimpan/i.test(await evalIn('document.querySelector(".cs-bar-status")?.textContent ?? ""')),
  'nothing told the owner there were unsaved changes'
);

await clickButton(/simpan draf/i);
ok(
  'saving reports success',
  await waitFor('/tersimpan/i.test(document.querySelector(".cs-bar-status")?.textContent ?? "")'),
  await evalIn('document.querySelector(".cs-bar-status")?.textContent ?? "(nothing)"')
);

await go(firstEditor);
ok(
  'the draft survives a reload',
  /belum diterbitkan/i.test(await evalIn('document.querySelector(".cs-lede")?.textContent ?? ""')),
  'the editor reopened on the live version — the draft was lost'
);

// The property the whole draft table exists to guarantee. A staged edit must
// be invisible to every visitor until it is published — so the marker just
// saved must appear on no public page at all, not merely on the one being
// edited. Checked across the entire sitemap, because a landing page's copy also
// surfaces on the hub, the home page and the blog's city links.
{
  const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  let leaked = null;
  for (const path of paths) {
    const body = await (await fetch(BASE + path)).text();
    if (body.includes(MARKER)) {
      leaked = path;
      break;
    }
  }
  ok(
    `the staged edit reaches no public page (${paths.length} checked)`,
    leaked === null,
    `it leaked onto ${leaked}`
  );
}

await go('/admin');
ok(
  'the list marks the entry as having pending edits',
  await evalIn('!!document.querySelector(".cs-dot")'),
  'no draft marker in the list'
);
ok(
  'the marker is not colour alone',
  /editan belum diterbitkan/i.test(await evalIn('document.querySelector(".cs-dot")?.textContent ?? ""')),
  'the dot carries no text alternative'
);

// Put it back. `confirm()` is stubbed because a native dialog would block CDP.
await go(firstEditor);
// A native confirm() would block CDP outright, so it is stubbed rather than
// dismissed — the point being tested is what happens after the owner agrees.
await evalIn('window.confirm = () => true');
await clickButton(/buang draf/i);
ok(
  'discarding a draft restores the live version',
  await waitFor(
    '/versi yang sedang tayang/i.test(document.querySelector(".cs-lede")?.textContent ?? "")'
  ),
  await evalIn('document.querySelector(".cs-lede")?.textContent ?? "(nothing)"')
);

/* -------------------------------------------------------------- publishing */

/**
 * The only assertion that can prove publishing works is one that changes real
 * content and then looks at the public page. So this does exactly that, and
 * puts it back.
 *
 * The original value is captured first and restored through a second publish,
 * so a clean run leaves the database byte-identical. A failed run leaves a
 * visible marker in a meta title, which is recoverable and — on a site that is
 * still `noindex` — harmless. An assertion that avoided the risk would also
 * avoid testing the thing.
 */
console.log('\npublishing');

// Reads a field by its visible label, so the test does not depend on input order.
const fieldValue = (label) => `(() => {
  const lab = [...document.querySelectorAll('label.cs-label')].find(l => l.textContent.trim().startsWith(${JSON.stringify(label)}));
  if (!lab) return null;
  const el = document.getElementById(lab.htmlFor);
  return el ? el.value : null;
})()`;

const setField = (label, value) => `(() => {
  const lab = [...document.querySelectorAll('label.cs-label')].find(l => l.textContent.trim().startsWith(${JSON.stringify(label)}));
  if (!lab) return false;
  const el = document.getElementById(lab.htmlFor);
  if (!el) return false;
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)});
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`;

await go(firstEditor);
const slug = await evalIn(fieldValue('Slug (Indonesia)'));
const originalTitle = await evalIn(fieldValue('Meta title'));
const publishMarker = `QA terbit ${Date.now()}`;

ok('the entry has a slug and a meta title to work with', Boolean(slug && originalTitle), `slug=${slug}`);

async function saveAndPublish(title) {
  await evalIn(setField('Meta title', title));
  await clickButton(/simpan draf/i);
  await waitFor('/tersimpan/i.test(document.querySelector(".cs-bar-status")?.textContent ?? "")');
  await evalIn('window.confirm = () => true');
  await clickButton(/terbitkan/i);
  return waitFor('/diterbitkan|gagal/i.test(document.querySelector(".cs-bar-status")?.textContent ?? "")');
}

await saveAndPublish(publishMarker);
const publishMessage = await evalIn('document.querySelector(".cs-bar-status")?.textContent ?? ""');
ok('publishing reports success', /diterbitkan/i.test(publishMessage), publishMessage);
ok(
  'it says how many pages were regenerated',
  /\d+ halaman diperbarui/i.test(publishMessage),
  publishMessage
);

// The point of the whole commit: the change is now on the public page, without
// waiting out the ISR window.
{
  const live = await (await fetch(`${BASE}/${slug}`)).text();
  ok(`the change is live on /${slug} immediately`, live.includes(publishMarker), 'the public page still shows the old title');
}

await go('/admin');
ok(
  'the pending-edits marker is gone once published',
  !(await evalIn('!!document.querySelector(".cs-dot")')),
  'the draft dot survived publication'
);

// Put the original back through the same path, which also proves publishing
// twice in a row works.
await go(firstEditor);
await saveAndPublish(originalTitle);
{
  const restored = await (await fetch(`${BASE}/${slug}`)).text();
  ok(
    'restoring the original publishes cleanly',
    restored.includes(originalTitle) && !restored.includes(publishMarker),
    'the page did not return to its original title — CHECK THE DATABASE'
  );
}

/* ------------------------------------------------------------- signing out */

console.log('\nsigning out');

await go('/admin');
await clickButton(/keluar/i);
await new Promise((r) => setTimeout(r, 2500));

ok(
  'returns to the login form',
  (await evalIn('location.pathname')) === '/admin/login',
  `at ${await evalIn('location.pathname')}`
);

await go('/admin');
ok(
  'and the session is really gone',
  (await evalIn('location.pathname')) === '/admin/login',
  'the dashboard was still reachable after signing out'
);

/* -------------------------------------------------------------------- done */

await send('Target.closeTarget', { targetId });
chrome.kill();

if (failures) {
  console.error(`\n${failures} check(s) failed.\n`);
  process.exit(1);
}
console.log('\nSign-in works end to end.\n');
process.exit(0);
