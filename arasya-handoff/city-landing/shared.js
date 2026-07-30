// Shared business logic for Arasya landing templates (City / Region / Country).
// UI stays in each .dc.html — this module derives everything from the site.js registry
// (which applies the Content Studio draft overlay), so CMS drafts flow to every page.

import { site } from './site.js';

const S = site.settings;
const digitsOf = (t) => String(t || '').replace(/\D/g, '');

// Rekening: daftar baru (settings.bankAccounts) dengan fallback ke skema lama; urutan pertama = rekening utama.
const BANKS = (Array.isArray(S.bankAccounts) && S.bankAccounts.length
  ? S.bankAccounts
  : [{ bank: S.bankName, number: S.bankNumber, owner: S.bankOwner }]
).filter((b) => b && (b.bank || b.number));
const B0 = BANKS[0] || {};

export const OFFICIAL = {
  waPrimary: S.waPhone,
  phones: (S.officialPhones || []).map((p, i) => ({ key: 'p' + (i + 1), display: p.display, value: digitsOf(p.display) })),
  phonesDisplay: (S.officialPhones || []).map((p) => p.display).join(' · '),
  bankAccounts: BANKS.map((b, i) => ({ key: 'bank' + i, bank: b.bank || '', number: b.number || '', owner: b.owner || '', digits: digitsOf(b.number) })),
  bankName: B0.bank || '',
  bankNumber: B0.number || '',
  bankOwner: B0.owner || '',
  bankDisplay: ((B0.bank || '') + ' ' + (B0.number || '')).trim(),
  bankDigits: digitsOf(B0.number),
  bank: ((B0.bank || '') + ' ' + (B0.number || '') + ' ' + (B0.owner || '')).trim(),
  addressLine: S.addressLine,
  addressStreet: S.addressStreet,
  addressLocality: S.addressLocality,
  postalCode: S.postalCode,
  instagram: S.instagram,
  siteUrl: String(S.siteUrl || 'https://arasyarentcar.com').replace(/\/+$/, ''),
};

export const GENERIC_UNITS = site.genericUnits;

export function fleet() {
  const img = (f) => '../city-landing/assets/cars/' + f + '.webp';
  const logo = (f) => '../city-landing/assets/cars-with-logo/' + f + '.webp';
  return (site.fleet || []).map((f) => ({
    name: f.name,
    dalamKota: f.dalamKota,
    allin: f.allin,
    capacity: f.capacity,
    badge: f.badge || undefined,
    image: f.imgData || (f.img ? img(f.img) : undefined),
    imageLogo: f.imgLogoData || (f.imgLogo ? logo(f.imgLogo) : undefined),
  }));
}

export function fleetCars(allin) {
  return fleet().map((f) => ({
    name: f.name,
    capacity: f.capacity,
    badge: f.badge,
    image: f.image,
    imageLogo: f.imageLogo,
    priceFrom: allin ? f.allin : f.dalamKota,
  }));
}

export function formatIdr(n) {
  if (n == null) return null;
  return 'Rp ' + n.toLocaleString('id-ID');
}

export const FLEET_NOTES = site.fleetNotes;

// Atribusi kampanye: parameter iklan (utm/gclid/fbclid) dari URL disimpan per sesi
// dan ditambahkan sebagai sufiks [Src: …] pada setiap pesan WhatsApp.
export function campaignTag() {
  try {
    const sp = new URLSearchParams(location.search);
    let st = {};
    try { st = JSON.parse(sessionStorage.getItem('arasya-campaign') || '{}'); } catch (e) {}
    let dirty = false;
    ['utm_source', 'utm_medium', 'utm_campaign', 'gclid', 'fbclid'].forEach((k) => {
      const v = sp.get(k);
      if (v) { st[k] = String(v).slice(0, 48); dirty = true; }
    });
    if (dirty) sessionStorage.setItem('arasya-campaign', JSON.stringify(st));
    const parts = [];
    if (st.utm_source) parts.push(st.utm_source + (st.utm_medium ? '/' + st.utm_medium : ''));
    if (st.utm_campaign) parts.push(st.utm_campaign);
    if (st.gclid) parts.push('gclid');
    if (st.fbclid) parts.push('fbclid');
    return parts.join(' · ');
  } catch (e) { return ''; }
}

export function waHref(phone, message) {
  const tag = campaignTag();
  const full = tag && String(message).indexOf('[Src:') === -1 ? message + ' [Src: ' + tag + ']' : message;
  const ds = window.ArasyaDS;
  if (ds && ds.buildWaHref) return ds.buildWaHref(phone, full);
  const digits = String(phone).replace(/\D/g, '');
  return 'https://wa.me/' + digits + '?text=' + encodeURIComponent(full);
}

