// Arasya Rent Car — blog registry (CMS-shaped: one entry = one /blog/{slug} page).
// Body = sections[{heading, paragraphs[], list?[]}] — mirrors the future CMS "Post" collection.
export const posts = {
  'itinerari-puncak-satu-hari': {
    slug: 'blog/itinerari-puncak-satu-hari',
    title: 'Itinerari Puncak Satu Hari dari Bogor bersama Supir',
    category: 'Itinerari',
    cityKey: 'bogor',
    cityName: 'Bogor',
    citySlug: 'sewa-mobil-bogor',
    cityPreviewHref: '../city-landing/CityLanding.dc.html?city=bogor',
    author: 'Tim Arasya',
    datePublished: '2026-06-12',
    dateModified: '2026-07-05',
    dateDisplay: '12 Juni 2026',
    updatedDisplay: '5 Juli 2026',
    readMinutes: 6,
    metaTitle: 'Itinerari Puncak 1 Hari dari Bogor bersama Supir — Blog Arasya',
    metaDescription: 'Rangkaian satu hari ke Puncak dari Bogor: jam berangkat menghindari sistem satu arah, urutan destinasi searah, dan komponen biaya yang perlu disiapkan.',
    excerpt: 'Rangkaian satu hari ke Puncak dari Bogor — jam berangkat yang tepat, urutan destinasi searah, dan komponen biaya yang perlu Anda siapkan.',
    sections: [
      { heading: 'Berangkat sebelum sistem satu arah diberlakukan', paragraphs: [
        'Pada akhir pekan dan hari libur, kepolisian memberlakukan sistem satu arah di jalur Puncak: arah naik diprioritaskan pada pagi hari dan arah turun pada sore hari. Jadwalnya menyesuaikan kepadatan hari itu, sehingga selisih satu jam keberangkatan dapat berarti selisih dua hingga tiga jam di perjalanan.',
        'Kami menyarankan penjemputan pukul 05.30–06.00 dari Bogor. Selain lolos sebelum kepadatan arah naik, Anda tiba di kawasan kebun teh saat kabut pagi masih turun — waktu terbaik untuk berfoto.',
      ] },
      { heading: 'Urutan destinasi yang searah', paragraphs: [
        'Kunci itinerari Puncak adalah bergerak satu arah ke atas tanpa berbalik: mulai dari Taman Safari Indonesia di Cisarua, lanjut ke kebun teh untuk berjalan di antara petak teh, kemudian Masjid Atta\u2019awun di titik tertinggi jalur.',
        'Perjalanan turun dapat diisi makan sore dan oleh-oleh di kawasan Cimory, atau memilih jalur alternatif melalui Sentul bila arah turun belum dibuka — keputusan yang paling baik diserahkan kepada supir yang memantau kondisi hari itu.',
      ], list: [
        'Taman Safari Indonesia — buka sejak pagi, siapkan ±3 jam',
        'Kebun teh Puncak — berjalan santai dan berfoto di petak teh',
        'Masjid Atta\u2019awun — istirahat dan ibadah di titik tertinggi jalur',
        'Cimory Riverside — makan sore dan oleh-oleh sebelum turun',
      ] },
      { heading: 'Komponen biaya yang perlu disiapkan', paragraphs: [
        'Dengan skema All-in, tarif sewa sudah mencakup BBM, tol, dan makan supir — Anda hanya menyiapkan tiket masuk destinasi dan parkir. Dengan skema Dalam Kota 12 jam, komponen tersebut dihitung terpisah; rincian keduanya tersedia pada tabel tarif halaman Bogor.',
        'Untuk rombongan keluarga, satu unit MPV dengan supir hampir selalu lebih hemat daripada dua mobil kecil yang dikemudikan sendiri — sekaligus membebaskan Anda dari kelelahan jalur menanjak.',
      ] },
    ],
    related: ['borobudur-sunrise-dari-jogja', 'transportasi-bangkok-keluarga'],
  },

  'borobudur-sunrise-dari-jogja': {
    slug: 'blog/borobudur-sunrise-dari-jogja',
    title: 'Mengejar Matahari Terbit di Borobudur dari Yogyakarta',
    category: 'Panduan',
    cityKey: 'yogyakarta',
    cityName: 'Yogyakarta',
    citySlug: 'sewa-mobil-yogyakarta',
    cityPreviewHref: '../region-landing/RegionLanding.dc.html?city=yogyakarta',
    author: 'Tim Arasya',
    datePublished: '2026-05-28',
    dateModified: '2026-06-20',
    dateDisplay: '28 Mei 2026',
    updatedDisplay: '20 Juni 2026',
    readMinutes: 7,
    metaTitle: 'Sunrise Borobudur dari Jogja: Jam Berangkat & Kuota — Blog Arasya',
    metaDescription: 'Panduan berangkat dini hari dari Yogyakarta ke Borobudur: pilihan titik sunrise, aturan kuota naik candi, dan rute pulang yang dirangkai searah.',
    excerpt: 'Panduan berangkat dini hari dari Jogja — pilihan titik sunrise, aturan kuota naik candi, dan cara merangkai rute pulang agar hari Anda utuh.',
    sections: [
      { heading: 'Pukul berapa harus meninggalkan Jogja?', paragraphs: [
        'Jarak Yogyakarta–Borobudur sekitar 40 kilometer dengan waktu tempuh 1–1,5 jam. Untuk matahari terbit sekitar pukul 05.30, penjemputan ideal adalah pukul 03.30 — cukup untuk perjalanan, penukaran tiket, dan berjalan menuju titik pandang.',
        'Berangkat dini hari juga berarti jalanan kosong; supir kami biasa menempuh rute Jalan Godean–Kalibawang yang lebih singkat daripada jalur utama Magelang.',
      ] },
      { heading: 'Sunrise dari candi atau dari bukit?', paragraphs: [
        'Menyaksikan fajar dari pelataran atas Borobudur memerlukan paket khusus dengan kuota terbatas yang sebaiknya dipesan jauh hari. Alternatifnya, Punthuk Setumbu menawarkan siluet Borobudur berselimut kabut dari kejauhan dengan tiket yang jauh lebih terjangkau.',
        'Bila kuota candi habis, Anda tetap dapat masuk pelataran setelah jam buka reguler — kombinasikan Setumbu untuk fajar, lalu Borobudur setelahnya.',
      ] },
      { heading: 'Merangkai rute pulang', paragraphs: [
        'Setelah pukul 09.00 agenda utama selesai — terlalu awal untuk kembali. Rangkaian yang kami rekomendasikan: Gereja Ayam Bukit Rhema, sarapan khas tepi Sungai Progo, lalu Candi Pawon dan Mendut yang berada pada poros yang sama.',
        'Kembali ke Jogja melalui Sleman, Anda masih memiliki sore untuk Malioboro atau beristirahat — satu hari penuh tanpa terburu-buru.',
      ], list: [
        'Pesan kuota sunrise candi beberapa hari sebelumnya',
        'Bawa jaket — suhu dini hari 17–20°C',
        'Senter ponsel cukup untuk jalur Punthuk Setumbu',
        'Sarapan setelah sunrise — warung sekitar buka pukul 07.00',
      ] },
    ],
    related: ['itinerari-puncak-satu-hari', 'transportasi-bangkok-keluarga'],
  },

  'transportasi-bangkok-keluarga': {
    slug: 'blog/transportasi-bangkok-keluarga',
    title: 'BTS, Taksi, atau Mobil dengan Supir? Menimbang Transportasi Keluarga di Bangkok',
    category: 'Tips',
    cityKey: 'bangkok',
    cityName: 'Bangkok',
    citySlug: 'sewa-mobil-bangkok',
    cityPreviewHref: '../city-landing/CityLanding.dc.html?city=bangkok',
    author: 'Tim Arasya',
    datePublished: '2026-06-30',
    dateModified: '2026-07-10',
    dateDisplay: '30 Juni 2026',
    updatedDisplay: '10 Juli 2026',
    readMinutes: 5,
    metaTitle: 'Transportasi Keluarga di Bangkok: BTS, Taksi, atau Supir? — Blog Arasya',
    metaDescription: 'Perbandingan moda transportasi Bangkok untuk keluarga Indonesia: kapan BTS/MRT unggul, kapan taksi cukup, dan kapan mobil dengan supir menjadi pilihan masuk akal.',
    excerpt: 'Perbandingan jujur moda transportasi Bangkok untuk keluarga Indonesia — kapan transportasi publik unggul, dan kapan mobil dengan supir menjadi pilihan yang masuk akal.',
    sections: [
      { heading: 'BTS dan MRT: cepat, tetapi tidak ke mana-mana', paragraphs: [
        'Jaringan rel Bangkok andal dan bebas macet, namun cakupannya terbatas pada koridor pusat kota. Grand Palace, pasar terapung, dan Ayutthaya — justru destinasi utama wisatawan — tidak terjangkau rel secara praktis.',
        'Untuk keluarga dengan anak atau orang tua, perpindahan antarmoda dengan tangga dan gerbong padat pada jam sibuk cepat menguras tenaga.',
      ] },
      { heading: 'Taksi dan ride-hailing: layak untuk jarak pendek', paragraphs: [
        'Taksi argo dan aplikasi ride-hailing masuk akal untuk perjalanan pendek antar kawasan. Tantangannya pada perjalanan panjang: komunikasi dalam bahasa Thai, argo yang terus berjalan selama macet, dan kapasitas bagasi yang terbatas untuk rombongan.',
        'Ke luar kota, tarifnya melonjak dan sulit diprediksi — pengeluaran justru menjadi tidak terkendali dibandingkan sewa harian.',
      ] },
      { heading: 'Kapan mobil dengan supir menjadi pilihan masuk akal', paragraphs: [
        'Untuk rombongan empat orang atau lebih dengan agenda lintas kawasan — apalagi keluar kota ke Damnoen Saduak, Ayutthaya, atau Pattaya — satu mobil dengan supir harian memberi kepastian biaya dan waktu.',
        'Dengan Arasya, koordinasi dilakukan admin berbahasa Indonesia: Anda menyampaikan agenda, kami menyusun rute dan jadwal penjemputan dari hotel — tanpa kendala bahasa di jalan.',
      ], list: [
        '1–2 orang, agenda di pusat kota → BTS/MRT',
        'Jarak pendek atau malam hari → taksi argo/aplikasi',
        'Keluarga 4+ atau agenda luar kota → mobil dengan supir',
        'Bandara → hotel: penjemputan terjadwal lebih pasti daripada antrean taksi',
      ] },
    ],
    related: ['itinerari-puncak-satu-hari', 'borobudur-sunrise-dari-jogja'],
  },
};

// --- Content Studio draft overlay (pratinjau browser saja) ---
export const postsBase = JSON.parse(JSON.stringify(posts));
try {
  const _d = JSON.parse(localStorage.getItem('arasya-cms-posts') || 'null');
  if (_d && typeof _d === 'object') for (const k of Object.keys(_d)) { if (_d[k] === null) delete posts[k]; else posts[k] = _d[k]; }
} catch (e) {}
