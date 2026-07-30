// Arasya Rent Car — bilingual layer (ID default / EN).
// Bahasa aktif: localStorage 'arasya-lang' → bahasa browser → 'id'.
// Produksi (Next.js): locale = segmen URL /en/ (bukan localStorage) — lihat README handoff.
// Konten EN untuk data registry (services/trust/fleetNotes) hidup di sini sampai
// CMS punya tab EN per entri; UI string per halaman di STR.

export function resolveLang() {
  try {
    const s = localStorage.getItem('arasya-lang');
    if (s === 'id' || s === 'en') return s;
  } catch (e) {}
  const nav = ((navigator.languages && navigator.languages[0]) || navigator.language || 'id').toLowerCase();
  return nav.indexOf('id') === 0 || nav.indexOf('ms') === 0 ? 'id' : 'en';
}

export function setLang(l) {
  try { localStorage.setItem('arasya-lang', l); } catch (e) {}
}

// --- EN overlay untuk konten registry (per slug / preset) ---
export const SERVICES_EN = {
  'mobil-driver': { title: 'Car + Driver', description: 'Chauffeured car rental for daily needs around the city, with experienced drivers.' },
  'antar-jemput-bandara': { title: 'Airport Transfer', description: 'Airport pick-up and drop-off available 24 hours — punctual and comfortable.' },
  'travel-antar-kota': { title: 'Intercity Travel', description: 'Private car charter for trips out of town from your departure city.' },
  'wedding-car': { title: 'Wedding Car', description: 'A clean, elegant car for your special day, with a well-presented driver.' },
  'corporate': { title: 'Corporate', description: 'Scheduled transport for employees and business guests.' },
  'tour-wisata': { title: 'Tour & Leisure', description: 'Sightseeing trips with drivers who know the routes and destinations.' },
};

export const TRUST_EN = {
  shield: { title: 'Experienced Drivers', description: 'Disciplined, punctual, and familiar with the service routes.' },
  car: { title: 'Well-Maintained Cars', description: 'A clean fleet, inspected before every pick-up.' },
  check: { title: 'Transparent Pricing', description: 'Two clear rate options: In-City 12 hours or All-in.' },
  phone: { title: '24/7 Support', description: 'Our admins are ready to help you book anytime via WhatsApp.' },
  star: { title: 'Premium Service', description: 'One premium standard of service in every city.' },
  users: { title: 'For Every Group Size', description: 'From family MPVs to 19-seat vans.' },
};

export const FLEET_NOTES_EN = {
  dalamKota: 'In-City rates cover a 12-hour duration and include the driver; fuel, tolls, parking, and driver meals are not included.',
  allin: 'All-in rates include fuel, tolls, and driver meals. Passenger capacity includes the driver.',
};

export function localServices(lang, services) {
  if (lang !== 'en') return services || [];
  return (services || []).map((s) => Object.assign({}, s, SERVICES_EN[s.slug] || {}));
}

export function localTrust(lang, items) {
  if (lang !== 'en') return items || [];
  return (items || []).map((t) => Object.assign({}, t, TRUST_EN[t.preset] || {}));
}

