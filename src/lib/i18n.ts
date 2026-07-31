/**
 * UI string dictionaries — ported from `city-landing/i18n.js` (STR) and
 * `city-landing/travel.js` (TRAVEL_STR).
 *
 * These are interface copy, not CMS content, so they live in code rather than
 * the database. Registry content translations (services, trust cards, fleet
 * notes) go through `site_settings.en` instead — see `src/lib/localize.ts`.
 *
 * `resolveLang()` from the prototype is deliberately NOT ported. It read
 * localStorage to approximate locale in a static preview; in production the URL
 * segment is the source of truth, because indexable pages must be rendered per
 * locale rather than switched client-side.
 */
import type { Locale } from '@/types';

/* -------------------------------------------------------------- home / shared */

export const STR = {
  id: {
    navBeranda: 'Beranda',
    navArmada: 'Armada',
    navLayanan: 'Layanan',
    navTestimoni: 'Testimoni',
    navKota: 'Kota Layanan',
    navTravel: 'Travel',
    navBlog: 'Blog',
    navAllCities: 'Semua Kota Layanan →',
    // The nav's one dropdown. "Area Layanan" rather than "Kota Layanan" because
    // half the entries are countries, not cities — Thailand and Malaysia were
    // already sitting under a heading that called them cities.
    navArea: 'Area Layanan',
    navAreaDomestic: 'Dalam Negeri',
    navAreaOverseas: 'Luar Negeri',
    cta: 'Pesan Sekarang',
    // "Sejak Bogor" was a mistranslation of "From Bogor" — `sejak` is temporal
    // ("since"), never locational. `mancanegara` also sits better than
    // "luar negeri" in a positioning line.
    heroBadge: 'PT. Ayomi Raya · Dari Bogor untuk Indonesia & mancanegara',
    heroTitle: 'Sewa Mobil Premium dengan Supir Profesional',
    heroSub:
      'Perjalanan bisnis, wisata, dan keluarga dengan satu standar layanan: penawaran tertulis, driver terverifikasi, dan pembayaran hanya ke rekening resmi perusahaan.',
    heroWa: 'Pesan via WhatsApp',
    heroKota: 'Lihat Kota Layanan',
    // Was `${fleet.length} unit armada siap jalan`. A count reads as a ceiling —
    // "only 14" — and the grid further down already shows every car, so the
    // number added nothing it did not also take away. It was derived from
    // `fleet.length`, so it would have crept back to "15 unit" on the next
    // upload; stating the range of classes cannot go stale that way.
    chipFleetTypes: 'MPV · SUV · Van · Premium',
    chipTarif: 'Tarif Dalam Kota & All-in',
    chipSupport: 'Support admin 24/7',
    armadaEyebrow: 'Armada & Tarif',
    armadaTitle: 'Unit terawat untuk setiap kebutuhan',
    armadaSub:
      'Seluruh tarif sudah termasuk jasa driver. Tarif akhir menyesuaikan kota keberangkatan Anda.',
    armadaAll: 'Tarif lengkap per kota →',
    seatsSuffix: ' kursi termasuk driver',
    fromPrefix: 'Mulai ',
    priceSubIn: 'Dalam Kota · 12 jam · termasuk driver',
    priceContact: 'Hubungi untuk harga terbaik',
    priceContactSub: 'Penawaran tertulis via WhatsApp',
    orderUnit: 'Pesan Unit Ini',
    moreUnitsSuffix: ' unit lainnya →',
    layananEyebrow: 'Layanan',
    layananTitle: 'Satu armada, banyak kebutuhan',
    layananSub: 'Sampaikan kebutuhan Anda — admin kami menyiapkan unit dan driver yang sesuai.',
    layananAsk: 'Tanya layanan ini →',
    kotaEyebrow: 'Kota Layanan',
    kotaTitle: 'Berangkat dari kota Anda',
    kotaSub: 'Setiap halaman kota memuat tarif, armada, destinasi, dan rute setempat.',
    typeCity: 'Kota',
    typeRegion: 'Wilayah',
    typeCountry: 'Negara',
    rentPrefix: 'Sewa Mobil ',
    servingPrefix: 'Melayani ',
    seeTariff: 'Lihat tarif & armada →',
    allCitiesTitle: 'Semua Kota Layanan',
    allCitiesDesc: 'Direktori lengkap Indonesia dan luar negeri, termasuk kota yang belum terdaftar.',
    allCitiesLink: 'Buka direktori →',
    testiEyebrow: 'Testimoni',
    testiTitle: 'Cerita dari perjalanan pelanggan',
    testiSub: 'Pengalaman langsung dari perjalanan bisnis, keluarga, dan rombongan.',
    testiGoogle: 'Lihat ulasan di Google ↗',
    verifEyebrow: 'Verifikasi Resmi',
    verifTitle: 'Transaksi hanya melalui kontak resmi kami',
    verifDesc:
      'Seluruh pemesanan Arasya Rent Car dilayani admin resmi PT. Ayomi Raya dengan penawaran tertulis. Waspadai pihak yang mengatasnamakan kami di luar nomor dan rekening di halaman ini.',
    verifNumbers: 'Nomor resmi',
    // The EN side always said "Indonesian & English" while this said Indonesian
    // only, so the two locales stated different facts about the same service
    // desk. Admin does speak both — confirmed by the owner — so this is the side
    // that was wrong.
    verifHours: 'Setiap hari · 24 jam · Bahasa Indonesia & Inggris',
    verifWa: 'Konsultasi WhatsApp',
    bankLabel: 'Rekening resmi pembayaran',
    bankCopy: 'Salin',
    bankCopied: '✓ Tersalin',
    bankNote:
      'Rekening di luar daftar ini bukan milik Arasya Rent Car. DP 20% dibayarkan setelah invoice resmi diterbitkan.',
    footTagline: 'Sewa mobil premium dengan supir — Indonesia dan luar negeri.',
    footContact: 'Kontak',
    footExplore: 'Jelajahi',
    footArmada: 'Armada & Tarif',
    footRights: 'Seluruh hak cipta dilindungi.',
    waGeneral:
      'Halo admin Arasya Rent Car, saya ingin memesan unit mobil dengan supir. Mohon dibantu. Terima kasih.',
    waServicePre: 'Halo admin Arasya Rent Car, saya ingin menanyakan layanan ',
    waServicePost: '. Mohon dibantu. Terima kasih.',
    waUnitPre: 'Halo admin Arasya Rent Car, saya ingin memesan unit ',
    waUnitPost: ' dengan supir. Mohon info ketersediaan dan tarifnya. Terima kasih.',
    seoTitle: 'Arasya Rent Car — Sewa Mobil Premium dengan Supir',
    seoDescPre: 'Sewa mobil premium dengan supir profesional dari PT. Ayomi Raya — melayani ',
    seoDescPost: '. Tarif transparan, pembayaran ke rekening resmi, pesan via WhatsApp.',
    seoAreaFallback: 'Indonesia dan luar negeri',
  },
  en: {
    navBeranda: 'Home',
    navArmada: 'Fleet',
    navLayanan: 'Services',
    navTestimoni: 'Reviews',
    navKota: 'Service Cities',
    navTravel: 'Travel',
    navBlog: 'Blog',
    navAllCities: 'All Service Cities →',
    navArea: 'Service Areas',
    // "In Indonesia", not "Domestic" — the reader of the English site may well
    // be outside it, so "domestic" has no fixed meaning for them.
    navAreaDomestic: 'In Indonesia',
    navAreaOverseas: 'Overseas',
    cta: 'Book Now',
    heroBadge: 'PT. Ayomi Raya · From Bogor for Indonesia & abroad',
    heroTitle: 'Premium Car Rental with Professional Drivers',
    heroSub:
      'Business trips, holidays, and family travel with one standard of service: written quotes, verified drivers, and payments only to official company accounts.',
    heroWa: 'Book via WhatsApp',
    heroKota: 'View Service Cities',
    // Identical in both locales — these are the international class
    // abbreviations, not words to translate.
    chipFleetTypes: 'MPV · SUV · Van · Premium',
    chipTarif: 'In-City & All-in rates',
    chipSupport: '24/7 admin support',
    armadaEyebrow: 'Fleet & Rates',
    armadaTitle: 'Well-kept cars for every need',
    armadaSub: 'All rates include the driver. Final rates depend on your departure city.',
    armadaAll: 'Full rates per city →',
    seatsSuffix: ' seats incl. driver',
    fromPrefix: 'From ',
    priceSubIn: 'In-City · 12 hours · driver included',
    priceContact: 'Contact us for the best price',
    priceContactSub: 'Written quote via WhatsApp',
    orderUnit: 'Book This Car',
    moreUnitsSuffix: ' more units →',
    layananEyebrow: 'Services',
    layananTitle: 'One fleet, many needs',
    layananSub: 'Tell us what you need — our admins will arrange the right car and driver.',
    layananAsk: 'Ask about this service →',
    kotaEyebrow: 'Service Cities',
    kotaTitle: 'Departing from your city',
    kotaSub: 'Every city page lists local rates, fleet, destinations, and routes.',
    typeCity: 'City',
    typeRegion: 'Region',
    typeCountry: 'Country',
    rentPrefix: 'Car Rental ',
    servingPrefix: 'Serving ',
    seeTariff: 'See rates & fleet →',
    allCitiesTitle: 'All Service Cities',
    allCitiesDesc: 'The full directory for Indonesia and abroad, including cities not yet listed.',
    allCitiesLink: 'Open the directory →',
    testiEyebrow: 'Reviews',
    testiTitle: 'Stories from our customers',
    testiSub: 'First-hand experiences from business, family, and group trips.',
    testiGoogle: 'See the review on Google ↗',
    verifEyebrow: 'Official Verification',
    verifTitle: 'Transact only through our official contacts',
    verifDesc:
      'Every Arasya Rent Car booking is handled by official PT. Ayomi Raya admins with a written quote. Beware of anyone using our name outside the numbers and accounts on this page.',
    verifNumbers: 'Official numbers',
    verifHours: 'Every day · 24 hours · Indonesian & English',
    verifWa: 'Chat on WhatsApp',
    bankLabel: 'Official payment accounts',
    bankCopy: 'Copy',
    bankCopied: '✓ Copied',
    bankNote:
      'Accounts outside this list do not belong to Arasya Rent Car. A 20% deposit is paid after the official invoice is issued.',
    footTagline: 'Premium car rental with driver — Indonesia and abroad.',
    footContact: 'Contact',
    footExplore: 'Explore',
    footArmada: 'Fleet & Rates',
    footRights: 'All rights reserved.',
    waGeneral:
      'Hello Arasya Rent Car, I would like to book a car with a driver. Please assist. Thank you.',
    waServicePre: 'Hello Arasya Rent Car, I would like to ask about the ',
    waServicePost: ' service. Please assist. Thank you.',
    waUnitPre: 'Hello Arasya Rent Car, I would like to book a ',
    waUnitPost: ' with a driver. Please share availability and rates. Thank you.',
    seoTitle: 'Arasya Rent Car — Premium Car Rental with Driver in Indonesia',
    seoDescPre: 'Premium chauffeured car rental by PT. Ayomi Raya — serving ',
    seoDescPost: '. Transparent rates, official company accounts, book via WhatsApp.',
    seoAreaFallback: 'Indonesia and abroad',
  },
} as const;

