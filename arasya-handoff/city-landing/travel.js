// Arasya Travel — registry rute charter drop off antar kota (halaman /travel).
// Sumber: arasyarentcar.com/travel (Mar 2026). Editable via Content Studio (draf localStorage 'arasya-cms-travel').
// prices: rupiah per unit-key; null/absen = unit tidak dilayani di rute itu.

export const travel = {
  units: [
    { key: 'avanza', name: 'Avanza · Xenia · Ertiga', capacity: 7, img: 'toyota-new-avanza-with-logo' },
    { key: 'xpander', name: 'Xpander · Rush', capacity: 7, img: 'mitsubishi-expander-with-logo' },
    { key: 'reborn', name: 'Innova Reborn', capacity: 7, img: 'toyota-innova-reborn-with-logo' },
    { key: 'zenix', name: 'Innova Zenix', capacity: 7, img: 'toyota-zenix-with-logo' },
    { key: 'zenixq', name: 'Innova Zenix Q Hybrid', capacity: 6, img: 'toyota-zenix-q-modellista-with-logo' },
  ],
  origins: [
    { key: 'bogor', code: 'BGR', name: 'Bogor' },
    { key: 'jakarta', code: 'JKT', name: 'Jakarta' },
    { key: 'bandung', code: 'BDG', name: 'Bandung' },
  ],
  routes: [
    { origin: 'bogor', dest: 'cgk', destName: 'Bandara Soekarno-Hatta', prices: { avanza: 500000, xpander: 600000, reborn: 700000 } },
    { origin: 'bogor', dest: 'bandung', destName: 'Bandung', prices: { avanza: 1100000, xpander: 1200000, reborn: 1350000, zenix: 1750000, zenixq: 2300000 } },
    { origin: 'bogor', dest: 'garut', destName: 'Garut', prices: { avanza: 1200000, xpander: 1300000, reborn: 1450000 } },
    { origin: 'jakarta', dest: 'bogor', destName: 'Bogor', prices: { avanza: 500000, xpander: 600000, reborn: 700000 } },
    { origin: 'jakarta', dest: 'serang', destName: 'Serang', prices: { avanza: 900000, xpander: 1000000, reborn: 1150000 } },
    { origin: 'jakarta', dest: 'bandung', destName: 'Bandung', prices: { avanza: 1000000, xpander: 1100000, reborn: 1250000, zenix: 1650000, zenixq: 2200000 } },
    { origin: 'jakarta', dest: 'garut', destName: 'Garut', prices: { avanza: 1200000, xpander: 1300000, reborn: 1450000 } },
    { origin: 'bandung', dest: 'cgk', destName: 'Bandara Soekarno-Hatta', prices: { avanza: 1000000, xpander: 1100000, reborn: 1250000, zenix: 1650000, zenixq: 2200000 } },
    { origin: 'bandung', dest: 'jakarta', destName: 'Jakarta', prices: { avanza: 1000000, xpander: 1100000, reborn: 1250000, zenix: 1650000, zenixq: 2200000 } },
    { origin: 'bandung', dest: 'bogor', destName: 'Bogor', prices: { avanza: 1100000, xpander: 1200000, reborn: 1350000, zenix: 1750000, zenixq: 2300000 } },
  ],
};

