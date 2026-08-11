export type Role = 'admin' | 'guru' | 'siswa';

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  nama?: string;
  role: Role;
  nuptkOrNisn?: string;
  nipNuptk?: string;
  mataPelajaranId?: string;
  mataPelajaranNama?: string;
  kelasId?: string;
  avatar?: string;
  status?: 'Aktif' | 'Non-Aktif';
}

export interface SchoolSettings {
  namaSekolah: string;
  alamat: string;
  kodePos: string;
  kepalaSekolah: string;
  logoUrl?: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  tahunAkademik?: string;
  semester?: 'Ganjil' | 'Genap';
}

export interface TeacherItem {
  id: string;
  nama: string;
  nuptk: string;
  nipNuptk?: string;
  mengajarMapel: string;
  mataPelajaranIds?: string[];
  mataPelajaranNama?: string;
  email?: string;
  telepon?: string;
  status: 'Aktif' | 'Non-Aktif';
}

export interface StudentItem {
  id: string;
  nama: string;
  nisn: string;
  ttl: string; // Tempat, Tanggal Lahir
  kelasId: string;
  jenisKelamin: 'L' | 'P';
  status: 'Aktif' | 'Non-Aktif';
}

export interface ClassItem {
  id: string;
  namaKelas: string; // e.g. "X IPA 1", "XI IPS 2", "XII IPA 1"
  waliKelas: string;
  jumlahSiswa: number;
}

export interface SubjectItem {
  id: string;
  kode: string;
  namaMapel: string;
  kelompok: 'Wajib' | 'Peminatan' | 'Muatan Lokal';
}

export interface ScheduleItem {
  id: string;
  hari: 'Ahad' | 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';
  jamKe: string; // e.g. "07.00 - 08.00"
  kelasId: string;
  guruId: string;
  mapelId: string;
}

export interface Announcement {
  id: string;
  judul: string;
  isi: string;
  kategori: 'umum' | 'penting';
  tanggal: string;
  pembuat: string;
}

export interface QuestionOption {
  key: 'A' | 'B' | 'C' | 'D' | 'E';
  text: string;
}

export interface Question {
  id: string;
  pertanyaan: string;
  opsi: QuestionOption[]; // 5 choices A-E
  kunciJawaban: 'A' | 'B' | 'C' | 'D' | 'E';
  bobot: number;
}

export interface Assessment {
  id: string;
  judul: string;
  kelasId: string;
  mapelId: string;
  guruId: string;
  createdBy?: string;
  targetSiswaIds?: string[]; // Daftar ID/NISN murid yang dipilih untuk ujian (opsional, jika kosong = semua murid di kelas)
  jumlahSoal: number;
  jenisSoal: string; // Pilihan Ganda 5 Opsi
  waktuMulai: string; // YYYY-MM-DD HH:mm
  lamaUjianMenit: number;
  aktif: boolean;
  soalList: Question[];
}

export interface AssessmentSubmission {
  id: string;
  assessmentId: string;
  siswaId: string;
  siswaNama: string;
  kelasId: string;
  waktuSelesai: string;
  nilai: number;
  jawabanDetail: Record<string, 'A' | 'B' | 'C' | 'D' | 'E'>;
}

export interface TeacherAttendance {
  id: string;
  guruId: string;
  guruNama: string;
  tanggal: string; // YYYY-MM-DD
  jamMasuk: string;
  jamPulang?: string;
  status: 'Hadir' | 'Izin' | 'Sakit' | 'Terlambat';
  lat: number;
  lng: number;
  dalamRadius: boolean;
  fotoBase64?: string;
  catatan?: string;
}

export interface StudentAttendance {
  id: string;
  siswaId: string;
  siswaNama: string;
  kelasId: string;
  tanggal: string; // YYYY-MM-DD
  status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa';
  catatan?: string;
}

export interface TeachingJournal {
  id: string;
  guruId: string;
  guruNama: string;
  tanggal: string; // YYYY-MM-DD
  jamKe: string;
  kelasId: string;
  mapelId: string;
  materi: string;
  catatanSiswa: string;
}

export interface GradeRecord {
  id: string;
  siswaId: string;
  siswaNama: string;
  kelasId: string;
  mapelId: string;
  asesmen1: number;
  asesmen2: number;
  asesmen3: number;
  asas: number; // Asesmen Sumatif Akhir Semester
  nilaiAkhir: number;
}

export interface LibraryBook {
  id: string;
  judul: string;
  pengarang: string;
  penerbit: string;
  kategori: string;
  tahunTerbit: number;
  stok: number;
  coverColor: string;
  ringkasan: string;
  filePdfDemoUrl?: string;
}

export type CalendarEventType = 'jam_mengajar' | 'rapat_orang_tua' | 'kegiatan_sekolah' | 'lainnya';

export interface CalendarEvent {
  id: string;
  judul: string;
  deskripsi?: string;
  tanggal: string; // YYYY-MM-DD
  jamMulai?: string; // HH:mm format, e.g. "08:00"
  jamSelesai?: string; // HH:mm format, e.g. "10:00"
  tipe: CalendarEventType;
  lokasi?: string;
  penanggungJawab?: string;
  warna?: 'emerald' | 'amber' | 'indigo' | 'rose' | 'purple' | 'cyan';
}