export type Strings = (typeof STR)['id'];

export function t(locale: Locale): Strings {
  return (STR[locale] ?? STR.id) as Strings;
}

/* ------------------------------------------------------------------ landings */

/**
 * Chrome labels for the city / region / country templates.
 *
 * The Indonesian values are verbatim from the `.dc.html` prototypes, which
 * hardcode them. `i18n.js` ships no English for these templates, so the EN
 * column here is mechanical UI vocabulary only — section eyebrows and button
 * labels, never marketing prose. It is also currently unreachable: a landing
 * page renders at /en/ only once its entry has EN *content*, and none do yet.
 * Having it in place means the chrome is ready the moment a translation lands.
 */
export const LANDING_STR = {
  id: {
    navBeranda: 'Beranda',
    navArmada: 'Armada',
    navFaq: 'FAQ',
    navKota: 'Kota',
    // Site-wide destinations. Landing pages carried only Beranda/Armada/FAQ,
    // which left every city page a dead end — no route to /travel or /blog, in
    // either direction, breaking half the internal-link mesh the pSEO spec needs.
    navTravel: 'Travel',
    navBlog: 'Blog',
    cta: 'Pesan Sekarang',
    heroBadge: 'Layanan Premium dengan Supir',
    heroBadgeCountry: 'Untuk Wisatawan Indonesia',
    heroWa: 'Konsultasi WhatsApp',
    heroDirectoryCta: 'Lihat Kota Layanan',
    chipsLabelArea: 'Wilayah Layanan',
    chipsLabelBenefits: 'Keunggulan Kami',

    armadaEyebrow: 'Armada & Tarif',
    armadaTitle: 'Pilihan armada untuk setiap kebutuhan',
    // "jasa driver", not "jasa supir": the site uses `supir` for the person in
    // narrative and headings ("Sewa Mobil Bogor dengan Supir" is also the search
    // term) and `driver` for the line item in rates and specs — which is how the
    // Indonesian rental trade writes it, and what `fleetNotes` already says.
    // This sentence is a rate inclusion, so it takes `driver`. STR.armadaSub is
    // the same sentence in the same position and already did.
    armadaSub: 'Seluruh tarif sudah termasuk jasa driver profesional.',
    tierDalamKota: 'Dalam Kota · 12 Jam',
    tierAllin: 'All-in',
    capacitySuffix: 'Kapasitas {n} penumpang · Termasuk supir',
    order: 'Pesan',
    contactPrice: 'Hubungi kami',
    perDay: 'per hari, all-in',
    per12h: 'per 12 jam',
    specialRate: 'tarif khusus',

    unitsEyebrow: 'Armada',
    unitsTitle: 'Kelas unit di setiap kota layanan',
    unitsSub: 'Model persis dan tarif dikonfirmasi per kota melalui penawaran tertulis dalam Rupiah.',
    unitsAsk: 'Tanya ketersediaan unit',

    // Single international city (e.g. Bangkok). The country-page copy above
    // says "setiap kota layanan" and "dalam Rupiah" — neither is right here:
    // there is one city, and the currency is settled in the conversation, not
    // asserted on the page.
    unitsCityTitle: 'Kelas unit yang dapat kami sediakan di {city}',
    unitsCitySub:
      'Ketersediaan unit dan tarif di {city} kami konfirmasi langsung melalui WhatsApp, menyesuaikan tanggal, durasi, dan rute perjalanan Anda.',
    unitsCityAsk: 'Tanya ketersediaan & tarif',

    unitsSeats: 'Kapasitas',
    unitsLuggage: 'Bagasi',
    // States the partner arrangement outright. The reader is being asked to book
    // a car in a country Arasya does not operate in, and finding that out after
    // paying is exactly the surprise that costs a review.
    unitsPartnerNote:
      'Unit di {city} disediakan oleh mitra operasional kami di sana, dan dikoordinasikan penuh oleh admin Arasya dari Indonesia. Model persis, plat, dan tarif final dikonfirmasi melalui WhatsApp sebelum Anda memesan.',

    layananEyebrow: 'Layanan',
    layananTitle: 'Satu operator, semua kebutuhan perjalanan',
    layananAsk: 'Tanya layanan →',

    mengenalKota: 'Mengenal Kota',
    mengenalWilayah: 'Mengenal Wilayah',
    mengenalNegara: 'Mengenal Negara',

    destEyebrow: 'Destinasi Populer',
    destTitleFrom: 'Rute favorit dari {city}',
    destTitleIn: 'Rute favorit di {city}',
    destTitleCountry: 'Destinasi lintas kota di {city}',

    routesEyebrow: 'Rute Antarkota',
    routesTitleCity: 'Perjalanan luar kota dari {city}',
    routesTitleRegion: 'Perjalanan populer dari {city}',
    routesSub:
      'Tarif rute antarkota dikonfirmasi melalui penawaran tertulis sesuai jarak dan durasi.',

    dirEyebrow: 'Kota Layanan',
    dirTitle: 'Pilih kota keberangkatan Anda',
    dirSub: 'Jaringan kota kami di {city} terus bertambah.',
    dirAsk: 'Tanya kota ini →',

    stepsEyebrow: 'Langkah Pemesanan',
    stepsTitle: 'Tujuh langkah hingga keberangkatan',
    stepsSub: 'Prosedur resmi yang sama untuk seluruh kota layanan.',

    galleryEyebrow: 'Galeri',
    galleryTitle: 'Dokumentasi armada & perjalanan',
    // Was "Campurkan foto lanskap dan potret." — an imperative left over from the
    // design handoff, telling whoever filled the gallery what to upload. It was
    // shipping to customers as body copy. The English was already descriptive.
    gallerySub: 'Perpaduan foto lanskap dan potret perjalanan.',

    testiEyebrow: 'Testimoni',
    testiTitle: 'Kata mereka yang telah berangkat',
    testiGoogle: 'Lihat ulasan di Google ↗',

    faqEyebrow: 'FAQ',
    faqTitle: 'Pertanyaan yang sering diajukan',

    quoteEyebrow: 'Pemesanan',
    quoteTitle: 'Minta penawaran sekarang',
    quoteSub:
      'Lengkapi formulir berikut — tim kami menghubungi Anda melalui WhatsApp untuk konfirmasi.',
    quoteOrContact: 'Atau hubungi langsung:',
    // Same correction as STR.verifHours — these two must agree with each other
    // and with the English.
    quoteHours: 'Setiap hari · 24 jam · Bahasa Indonesia & Inggris',
    quoteAssurances: [
      'Penawaran tertulis, tanpa biaya tersembunyi',
      'Konfirmasi cepat melalui WhatsApp',
      'Pembayaran hanya ke rekening resmi PT. Ayomi Raya',
    ],

    mapEyebrow: 'Lokasi Kantor',
    mapTitleCity: 'Kunjungi kantor kami di Bogor',
    mapTitleRegion: 'Kantor pusat kami di Bogor',

    copy: 'Salin',
    copied: '✓ Tersalin',
    footContact: 'Kontak',
    footExplore: 'Jelajahi',
    footOtherCities: 'Kota Layanan Lain',
    footRights: 'Seluruh hak cipta dilindungi.',
    footTagline: 'Sewa mobil premium dengan supir — melayani',
  },
  en: {
    navBeranda: 'Home',
    navArmada: 'Fleet',
    navFaq: 'FAQ',
    navKota: 'Cities',
    navTravel: 'Travel',
    navBlog: 'Blog',
    cta: 'Book Now',
    heroBadge: 'Premium Chauffeured Service',
    heroBadgeCountry: 'For Indonesian Travellers',
    heroWa: 'Chat on WhatsApp',
    heroDirectoryCta: 'View Service Cities',
    chipsLabelArea: 'Service Area',
    chipsLabelBenefits: 'Why Arasya',

    armadaEyebrow: 'Fleet & Rates',
    armadaTitle: 'A car for every kind of trip',
    armadaSub: 'Every rate includes a professional driver.',
    tierDalamKota: 'In-City · 12 Hours',
    tierAllin: 'All-in',
    capacitySuffix: 'Seats {n} passengers · Driver included',
    order: 'Book',
    contactPrice: 'Contact us',
    perDay: 'per day, all-in',
    per12h: 'per 12 hours',
    specialRate: 'custom rate',

    unitsEyebrow: 'Fleet',
    unitsTitle: 'Car classes in every service city',
    unitsSub: 'Exact models and rates are confirmed per city in a written quote, in Rupiah.',
    unitsAsk: 'Ask about availability',

    unitsCityTitle: 'Car classes we can arrange in {city}',
    unitsCitySub:
      'Availability and rates in {city} are confirmed directly over WhatsApp, based on your dates, duration and route.',
    unitsCityAsk: 'Ask about availability & rates',

    unitsSeats: 'Capacity',
    unitsLuggage: 'Luggage',
    unitsPartnerNote:
      'Cars in {city} are supplied by our operating partner there, coordinated end to end by Arasya admin in Indonesia. The exact model, plate and final rate are confirmed over WhatsApp before you book.',

    layananEyebrow: 'Services',
    layananTitle: 'One operator, every travel need',
    layananAsk: 'Ask about this service →',

    mengenalKota: 'About the City',
    mengenalWilayah: 'About the Region',
    mengenalNegara: 'About the Country',

    destEyebrow: 'Popular Destinations',
    destTitleFrom: 'Favourite routes from {city}',
    destTitleIn: 'Favourite routes in {city}',
    destTitleCountry: 'Cross-city destinations in {city}',

    routesEyebrow: 'Intercity Routes',
    routesTitleCity: 'Out-of-town trips from {city}',
    routesTitleRegion: 'Popular trips from {city}',
    routesSub: 'Intercity rates are confirmed in a written quote based on distance and duration.',

    dirEyebrow: 'Service Cities',
    dirTitle: 'Choose your departure city',
    dirSub: 'Our city network in {city} keeps growing.',
    dirAsk: 'Ask about this city →',

    stepsEyebrow: 'How to Book',
    stepsTitle: 'Seven steps to departure',
    stepsSub: 'The same official procedure in every service city.',

    galleryEyebrow: 'Gallery',
    galleryTitle: 'Fleet & journey documentation',
    gallerySub: 'A mix of landscape and portrait photography.',

    testiEyebrow: 'Reviews',
    testiTitle: 'From travellers who have ridden with us',
    testiGoogle: 'See the review on Google ↗',

    faqEyebrow: 'FAQ',
    faqTitle: 'Frequently asked questions',

    quoteEyebrow: 'Booking',
    quoteTitle: 'Request a quote',
    quoteSub: 'Fill in the form — our team will confirm with you on WhatsApp.',
    quoteOrContact: 'Or contact us directly:',
    quoteHours: 'Every day · 24 hours · Indonesian & English',
    quoteAssurances: [
      'Written quotes, no hidden fees',
      'Fast confirmation over WhatsApp',
      'Payment only to official PT. Ayomi Raya accounts',
    ],

    mapEyebrow: 'Office Location',
    mapTitleCity: 'Visit our office in Bogor',
    mapTitleRegion: 'Our head office in Bogor',

    copy: 'Copy',
    copied: '✓ Copied',
    footContact: 'Contact',
    footExplore: 'Explore',
    footOtherCities: 'Other Service Cities',
    footRights: 'All rights reserved.',
    footTagline: 'Premium chauffeured car rental — serving',
  },
} as const;

