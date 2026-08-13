import {
  SchoolSettings,
  TeacherItem,
  StudentItem,
  ClassItem,
  SubjectItem,
  ScheduleItem,
  Announcement,
  Assessment,
  TeacherAttendance,
  StudentAttendance,
  TeachingJournal,
  GradeRecord,
  LibraryBook,
  User,
  CalendarEvent
} from '../types';

export const defaultSettings: SchoolSettings = {
  namaSekolah: 'MAS AL-AMIEN I PRAGAAN',
  alamat: 'Jl. Pamekasan-Sumenep No. 2A Prenduan Pragaan Sumenep',
  kodePos: '69465',
  kepalaSekolah: 'SYAIFUDIN KUDSI, SHI. MA.',
  tahunAkademik: '2026/2027',
  semester: 'Ganjil',
  logoUrl: '/logo.png',
  latitude: -7.108657,
  longitude: 113.669191,
  radiusMeters: 100,
};

export const defaultUsers: User[] = [
  {
    id: 'usr-admin',
    username: 'admin',
    password: 'admin#123',
    name: 'Administrator Madrasah',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    status: 'Aktif',
  },
];

export const defaultTeachers: TeacherItem[] = [];

export const defaultClasses: ClassItem[] = [];

export const defaultStudents: StudentItem[] = [];

export const defaultSubjects: SubjectItem[] = [];

export const defaultSchedules: ScheduleItem[] = [];

export const defaultAnnouncements: Announcement[] = [
  {
    id: 'ann-1',
    judul: 'Pelaksanaan Asesmen Sumatif Akhir Semester (ASAS) Genap',
    isi: 'Diberitahukan kepada seluruh siswa MAS AL-AMIEN I PRAGAAN bahwa ASAS akan dilaksanakan mulai tanggal 10 Agustus 2026. Mohon mempersiapkan fisik dan mental serta menjaga kedisiplinan belajar.',
    kategori: 'penting',
    tanggal: '2026-08-01',
    pembuat: 'Administrator Madrasah',
  },
  {
    id: 'ann-2',
    judul: 'Kegiatan Istighotsah Rutin dan Kajian Kitab',
    isi: 'Seluruh civitas akademika wajib menghadiri kegiatan Istighotsah dan Kajian Kitab Ta\'lim Muta\'allim setiap hari Jumat pagi pukul 06.30 WIB di Masjid Al-Amien.',
    kategori: 'umum',
    tanggal: '2026-07-28',
    pembuat: 'SYAIFUDIN KUDSI, SHI. MA.',
  },
  {
    id: 'ann-3',
    judul: 'Pengembalian dan Peminjaman Buku Cetak Perpustakaan',
    isi: 'Bagi siswa kelas XII yang ingin meminjam modul latihan ujian nasional/SNBT disilakan mendatangi Perpustakaan Madrasah pada jam istirahat.',
    kategori: 'umum',
    tanggal: '2026-07-25',
    pembuat: 'Tim Perpustakaan',
  },
];

export const defaultAssessments: Assessment[] = [];

export const defaultTeacherAttendances: TeacherAttendance[] = [];

export const defaultStudentAttendances: StudentAttendance[] = [];

export const defaultTeachingJournals: TeachingJournal[] = [];

export const defaultGradeRecords: GradeRecord[] = [];

export const defaultLibraryBooks: LibraryBook[] = [
  {
    id: 'bk-1',
    judul: 'Kitab Fiqih Al-Wadhih Juz 3',
    pengarang: 'Dr. Mahmud Yunus',
    penerbit: 'PT Hidakarya Surabaya',
    kategori: 'Keagamaan',
    tahunTerbit: 2021,
    stok: 45,
    coverColor: 'from-emerald-600 to-teal-800',
    ringkasan: 'Panduan fiqih Ibadah dan Muamalah tingkat Aliyah terpadu.',
    filePdfDemoUrl: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf',
  },
  {
    id: 'bk-2',
    judul: 'Panduan Belajar Bahasa Arab Modern Kurikulum Merdeka',
    pengarang: 'Ahmad Zaini, S.Pd.I & Tim Kemag',
    penerbit: 'Penerbit Pustaka Madrasah',
    kategori: 'Bahasa',
    tahunTerbit: 2023,
    stok: 60,
    coverColor: 'from-blue-600 to-indigo-800',
    ringkasan: 'Modul qiraah, kitabah, muhadatsah dan analisis tarkib grammar Arab.',
  },
  {
    id: 'bk-3',
    judul: 'Fisika Terapan untuk SMA/MA Kelas XII',
    pengarang: 'Prof. Bambang Supriadi',
    penerbit: 'Erlangga',
    kategori: 'Sains',
    tahunTerbit: 2022,
    stok: 35,
    coverColor: 'from-amber-600 to-orange-800',
    ringkasan: 'Membahas elektromagnetik, optik kuantum, dan aplikasi energi terbarukan.',
  },
  {
    id: 'bk-4',
    judul: 'Ta\'lim Muta\'allim (Terjemah & Syarah)',
    pengarang: 'Syaikh Az-Zarnuji',
    penerbit: 'Pustaka Tebuireng',
    kategori: 'Akhlak & Keagamaan',
    tahunTerbit: 2020,
    stok: 50,
    coverColor: 'from-purple-600 to-slate-900',
    ringkasan: 'Panduan etika pencari ilmu dan keberkahan hubungan santri dan guru.',
  },
  {
    id: 'bk-5',
    judul: 'Matematika Peminatan & Kalkulus Tingkat Lanjut',
    pengarang: 'Drs. Sukino',
    penerbit: 'Yrama Widya',
    kategori: 'Matematika',
    tahunTerbit: 2023,
    stok: 28,
    coverColor: 'from-cyan-600 to-blue-900',
    ringkasan: 'Materi turunan, integral, turunan trigonometri dan latihan soal persiapan UTBK.',
  },
];

export const defaultCalendarEvents: CalendarEvent[] = [];


