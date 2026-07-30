// Arasya Rent Car — pSEO city registry.
// One entry = one static landing page (see PSEO-HANDOFF.md).
// Copy rules: Bahasa Indonesia formal-premium ("Anda"), no hype, keyword in h1/metaTitle.

export const cities = {
  bogor: {
    slug: 'sewa-mobil-bogor',
    name: 'Bogor',
    code: 'BGR',
    pageType: 'city', // 'city' | 'region' | 'country'
    template: 'city', // which .dc.html renders this entry
    variant: 'navy', // layout variant within that template
    country: 'ID',
    heroImage: '../city-landing/assets/images/bogor/hero-bogor.webp',
    h1: 'Sewa Mobil Bogor dengan Supir',
    heroSubtitle:
      'Layanan sewa mobil premium dengan supir profesional untuk perjalanan bisnis, wisata, dan keluarga — melayani Bogor, Puncak, dan rute luar kota.',
    heroStat: '14 unit armada · Tarif Dalam Kota & All-in · Support admin 24/7',
    metaTitle: 'Sewa Mobil Bogor dengan Supir — Arasya Rent Car',
    metaDescription:
      'Sewa mobil premium dengan supir profesional di Bogor. Tarif transparan Dalam Kota 12 jam atau All-in, melayani Bogor, Puncak, dan rute luar kota. Pesan via WhatsApp.',
    trustRouteDesc: 'Tertib, tepat waktu, dan memahami rute Bogor–Puncak.',
    serviceLine: 'Bogor, Puncak, dan rute luar kota',
    editorial: {
      eyebrow: 'Mengenal Bogor',
      title: 'Kota Hujan di kaki Gunung Salak',
      lead: 'Berjarak sekitar 60 kilometer dari Jakarta, Bogor dikenal sebagai Kota Hujan — kota sejuk di kaki Gunung Salak yang menjadi gerbang utama menuju kawasan wisata Puncak.',
      paragraphs: [
        'Karakter jalannya menuntut pengalaman: rute menanjak dan berkelok menuju Puncak, sistem satu arah yang diberlakukan pada akhir pekan, serta curah hujan yang tinggi hampir sepanjang tahun. Di sinilah peran supir yang memahami medan menjadi penentu kenyamanan perjalanan Anda.',
        'Supir Arasya mengenal rute alternatif, jam-jam padat, dan titik penjemputan strategis di seluruh Bogor — sehingga Anda dapat fokus pada agenda perjalanan, bukan pada kemacetan.',
      ],
    },
    destinationsSubtitle: 'Sampaikan tujuan Anda — supir kami yang mengatur rute terbaiknya.',
    destinations: [
      { area: 'Pusat Kota', name: 'Kebun Raya Bogor', image: '../city-landing/assets/images/bogor/kebun-raya-bogor.webp', description: 'Kebun botani bersejarah sejak 1817 dengan ribuan spesies tanaman tropis, tepat di jantung kota.' },
      { area: 'Cisarua', name: 'Kawasan Puncak', image: '../city-landing/assets/images/bogor/puncak-kebun-teh.webp', description: 'Hamparan kebun teh dan udara pegunungan yang sejuk — rute berkelok yang paling nyaman ditempuh bersama supir berpengalaman.' },
      { area: 'Cisarua', name: 'Taman Safari Indonesia', image: '../city-landing/assets/images/bogor/taman-safari.webp', description: 'Taman konservasi satwa keluarga di lereng Gunung Gede — mobil pribadi dengan supir memudahkan safari berkeliling.' },
      { area: 'Pusat Kota', name: 'Jalan Suryakencana', image: '../city-landing/assets/images/bogor/suryakancana.webp', description: 'Pusat kuliner legendaris Bogor — soto mie, asinan, dan toge goreng di sepanjang kawasan pecinan.' },
      { area: 'Babakan Madang', name: 'Kawasan Sentul', image: '../city-landing/assets/images/bogor/sentul.webp', description: 'Perbukitan, air terjun, dan destinasi keluarga di sisi timur Bogor, mudah dijangkau melalui tol Jagorawi.' },
      { area: 'Bogor Barat', name: 'Situ Gede', description: 'Danau tenang di tepi hutan penelitian — pilihan tepat untuk pagi yang teduh sebelum menjelajah kota.' },
    ],
    outOfTownExamples: 'Puncak, Jakarta, atau Bandung',
    pickupPoints: 'Stasiun Bogor, kawasan Puncak, dan hotel tempat Anda menginap',
    areaServed: ['Bogor', 'Puncak', 'Cisarua', 'Sentul', 'Jabodetabek'],
    routes: [
      { to: 'Jakarta', duration: '±1,5–2 jam', note: 'Via Tol Jagorawi — antar-jemput Bandara Soekarno-Hatta tersedia.' },
      { to: 'Bandung', duration: '±3 jam', note: 'Via Tol Cipularang atau jalur Puncak–Cianjur.' },
      { to: 'Puncak & Cipanas', duration: '±1–2 jam', note: 'Menyesuaikan jadwal sistem satu arah akhir pekan.' },
      { to: 'Sukabumi & Pelabuhan Ratu', duration: '±2,5–3 jam', note: 'Jalur selatan menuju pantai dan Geopark Ciletuh.' },
    ],
    faqExtra: [],
  },

  yogyakarta: {
    slug: 'sewa-mobil-yogyakarta',
    name: 'Yogyakarta',
    code: 'JOG',
    pageType: 'region',
    template: 'region',
    variant: 'peta',
    country: 'ID',
    h1: 'Sewa Mobil Yogyakarta dengan Supir',
    heroSubtitle:
      'Layanan sewa mobil premium dengan supir profesional untuk wisata dan bisnis — melayani Kota Jogja, Sleman, Bantul, Gunungkidul, hingga Borobudur.',
    heroStat: 'Tarif transparan · Konfirmasi cepat · Support admin 24/7',
    metaTitle: 'Sewa Mobil Yogyakarta (Jogja) dengan Supir — Arasya Rent Car',
    metaDescription:
      'Sewa mobil dengan supir profesional di Yogyakarta. Tarif transparan, melayani Malioboro, Prambanan, Borobudur, hingga pantai Gunungkidul. Pesan via WhatsApp.',
    trustRouteDesc: 'Tertib, tepat waktu, dan memahami rute Jogja hingga Borobudur.',
    serviceLine: 'Yogyakarta, Sleman, Bantul, Gunungkidul, hingga Borobudur',
    editorial: {
      eyebrow: 'Mengenal Yogyakarta',
      title: 'Daerah Istimewa dengan destinasi yang tersebar luas',
      lead: 'Yogyakarta memadukan keraton, candi warisan dunia, dan garis pantai selatan dalam satu wilayah — paling nyaman dijelajahi dengan mobil pribadi bersama supir.',
      paragraphs: [
        'Jarak antardestinasi cukup jauh dan karakternya beragam: jalur berkelok menuju perbukitan Gunungkidul, kawasan Malioboro dan Keraton yang padat dengan kantong parkir terbatas, hingga rute lintas kabupaten menuju Borobudur di Magelang. Tanpa perencanaan, waktu Anda habis di perjalanan.',
        'Supir Arasya menyusun urutan kunjungan yang efisien, memahami jam-jam padat, dan mengenal titik penjemputan di Bandara YIA, Stasiun Tugu, maupun hotel Anda — sehingga agenda wisata maupun bisnis berjalan sesuai rencana.',
      ],
    },
    destinationsSubtitle: 'Sampaikan tujuan Anda — supir kami menyusun urutan kunjungan yang efisien.',
    destinations: [
      { area: 'Pusat Kota', name: 'Malioboro & Titik Nol', description: 'Poros wisata utama Jogja — belanja, kuliner, dan bangunan kolonial dalam satu kawasan pedestrian.' },
      { area: 'Pusat Kota', name: 'Keraton & Tamansari', description: 'Kompleks istana Kesultanan Yogyakarta beserta bekas taman pemandian kerajaan yang ikonik.' },
      { area: 'Sleman', name: 'Candi Prambanan', description: 'Kompleks candi Hindu terbesar di Indonesia, situs warisan dunia UNESCO di sisi timur Jogja.' },
      { area: 'Magelang', name: 'Candi Borobudur', description: 'Candi Buddha terbesar di dunia — sekitar 1,5 jam berkendara dari pusat kota, ideal berangkat pagi.' },
      { area: 'Bantul', name: 'Pantai Parangtritis', description: 'Pantai selatan legendaris dengan gumuk pasir Parangkusumo — sekitar satu jam dari pusat kota.' },
      { area: 'Gunungkidul', name: 'HeHa Sky View & Pantai Selatan', description: 'Panorama perbukitan dan deretan pantai berpasir putih — rute berkelok yang menuntut supir berpengalaman.' },
    ],
    outOfTownExamples: 'Borobudur, Solo, atau Semarang',
    pickupPoints: 'Bandara YIA, Stasiun Tugu, dan hotel tempat Anda menginap',
    areaServed: ['Yogyakarta', 'Sleman', 'Bantul', 'Gunungkidul', 'Kulon Progo', 'Magelang'],
    routes: [
      { to: 'Borobudur (Magelang)', duration: '±1,5 jam', note: 'Ideal berangkat pagi untuk sunrise atau kuota naik candi.' },
      { to: 'Solo', duration: '±2 jam', note: 'Via tol — sekaligus kunjungan Keraton Surakarta.' },
      { to: 'Semarang', duration: '±3 jam', note: 'Via Tol Trans-Jawa, sesuai untuk agenda bisnis.' },
      { to: 'Pantai Gunungkidul', duration: '±2 jam', note: 'Rute berkelok menuju deretan pantai selatan.' },
    ],
    faqExtra: [],
  },

  bangkok: {
    slug: 'sewa-mobil-bangkok',
    name: 'Bangkok',
    code: 'BKK',
    pageType: 'city',
    template: 'city',
    variant: 'terang',
    country: 'TH',
    h1: 'Sewa Mobil Bangkok dengan Supir',
    heroSubtitle:
      'Mobil pribadi dengan supir untuk wisatawan Indonesia di Bangkok — penjemputan bandara, city tour, dan rute luar kota, dengan pendampingan admin dalam Bahasa Indonesia.',
    heroStat: 'Penjemputan bandara · Admin berbahasa Indonesia · Support 24/7',
    metaTitle: 'Sewa Mobil Bangkok dengan Supir — Arasya Rent Car',
    metaDescription:
      'Sewa mobil dengan supir di Bangkok untuk wisatawan Indonesia. Penjemputan Suvarnabhumi & Don Mueang, city tour, rute Pattaya dan Ayutthaya. Pesan via WhatsApp.',
    trustRouteDesc: 'Memahami rute dan jam padat Bangkok hingga rute luar kota.',
    serviceLine: 'Bangkok dan rute wisata Thailand',
    editorial: {
      eyebrow: 'Mengenal Bangkok',
      title: 'Metropolitan di tepi Chao Phraya',
      lead: 'Bangkok adalah pintu masuk utama Thailand — kota metropolitan di tepi Sungai Chao Phraya dengan lalu lintas yang padat dan destinasi yang tersebar luas.',
      paragraphs: [
        'Bagi wisatawan Indonesia, tantangannya bukan pada destinasi, melainkan mobilitas: kendala bahasa, tarif taksi yang tidak pasti, dan jarak antartempat yang jauh. Mobil pribadi dengan supir menjadikan perjalanan keluarga maupun bisnis jauh lebih terkendali.',
        'Supir kami memahami rute dan jam-jam padat Bangkok, sementara admin kami mendampingi Anda dalam Bahasa Indonesia — sejak penjemputan di Suvarnabhumi atau Don Mueang hingga kembali ke hotel.',
      ],
    },
    destinationsSubtitle: 'Sampaikan rencana Anda — kami susun rute dan jadwal penjemputannya.',
    destinations: [
      { area: 'Phra Nakhon', name: 'Grand Palace & Wat Phra Kaew', description: 'Istana kerajaan Thailand dan kuil Buddha Zamrud — destinasi paling ikonik di Bangkok.' },
      { area: 'Thonburi', name: 'Wat Arun', description: 'Kuil Fajar di tepi Chao Phraya, paling memukau menjelang matahari terbenam.' },
      { area: 'Chatuchak', name: 'Chatuchak Weekend Market', description: 'Salah satu pasar akhir pekan terbesar di dunia dengan ribuan kios belanja dan kuliner.' },
      { area: 'Charoen Krung', name: 'Asiatique The Riverfront', description: 'Kawasan belanja dan kuliner tepi sungai — nyaman dikunjungi pada malam hari.' },
      { area: 'Ratchaburi', name: 'Pasar Terapung Damnoen Saduak', description: 'Pasar terapung legendaris sekitar 1,5 jam dari kota — ideal berangkat pagi bersama supir.' },
      { area: 'Min Buri', name: 'Safari World Bangkok', description: 'Taman safari dan marine park favorit keluarga di sisi timur laut Bangkok.' },
    ],
    outOfTownExamples: 'Pattaya, Ayutthaya, atau Hua Hin',
    pickupPoints: 'Bandara Suvarnabhumi, Don Mueang, dan hotel tempat Anda menginap',
    areaServed: ['Bangkok', 'Pattaya', 'Ayutthaya'],
    routes: [
      { to: 'Pattaya', duration: '±2 jam', note: 'Kota pantai populer di tepi Teluk Thailand.' },
      { to: 'Ayutthaya', duration: '±1,5 jam', note: 'Situs warisan dunia bekas ibu kota Kerajaan Siam.' },
      { to: 'Hua Hin', duration: '±3 jam', note: 'Kota resor tepi laut favorit keluarga.' },
      { to: 'Khao Yai', duration: '±2,5 jam', note: 'Taman nasional dan kawasan perkebunan anggur.' },
    ],
    faqExtra: [
      {
        question: 'Apakah supir di Bangkok dapat berbahasa Indonesia?',
        answer: 'Koordinasi pemesanan dilakukan admin kami dalam Bahasa Indonesia. Supir lokal berkomunikasi dalam bahasa Inggris dasar, dan admin kami siap membantu komunikasi selama perjalanan.',
      },
    ],
  },

  bali: {
    slug: 'sewa-mobil-bali',
    name: 'Bali',
    code: 'DPS',
    pageType: 'region',
    template: 'region',
    variant: 'wisata',
    country: 'ID',
    h1: 'Sewa Mobil Bali dengan Supir',
    heroSubtitle:
      'Layanan sewa mobil premium dengan supir profesional di seluruh Bali — penjemputan Bandara Ngurah Rai, wisata keluarga, hingga agenda bisnis di Denpasar.',
    heroStat: 'Penjemputan bandara · Tarif transparan · Support admin 24/7',
    metaTitle: 'Sewa Mobil Bali dengan Supir — Arasya Rent Car',
    metaDescription:
      'Sewa mobil dengan supir profesional di Bali. Penjemputan Bandara Ngurah Rai, melayani Denpasar, Ubud, Uluwatu, hingga Kintamani. Pesan via WhatsApp.',
    trustRouteDesc: 'Memahami rute wisata Bali dari pesisir hingga pegunungan.',
    serviceLine: 'Denpasar, Ubud, Uluwatu, hingga Kintamani',
    editorial: {
      eyebrow: 'Mengenal Bali',
      title: 'Pulau Dewata, dari pesisir hingga kaldera',
      lead: 'Destinasi Bali tersebar dari pantai selatan hingga kaldera Kintamani — dan lalu lintasnya menuntut strategi, terutama di poros Canggu–Seminyak dan Ubud.',
      paragraphs: [
        'Kepadatan di Bali mengikuti arus wisatawan: jalan utama relatif sempit dan banyak destinasi berada di jalur yang sama. Urutan kunjungan yang keliru dapat menghabiskan setengah hari di jalan.',
        'Supir Arasya menyusun rangkaian searah yang efisien — Uluwatu dan pantai selatan dalam satu hari, atau Ubud, Tegalalang, dan Kintamani dalam rangkaian lain — sehingga setiap hari Anda utuh untuk berwisata.',
      ],
    },
    destinationsSubtitle: 'Sampaikan agenda Anda — supir kami menyusun rangkaian searah yang efisien.',
    destinations: [
      { area: 'Gianyar', name: 'Ubud & Tegalalang', description: 'Pusat seni dan budaya Bali dengan terasering sawah yang ikonik.' },
      { area: 'Badung', name: 'Uluwatu', description: 'Pura di atas tebing dengan pertunjukan Kecak menjelang senja.' },
      { area: 'Tabanan', name: 'Tanah Lot', description: 'Pura ikonik di atas batu karang lepas pantai — favorit saat matahari terbenam.' },
      { area: 'Bangli', name: 'Kintamani', description: 'Panorama kaldera Gunung dan Danau Batur dari ketinggian.' },
      { area: 'Badung', name: 'Seminyak & Canggu', description: 'Kawasan pantai, restoran, dan sunset yang paling hidup di Bali.' },
      { area: 'Karangasem', name: 'Lempuyang & Tirta Gangga', description: 'Gerbang ikonik dan taman air kerajaan di sisi timur Bali.' },
    ],
    outOfTownExamples: 'Kintamani, Lempuyang, atau Lovina',
    pickupPoints: 'Bandara I Gusti Ngurah Rai, pelabuhan, dan hotel atau vila Anda',
    areaServed: ['Denpasar', 'Badung', 'Gianyar', 'Ubud', 'Tabanan', 'Karangasem'],
    routes: [
      { to: 'Ubud & Tegalalang', duration: '±1,5 jam', note: 'Dari kawasan Kuta–Seminyak, ideal dirangkai dengan Kintamani.' },
      { to: 'Uluwatu', duration: '±1 jam', note: 'Rangkaian pantai selatan, ditutup pertunjukan Kecak saat senja.' },
      { to: 'Kintamani', duration: '±2 jam', note: 'Panorama kaldera Batur — paling nyaman berangkat pagi.' },
      { to: 'Lempuyang & Tirta Gangga', duration: '±2,5 jam', note: 'Sisi timur Bali — berangkat sebelum pukul enam pagi.' },
    ],
    faqExtra: [],
  },

  thailand: {
    slug: 'sewa-mobil-thailand',
    name: 'Thailand',
    code: 'TH',
    pageType: 'country',
    template: 'country',
    variant: 'concierge',
    country: 'TH',
    h1: 'Sewa Mobil Thailand dengan Supir',
    heroSubtitle:
      'Mobil pribadi dengan supir untuk wisatawan Indonesia di Thailand — dari Bangkok hingga rute antar kota, dengan pendampingan admin berbahasa Indonesia.',
    heroStat: 'Kota layanan: Bangkok · Admin berbahasa Indonesia · Support 24/7',
    metaTitle: 'Sewa Mobil Thailand dengan Supir — Arasya Rent Car',
    metaDescription:
      'Sewa mobil dengan supir di Thailand untuk wisatawan Indonesia. Melayani Bangkok, Pattaya, Ayutthaya, dan rute antar kota. Admin berbahasa Indonesia, pesan via WhatsApp.',
    trustRouteDesc: 'Driver lokal terverifikasi dengan standar layanan Arasya.',
    serviceLine: 'Bangkok dan rute antar kota Thailand',
    trust: [
      { preset: 'shield', title: 'Driver Lokal Terverifikasi', description: 'Diseleksi dengan standar layanan Arasya.' },
      { preset: 'phone', title: 'Admin Berbahasa Indonesia', description: 'Pendampingan penuh sejak pemesanan hingga perjalanan selesai.' },
      { preset: 'check', title: 'Harga Transparan', description: 'Penawaran tertulis dalam Rupiah, tanpa biaya tersembunyi.' },
      { preset: 'car', title: 'Unit Sesuai Pesanan', description: 'Kapasitas dan kelas unit sesuai konfirmasi tertulis.' },
    ],
    cityDirectory: [
      { name: 'Bangkok', slug: 'sewa-mobil-bangkok', status: 'Aktif', description: 'City tour, penjemputan Suvarnabhumi & Don Mueang, rute luar kota.' },
      { name: 'Pattaya', slug: null, status: 'Segera', description: 'Kota pantai Teluk Thailand — saat ini dilayani melalui rute dari Bangkok.' },
      { name: 'Phuket', slug: null, status: 'Segera', description: 'Destinasi pulau terpopuler di selatan Thailand.' },
      { name: 'Chiang Mai', slug: null, status: 'Segera', description: 'Kota budaya di utara dengan kuil dan pegunungan.' },
    ],
    editorial: {
      eyebrow: 'Mengenal Thailand',
      title: 'Negeri Gajah Putih untuk wisatawan Indonesia',
      lead: 'Thailand adalah destinasi luar negeri terpopuler wisatawan Indonesia — bebas visa dan penerbangan singkat, namun dengan kendala bahasa dan transportasi antarkota yang kurang ramah keluarga.',
      paragraphs: [
        'Transportasi publik Bangkok tidak menjangkau destinasi seperti Damnoen Saduak, Ayutthaya, atau Pattaya secara praktis — dan taksi antarkota menuntut negosiasi dalam bahasa Thai.',
        'Dengan layanan Arasya, satu mobil dan supir yang sama mendampingi Anda sejak mendarat hingga kembali ke bandara — seluruhnya dikoordinasikan admin kami dalam Bahasa Indonesia.',
      ],
    },
    destinationsSubtitle: 'Destinasi lintas kota yang dapat dirangkai dalam satu itinerari.',
    destinations: [
      { area: 'Bangkok', name: 'Grand Palace & Wat Arun', description: 'Ikon kerajaan Thailand di tepi Sungai Chao Phraya.' },
      { area: 'Ratchaburi', name: 'Damnoen Saduak', description: 'Pasar terapung legendaris — ideal berangkat pagi dari Bangkok.' },
      { area: 'Ayutthaya', name: 'Kota Tua Ayutthaya', description: 'Reruntuhan ibu kota Kerajaan Siam, situs warisan dunia UNESCO.' },
      { area: 'Chonburi', name: 'Pattaya', description: 'Kota pantai dengan taman hiburan dan wisata keluarga.' },
      { area: 'Prachuap Khiri Khan', name: 'Hua Hin', description: 'Kota resor tepi laut kediaman musim panas kerajaan.' },
      { area: 'Nakhon Ratchasima', name: 'Khao Yai', description: 'Taman nasional dan kawasan perkebunan anggur di dataran tinggi.' },
    ],
    outOfTownExamples: 'Pattaya, Ayutthaya, atau Hua Hin',
    pickupPoints: 'Bandara Suvarnabhumi, Don Mueang, dan hotel Anda',
    areaServed: ['Bangkok', 'Pattaya', 'Ayutthaya', 'Hua Hin'],
    routes: [
      { to: 'Bangkok → Pattaya', duration: '±2 jam', note: 'Kota pantai populer di tepi Teluk Thailand.' },
      { to: 'Bangkok → Ayutthaya', duration: '±1,5 jam', note: 'Situs warisan dunia bekas ibu kota Kerajaan Siam.' },
      { to: 'Bangkok → Hua Hin', duration: '±3 jam', note: 'Kota resor tepi laut favorit keluarga.' },
      { to: 'Bangkok → Khao Yai', duration: '±2,5 jam', note: 'Taman nasional dan kawasan perkebunan anggur.' },
    ],
    faqExtra: [
      {
        question: 'Apakah supir di Thailand dapat berbahasa Indonesia?',
        answer: 'Koordinasi pemesanan dilakukan admin kami dalam Bahasa Indonesia. Supir lokal berkomunikasi dalam bahasa Inggris dasar, dan admin kami siap membantu komunikasi selama perjalanan.',
      },
      {
        question: 'Apakah pembayaran dalam Rupiah?',
        answer: 'Ya. Penawaran dan pembayaran dilakukan dalam Rupiah ke rekening resmi kami di Indonesia, sehingga Anda tidak perlu menghitung kurs sendiri.',
      },
    ],
  },

  malaysia: {
    slug: 'sewa-mobil-malaysia',
    name: 'Malaysia',
    code: 'MY',
    pageType: 'country',
    template: 'country',
    variant: 'direktori',
    country: 'MY',
    h1: 'Sewa Mobil Malaysia dengan Supir',
    heroSubtitle:
      'Mobil pribadi dengan supir untuk wisatawan Indonesia di Malaysia — Kuala Lumpur, Genting, Malaka, hingga Penang, dengan pendampingan admin berbahasa Indonesia.',
    heroStat: 'Kota layanan: Kuala Lumpur · Admin berbahasa Indonesia · Support 24/7',
    metaTitle: 'Sewa Mobil Malaysia dengan Supir — Arasya Rent Car',
    metaDescription:
      'Sewa mobil dengan supir di Malaysia untuk wisatawan Indonesia. Melayani Kuala Lumpur, Genting, Malaka, dan Penang. Penawaran dalam Rupiah, pesan via WhatsApp.',
    trustRouteDesc: 'Driver lokal terverifikasi dengan standar layanan Arasya.',
    serviceLine: 'Kuala Lumpur dan rute antar kota Malaysia',
    trust: [
      { preset: 'shield', title: 'Driver Lokal Terverifikasi', description: 'Diseleksi dengan standar layanan Arasya.' },
      { preset: 'phone', title: 'Admin Berbahasa Indonesia', description: 'Pendampingan penuh sejak pemesanan hingga perjalanan selesai.' },
      { preset: 'check', title: 'Harga Transparan', description: 'Penawaran tertulis dalam Rupiah, tanpa biaya tersembunyi.' },
      { preset: 'car', title: 'Unit Sesuai Pesanan', description: 'Kapasitas dan kelas unit sesuai konfirmasi tertulis.' },
    ],
    cityDirectory: [
      { name: 'Kuala Lumpur', slug: null, status: 'Aktif', description: 'City tour, penjemputan KLIA, dan rute antar kota dari ibu kota.' },
      { name: 'Malaka', slug: null, status: 'Segera', description: 'Kota bersejarah warisan dunia di pesisir selat.' },
      { name: 'Penang', slug: null, status: 'Segera', description: 'George Town dan wisata kuliner di utara Malaysia.' },
      { name: 'Johor Bahru', slug: null, status: 'Segera', description: 'Gerbang selatan — Legoland dan akses Singapura.' },
    ],
    editorial: {
      eyebrow: 'Mengenal Malaysia',
      title: 'Negeri serumpun yang mudah dijelajahi',
      lead: 'Malaysia terasa akrab bagi wisatawan Indonesia — bahasa serumpun dan kuliner yang familiar — namun destinasi terbaiknya tersebar antar kota dan dataran tinggi.',
      paragraphs: [
        'Genting dan Cameron Highlands menuntut rute pegunungan, Malaka dan Penang berjarak ratusan kilometer dari ibu kota — kereta dan bus memakan waktu serta membatasi bagasi keluarga.',
        'Dengan supir Arasya, itinerari lintas kota tersusun efisien: satu mobil sejak penjemputan KLIA, dengan koordinasi admin dalam Bahasa Indonesia.',
      ],
    },
    destinationsSubtitle: 'Destinasi lintas kota yang dapat dirangkai dalam satu itinerari.',
    destinations: [
      { area: 'Kuala Lumpur', name: 'Menara Petronas & KLCC', description: 'Ikon kota kembar tertinggi di dunia dengan taman dan galeri.' },
      { area: 'Selangor', name: 'Batu Caves', description: 'Kuil gua Hindu dengan tangga warna-warni yang ikonik.' },
      { area: 'Pahang', name: 'Genting Highlands', description: 'Resor dataran tinggi dengan taman hiburan dan udara sejuk.' },
      { area: 'Malaka', name: 'Kota Tua Malaka', description: 'Jonker Street dan warisan kolonial di situs warisan dunia.' },
      { area: 'Penang', name: 'George Town', description: 'Mural, rumah peranakan, dan surga kuliner di utara.' },
      { area: 'Pahang', name: 'Cameron Highlands', description: 'Kebun teh dan perkebunan stroberi di dataran tinggi.' },
    ],
    outOfTownExamples: 'Genting, Malaka, atau Penang',
    pickupPoints: 'KLIA 1 & 2, KL Sentral, dan hotel Anda',
    areaServed: ['Kuala Lumpur', 'Selangor', 'Genting', 'Malaka', 'Penang'],
    routes: [
      { to: 'Kuala Lumpur → Genting Highlands', duration: '±1 jam', note: 'Resor dataran tinggi — berangkat pagi menghindari kabut sore.' },
      { to: 'Kuala Lumpur → Malaka', duration: '±2 jam', note: 'Kota bersejarah — nyaman untuk perjalanan sehari.' },
      { to: 'Kuala Lumpur → Cameron Highlands', duration: '±3 jam', note: 'Kebun teh dan udara sejuk pegunungan.' },
      { to: 'Kuala Lumpur → Penang', duration: '±4 jam', note: 'George Town — ideal menginap satu malam.' },
    ],
    faqExtra: [
      {
        question: 'Apakah komunikasi dengan supir mudah?',
        answer: 'Ya. Admin kami berbahasa Indonesia, dan mayoritas driver di Malaysia memahami Bahasa Melayu yang serumpun dengan Bahasa Indonesia.',
      },
      {
        question: 'Apakah pembayaran dalam Rupiah?',
        answer: 'Ya. Penawaran dan pembayaran dilakukan dalam Rupiah ke rekening resmi kami di Indonesia, sehingga Anda tidak perlu menghitung kurs sendiri.',
      },
    ],
  },
};

// --- Content Studio draft overlay (pratinjau browser saja) ---
// Draf yang disimpan ../content-studio/ContentStudio.dc.html digabung di sini
// sehingga seluruh pratinjau template ikut berubah. Produksi memakai objek statis di atas.
export const citiesBase = JSON.parse(JSON.stringify(cities));
try {
  const _d = JSON.parse(localStorage.getItem('arasya-cms-cities') || 'null');
  if (_d && typeof _d === 'object') for (const k of Object.keys(_d)) { if (_d[k] === null) delete cities[k]; else cities[k] = _d[k]; }
} catch (e) {}
