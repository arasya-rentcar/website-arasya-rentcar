// Arasya Rent Car — global site registry (data shared by ALL pages).
// Editable via Content Studio (draf localStorage 'arasya-cms-site').
// settings = kontak/pembayaran/alamat · fleet = armada & tarif · services/testimonials/trustDefaults = blok konten global.

export const site = {
  settings: {
    waPhone: '6282124024281',
    officialPhones: [
      { display: '0821-2402-4281' },
      { display: '0822-9885-4855' },
      { display: '0813-9990-9602' },
    ],
    // Rekening resmi — bisa lebih dari satu; urutan pertama = rekening utama (FAQ pembayaran).
    bankAccounts: [
      { bank: 'BCA', number: '095 484 0782', owner: 'a.n. PT. Ayomi Raya' },
    ],
    addressLine: 'Selakopi Hijau Blok F No. 3–4, Pasir Mulya, Bogor Barat, Kota Bogor 16118',
    addressStreet: 'Selakopi Hijau Blok F No. 3-4, Pasir Mulya, Bogor Barat',
    addressLocality: 'Kota Bogor',
    postalCode: '16118',
    instagram: 'https://www.instagram.com/arasyarentcar/',
    siteUrl: 'https://arasyarentcar.com',
    mapsEmbed: 'https://maps.google.com/maps?q=Selakopi%20Hijau%20Blok%20F%20No.3-4%20Pasir%20Mulya%20Bogor%20Barat&t=&z=15&ie=UTF8&iwloc=&output=embed',
  },

  fleetNotes: {
    dalamKota: 'Tarif Dalam Kota berlaku untuk durasi 12 jam, sudah termasuk jasa driver; belum termasuk BBM, tol, parkir, dan makan driver.',
    allin: 'Tarif All-in sudah termasuk BBM, tol, dan makan driver. Kapasitas penumpang sudah termasuk jasa driver.',
  },
  genericUnits: ['MPV 7 kursi', 'MPV Premium 6 kursi', 'Van 11–14 kursi', 'SUV Eksekutif'],
  // dalamKota/allin: angka rupiah; null = "Hubungi untuk harga terbaik". img/imgLogo = nama file di assets/cars & assets/cars-with-logo (produksi: path Supabase Storage).
  // imgData/imgLogoData = unggahan draf dari Content Studio (data URL, pratinjau browser saja — tidak ikut ekspor).
  fleet: [
    { name: 'Toyota Avanza', dalamKota: 500000, allin: 1250000, capacity: 7, img: 'toyota-avanza', imgLogo: 'toyota-new-avanza-with-logo' },
    { name: 'Suzuki Ertiga', dalamKota: 500000, allin: 1250000, capacity: 7, img: 'suzuki-ertiga', imgLogo: 'suzuki-ertiga-with-logo' },
    { name: 'Mitsubishi Xpander', dalamKota: 600000, allin: 1350000, capacity: 7, img: 'mitsubishi-xpander', imgLogo: 'mitsubishi-expander-with-logo' },
    { name: 'Daihatsu Terios', dalamKota: 600000, allin: 1350000, capacity: 7, img: 'daihatsu-terios', imgLogo: 'daihatsu-terios-with-logo' },
    { name: 'Toyota Rush', dalamKota: 600000, allin: 1350000, capacity: 7, img: 'toyota-rush', imgLogo: 'toyota-rush-with-logo' },
    { name: 'Toyota Innova Reborn', dalamKota: 700000, allin: 1500000, capacity: 7, badge: 'Terpopuler', img: 'toyota-innova-reborn', imgLogo: 'toyota-innova-reborn-with-logo' },
    { name: 'Toyota Zenix', dalamKota: 1000000, allin: 1800000, capacity: 7, img: 'toyota-innova-zenix', imgLogo: 'toyota-zenix-with-logo' },
    { name: 'Toyota Innova Venturer', dalamKota: 1000000, allin: 1800000, capacity: 6, img: 'toyota-innova-venturer', imgLogo: 'toyota-innova-venturer-with-logo' },
    { name: 'Toyota Zenix Q Hybrid Modellista', dalamKota: 1300000, allin: 2200000, capacity: 6, img: 'toyota-zenix-q-hybrid-modellista', imgLogo: 'toyota-zenix-q-modellista-with-logo' },
    { name: 'Toyota Fortuner', dalamKota: 1500000, allin: null, capacity: 6, img: 'toyota-fortuner', imgLogo: 'toyota-fortuner-with-logo' },
    { name: 'Toyota Hiace Commuter', dalamKota: 1500000, allin: null, capacity: 14, img: 'hiace-commuter', imgLogo: 'hiace-commuter-with-logo' },
    { name: 'Toyota Hiace Premio', dalamKota: null, allin: null, capacity: 14, img: 'hiace-premio', imgLogo: 'hiacepremio-with-logo' },
    { name: 'Toyota Alphard', dalamKota: null, allin: null, capacity: 6, img: 'toyota-alphard', imgLogo: 'toyota-alphard-with-logo' },
    { name: 'Isuzu Elf Long', dalamKota: null, allin: null, capacity: 19, img: 'isuzu-elf-long', imgLogo: 'isuzu-elf-long-with-logo' },
  ],

  services: [
    { slug: 'mobil-driver', icon: 'car', title: 'Mobil + Driver', description: 'Sewa mobil dengan driver berpengalaman untuk kebutuhan harian dalam kota.' },
    { slug: 'antar-jemput-bandara', icon: 'plane', title: 'Antar Jemput Bandara', description: 'Layanan antar jemput bandara siap 24 jam, tepat waktu dan nyaman.' },
    { slug: 'travel-antar-kota', icon: 'route', title: 'Travel Antar Kota', description: 'Carter mobil untuk perjalanan ke luar kota dari kota keberangkatan Anda.' },
    { slug: 'wedding-car', icon: 'heart', title: 'Wedding Car', description: 'Mobil bersih dan elegan untuk hari spesial Anda, dengan driver rapi.' },
    { slug: 'corporate', icon: 'building', title: 'Corporate', description: 'Transportasi karyawan dan tamu bisnis dengan layanan terjadwal.' },
    { slug: 'tour-wisata', icon: 'pin', title: 'Tour & Wisata', description: 'Paket perjalanan wisata dengan driver yang paham rute dan destinasi.' },
  ],

  // PLACEHOLDER — ganti dengan ulasan asli pelanggan sebelum tayang.
  testimonials: [
    { quote: 'Driver datang lebih awal dari jadwal, mobil bersih dan wangi. Perjalanan keluarga kami jadi sangat nyaman.', name: 'Rina W.', context: 'Perjalanan keluarga · Innova Reborn' },
    { quote: 'Komunikasi admin cepat dan jelas. Harga sesuai penawaran tertulis, tidak ada biaya tambahan mendadak.', name: 'Budi S.', context: 'Perjalanan bisnis · Alphard' },
    { quote: 'Hiace-nya nyaman untuk rombongan kantor. Driver sopan, hafal rute, dan sabar menunggu agenda kami.', name: 'Maya A.', context: 'Rombongan kantor · Hiace Premio' },
  ],

  // Kartu pertama (shield): deskripsinya digantikan trustRouteDesc per kota bila tersedia.
  trustDefaults: [
    { preset: 'shield', title: 'Driver Berpengalaman', description: 'Tertib, tepat waktu, dan memahami rute layanan.' },
    { preset: 'car', title: 'Mobil Terawat', description: 'Armada bersih dan diperiksa sebelum setiap penjemputan.' },
    { preset: 'check', title: 'Harga Transparan', description: 'Dua pilihan tarif jelas: Dalam Kota 12 jam atau All-in.' },
    { preset: 'phone', title: 'Support 24/7', description: 'Admin siap membantu pemesanan kapan pun melalui WhatsApp.' },
  ],
};

// --- Content Studio draft overlay (pratinjau browser saja) ---
export const siteBase = JSON.parse(JSON.stringify(site));
try {
  const _d = JSON.parse(localStorage.getItem('arasya-cms-site') || 'null');
  if (_d && typeof _d === 'object') {
    if (_d.pengaturan) Object.assign(site.settings, _d.pengaturan);
    if (_d.armada) {
      if (_d.armada.fleet) site.fleet = _d.armada.fleet;
      if (_d.armada.fleetNotes) site.fleetNotes = _d.armada.fleetNotes;
      if (_d.armada.genericUnits) site.genericUnits = _d.armada.genericUnits;
    }
    if (_d.layanan && _d.layanan.services) site.services = _d.layanan.services;
    if (_d.testimoni && _d.testimoni.testimonials) site.testimonials = _d.testimoni.testimonials;
    if (_d.kepercayaan && _d.kepercayaan.trustDefaults) site.trustDefaults = _d.kepercayaan.trustDefaults;
  }
} catch (e) {}