export function baseFaq(c) {
  const isCountry = c.template === 'country';
  const items = [];
  items.push(
    isCountry
      ? {
          question: 'Apakah tarif sudah termasuk supir?',
          answer: 'Ya, seluruh penawaran sudah termasuk jasa driver lokal terverifikasi. Rincian tarif per kota dan itinerari dikonfirmasi secara tertulis oleh admin kami.',
        }
      : {
          question: 'Apakah tarif sudah termasuk supir?',
          answer: 'Ya, seluruh tarif sudah termasuk jasa driver profesional. Tersedia dua pilihan: tarif Dalam Kota 12 jam (belum termasuk BBM, tol, parkir, dan makan driver) atau tarif All-in (sudah termasuk BBM, tol, dan makan driver).',
        }
  );
  items.push({
    question: 'Bagaimana prosedur pemesanannya?',
    answer: 'Lengkapi formulir penawaran atau hubungi kami melalui WhatsApp. Tim kami mengonfirmasi ketersediaan unit, rincian tarif, dan titik penjemputan sebelum pemesanan dipastikan.',
  });
  items.push({
    question: 'Apakah melayani rute luar kota seperti ' + c.outOfTownExamples + '?',
    answer: 'Ya. Kami melayani perjalanan luar kota dengan penyesuaian tarif sesuai jarak dan durasi. Sampaikan rencana rute Anda saat meminta penawaran.',
  });
  if (!isCountry) {
    items.push({
      question: 'Bagaimana jika pemakaian melebihi 12 jam?',
      answer: 'Kelebihan durasi dikenakan biaya tambahan per jam yang diinformasikan secara tertulis di awal, sehingga tidak ada biaya yang mengejutkan.',
    });
  }
  items.push({
    question: 'Di mana saja titik penjemputannya?',
    answer: 'Supir kami menjemput di titik mana pun di wilayah ' + c.name + ' dan sekitarnya, termasuk ' + c.pickupPoints + '.',
  });
  items.push({
    question: 'Bagaimana ketentuan pembayarannya?',
    answer: 'Setelah invoice diterbitkan, Anda mentransfer DP 20% ke rekening resmi ' + OFFICIAL.bank + '. Pelunasan dilakukan saat driver bertemu Anda sebelum keberangkatan, secara tunai atau transfer.',
  });
  items.push({
    question: 'Bagaimana kebijakan pembatalannya?',
    answer: 'Pembatalan hingga H-1: DP 20% tidak dapat dikembalikan. Pembatalan pada hari H sebelum driver tiba atau sebelum pukul 10.00: biaya 50% dari nilai invoice. Setelah driver tiba atau setelah pukul 10.00: biaya 100%.',
  });
  return items;
}

export function fullFaq(c) {
  if (!c || !c.name) return [];
  return baseFaq(c).concat(c.faqExtra || []);
}

export function trustItems(c) {
  if (c && c.trust) return c.trust;
  return (site.trustDefaults || []).map((t, i) =>
    i === 0 && c && c.trustRouteDesc ? Object.assign({}, t, { description: c.trustRouteDesc }) : t
  );
}

export function fleetPriceRange() {
  const lo = (site.fleet || []).map((f) => f.dalamKota).filter((n) => typeof n === 'number');
  const hi = (site.fleet || []).map((f) => f.allin).filter((n) => typeof n === 'number');
  if (!lo.length) return undefined;
  return formatIdr(Math.min(...lo)) + ' – ' + formatIdr(Math.max(...(hi.length ? hi : lo)));
}

export function applySeo(c, phone) {
  if (!c) return;
  document.title = c.metaTitle;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', c.metaDescription);
  const base = OFFICIAL.siteUrl;
  const pageUrl = base + '/' + (c.slug || '');
  const heroAbs = c.heroImage ? new URL(c.heroImage, location.href).href : undefined;
  // canonical + Open Graph/Twitter — dibuat ulang setiap ganti halaman (produksi: emit statis di <head>, lihat PSEO-HANDOFF.md)
  document.querySelectorAll('[data-seo-extra]').forEach((el) => el.remove());
  const add = (tag, attrs) => {
    const el = document.createElement(tag);
    for (const k in attrs) if (attrs[k] != null) el.setAttribute(k, attrs[k]);
    el.setAttribute('data-seo-extra', '1');
    document.head.appendChild(el);
  };
  add('link', { rel: 'canonical', href: pageUrl });
  [['og:type', 'website'], ['og:locale', 'id_ID'], ['og:site_name', 'Arasya Rent Car'], ['og:title', c.metaTitle], ['og:description', c.metaDescription], ['og:url', pageUrl], ['og:image', heroAbs]].forEach(([p, v]) => { if (v) add('meta', { property: p, content: v }); });
  add('meta', { name: 'twitter:card', content: heroAbs ? 'summary_large_image' : 'summary' });
  const old = document.getElementById('seo-jsonld');
  if (old) old.remove();
  const digits = String(phone).replace(/\D/g, '');
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AutoRental',
        name: 'Arasya Rent Car',
        legalName: 'PT. Ayomi Raya',
        url: pageUrl,
        image: heroAbs,
        priceRange: fleetPriceRange(),
        description: c.metaDescription,
        telephone: '+' + digits,
        address: {
          '@type': 'PostalAddress',
          streetAddress: S.addressStreet,
          addressLocality: S.addressLocality,
          postalCode: S.postalCode,
          addressCountry: 'ID',
        },
        sameAs: [OFFICIAL.instagram],
        areaServed: c.areaServed,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Beranda', item: base + '/' },
          { '@type': 'ListItem', position: 2, name: 'Sewa Mobil', item: base + '/sewa-mobil' },
          { '@type': 'ListItem', position: 3, name: c.name, item: pageUrl },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: fullFaq(c).map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      },
    ],
  };
  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.id = 'seo-jsonld';
  s.textContent = JSON.stringify(data);
  document.head.appendChild(s);
}

// Footer cross-links. In-preview: same-template entries swap in place;
// cross-template entries keep their production href but don't navigate the preview.
export function otherCities(registry, currentKey, setCity) {
  const current = (registry || {})[currentKey];
  return Object.entries(registry || {})
    .filter(([k]) => k !== currentKey)
    .map(([k, v]) => ({
      key: k,
      name: v.name,
      slug: v.slug,
      onClick: (e) => {
        e.preventDefault();
        if (current && v.template === current.template) {
          setCity(k);
          window.scrollTo(0, 0);
        }
      },
    }));
}

export const SERVICES = site.services;
export const TESTIMONIALS = site.testimonials;
export const MAPS_EMBED = S.mapsEmbed;