export type LandingStrings = (typeof LANDING_STR)['id'];

export function tLanding(locale: Locale): LandingStrings {
  return (LANDING_STR[locale] ?? LANDING_STR.id) as LandingStrings;
}

/** Replaces the `{city}` token in a landing label. */
export function withCity(template: string, city: string): string {
  return template.replace('{city}', city);
}

/* --------------------------------------------------------------------- travel */

export const TRAVEL_STR = {
  id: {
    navBeranda: 'Beranda',
    navRute: 'Rute & Tarif',
    navCara: 'Cara Pesan',
    navFaq: 'FAQ',
    navKota: 'Kota Layanan',
    navBlog: 'Blog',
    cta: 'Pesan Sekarang',
    heroBadge: 'Arasya Travel — Charter Drop Off',
    heroTitle: 'Charter satu mobil antar kota, door to door.',
    heroSub:
      'Satu mobil khusus untuk Anda — dijemput di alamat Anda, diantar sampai alamat tujuan. Tarif all-in sudah termasuk mobil, supir, BBM, tol, dan parkir untuk satu kali perjalanan.',
    chipRoutesSuffix: ' rute tarif tetap',
    chipAllin: 'Tarif all-in transparan',
    chipPrivate: 'Privat, bukan travel gabungan',
    bTitle: 'Cek tarif rute Anda',
    bOrigin: 'Kota keberangkatan',
    bDest: 'Tujuan',
    bUnit: 'Pilihan unit',
    bPriceLabel: 'Tarif all-in',
    bPriceNote: 'Mobil + supir + BBM + tol + parkir · 1x perjalanan',
    bCta: 'Pesan via WhatsApp',
    bOther: 'Rute Anda tidak ada di daftar?',
    bOtherLink: 'Chat admin untuk tarif khusus',
    incLabel: 'Tarif sudah termasuk',
    incItems: ['Mobil privat', 'Supir profesional', 'BBM', 'Tol', 'Parkir'],
    incNote: 'Berlaku untuk satu kali perjalanan — 1 lokasi penjemputan, 1 lokasi tujuan.',
    ruteEyebrow: 'Rute & Tarif',
    ruteTitle: 'Pilih kota keberangkatan Anda',
    ruteSub:
      'Tarif tetap per unit untuk rute-rute populer. Rute di luar daftar dilayani dengan penawaran khusus melalui WhatsApp.',
    fromPrefix: 'Dari ',
    doorNote: ' · door to door',
    pesan: 'Pesan',
    seatsSuffix: ' kursi',
    routeSuffix: ' rute',
    cardNote: 'Semua tarif all-in untuk 1x perjalanan, 1 lokasi jemput, 1 lokasi tujuan.',
    caraEyebrow: 'Cara Pesan',
    caraTitle: 'Tiga langkah menuju keberangkatan',
    steps: [
      {
        title: 'Pilih rute & unit',
        desc: 'Tentukan kota keberangkatan, tujuan, dan unit yang sesuai kebutuhan rombongan Anda.',
      },
      {
        title: 'Konfirmasi via WhatsApp',
        desc: 'Admin memastikan ketersediaan unit dan jadwal, lalu menerbitkan invoice resmi.',
      },
      {
        title: 'DP 20% & berangkat',
        desc: 'Transfer DP ke rekening resmi; pelunasan dilakukan saat driver menjemput Anda.',
      },
    ],
    faqEyebrow: 'FAQ',
    faqTitle: 'Pertanyaan seputar Arasya Travel',
    faqs: [
      {
        question: 'Apa saja yang sudah termasuk dalam tarif?',
        answer:
          'Tarif sudah termasuk mobil, supir, BBM, tol, dan parkir untuk satu kali perjalanan dengan 1 lokasi penjemputan dan 1 lokasi tujuan.',
      },
      {
        question: 'Apakah penjemputan bisa di alamat mana pun?',
        answer:
          'Ya. Layanan kami door to door — supir menjemput di alamat Anda di kota keberangkatan dan mengantar langsung ke alamat tujuan.',
      },
      {
        question: 'Bagaimana jika rute saya tidak ada di daftar?',
        answer:
          'Hubungi admin melalui WhatsApp dan sampaikan rencana rute Anda. Kami menghitung penawaran khusus sesuai jarak dan durasi perjalanan.',
      },
      {
        question: 'Apakah bisa berangkat malam atau dini hari?',
        answer:
          'Bisa. Layanan travel tersedia 24 jam, termasuk keberangkatan dini hari untuk mengejar penerbangan. Sampaikan jadwal Anda saat memesan.',
      },
      {
        question: 'Bolehkah mampir atau menambah titik jemput?',
        answer:
          'Tarif berlaku untuk 1 lokasi jemput dan 1 lokasi tujuan. Tambahan titik atau persinggahan dapat diatur dengan penyesuaian tarif yang diinformasikan di awal.',
      },
      {
        question: 'Bagaimana ketentuan pembayarannya?',
        answer:
          'Setelah invoice diterbitkan, Anda mentransfer DP 20% ke rekening resmi {BANK}. Pelunasan dilakukan kepada driver saat penjemputan, tunai atau transfer.',
      },
    ],
    ctaTitle: 'Siap berangkat kapan pun Anda siap.',
    ctaDesc: 'Konsultasikan jadwal dan rute Anda — admin kami siap membantu melalui WhatsApp.',
    ctaWa: 'Chat Admin Sekarang',
    footTagline:
      'Layanan charter drop off antar kota door to door dari Arasya Rent Car — PT. Ayomi Raya.',
    footContact: 'Kontak',
    footExplore: 'Jelajahi',
    // Was "Seluruh hak cipta." — truncated. The other two dictionaries carry the
    // complete phrase, and the English here says "All rights reserved."
    footRights: 'Seluruh hak cipta dilindungi.',
    footHome: 'Beranda',
    footHub: 'Semua Kota Layanan',
    footBlog: 'Blog Arasya',
    seoTitle:
      'Arasya Travel — Charter Mobil Drop Off Antar Kota Door to Door | Arasya Rent Car',
    seoDesc:
      'Charter satu mobil drop off door to door rute Bogor, Jakarta, dan Bandung. Tarif all-in termasuk mobil, supir, BBM, tol, dan parkir. Pesan via WhatsApp.',
    waGeneral:
      'Halo Admin Arasya Rent Car, saya ingin bertanya tentang layanan Arasya Travel drop off antar kota.',
    waRoutePre: 'Halo Admin Arasya Rent Car, saya ingin memesan Travel Drop Off rute ',
    waRouteUnit: ' dengan unit ',
    waRoutePrice: ', tarif ',
    waRoutePost: ' all-in. Mohon dibantu, terima kasih.',
  },
  en: {
    navBeranda: 'Home',
    navRute: 'Routes & Rates',
    navCara: 'How to Book',
    navFaq: 'FAQ',
    navKota: 'Service Cities',
    navBlog: 'Blog',
    cta: 'Book Now',
    heroBadge: 'Arasya Travel — Private Drop-off Charter',
    heroTitle: 'Private intercity car charter, door to door.',
    heroSub:
      'One car exclusively for you — picked up at your address, delivered to your destination. All-in rates cover the car, driver, fuel, tolls, and parking for a single trip.',
    chipRoutesSuffix: ' fixed-rate routes',
    chipAllin: 'Transparent all-in rates',
    chipPrivate: 'Private — never shared',
    bTitle: 'Check your route fare',
    bOrigin: 'Departure city',
    bDest: 'Destination',
    bUnit: 'Car option',
    bPriceLabel: 'All-in rate',
    bPriceNote: 'Car + driver + fuel + tolls + parking · one-way trip',
    bCta: 'Book via WhatsApp',
    bOther: 'Route not listed?',
    bOtherLink: 'Chat our admin for a custom quote',
    incLabel: 'Rate includes',
    incItems: ['Private car', 'Professional driver', 'Fuel', 'Tolls', 'Parking'],
    incNote: 'Valid for a single trip — one pick-up point, one destination.',
    ruteEyebrow: 'Routes & Rates',
    ruteTitle: 'Choose your departure city',
    ruteSub:
      'Fixed per-unit rates on popular routes. Routes beyond this list are served with a custom quote via WhatsApp.',
    fromPrefix: 'From ',
    doorNote: ' · door to door',
    pesan: 'Book',
    seatsSuffix: ' seats',
    routeSuffix: ' routes',
    cardNote: 'All rates are all-in for a single trip — one pick-up point, one destination.',
    caraEyebrow: 'How to Book',
    caraTitle: 'Three steps to departure',
    steps: [
      {
        title: 'Pick a route & unit',
        desc: 'Choose your departure city, destination, and the car that fits your group.',
      },
      {
        title: 'Confirm via WhatsApp',
        desc: 'Our admin confirms unit availability and schedule, then issues an official invoice.',
      },
      {
        title: '20% deposit & depart',
        desc: 'Transfer the deposit to our official account; settle the balance when the driver picks you up.',
      },
    ],
    faqEyebrow: 'FAQ',
    faqTitle: 'Arasya Travel — common questions',
    faqs: [
      {
        question: 'What does the rate include?',
        answer:
          'The rate covers the car, driver, fuel, tolls, and parking for a single trip with one pick-up point and one destination.',
      },
      {
        question: 'Can you pick me up at any address?',
        answer:
          'Yes. The service is door to door — the driver picks you up at your address in the departure city and delivers you straight to your destination address.',
      },
      {
        question: 'What if my route is not listed?',
        answer:
          'Contact our admin on WhatsApp with your travel plan. We prepare a custom quote based on distance and trip duration.',
      },
      {
        question: 'Can I depart at night or before dawn?',
        answer:
          'Yes. The travel service runs 24 hours, including early-morning departures to catch a flight. Share your schedule when booking.',
      },
      {
        question: 'Can I add a stop or an extra pick-up point?',
        answer:
          'Rates apply to one pick-up point and one destination. Extra stops can be arranged with a rate adjustment confirmed up front.',
      },
      {
        question: 'How does payment work?',
        answer:
          'Once the invoice is issued, you transfer a 20% deposit to our official account {BANK}. The balance is settled with the driver at pick-up, by cash or transfer.',
      },
    ],
    ctaTitle: 'Ready whenever you are.',
    ctaDesc: 'Discuss your schedule and route — our admins are ready to help on WhatsApp.',
    ctaWa: 'Chat Admin Now',
    footTagline: 'Door-to-door intercity drop-off charter by Arasya Rent Car — PT. Ayomi Raya.',
    footContact: 'Contact',
    footExplore: 'Explore',
    footRights: 'All rights reserved.',
    footHome: 'Home',
    footHub: 'All Service Cities',
    footBlog: 'Arasya Blog',
    seoTitle: 'Arasya Travel — Private Intercity Drop-off Car Charter | Arasya Rent Car',
    seoDesc:
      'Private one-car drop-off charter, door to door across Bogor, Jakarta, and Bandung. All-in rates include car, driver, fuel, tolls, and parking. Book via WhatsApp.',
    waGeneral:
      'Hello Arasya Rent Car admin, I would like to ask about the Arasya Travel intercity drop-off service.',
    waRoutePre: 'Hello Arasya Rent Car admin, I would like to book a Travel Drop Off on the ',
    waRouteUnit: ' route with a ',
    waRoutePrice: ' unit, at ',
    waRoutePost: ' all-in. Thank you.',
  },
} as const;

export type TravelStrings = (typeof TRAVEL_STR)['id'];

export function tTravel(locale: Locale): TravelStrings {
  return (TRAVEL_STR[locale] ?? TRAVEL_STR.id) as TravelStrings;
}

/** Travel FAQ answers carry a `{BANK}` placeholder filled from site settings. */
export function fillBank(text: string, bank: string): string {
  return text.replace('{BANK}', bank);
}