// --- UI strings ---
export const STR = {
  id: {
    navBeranda: 'Beranda', navArmada: 'Armada', navLayanan: 'Layanan', navTestimoni: 'Testimoni', navKota: 'Kota Layanan', navTravel: 'Travel', navBlog: 'Blog', navAllCities: 'Semua Kota Layanan →', cta: 'Pesan Sekarang',
    heroBadge: 'PT. Ayomi Raya · Sejak Bogor untuk Indonesia & luar negeri',
    heroTitle: 'Sewa Mobil Premium dengan Supir Profesional',
    heroSub: 'Perjalanan bisnis, wisata, dan keluarga dengan satu standar layanan: penawaran tertulis, driver terverifikasi, dan pembayaran hanya ke rekening resmi perusahaan.',
    heroWa: 'Pesan via WhatsApp', heroKota: 'Lihat Kota Layanan',
    chipFleetSuffix: ' unit armada siap jalan', chipTarif: 'Tarif Dalam Kota & All-in', chipSupport: 'Support admin 24/7',
    armadaEyebrow: 'Armada & Tarif', armadaTitle: 'Unit terawat untuk setiap kebutuhan', armadaSub: 'Seluruh tarif sudah termasuk jasa driver. Tarif akhir menyesuaikan kota keberangkatan Anda.', armadaAll: 'Tarif lengkap per kota →',
    seatsSuffix: ' kursi termasuk driver', fromPrefix: 'Mulai ', priceSubIn: 'Dalam Kota · 12 jam · termasuk driver', priceContact: 'Hubungi untuk harga terbaik', priceContactSub: 'Penawaran tertulis via WhatsApp', orderUnit: 'Pesan Unit Ini', moreUnitsSuffix: ' unit lainnya →',
    layananEyebrow: 'Layanan', layananTitle: 'Satu armada, banyak kebutuhan', layananSub: 'Sampaikan kebutuhan Anda — admin kami menyiapkan unit dan driver yang sesuai.', layananAsk: 'Tanya layanan ini →',
    kotaEyebrow: 'Kota Layanan', kotaTitle: 'Berangkat dari kota Anda', kotaSub: 'Setiap halaman kota memuat tarif, armada, destinasi, dan rute setempat.',
    typeCity: 'Kota', typeRegion: 'Wilayah', typeCountry: 'Negara', rentPrefix: 'Sewa Mobil ', servingPrefix: 'Melayani ', seeTariff: 'Lihat tarif & armada →',
    allCitiesTitle: 'Semua Kota Layanan', allCitiesDesc: 'Direktori lengkap Indonesia dan luar negeri, termasuk kota yang belum terdaftar.', allCitiesLink: 'Buka direktori →',
    testiEyebrow: 'Testimoni', testiTitle: 'Cerita dari perjalanan pelanggan', testiSub: 'Pengalaman langsung dari perjalanan bisnis, keluarga, dan rombongan.',
    verifEyebrow: 'Verifikasi Resmi', verifTitle: 'Transaksi hanya melalui kontak resmi kami',
    verifDesc: 'Seluruh pemesanan Arasya Rent Car dilayani admin resmi PT. Ayomi Raya dengan penawaran tertulis. Waspadai pihak yang mengatasnamakan kami di luar nomor dan rekening di halaman ini.',
    verifNumbers: 'Nomor resmi', verifHours: 'Setiap hari · 24 jam · Bahasa Indonesia', verifWa: 'Konsultasi WhatsApp',
    bankLabel: 'Rekening resmi pembayaran', bankCopy: 'Salin', bankCopied: '✓ Tersalin',
    bankNote: 'Rekening di luar daftar ini bukan milik Arasya Rent Car. DP 20% dibayarkan setelah invoice resmi diterbitkan.',
    footTagline: 'Sewa mobil premium dengan supir — Indonesia dan luar negeri.', footContact: 'Kontak', footExplore: 'Jelajahi', footArmada: 'Armada & Tarif', footRights: 'Seluruh hak cipta dilindungi.',
    waGeneral: 'Halo admin Arasya Rent Car, saya ingin memesan unit mobil dengan supir. Mohon dibantu. Terima kasih.',
    waServicePre: 'Halo admin Arasya Rent Car, saya ingin menanyakan layanan ', waServicePost: '. Mohon dibantu. Terima kasih.',
    waUnitPre: 'Halo admin Arasya Rent Car, saya ingin memesan unit ', waUnitPost: ' dengan supir. Mohon info ketersediaan dan tarifnya. Terima kasih.',
    seoTitle: 'Arasya Rent Car — Sewa Mobil Premium dengan Supir',
    seoDescPre: 'Sewa mobil premium dengan supir profesional dari PT. Ayomi Raya — melayani ', seoDescPost: '. Tarif transparan, pembayaran ke rekening resmi, pesan via WhatsApp.', seoAreaFallback: 'Indonesia dan luar negeri',
  },
  en: {
    navBeranda: 'Home', navArmada: 'Fleet', navLayanan: 'Services', navTestimoni: 'Reviews', navKota: 'Service Cities', navTravel: 'Travel', navBlog: 'Blog', navAllCities: 'All Service Cities →', cta: 'Book Now',
    heroBadge: 'PT. Ayomi Raya · From Bogor for Indonesia & abroad',
    heroTitle: 'Premium Car Rental with Professional Drivers',
    heroSub: 'Business trips, holidays, and family travel with one standard of service: written quotes, verified drivers, and payments only to official company accounts.',
    heroWa: 'Book via WhatsApp', heroKota: 'View Service Cities',
    chipFleetSuffix: ' fleet units ready to go', chipTarif: 'In-City & All-in rates', chipSupport: '24/7 admin support',
    armadaEyebrow: 'Fleet & Rates', armadaTitle: 'Well-kept cars for every need', armadaSub: 'All rates include the driver. Final rates depend on your departure city.', armadaAll: 'Full rates per city →',
    seatsSuffix: ' seats incl. driver', fromPrefix: 'From ', priceSubIn: 'In-City · 12 hours · driver included', priceContact: 'Contact us for the best price', priceContactSub: 'Written quote via WhatsApp', orderUnit: 'Book This Car', moreUnitsSuffix: ' more units →',
    layananEyebrow: 'Services', layananTitle: 'One fleet, many needs', layananSub: 'Tell us what you need — our admins will arrange the right car and driver.', layananAsk: 'Ask about this service →',
    kotaEyebrow: 'Service Cities', kotaTitle: 'Departing from your city', kotaSub: 'Every city page lists local rates, fleet, destinations, and routes.',
    typeCity: 'City', typeRegion: 'Region', typeCountry: 'Country', rentPrefix: 'Car Rental ', servingPrefix: 'Serving ', seeTariff: 'See rates & fleet →',
    allCitiesTitle: 'All Service Cities', allCitiesDesc: 'The full directory for Indonesia and abroad, including cities not yet listed.', allCitiesLink: 'Open the directory →',
    testiEyebrow: 'Reviews', testiTitle: 'Stories from our customers', testiSub: 'First-hand experiences from business, family, and group trips.',
    verifEyebrow: 'Official Verification', verifTitle: 'Transact only through our official contacts',
    verifDesc: 'Every Arasya Rent Car booking is handled by official PT. Ayomi Raya admins with a written quote. Beware of anyone using our name outside the numbers and accounts on this page.',
    verifNumbers: 'Official numbers', verifHours: 'Every day · 24 hours · Indonesian & English', verifWa: 'Chat on WhatsApp',
    bankLabel: 'Official payment accounts', bankCopy: 'Copy', bankCopied: '✓ Copied',
    bankNote: 'Accounts outside this list do not belong to Arasya Rent Car. A 20% deposit is paid after the official invoice is issued.',
    footTagline: 'Premium car rental with driver — Indonesia and abroad.', footContact: 'Contact', footExplore: 'Explore', footArmada: 'Fleet & Rates', footRights: 'All rights reserved.',
    waGeneral: 'Hello Arasya Rent Car, I would like to book a car with a driver. Please assist. Thank you.',
    waServicePre: 'Hello Arasya Rent Car, I would like to ask about the ', waServicePost: ' service. Please assist. Thank you.',
    waUnitPre: 'Hello Arasya Rent Car, I would like to book a ', waUnitPost: ' with a driver. Please share availability and rates. Thank you.',
    seoTitle: 'Arasya Rent Car — Premium Car Rental with Driver in Indonesia',
    seoDescPre: 'Premium chauffeured car rental by PT. Ayomi Raya — serving ', seoDescPost: '. Transparent rates, official company accounts, book via WhatsApp.', seoAreaFallback: 'Indonesia and abroad',
  },
};
