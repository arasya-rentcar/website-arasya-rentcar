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
  'dashboard rendered real content',
  (await evalIn('document.querySelectorAll(".cs-stat-value").length')) === 3,
  `${await evalIn('document.querySelectorAll(".cs-stat-value").length')} stat cards`
);
ok(
  'counts came from the database, not zeroes',
  (await evalIn('[...document.querySelectorAll(".cs-stat-value")].some(el => Number(el.textContent) > 0)')),
  'every count was 0 — the query probably failed silently'
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

/* ------------------------------------------------------------- signing out */

console.log('\nsigning out');

await go('/admin');
await evalIn('[...document.querySelectorAll(".cs-signout")].find(b => /keluar/i.test(b.textContent)).click()');
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