// UI strings halaman /travel — dwibahasa (pola i18n.js). {BANK} diganti rekening resmi di runtime.
export const TRAVEL_STR = {
  id: {
    navBeranda: 'Beranda', navRute: 'Rute & Tarif', navCara: 'Cara Pesan', navFaq: 'FAQ', navBlog: 'Blog', cta: 'Pesan Sekarang',
    heroBadge: 'Arasya Travel — Charter Drop Off',
    heroTitle: 'Charter satu mobil antar kota, door to door.',
    heroSub: 'Satu mobil khusus untuk Anda — dijemput di alamat Anda, diantar sampai alamat tujuan. Tarif all-in sudah termasuk mobil, supir, BBM, tol, dan parkir untuk satu kali perjalanan.',
    chipRoutesSuffix: ' rute tarif tetap', chipAllin: 'Tarif all-in transparan', chipPrivate: 'Privat, bukan travel gabungan',
    bTitle: 'Cek tarif rute Anda', bOrigin: 'Kota keberangkatan', bDest: 'Tujuan', bUnit: 'Pilihan unit',
    bPriceLabel: 'Tarif all-in', bPriceNote: 'Mobil + supir + BBM + tol + parkir · 1x perjalanan',
    bCta: 'Pesan via WhatsApp', bOther: 'Rute Anda tidak ada di daftar?', bOtherLink: 'Chat admin untuk tarif khusus',
    incLabel: 'Tarif sudah termasuk', incItems: ['Mobil privat', 'Supir profesional', 'BBM', 'Tol', 'Parkir'],
    incNote: 'Berlaku untuk satu kali perjalanan — 1 lokasi penjemputan, 1 lokasi tujuan.',
    ruteEyebrow: 'Rute & Tarif', ruteTitle: 'Pilih kota keberangkatan Anda',
    ruteSub: 'Tarif tetap per unit untuk rute-rute populer. Rute di luar daftar dilayani dengan penawaran khusus melalui WhatsApp.',
    fromPrefix: 'Dari ', doorNote: ' · door to door', pesan: 'Pesan', seatsSuffix: ' kursi', routeSuffix: ' rute',
    cardNote: 'Semua tarif all-in untuk 1x perjalanan, 1 lokasi jemput, 1 lokasi tujuan.',
    caraEyebrow: 'Cara Pesan', caraTitle: 'Tiga langkah menuju keberangkatan',
    steps: [
      { title: 'Pilih rute & unit', desc: 'Tentukan kota keberangkatan, tujuan, dan unit yang sesuai kebutuhan rombongan Anda.' },
      { title: 'Konfirmasi via WhatsApp', desc: 'Admin memastikan ketersediaan unit dan jadwal, lalu menerbitkan invoice resmi.' },
      { title: 'DP 20% & berangkat', desc: 'Transfer DP ke rekening resmi; pelunasan dilakukan saat driver menjemput Anda.' },
    ],
    faqEyebrow: 'FAQ', faqTitle: 'Pertanyaan seputar Arasya Travel',
    faqs: [
      { question: 'Apa saja yang sudah termasuk dalam tarif?', answer: 'Tarif sudah termasuk mobil, supir, BBM, tol, dan parkir untuk satu kali perjalanan dengan 1 lokasi penjemputan dan 1 lokasi tujuan.' },
      { question: 'Apakah penjemputan bisa di alamat mana pun?', answer: 'Ya. Layanan kami door to door — supir menjemput di alamat Anda di kota keberangkatan dan mengantar langsung ke alamat tujuan.' },
      { question: 'Bagaimana jika rute saya tidak ada di daftar?', answer: 'Hubungi admin melalui WhatsApp dan sampaikan rencana rute Anda. Kami menghitung penawaran khusus sesuai jarak dan durasi perjalanan.' },
      { question: 'Apakah bisa berangkat malam atau dini hari?', answer: 'Bisa. Layanan travel tersedia 24 jam, termasuk keberangkatan dini hari untuk mengejar penerbangan. Sampaikan jadwal Anda saat memesan.' },
      { question: 'Bolehkah mampir atau menambah titik jemput?', answer: 'Tarif berlaku untuk 1 lokasi jemput dan 1 lokasi tujuan. Tambahan titik atau persinggahan dapat diatur dengan penyesuaian tarif yang diinformasikan di awal.' },
      { question: 'Bagaimana ketentuan pembayarannya?', answer: 'Setelah invoice diterbitkan, Anda mentransfer DP 20% ke rekening resmi {BANK}. Pelunasan dilakukan kepada driver saat penjemputan, tunai atau transfer.' },
    ],
    ctaTitle: 'Siap berangkat kapan pun Anda siap.',
    ctaDesc: 'Konsultasikan jadwal dan rute Anda — admin kami siap membantu melalui WhatsApp.',
    ctaWa: 'Chat Admin Sekarang',
    footTagline: 'Layanan charter drop off antar kota door to door dari Arasya Rent Car — PT. Ayomi Raya.',
    footContact: 'Kontak', footExplore: 'Jelajahi', footRights: 'Seluruh hak cipta.',
    footHome: 'Beranda', footHub: 'Semua Kota Layanan', footBlog: 'Blog Arasya',
    seoTitle: 'Arasya Travel — Charter Mobil Drop Off Antar Kota Door to Door | Arasya Rent Car',
    seoDesc: 'Charter satu mobil drop off door to door rute Bogor, Jakarta, dan Bandung. Tarif all-in termasuk mobil, supir, BBM, tol, dan parkir. Pesan via WhatsApp.',
    waGeneral: 'Halo Admin Arasya Rent Car, saya ingin bertanya tentang layanan Arasya Travel drop off antar kota.',
    waRoutePre: 'Halo Admin Arasya Rent Car, saya ingin memesan Travel Drop Off rute ', waRouteUnit: ' dengan unit ', waRoutePrice: ', tarif ', waRoutePost: ' all-in. Mohon dibantu, terima kasih.',
  },
  en: {
    navBeranda: 'Home', navRute: 'Routes & Rates', navCara: 'How to Book', navFaq: 'FAQ', navBlog: 'Blog', cta: 'Book Now',
    heroBadge: 'Arasya Travel — Private Drop-off Charter',
    heroTitle: 'Private intercity car charter, door to door.',
    heroSub: 'One car exclusively for you — picked up at your address, delivered to your destination. All-in rates cover the car, driver, fuel, tolls, and parking for a single trip.',
    chipRoutesSuffix: ' fixed-rate routes', chipAllin: 'Transparent all-in rates', chipPrivate: 'Private — never shared',
    bTitle: 'Check your route fare', bOrigin: 'Departure city', bDest: 'Destination', bUnit: 'Car option',
    bPriceLabel: 'All-in rate', bPriceNote: 'Car + driver + fuel + tolls + parking · one-way trip',
    bCta: 'Book via WhatsApp', bOther: 'Route not listed?', bOtherLink: 'Chat our admin for a custom quote',
    incLabel: 'Rate includes', incItems: ['Private car', 'Professional driver', 'Fuel', 'Tolls', 'Parking'],
    incNote: 'Valid for a single trip — one pick-up point, one destination.',
    ruteEyebrow: 'Routes & Rates', ruteTitle: 'Choose your departure city',
    ruteSub: 'Fixed per-unit rates on popular routes. Routes beyond this list are served with a custom quote via WhatsApp.',
    fromPrefix: 'From ', doorNote: ' · door to door', pesan: 'Book', seatsSuffix: ' seats', routeSuffix: ' routes',
    cardNote: 'All rates are all-in for a single trip — one pick-up point, one destination.',
    caraEyebrow: 'How to Book', caraTitle: 'Three steps to departure',
    steps: [
      { title: 'Pick a route & unit', desc: 'Choose your departure city, destination, and the car that fits your group.' },
      { title: 'Confirm via WhatsApp', desc: 'Our admin confirms unit availability and schedule, then issues an official invoice.' },
      { title: '20% deposit & depart', desc: 'Transfer the deposit to our official account; settle the balance when the driver picks you up.' },
    ],
    faqEyebrow: 'FAQ', faqTitle: 'Arasya Travel — common questions',
    faqs: [
      { question: 'What does the rate include?', answer: 'The rate covers the car, driver, fuel, tolls, and parking for a single trip with one pick-up point and one destination.' },
      { question: 'Can you pick me up at any address?', answer: 'Yes. The service is door to door — the driver picks you up at your address in the departure city and delivers you straight to your destination address.' },
      { question: 'What if my route is not listed?', answer: 'Contact our admin on WhatsApp with your travel plan. We prepare a custom quote based on distance and trip duration.' },
      { question: 'Can I depart at night or before dawn?', answer: 'Yes. The travel service runs 24 hours, including early-morning departures to catch a flight. Share your schedule when booking.' },
      { question: 'Can I add a stop or an extra pick-up point?', answer: 'Rates apply to one pick-up point and one destination. Extra stops can be arranged with a rate adjustment confirmed up front.' },
      { question: 'How does payment work?', answer: 'Once the invoice is issued, you transfer a 20% deposit to our official account {BANK}. The balance is settled with the driver at pick-up, by cash or transfer.' },
    ],
    ctaTitle: 'Ready whenever you are.',
    ctaDesc: 'Discuss your schedule and route — our admins are ready to help on WhatsApp.',
    ctaWa: 'Chat Admin Now',
    footTagline: 'Door-to-door intercity drop-off charter by Arasya Rent Car — PT. Ayomi Raya.',
    footContact: 'Contact', footExplore: 'Explore', footRights: 'All rights reserved.',
    footHome: 'Home', footHub: 'All Service Cities', footBlog: 'Arasya Blog',
    seoTitle: 'Arasya Travel — Private Intercity Drop-off Car Charter | Arasya Rent Car',
    seoDesc: 'Private one-car drop-off charter, door to door across Bogor, Jakarta, and Bandung. All-in rates include car, driver, fuel, tolls, and parking. Book via WhatsApp.',
    waGeneral: 'Hello Arasya Rent Car admin, I would like to ask about the Arasya Travel intercity drop-off service.',
    waRoutePre: 'Hello Arasya Rent Car admin, I would like to book a Travel Drop Off on the ', waRouteUnit: ' route with a ', waRoutePrice: ' unit, at ', waRoutePost: ' all-in. Thank you.',
  },
};

// --- Content Studio draft overlay (pratinjau browser saja) ---
export const travelBase = JSON.parse(JSON.stringify(travel));
try {
  const _d = JSON.parse(localStorage.getItem('arasya-cms-travel') || 'null');
  if (_d && typeof _d === 'object') {
    if (Array.isArray(_d.units)) travel.units = _d.units;
    if (Array.isArray(_d.origins)) travel.origins = _d.origins;
    if (Array.isArray(_d.routes)) travel.routes = _d.routes;
  }
} catch (e) {}
