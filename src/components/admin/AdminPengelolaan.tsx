import React, { useState, useRef } from 'react';
import { matchClass, matchTeacher, getDisplayClassName } from '../../lib/matchUtils';
import {
  TeacherItem,
  StudentItem,
  ClassItem,
  SubjectItem,
  LibraryBook,
  User,
  SchoolSettings,
  ScheduleItem,
  CalendarEvent
} from '../../types';
import {
  Users,
  GraduationCap,
  School,
  BookOpen,
  BookMarked,
  Plus,
  Trash2,
  Edit,
  Download,
  Upload,
  Search,
  CheckCircle2,
  CalendarCheck,
  Check,
  X,
  Filter,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { exportToExcel } from '../../lib/exportUtils';
import { storageService } from '../../lib/storage';
import * as XLSX from 'xlsx';
import { parseEntireWorkbook, extractExcelValue } from '../../lib/excelParser';

interface AdminPengelolaanProps {
  teachers: TeacherItem[];
  setTeachers: React.Dispatch<React.SetStateAction<TeacherItem[]>>;
  students: StudentItem[];
  setStudents: React.Dispatch<React.SetStateAction<StudentItem[]>>;
  classes: ClassItem[];
  setClasses: React.Dispatch<React.SetStateAction<ClassItem[]>>;
  subjects: SubjectItem[];
  setSubjects: React.Dispatch<React.SetStateAction<SubjectItem[]>>;
  libraryBooks: LibraryBook[];
  setLibraryBooks: React.Dispatch<React.SetStateAction<LibraryBook[]>>;
  users?: User[];
  setUsers?: React.Dispatch<React.SetStateAction<User[]>>;
  settings?: SchoolSettings;
  setSettings?: React.Dispatch<React.SetStateAction<SchoolSettings>>;
  schedules?: ScheduleItem[];
  setSchedules?: React.Dispatch<React.SetStateAction<ScheduleItem[]>>;
  calendarEvents?: CalendarEvent[];
  setCalendarEvents?: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
}

export const AdminPengelolaan: React.FC<AdminPengelolaanProps> = ({
  teachers,
  setTeachers,
  students,
  setStudents,
  classes,
  setClasses,
  subjects,
  setSubjects,
  libraryBooks,
  setLibraryBooks,
  users,
  setUsers,
  settings,
  setSettings,
  schedules = [],
  setSchedules,
  calendarEvents = [],
  setCalendarEvents,
}) => {
  const [subTab, setSubTab] = useState<'guru' | 'siswa' | 'kelas' | 'mapel' | 'bacaan'>('guru');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');

  const teacherFileInputRef = useRef<HTMLInputElement>(null);
  const studentFileInputRef = useRef<HTMLInputElement>(null);
  const classFileInputRef = useRef<HTMLInputElement>(null);
  const subjectFileInputRef = useRef<HTMLInputElement>(null);
  const bookFileInputRef = useRef<HTMLInputElement>(null);

  // --- Modals State ---
  const [showAddModal, setShowAddModal] = useState(false);

  // Edit states for each category
  const [editingGuru, setEditingGuru] = useState<TeacherItem | null>(null);
  const [editingSiswa, setEditingSiswa] = useState<StudentItem | null>(null);
  const [editingKelas, setEditingKelas] = useState<ClassItem | null>(null);
  const [editingMapel, setEditingMapel] = useState<SubjectItem | null>(null);
  const [editingBuku, setEditingBuku] = useState<LibraryBook | null>(null);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Delete modal confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    type: 'guru' | 'siswa' | 'kelas' | 'mapel' | 'buku';
    name: string;
  } | null>(null);

  // Delete all modal state (single category)
  const [deleteAllCategory, setDeleteAllCategory] = useState<'guru' | 'siswa' | 'kelas' | 'mapel' | 'bacaan' | null>(null);

  // Master Delete All Data Modal State (for all 7 categories)
  const [showDeleteAllDataModal, setShowDeleteAllDataModal] = useState(false);
  const [selectedDeleteItems, setSelectedDeleteItems] = useState({
    teachers: true,
    students: true,
    classes: true,
    subjects: true,
    libraryBooks: true,
    schedules: true,
    calendarEvents: true,
  });

  const handleToggleSelectAllDelete = (selectAll: boolean) => {
    setSelectedDeleteItems({
      teachers: selectAll,
      students: selectAll,
      classes: selectAll,
      subjects: selectAll,
      libraryBooks: selectAll,
      schedules: selectAll,
      calendarEvents: selectAll,
    });
  };

  const handleExecuteDeleteAllData = () => {
    const deletedLabels: string[] = [];

    if (selectedDeleteItems.teachers) {
      setTeachers([]);
      storageService.saveTeachers([]);
      if (setUsers) {
        setUsers((prev) => {
          const updated = prev.filter((u) => u.role !== 'guru');
          storageService.saveUsers(updated);
          return updated;
        });
      }
      deletedLabels.push('Guru');
    }

    if (selectedDeleteItems.students) {
      setStudents([]);
      storageService.saveStudents([]);
      if (setUsers) {
        setUsers((prev) => {
          const updated = prev.filter((u) => u.role !== 'siswa');
          storageService.saveUsers(updated);
          return updated;
        });
      }
      deletedLabels.push('Murid');
    }

    if (selectedDeleteItems.classes) {
      setClasses([]);
      storageService.saveClasses([]);
      deletedLabels.push('Kelas');
    }

    if (selectedDeleteItems.subjects) {
      setSubjects([]);
      storageService.saveSubjects([]);
      deletedLabels.push('Mata Pelajaran');
    }

    if (selectedDeleteItems.libraryBooks) {
      setLibraryBooks([]);
      storageService.saveLibraryBooks([]);
      deletedLabels.push('Buku Perpustakaan');
    }

    if (selectedDeleteItems.schedules && setSchedules) {
      setSchedules([]);
      storageService.saveSchedules([]);
      deletedLabels.push('Jadwal Mengajar');
    }

    if (selectedDeleteItems.calendarEvents && setCalendarEvents) {
      setCalendarEvents([]);
      storageService.saveCalendarEvents([]);
      deletedLabels.push('Kalender Kegiatan');
    }

    if (deletedLabels.length > 0) {
      showToast(`Data (${deletedLabels.join(', ')}) berhasil dihapus.`);
    } else {
      showToast('Tidak ada kategori data yang dipilih untuk dihapus.');
    }

    setShowDeleteAllDataModal(false);
  };

  const confirmDeleteAllAction = () => {
    if (!deleteAllCategory) return;
    if (deleteAllCategory === 'guru') {
      setTeachers([]);
      storageService.saveTeachers([]);
      if (setUsers) {
        setUsers((prev) => {
          const updated = prev.filter((u) => u.role !== 'guru');
          storageService.saveUsers(updated);
          return updated;
        });
      }
      showToast('Semua data Guru berhasil dihapus.');
    } else if (deleteAllCategory === 'siswa') {
      setStudents([]);
      storageService.saveStudents([]);
      if (setUsers) {
        setUsers((prev) => {
          const updated = prev.filter((u) => u.role !== 'siswa');
          storageService.saveUsers(updated);
          return updated;
        });
      }
      showToast('Semua data Murid berhasil dihapus.');
    } else if (deleteAllCategory === 'kelas') {
      setClasses([]);
      storageService.saveClasses([]);
      showToast('Semua data Kelas berhasil dihapus.');
    } else if (deleteAllCategory === 'mapel') {
      setSubjects([]);
      storageService.saveSubjects([]);
      showToast('Semua data Mata Pelajaran berhasil dihapus.');
    } else if (deleteAllCategory === 'bacaan') {
      setLibraryBooks([]);
      storageService.saveLibraryBooks([]);
      showToast('Semua data Buku Perpustakaan berhasil dihapus.');
    } else if (deleteAllCategory === 'jadwal') {
      if (setSchedules) setSchedules([]);
      storageService.saveSchedules([], true);
      showToast('Semua data Jadwal Pelajaran berhasil dihapus.');
    }
    setDeleteAllCategory(null);
  };

  const confirmDeleteAction = () => {
    if (!deleteTarget) return;
    const { id, type, name } = deleteTarget;
    if (type === 'guru') {
      const nextTeachers = teachers.filter((t) => t.id !== id);
      setTeachers(nextTeachers);
      storageService.saveTeachers(nextTeachers, true);

      if (setUsers) {
        const currentUsers = users || storageService.getUsers() || [];
        const nextUsers = currentUsers.filter((u) => u.id !== id && u.name !== name && u.nama !== name);
        setUsers(nextUsers);
        storageService.saveUsers(nextUsers, true);
      }
      showToast(`Data Guru '${name}' berhasil dihapus.`);
    } else if (type === 'siswa') {
      const nextStudents = students.filter((s) => s.id !== id);
      setStudents(nextStudents);
      storageService.saveStudents(nextStudents, true);

      if (setUsers) {
        const currentUsers = users || storageService.getUsers() || [];
        const nextUsers = currentUsers.filter((u) => u.id !== id && u.name !== name && u.nama !== name);
        setUsers(nextUsers);
        storageService.saveUsers(nextUsers, true);
      }
      showToast(`Data Siswa '${name}' berhasil dihapus.`);
    } else if (type === 'kelas') {
      const nextClasses = classes.filter((c) => c.id !== id);
      setClasses(nextClasses);
      storageService.saveClasses(nextClasses, true);
      showToast(`Kelas '${name}' berhasil dihapus.`);
    } else if (type === 'mapel') {
      const nextSubjects = subjects.filter((m) => m.id !== id);
      setSubjects(nextSubjects);
      storageService.saveSubjects(nextSubjects, true);
      showToast(`Mata Pelajaran '${name}' berhasil dihapus.`);
    } else if (type === 'buku') {
      const nextBooks = libraryBooks.filter((b) => b.id !== id);
      setLibraryBooks(nextBooks);
      storageService.saveLibraryBooks(nextBooks, true);
      showToast(`Buku '${name}' berhasil dihapus.`);
    }
    setDeleteTarget(null);
  };

  // Update handlers
  const handleUpdateGuru = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuru) return;
    const nextTeachers = teachers.map((t) => (t.id === editingGuru.id ? editingGuru : t));
    setTeachers(nextTeachers);
    storageService.saveTeachers(nextTeachers, true);

    if (setUsers) {
      const currentUsers = users || storageService.getUsers() || [];
      const unameToUse = String(editingGuru.nuptk || editingGuru.nipNuptk || '').toLowerCase().trim();
      const nextUsers = currentUsers.map((u) =>
        u.id === editingGuru.id || (u.role === 'guru' && u.nuptkOrNisn === editingGuru.nuptk)
          ? {
              ...u,
              name: editingGuru.nama,
              nama: editingGuru.nama,
              nuptkOrNisn: editingGuru.nuptk,
              nipNuptk: editingGuru.nuptk,
              username: unameToUse || u.username,
              mataPelajaranNama: editingGuru.mengajarMapel || editingGuru.mataPelajaranNama,
            }
          : u
      );
      setUsers(nextUsers);
      storageService.saveUsers(nextUsers, true);
    }
    showToast(`Perubahan data Guru '${editingGuru.nama}' berhasil disimpan!`);
    setEditingGuru(null);
  };

  const handleUpdateSiswa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSiswa) return;
    setStudents((prev) => prev.map((s) => (s.id === editingSiswa.id ? editingSiswa : s)));
    if (setUsers) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingSiswa.id
            ? { ...u, name: editingSiswa.nama, nuptkOrNisn: editingSiswa.nisn, kelasId: editingSiswa.kelasId }
            : u
        )
      );
    }
    showToast(`Perubahan data Siswa '${editingSiswa.nama}' berhasil disimpan!`);
    setEditingSiswa(null);
  };

  const handleUpdateKelas = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKelas) return;
    setClasses((prev) => prev.map((c) => (c.id === editingKelas.id ? editingKelas : c)));
    showToast(`Perubahan Kelas '${editingKelas.namaKelas}' berhasil disimpan!`);
    setEditingKelas(null);
  };

  const handleUpdateMapel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMapel) return;
    setSubjects((prev) => prev.map((m) => (m.id === editingMapel.id ? editingMapel : m)));
    showToast(`Perubahan Mata Pelajaran '${editingMapel.namaMapel}' berhasil disimpan!`);
    setEditingMapel(null);
  };

  const handleUpdateBuku = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBuku) return;
    setLibraryBooks((prev) => prev.map((b) => (b.id === editingBuku.id ? editingBuku : b)));
    showToast(`Perubahan Buku '${editingBuku.judul}' berhasil disimpan!`);
    setEditingBuku(null);
  };

  // Form states
  const [newGuru, setNewGuru] = useState({
    nama: '',
    nuptk: '',
    mengajarMapel: '',
    email: '',
    telepon: '',
  });

  const [newSiswa, setNewSiswa] = useState({
    nama: '',
    nisn: '',
    ttl: '',
    kelasId: classes[0]?.id || 'cls-12a',
    jenisKelamin: 'L' as 'L' | 'P',
  });

  const [newKelas, setNewKelas] = useState({
    namaKelas: '',
    waliKelas: '',
    jumlahSiswa: 30,
  });

  const [newMapel, setNewMapel] = useState({
    kode: '',
    namaMapel: '',
    kelompok: 'Wajib' as 'Wajib' | 'Peminatan' | 'Muatan Lokal',
  });

  const [newBuku, setNewBuku] = useState({
    judul: '',
    pengarang: '',
    penerbit: '',
    kategori: 'Keagamaan',
    tahunTerbit: 2024,
    stok: 20,
    coverColor: 'from-blue-600 to-indigo-800',
    ringkasan: '',
    filePdfDemoUrl: '',
  });

  // --- HANDLERS ADD ---
  const handleAddGuru = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuru.nama || !newGuru.nuptk) return;
    const added: TeacherItem = {
      id: `guru-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      nama: newGuru.nama.trim(),
      nuptk: newGuru.nuptk.trim(),
      nipNuptk: newGuru.nuptk.trim(),
      mengajarMapel: newGuru.mengajarMapel || 'Mapel Umum',
      mataPelajaranNama: newGuru.mengajarMapel || 'Mapel Umum',
      email: newGuru.email || `${newGuru.nuptk}@al-amien.sch.id`,
      telepon: newGuru.telepon || '08123456789',
      status: 'Aktif',
    };

    const nextTeachers = [...teachers.filter((t) => t.id !== added.id && t.nuptk !== added.nuptk), added];
    setTeachers(nextTeachers);
    storageService.saveTeachers(nextTeachers, true);

    // Automatically generate User Login account
    if (setUsers) {
      const currentUsers = users || storageService.getUsers() || [];
      const newUser: User = {
        id: added.id,
        username: added.nuptk.toString().trim().toLowerCase(),
        password: 'guru123',
        name: added.nama,
        nama: added.nama,
        role: 'guru',
        nuptkOrNisn: added.nuptk,
        nipNuptk: added.nuptk,
        mataPelajaranNama: added.mengajarMapel,
        status: 'Aktif',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
      };
      const nextUsers = [...currentUsers.filter((u) => u.username !== newUser.username && u.id !== newUser.id), newUser];
      setUsers(nextUsers);
      storageService.saveUsers(nextUsers, true);
    }

    setNewGuru({ nama: '', nuptk: '', mengajarMapel: '', email: '', telepon: '' });
    setShowAddModal(false);
  };

  const handleAddSiswa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiswa.nama || !newSiswa.nisn) return;
    const added: StudentItem = {
      id: `sis-${Date.now()}`,
      nama: newSiswa.nama,
      nisn: newSiswa.nisn,
      ttl: newSiswa.ttl || 'Sumenep, 01 Januari 2006',
      kelasId: newSiswa.kelasId,
      jenisKelamin: newSiswa.jenisKelamin,
      status: 'Aktif',
    };
    setStudents((prev) => [...prev, added]);

    // Automatically generate User Login account with generated random password
    if (setUsers) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
      let genPass = '';
      for (let i = 0; i < 8; i++) {
        genPass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const newUser: User = {
        id: added.id,
        username: added.nisn.toString().trim().toLowerCase(),
        password: genPass,
        name: added.nama,
        role: 'siswa',
        nuptkOrNisn: added.nisn,
        kelasId: added.kelasId,
        status: 'Aktif',
        avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80',
      };
      setUsers((prev) => [...prev.filter((u) => u.username !== newUser.username), newUser]);
    }

    setNewSiswa({ nama: '', nisn: '', ttl: '', kelasId: classes[0]?.id || 'cls-12a', jenisKelamin: 'L' });
    setShowAddModal(false);
  };

  const handleAddKelas = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKelas.namaKelas) return;
    const added: ClassItem = {
      id: `cls-${Date.now()}`,
      namaKelas: newKelas.namaKelas,
      waliKelas: newKelas.waliKelas || 'Belum Ditentukan',
      jumlahSiswa: newKelas.jumlahSiswa || 0,
    };
    setClasses((prev) => [...prev, added]);
    setNewKelas({ namaKelas: '', waliKelas: '', jumlahSiswa: 30 });
    setShowAddModal(false);
  };

  const handleAddMapel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMapel.namaMapel) return;
    const added: SubjectItem = {
      id: `sub-${Date.now()}`,
      kode: newMapel.kode || `MP-${Date.now().toString().slice(-3)}`,
      namaMapel: newMapel.namaMapel,
      kelompok: newMapel.kelompok,
    };
    setSubjects((prev) => [...prev, added]);
    setNewMapel({ kode: '', namaMapel: '', kelompok: 'Wajib' });
    setShowAddModal(false);
  };

  const handleAddBuku = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuku.judul) return;
    const added: LibraryBook = {
      id: `bk-${Date.now()}`,
      judul: newBuku.judul,
      pengarang: newBuku.pengarang || 'Tim Penulis',
      penerbit: newBuku.penerbit || 'Pustaka Madrasah',
      kategori: newBuku.kategori || 'Keagamaan',
      tahunTerbit: Number(newBuku.tahunTerbit) || 2024,
      stok: Number(newBuku.stok) || 10,
      coverColor: newBuku.coverColor || 'from-emerald-600 to-teal-800',
      ringkasan: newBuku.ringkasan || 'Modul rujukan bacaan santri MAS AL-AMIEN I PRAGAAN.',
      filePdfDemoUrl: newBuku.filePdfDemoUrl || '',
    };
    setLibraryBooks((prev) => [...prev, added]);
    setNewBuku({
      judul: '',
      pengarang: '',
      penerbit: '',
      kategori: 'Keagamaan',
      tahunTerbit: 2024,
      stok: 20,
      coverColor: 'from-blue-600 to-indigo-800',
      ringkasan: '',
      filePdfDemoUrl: '',
    });
    setShowAddModal(false);
  };

  // --- DELETE HANDLERS ---
  const handleDeleteGuru = (id: string, name: string) => {
    setDeleteTarget({ id, type: 'guru', name });
  };

  const handleDeleteSiswa = (id: string, name: string) => {
    setDeleteTarget({ id, type: 'siswa', name });
  };

  const handleDeleteKelas = (id: string, name: string) => {
    setDeleteTarget({ id, type: 'kelas', name });
  };

  const handleDeleteMapel = (id: string, name: string) => {
    setDeleteTarget({ id, type: 'mapel', name });
  };

  const handleDeleteBuku = (id: string, name: string) => {
    setDeleteTarget({ id, type: 'buku', name });
  };

  // --- TEMPLATES DOWNLOAD & UPLOAD ---
  const downloadTemplateGuru = () => {
    const templateData = [
      {
        Nama: 'H. Moh. Ridwan, S.Ag',
        NUPTK: '198001012005011001',
        Mengajar: 'Fiqih, Usul Fiqih',
        Email: 'ridwan@al-amien.sch.id',
        'Nomer HP': '081234567890',
        User: '198001012005011001',
        Password: '123'
      },
      {
        Nama: 'Drs. Ahmad Fauzi, M.Pd.',
        NUPTK: '197508152002121003',
        Mengajar: 'Matematika Wajib, Fisika',
        Email: 'ahmadfauzi@al-amien.sch.id',
        'Nomer HP': '081234567891',
        User: '197508152002121003',
        Password: '123'
      },
      {
        Nama: 'Ustdzh. Siti Aminah, S.Pd',
        NUPTK: '198502022008022002',
        Mengajar: 'Bahasa Arab',
        Email: 'sitiaminah@al-amien.sch.id',
        'Nomer HP': '081234567892',
        User: '198502022008022002',
        Password: '123'
      },
    ];
    exportToExcel(templateData, 'Template_Data_Guru_MAS_Al_Amien', 'Template Guru', settings, true);
  };

  const downloadTemplateSiswa = () => {
    const templateData = [
      { NISN: '0061112233', Nama: 'Ahmad Mubarok', JenisKelamin: 'L', Kelas: 'XII IPA 1', TTL: 'Sumenep, 10 Maret 2006', User: '0061112233', Password: 'murid123' },
      { NISN: '0064445566', Nama: 'Siti Rahmawati', JenisKelamin: 'P', Kelas: 'XII IPA 2', TTL: 'Pamekasan, 15 Juli 2006', User: '0064445566', Password: 'murid123' },
    ];
    exportToExcel(templateData, 'Template_Data_Siswa_MAS_Al_Amien', 'Template Siswa', settings, true);
  };

  const downloadTemplateKelas = () => {
    const templateData = [
      { NamaKelas: 'X IPA 1', Tingkat: 'X', WaliKelas: teachers[0]?.nama || 'Belum Ditentukan', Ruangan: 'Ruang 101' },
      { NamaKelas: 'XI IPS 2', Tingkat: 'XI', WaliKelas: teachers[1]?.nama || 'Belum Ditentukan', Ruangan: 'Ruang 202' },
    ];
    exportToExcel(templateData, 'Template_Data_Kelas_MAS_Al_Amien', 'Template Kelas', settings, true);
  };

  const downloadTemplateMapel = () => {
    const templateData = [
      { Kode: 'FQH', NamaMapel: 'Fiqih & Usul Fiqih', Kelompok: 'Wajib' },
      { Kode: 'ARB', NamaMapel: 'Bahasa Arab', Kelompok: 'Wajib' },
      { Kode: 'BIG', NamaMapel: 'Bahasa Inggris', Kelompok: 'Peminatan' },
    ];
    exportToExcel(templateData, 'Template_Data_Mapel_MAS_Al_Amien', 'Template Mapel', settings, true);
  };

  const downloadTemplateBuku = () => {
    const templateData = [
      { Judul: 'Kitab Fiqih Al-Wadhih', Pengarang: 'Dr. Mahmud Yunus', Penerbit: 'Pustaka Al-Amien', Kategori: 'Keagamaan', Tahun: 2024, Stok: 30, Ringkasan: 'Panduan fiqih muamalah santri', LinkPDF: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf' },
    ];
    exportToExcel(templateData, 'Template_Daftar_Bacaan_Perpustakaan', 'Template Buku', settings, true);
  };

  // Handle Upload Excel/CSV with Firestore persistence
  const handleUploadGuru = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const inputTarget = e.target;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const sheets = parseEntireWorkbook(wb);

        const allRows: any[] = [];
        sheets.forEach((s) => allRows.push(...s.rows));

        if (allRows.length === 0) {
          showToast('File Excel data Guru kosong atau tidak terbaca!');
          return;
        }

        const validImportedRows: { teacher: TeacherItem; user: User }[] = [];
        const allExistingUsernames = new Set([
          ...(users || []).map((u) => u.username.toLowerCase().trim()),
        ]);

        const isGenericValue = (str: string) => {
          const clean = str.toLowerCase().replace(/[^a-z0-9]/g, '');
          return !clean || ['123', '0', 'nuptk', 'nip', 'user', 'username', 'null', 'undefined', 'dash', '-'].includes(clean);
        };

        allRows.forEach((item, idx) => {
          if (!item || typeof item !== 'object') return;

          let teacherNama = extractExcelValue(item, [
            'Nama Guru',
            'Nama Lengkap',
            'Nama Pendidik',
            'Nama Pengajar',
            'Nama Ustadz',
            'Nama Ustadzah',
            'Nama',
            'Guru',
            'Pengajar',
            'Pendidik',
            'Name',
            'NamaGuru',
            'Pegawai'
          ]).trim();

          // Fallback positional search in raw cells
          if (!teacherNama && Array.isArray(item._rawCells)) {
            for (const cell of item._rawCells) {
              const cVal = String(cell || '').trim();
              if (
                cVal.length >= 2 &&
                /[a-zA-Z]/.test(cVal) &&
                !/^\d+$/.test(cVal) &&
                !/^(no|nomor|nuptk|nip|nik|mapel|guru|pengajar|status|aktif|email)$/i.test(cVal)
              ) {
                teacherNama = cVal;
                break;
              }
            }
          }

          if (!teacherNama || teacherNama.length < 2) return;
          const lowerNama = teacherNama.toLowerCase();
          if (
            lowerNama.includes('yayasan') ||
            lowerNama.includes('madrasah aliyah') ||
            lowerNama.includes('tahun akademik') ||
            lowerNama.includes('daftar guru') ||
            lowerNama.includes('rekap') ||
            lowerNama === 'nama' ||
            lowerNama === 'nama guru'
          ) {
            return;
          }

          let teacherNuptkRaw = extractExcelValue(item, [
            'NUPTK',
            'NIP',
            'NIP/NUPTK',
            'NUPTK/NIP',
            'ID Guru',
            'Username',
            'User'
          ]).replace(/\.0$/, '').trim();

          const uniqueFallbackNuptk = `${Date.now().toString().slice(-6)}${idx}${Math.floor(Math.random() * 900 + 100)}`;
          const teacherNuptk = !isGenericValue(teacherNuptkRaw) ? teacherNuptkRaw : uniqueFallbackNuptk;

          const mapelStr = extractExcelValue(item, [
            'Mengajar',
            'Mapel',
            'Mata Pelajaran',
            'MataPelajaran',
            'Pelajaran',
            'Subject',
            'Bidang'
          ]).trim() || 'Mapel Umum';

          const names = mapelStr
            .split(/[,;&/]/)
            .map((s: string) => (s ? String(s).trim().toLowerCase() : ''))
            .filter(Boolean);

          const matchedIds = (subjects || [])
            .filter((s) => {
              if (!s) return false;
              const sName = (s.namaMapel || s.namaMataPelajaran || '').toLowerCase();
              if (!sName) return false;
              return names.some((n: string) => n && (sName.includes(n) || n.includes(sName)));
            })
            .map((s) => s.id);

          const emailVal =
            extractExcelValue(item, [
              'Email',
              'E-mail',
              'Surel',
              'Alamat Email',
              'Mail',
              'E Mail',
            ]).trim() || `${teacherNuptk}@al-amien.sch.id`;

          const phoneVal =
            extractExcelValue(item, [
              'Nomer HP',
              'Nomor HP',
              'No HP',
              'NoHP',
              'Telepon',
              'No Telepon',
              'Nomor Telepon',
              'Nomer Telepon',
              'HP',
              'WA',
              'Telp',
              'Handphone',
              'Phone',
              'No. HP',
              'No. Telp'
            ]).trim() || '081234567890';

          let customUser = extractExcelValue(item, ['User', 'Username', 'Akun']).toLowerCase().trim().replace(/\.0$/, '');
          const customPass = extractExcelValue(item, ['Password', 'Pass', 'Sandi', 'PIN']).trim() || 'guru123';

          let baseUname = !isGenericValue(customUser)
            ? customUser
            : (!isGenericValue(teacherNuptk) ? teacherNuptk.toLowerCase() : `guru_${idx + 1}`);

          let unameToUse = baseUname;
          let counter = 1;
          while (allExistingUsernames.has(unameToUse)) {
            counter++;
            unameToUse = `${baseUname}_${counter}`;
          }
          allExistingUsernames.add(unameToUse);

          const teacherId = `guru-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`;

          const teacherObj: TeacherItem = {
            id: teacherId,
            nama: teacherNama,
            nipNuptk: teacherNuptk,
            nuptk: teacherNuptk,
            mataPelajaranIds: matchedIds,
            mataPelajaranNama: mapelStr,
            mengajarMapel: mapelStr,
            email: emailVal,
            telepon: phoneVal,
            status: 'Aktif',
          };

          const userObj: User = {
            id: teacherId,
            username: unameToUse,
            password: customPass,
            nama: teacherNama,
            name: teacherNama,
            role: 'guru',
            nipNuptk: teacherNuptk,
            nuptkOrNisn: teacherNuptk,
            mataPelajaranId: matchedIds.length > 0 ? matchedIds[0] : undefined,
            mataPelajaranNama: mapelStr,
            status: 'Aktif',
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
          };

          validImportedRows.push({ teacher: teacherObj, user: userObj });
        });

        if (validImportedRows.length === 0) {
          showToast('Tidak ada data Guru valid yang ditemukan dalam file Excel.');
          return;
        }

        // Upsert Teachers
        let updatedTeachers = [...teachers];
        validImportedRows.forEach(({ teacher: t }) => {
          const cleanName = t.nama.toLowerCase().trim();
          const cleanNuptk = (t.nuptk || t.nipNuptk || '').trim();
          const isRealNuptk = cleanNuptk.length >= 6 && !isGenericValue(cleanNuptk);

          updatedTeachers = updatedTeachers.filter((existing) => {
            if (existing.id === t.id) return false;
            if (existing.nama.toLowerCase().trim() === cleanName) return false;
            const existNuptk = (existing.nuptk || existing.nipNuptk || '').trim();
            if (isRealNuptk && existNuptk === cleanNuptk) return false;
            return true;
          });

          updatedTeachers.push(t);
        });

        setTeachers(updatedTeachers);
        storageService.saveTeachers(updatedTeachers, true);

        // Upsert Users
        const currentUsers = users || storageService.getUsers() || [];
        let updatedUsersList = [...currentUsers];

        validImportedRows.forEach(({ user: uObj, teacher: t }) => {
          const cleanName = t.nama.toLowerCase().trim();
          const cleanNuptk = (t.nuptk || t.nipNuptk || '').trim();

          updatedUsersList = updatedUsersList.filter((u) => {
            if (u.id === uObj.id) return false;
            if (u.username.toLowerCase() === uObj.username.toLowerCase()) return false;
            if (u.role === 'guru') {
              if (u.nama.toLowerCase().trim() === cleanName) return false;
              if (cleanNuptk.length >= 6 && u.nuptkOrNisn === cleanNuptk) return false;
            }
            return true;
          });

          updatedUsersList.push(uObj);
        });

        if (setUsers) {
          setUsers(updatedUsersList);
        }
        storageService.saveUsers(updatedUsersList, true);

        showToast(`Berhasil mengimpor & menyimpan ${validImportedRows.length} data Guru ke Database Cloud Firestore!`);
      } catch (err) {
        console.error('Error importing teachers Excel:', err);
        showToast('Gagal membaca file Excel Guru.');
      } finally {
        inputTarget.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleUploadSiswa = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const inputTarget = e.target;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const sheets = parseEntireWorkbook(wb);

        const allRows: any[] = [];
        sheets.forEach((s) => allRows.push(...s.rows));

        if (allRows.length === 0) {
          showToast('File Excel data Siswa/Murid kosong atau tidak terbaca!');
          return;
        }

        const validImportedRows: { student: StudentItem; row: any }[] = [];
        const allUsernames = new Set([
          ...(users || []).map((u) => u.username.toLowerCase().trim()),
        ]);

        let currentClasses = [...classes];
        let classesUpdated = false;

        allRows.forEach((item, idx) => {
          if (!item || typeof item !== 'object') return;

          // 1. Extract Student Name (multi-candidate + positional fallback)
          let studentNama = extractExcelValue(item, [
            'Nama Siswa',
            'Nama Lengkap',
            'Nama Peserta Didik',
            'Nama Santri',
            'Nama Murid',
            'Nama Siswa / Santri',
            'Nama Santri / Siswa',
            'Nama Siswa/i',
            'Nama Siswa (Sesuai Ijazah)',
            'Nama Lengkap Siswa',
            'Nama Peserta Didik (Lengkap)',
            'Nama Lengkap Peserta Didik',
            'Nama Lengkap Murid',
            'Nama Calon Santri',
            'Nama_Siswa',
            'Nama_Lengkap',
            'NamaSiswa',
            'NamaLengkap',
            'NamaPesertaDidik',
            'Nama',
            'Siswa',
            'Santri',
            'Murid',
            'Peserta Didik',
            'PesertaDidik',
            'Name',
            'Full Name',
            'Student Name'
          ]).trim();

          // Positional fallback: check rawCells if column 1 or 2 contains a human name
          if (!studentNama && Array.isArray(item._rawCells)) {
            for (let ci = 0; ci < Math.min(item._rawCells.length, 6); ci++) {
              const cVal = String(item._rawCells[ci] || '').trim();
              if (
                cVal.length >= 2 &&
                /[a-zA-Z]/.test(cVal) &&
                !/^\d+$/.test(cVal) &&
                !/^(no|nomor|nisn|nis|nik|nim|jk|l\/p|lp|gender|sex|ttl|laki|perempuan|pria|wanita|l|p)$/i.test(cVal)
              ) {
                studentNama = cVal;
                break;
              }
            }
          }

          if (!studentNama || studentNama.length < 2) return;

          const lowerNama = studentNama.toLowerCase();
          if (
            lowerNama.includes('yayasan') ||
            lowerNama.includes('madrasah') ||
            lowerNama.includes('sekolah') ||
            lowerNama.includes('daftar siswa') ||
            lowerNama.includes('rekap data') ||
            lowerNama.includes('tahun akademik') ||
            lowerNama.includes('tahun pelajaran') ||
            lowerNama.includes('kementerian agama') ||
            lowerNama === 'nama' ||
            lowerNama === 'nama siswa' ||
            lowerNama === 'nama lengkap' ||
            lowerNama === 'jumlah' ||
            lowerNama === 'total'
          ) {
            return;
          }

          // 2. Extract NISN
          let studentNisn = extractExcelValue(item, [
            'NISN',
            'NIS',
            'NISN/NIS',
            'NIS/NISN',
            'ID Siswa',
            'No Induk Siswa',
            'Nomor Induk Siswa',
            'No Induk',
            'Nomor Induk',
            'No. Induk',
            'No_Induk',
            'NIM',
            'NIK',
            'ID_Siswa',
            'ID'
          ]).replace(/\.0$/, '').trim();

          if (!studentNisn && Array.isArray(item._rawCells)) {
            // Find numeric string with length >= 4
            for (const cell of item._rawCells) {
              const cClean = String(cell || '').trim().replace(/\.0$/, '');
              if (/^\d{4,18}$/.test(cClean)) {
                studentNisn = cClean;
                break;
              }
            }
          }

          if (!studentNisn) {
            studentNisn = '-';
          }

          // 3. Extract Class
          let rawClassStr = extractExcelValue(item, [
            'Kelas',
            'Nama Kelas',
            'Rombel',
            'Tingkat',
            'Kelas/Rombel',
            'Rombongan Belajar',
            'RombonganBelajar',
            'Nama_Kelas',
            'Kelompok',
            'Tingkat/Kelas',
            'Class',
            'Ruang',
            'Ruangan'
          ]).trim();

          if (!rawClassStr && item._sheetName && !/^(sheet\d*|data|rekap|export|template)$/i.test(item._sheetName.trim())) {
            rawClassStr = item._sheetName.trim();
          }

          let targetClass: ClassItem | undefined;
          if (rawClassStr) {
            targetClass = currentClasses.find(
              (c) =>
                c.namaKelas.trim().toLowerCase() === rawClassStr.toLowerCase() ||
                c.id.toLowerCase() === rawClassStr.toLowerCase()
            );
            if (!targetClass) {
              targetClass = matchClass(rawClassStr, currentClasses) || undefined;
            }
            if (!targetClass) {
              const fallbackWali = teachers[currentClasses.length % (teachers.length || 1)]?.nama || '-';
              targetClass = {
                id: `cls-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
                namaKelas: rawClassStr,
                waliKelas: fallbackWali,
                jumlahSiswa: 0,
              };
              currentClasses.push(targetClass);
              classesUpdated = true;
            }
          }

          const classIdToUse = targetClass ? targetClass.id : (rawClassStr || '-');

          // 4. Extract Gender (Jenis Kelamin)
          let rawJk = extractExcelValue(item, [
            'Jenis Kelamin',
            'JenisKelamin',
            'JK',
            'L/P',
            'LP',
            'L / P',
            'Sex',
            'Gender',
            'Kelamin'
          ]).toUpperCase().trim();

          if (!rawJk && Array.isArray(item._rawCells)) {
            for (const cell of item._rawCells) {
              const cUpper = String(cell || '').toUpperCase().trim();
              if (['L', 'P', 'LK', 'PR', 'LAKI-LAKI', 'PEREMPUAN', 'PRIA', 'WANITA', 'M', 'F'].includes(cUpper)) {
                rawJk = cUpper;
                break;
              }
            }
          }

          const parsedJk: 'L' | 'P' =
            rawJk.startsWith('P') || rawJk === 'PEREMPUAN' || rawJk === 'WANITA' || rawJk === 'FEMALE' || rawJk === 'F' || rawJk === 'PR'
              ? 'P'
              : 'L';

          // 5. Extract TTL (Tempat & Tanggal Lahir)
          let ttlStr = extractExcelValue(item, [
            'TTL',
            'Tempat Tanggal Lahir',
            'Tempat, Tanggal Lahir',
            'Tempat / Tanggal Lahir',
            'Tempat/Tanggal Lahir',
            'Tempat & Tgl Lahir',
            'Tempat/Tgl Lahir',
            'Tempat Tgl Lahir',
            'Tempat Lahir',
            'Tanggal Lahir'
          ]).trim();

          if (!ttlStr) {
            const tempat = extractExcelValue(item, ['Tempat Lahir', 'TempatLahir', 'Tempat']).trim();
            const tgl = extractExcelValue(item, ['Tanggal Lahir', 'Tgl Lahir', 'TanggalLahir', 'TglLahir', 'Tgl']).trim();
            if (tempat && tgl) ttlStr = `${tempat}, ${tgl}`;
            else if (tempat) ttlStr = tempat;
            else if (tgl) ttlStr = tgl;
          }

          if (!ttlStr) {
            ttlStr = '-';
          }

          const sObj: StudentItem = {
            id: `sis-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
            nama: studentNama,
            nisn: studentNisn,
            ttl: ttlStr,
            kelasId: classIdToUse,
            jenisKelamin: parsedJk,
            status: 'Aktif',
          };

          validImportedRows.push({ student: sObj, row: item });
        });

        if (validImportedRows.length === 0) {
          showToast('Tidak ada data Siswa valid yang ditemukan dalam file Excel.');
          return;
        }

        if (classesUpdated) {
          setClasses([...currentClasses]);
          storageService.saveClasses(currentClasses, true);
        }

        // Cleanly merge student roster without losing non-conflicting records
        let updatedStudents = [...(students || [])];

        validImportedRows.forEach(({ student: s }) => {
          updatedStudents = updatedStudents.filter((ex) => {
            if (ex.id === s.id) return false;
            if (s.nisn && s.nisn !== '-' && s.nisn.length >= 4 && ex.nisn === s.nisn) return false;
            if (
              ex.nama.toLowerCase().trim() === s.nama.toLowerCase().trim() &&
              (ex.kelasId.toLowerCase().trim() === s.kelasId.toLowerCase().trim() ||
                ex.kelasId === s.kelasId)
            ) {
              return false;
            }
            return true;
          });
          updatedStudents.push(s);
        });

        const finalClasses = currentClasses.map((c) => ({
          ...c,
          jumlahSiswa: updatedStudents.filter((st) => st.kelasId === c.id || st.kelasId === c.namaKelas).length,
        }));
        setClasses(finalClasses);
        storageService.saveClasses(finalClasses, true);

        setStudents(updatedStudents);
        storageService.saveStudents(updatedStudents, true);

        const currentUsers = users || storageService.getUsers() || [];
        let updatedUsersList = [...currentUsers];

        validImportedRows.forEach(({ student: s, row }) => {
          const customUser = extractExcelValue(row, ['User', 'Username', 'Akun', 'ID User']).toLowerCase().trim().replace(/\.0$/, '');
          const customPass = extractExcelValue(row, ['Password', 'Pass', 'Sandi', 'PIN', 'Sandi Akun', 'Kata Sandi']).trim();

          let baseUname = customUser || (s.nisn !== '-' ? s.nisn.toLowerCase() : s.nama.toLowerCase().replace(/[^a-z0-9]/g, ''));
          let unameToUse = baseUname;
          let counter = 1;
          while (allUsernames.has(unameToUse)) {
            counter++;
            unameToUse = `${baseUname}_${counter}`;
          }
          allUsernames.add(unameToUse);

          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
          let randomPass = '';
          for (let i = 0; i < 8; i++) {
            randomPass += chars.charAt(Math.floor(Math.random() * chars.length));
          }

          const newUserObj: User = {
            id: s.id,
            username: unameToUse,
            password: customPass || randomPass,
            nama: s.nama,
            name: s.nama,
            role: 'siswa',
            nuptkOrNisn: s.nisn,
            kelasId: s.kelasId,
            status: 'Aktif',
            avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80',
          };

          updatedUsersList = updatedUsersList.filter(
            (u) =>
              u.id !== s.id &&
              u.username.toLowerCase() !== unameToUse.toLowerCase() &&
              (u.role !== 'siswa' || (u.nama.toLowerCase().trim() !== s.nama.toLowerCase().trim() && u.nuptkOrNisn !== s.nisn))
          );
          updatedUsersList.push(newUserObj);
        });

        if (setUsers) {
          setUsers(updatedUsersList);
        }
        storageService.saveUsers(updatedUsersList, true);

        showToast(`Berhasil mengimpor & menyimpan ${validImportedRows.length} data Siswa dari ${sheets.length} Sheet ke Database!`);
      } catch (err) {
        console.error('Error importing students Excel:', err);
        showToast('Gagal membaca file Excel Siswa.');
      } finally {
        inputTarget.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleUploadBuku = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const inputTarget = e.target;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const sheets = parseEntireWorkbook(wb);

        const allRows: any[] = [];
        sheets.forEach((s) => allRows.push(...s.rows));

        if (allRows.length === 0) {
          showToast('File Excel data Buku kosong atau tidak terbaca!');
          return;
        }

        const imported: LibraryBook[] = allRows
          .map((item, idx) => {
            const judul = extractExcelValue(item, ['Judul', 'Judul Buku', 'Nama Buku', 'Title']).trim();
            if (!judul || judul.length < 2) return null;
            return {
              id: `bk-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
              judul,
              pengarang: extractExcelValue(item, ['Pengarang', 'Penulis', 'Author']).trim() || 'Penulis',
              penerbit: extractExcelValue(item, ['Penerbit', 'Publisher']).trim() || 'Penerbit',
              kategori: extractExcelValue(item, ['Kategori', 'Category']).trim() || 'Keagamaan',
              tahunTerbit: Number(extractExcelValue(item, ['Tahun', 'Tahun Terbit', 'Year'])) || 2024,
              stok: Number(extractExcelValue(item, ['Stok', 'Jumlah', 'Stock'])) || 15,
              coverColor: 'from-blue-600 to-indigo-800',
              ringkasan: extractExcelValue(item, ['Ringkasan', 'Deskripsi', 'Summary']).trim() || 'Deskripsi singkat modul bacaan.',
              filePdfDemoUrl: extractExcelValue(item, ['LinkPDF', 'PDF', 'Link', 'URL']).trim() || '',
            };
          })
          .filter(Boolean) as LibraryBook[];

        if (imported.length === 0) {
          showToast('Tidak ada data Buku valid dalam file.');
          return;
        }

        const updatedBooks = [...libraryBooks, ...imported];
        setLibraryBooks(updatedBooks);
        storageService.saveLibraryBooks(updatedBooks, true);

        showToast(`Berhasil mengimpor & menyimpan ${imported.length} data Buku ke Database!`);
      } catch (err) {
        console.error('Error importing books Excel:', err);
        showToast('Gagal membaca file Excel Buku.');
      } finally {
        inputTarget.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleUploadKelas = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const inputTarget = e.target;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const sheets = parseEntireWorkbook(wb);

        const allRows: any[] = [];
        sheets.forEach((s) => allRows.push(...s.rows));

        if (allRows.length === 0) {
          showToast('File Excel data Kelas kosong!');
          return;
        }

        const imported: ClassItem[] = allRows
          .map((item, idx) => {
            const namaKelas = extractExcelValue(item, ['NamaKelas', 'Nama Kelas', 'Kelas', 'Nama']).trim();
            if (!namaKelas || namaKelas.length < 1) return null;
            const rawWali = extractExcelValue(item, ['WaliKelas', 'Wali Kelas', 'Wali']).trim();
            const matchedWali = matchTeacher(rawWali, teachers);
            return {
              id: `cls-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
              namaKelas,
              waliKelas: matchedWali ? matchedWali.nama : (teachers[idx % (teachers.length || 1)]?.nama || 'SYAIFUDIN KUDSI, SHI. MA.'),
              jumlahSiswa: Number(extractExcelValue(item, ['JumlahSiswa', 'Jumlah Siswa', 'Jumlah'])) || 0,
            };
          })
          .filter(Boolean) as ClassItem[];

        if (imported.length === 0) {
          showToast('Tidak ada data Kelas valid dalam file.');
          return;
        }

        let updatedClasses = [...classes];
        imported.forEach((c) => {
          updatedClasses = updatedClasses.filter(
            (ex) => ex.namaKelas.toLowerCase().trim() !== c.namaKelas.toLowerCase().trim()
          );
          updatedClasses.push(c);
        });

        setClasses(updatedClasses);
        storageService.saveClasses(updatedClasses, true);

        showToast(`Berhasil mengimpor & menyimpan ${imported.length} data Kelas!`);
      } catch (err) {
        console.error('Error importing classes Excel:', err);
        showToast('Gagal membaca file Excel Kelas.');
      } finally {
        inputTarget.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleUploadMapel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const inputTarget = e.target;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const sheets = parseEntireWorkbook(wb);

        const allRows: any[] = [];
        sheets.forEach((s) => allRows.push(...s.rows));

        if (allRows.length === 0) {
          showToast('File Excel data Mata Pelajaran kosong!');
          return;
        }

        const imported: SubjectItem[] = allRows
          .map((item, idx) => {
            const namaMapel = extractExcelValue(item, ['NamaMapel', 'Nama Mapel', 'Mata Pelajaran', 'Nama']).trim();
            if (!namaMapel || namaMapel.length < 2) return null;
            return {
              id: `mpl-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
              kode: extractExcelValue(item, ['Kode', 'Kode Mapel', 'ID']).trim() || `MPL${idx + 1}`,
              namaMapel,
              kelompok: (extractExcelValue(item, ['Kelompok', 'Kategori']).trim() || 'Wajib') as 'Wajib' | 'Peminatan' | 'Muatan Lokal',
            };
          })
          .filter(Boolean) as SubjectItem[];

        if (imported.length === 0) {
          showToast('Tidak ada data Mata Pelajaran valid dalam file.');
          return;
        }

        let updatedSubjects = [...subjects];
        imported.forEach((s) => {
          updatedSubjects = updatedSubjects.filter(
            (ex) =>
              ex.namaMapel.toLowerCase().trim() !== s.namaMapel.toLowerCase().trim() &&
              ex.kode.toLowerCase().trim() !== s.kode.toLowerCase().trim()
          );
          updatedSubjects.push(s);
        });

        setSubjects(updatedSubjects);
        storageService.saveSubjects(updatedSubjects, true);

        showToast(`Berhasil mengimpor & menyimpan ${imported.length} data Mata Pelajaran!`);
      } catch (err) {
        console.error('Error importing subjects Excel:', err);
        showToast('Gagal membaca file Excel Mata Pelajaran.');
      } finally {
        inputTarget.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      {/* Header Info Banner for Tahun Akademik & Semester */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-2xl">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white flex flex-wrap items-center gap-2">
              Pengelolaan Data Akademik
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                T.A. {settings?.tahunAkademik || '2025/2026'} • Semester {settings?.semester || 'Ganjil'}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Atur Tahun Akademik, Semester aktif, serta kelola master data Guru, Murid, Kelas, & Mapel
            </p>
          </div>
        </div>

        {/* Academic Year & Semester Selector Controls + Hapus Semua Data Button */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-950/80 p-2 rounded-2xl border border-slate-800 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <span className="text-slate-400 text-[11px] font-semibold pl-1">Tahun Akademik:</span>
            <select
              value={settings?.tahunAkademik || '2025/2026'}
              onChange={(e) => {
                if (setSettings) {
                  setSettings((prev) => ({ ...prev, tahunAkademik: e.target.value }));
                }
              }}
              className="bg-slate-900 text-emerald-400 font-mono font-bold border border-slate-700 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="2024/2025">2024/2025</option>
              <option value="2025/2026">2025/2026</option>
              <option value="2026/2027">2026/2027</option>
            </select>
          </div>

          <div className="hidden sm:block h-5 w-px bg-slate-800"></div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <span className="text-slate-400 text-[11px] font-semibold">Semester:</span>
            <select
              value={settings?.semester || 'Ganjil'}
              onChange={(e) => {
                if (setSettings) {
                  setSettings((prev) => ({ ...prev, semester: e.target.value as 'Ganjil' | 'Genap' }));
                }
              }}
              className="bg-slate-900 text-indigo-300 font-bold border border-slate-700 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>

          <div className="hidden sm:block h-5 w-px bg-slate-800"></div>

          <button
            type="button"
            onClick={() => setShowDeleteAllDataModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/20 text-rose-300 border border-rose-500/40 hover:bg-rose-600 hover:text-white font-bold text-xs transition shadow-sm"
            title="Kosongkan / Hapus Semua Data Pengelolaan (Guru, Murid, Kelas, Mapel, Bacaan, Jadwal & Agenda)"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Hapus Semua Data</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => { setSubTab('guru'); setSearchTerm(''); setSelectedClassFilter('ALL'); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition ${
            subTab === 'guru'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" /> Pengelolaan Guru ({teachers.length})
        </button>

        <button
          onClick={() => { setSubTab('siswa'); setSearchTerm(''); setSelectedClassFilter('ALL'); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition ${
            subTab === 'siswa'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4" /> Pengelolaan Murid ({students.length})
        </button>

        <button
          onClick={() => { setSubTab('kelas'); setSearchTerm(''); setSelectedClassFilter('ALL'); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition ${
            subTab === 'kelas'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <School className="w-4 h-4" /> Data Kelas ({classes.length})
        </button>

        <button
          onClick={() => { setSubTab('mapel'); setSearchTerm(''); setSelectedClassFilter('ALL'); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition ${
            subTab === 'mapel'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Mata Pelajaran ({subjects.length})
        </button>

        <button
          onClick={() => { setSubTab('bacaan'); setSearchTerm(''); setSelectedClassFilter('ALL'); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition ${
            subTab === 'bacaan'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <BookMarked className="w-4 h-4" /> Daftar Bacaan Perpustakaan ({libraryBooks.length})
        </button>
      </div>

      {/* Toolbar Search & Action Buttons */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder={subTab === 'siswa' ? 'Cari nama, NISN, TTL murid...' : `Cari data ${subTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                title="Hapus kata kunci"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Kelas (Khusus untuk Pengelolaan Murid) */}
          {subTab === 'siswa' && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-60">
                <Filter className="w-3.5 h-3.5 text-emerald-400 absolute left-3 top-3 pointer-events-none" />
                <select
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-7 py-2 text-xs text-slate-200 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer appearance-none"
                >
                  <option value="ALL">Semua Kelas ({students.length} Murid)</option>
                  {classes.map((c) => {
                    const countInClass = students.filter(
                      (s) => s.kelasId === c.id || s.kelasId === c.namaKelas
                    ).length;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.namaKelas} ({countInClass} Siswa)
                      </option>
                    );
                  })}
                </select>
                <div className="absolute right-3 top-2.5 pointer-events-none text-slate-500 text-[10px]">▼</div>
              </div>

              {(selectedClassFilter !== 'ALL' || searchTerm !== '') && (
                <button
                  onClick={() => {
                    setSelectedClassFilter('ALL');
                    setSearchTerm('');
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                  title="Reset Filter & Pencarian"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Reset Filter</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {subTab === 'guru' && (
            <>
              <button
                onClick={downloadTemplateGuru}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" /> Template Guru
              </button>
              <button
                onClick={() => teacherFileInputRef.current?.click()}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Upload className="w-3.5 h-3.5" /> Upload Excel Guru
              </button>
              <input
                ref={teacherFileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleUploadGuru}
                className="hidden"
              />
            </>
          )}

          {subTab === 'siswa' && (
            <>
              <button
                onClick={downloadTemplateSiswa}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" /> Template Murid
              </button>
              <button
                onClick={() => studentFileInputRef.current?.click()}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Upload className="w-3.5 h-3.5" /> Upload Excel Murid
              </button>
              <input
                ref={studentFileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleUploadSiswa}
                className="hidden"
              />
            </>
          )}

          {subTab === 'kelas' && (
            <>
              <button
                onClick={downloadTemplateKelas}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" /> Template Kelas
              </button>
              <button
                onClick={() => classFileInputRef.current?.click()}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Upload className="w-3.5 h-3.5" /> Upload Excel Kelas
              </button>
              <input
                ref={classFileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleUploadKelas}
                className="hidden"
              />
            </>
          )}

          {subTab === 'mapel' && (
            <>
              <button
                onClick={downloadTemplateMapel}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" /> Template Mapel
              </button>
              <button
                onClick={() => subjectFileInputRef.current?.click()}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Upload className="w-3.5 h-3.5" /> Upload Excel Mapel
              </button>
              <input
                ref={subjectFileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleUploadMapel}
                className="hidden"
              />
            </>
          )}

          {subTab === 'bacaan' && (
            <>
              <button
                onClick={downloadTemplateBuku}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" /> Template Buku
              </button>
              <button
                onClick={() => bookFileInputRef.current?.click()}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Upload className="w-3.5 h-3.5" /> Upload Excel Buku
              </button>
              <input
                ref={bookFileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleUploadBuku}
                className="hidden"
              />
            </>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
          >
            <Plus className="w-4 h-4" /> Tambah {subTab.toUpperCase()}
          </button>

          <button
            onClick={() => setDeleteAllCategory(subTab)}
            className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
            title={`Hapus data ${subTab}`}
          >
            <Trash2 className="w-3.5 h-3.5" /> {
              subTab === 'guru' ? 'Hapus Guru' :
              subTab === 'siswa' ? 'Hapus Murid' :
              subTab === 'kelas' ? 'Hapus Kelas' :
              subTab === 'mapel' ? 'Hapus Mapel' :
              'Hapus Buku'
            }
          </button>
        </div>
      </div>

      {/* --- SUBTAB DATA TABLES --- */}

      {/* 1. GURU TABLE */}
      {subTab === 'guru' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">No</th>
                  <th className="p-4">Nama Guru</th>
                  <th className="p-4">NUPTK</th>
                  <th className="p-4">Mengajar Mapel</th>
                  <th className="p-4">Email & No Telp</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {teachers
                  .filter((t) => t.nama.toLowerCase().includes(searchTerm.toLowerCase()) || t.nuptk.includes(searchTerm))
                  .map((t, idx) => (
                    <tr key={t.id} className="hover:bg-slate-800/50 transition">
                      <td className="p-4 font-mono font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-4 font-bold text-white">{t.nama}</td>
                      <td className="p-4 font-mono text-emerald-400">{t.nuptk}</td>
                      <td className="p-4 font-medium text-slate-200">{t.mengajarMapel}</td>
                      <td className="p-4 text-slate-400">
                        {t.email} <br /> {t.telepon}
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          {t.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setEditingGuru({ ...t })}
                            className="p-2 text-amber-400 hover:bg-amber-950/50 rounded-xl transition"
                            title="Edit Guru"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteGuru(t.id, t.nama)}
                            className="p-2 text-rose-400 hover:bg-rose-950/50 rounded-xl transition"
                            title="Hapus Guru"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. SISWA TABLE */}
      {subTab === 'siswa' && (() => {
        const filteredStudents = students.filter((s) => {
          // 1. Filter Kelas
          if (selectedClassFilter !== 'ALL') {
            const selectedClassObj = classes.find((c) => c.id === selectedClassFilter);
            const isMatchClass =
              s.kelasId === selectedClassFilter ||
              (selectedClassObj && (s.kelasId === selectedClassObj.namaKelas || s.kelasId?.toLowerCase() === selectedClassObj.namaKelas.toLowerCase()));
            if (!isMatchClass) return false;
          }

          // 2. Filter Search Term
          if (!searchTerm.trim()) return true;
          const term = searchTerm.toLowerCase();
          const cls = classes.find((c) => c.id === s.kelasId || c.namaKelas === s.kelasId);
          const classNameStr = cls?.namaKelas?.toLowerCase() || s.kelasId?.toLowerCase() || '';

          return (
            s.nama.toLowerCase().includes(term) ||
            s.nisn.toLowerCase().includes(term) ||
            s.ttl.toLowerCase().includes(term) ||
            classNameStr.includes(term)
          );
        });

        const activeClassObj = classes.find((c) => c.id === selectedClassFilter);

        return (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg space-y-0">
            {/* Filter Status Summary Header */}
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-emerald-400" />
                <span>
                  Menampilkan <strong className="text-emerald-400 font-bold">{filteredStudents.length}</strong> dari total{' '}
                  <strong className="text-white font-bold">{students.length}</strong> murid
                </span>
                {selectedClassFilter !== 'ALL' && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] font-semibold flex items-center gap-1">
                    <School className="w-3 h-3 text-emerald-400" />
                    Kelas: {activeClassObj?.namaKelas || selectedClassFilter}
                  </span>
                )}
                {searchTerm && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-indigo-950 text-indigo-300 border border-indigo-800 text-[11px] font-semibold">
                    Kata Kunci: "{searchTerm}"
                  </span>
                )}
              </div>
              {(selectedClassFilter !== 'ALL' || searchTerm !== '') && (
                <button
                  onClick={() => {
                    setSelectedClassFilter('ALL');
                    setSearchTerm('');
                  }}
                  className="text-amber-400 hover:text-amber-300 text-[11px] font-semibold flex items-center gap-1 underline"
                >
                  <RotateCcw className="w-3 h-3 text-amber-400" /> Reset Semua Filter
                </button>
              )}
            </div>

            {filteredStudents.length === 0 ? (
              <div className="p-10 text-center text-slate-400 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-amber-400">
                  <Search className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-200 text-sm">Murid Tidak Ditemukan</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Tidak ada data murid yang sesuai dengan kata kunci "{searchTerm}" {selectedClassFilter !== 'ALL' ? `di kelas ${activeClassObj?.namaKelas || selectedClassFilter}` : ''}.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedClassFilter('ALL');
                    setSearchTerm('');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-md shadow-emerald-950"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Tampilkan Semua Murid
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-4">No</th>
                      <th className="p-4">Nama Murid</th>
                      <th className="p-4">NISN</th>
                      <th className="p-4">Tempat, Tgl Lahir</th>
                      <th className="p-4">Kelas</th>
                      <th className="p-4">L/P</th>
                      <th className="p-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredStudents.map((s, idx) => {
                      const cls = classes.find((c) => c.id === s.kelasId || c.namaKelas === s.kelasId);
                      return (
                        <tr key={s.id} className="hover:bg-slate-800/50 transition">
                          <td className="p-4 font-mono font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-4 font-bold text-white">{s.nama}</td>
                          <td className="p-4 font-mono text-cyan-400">{s.nisn}</td>
                          <td className="p-4 text-slate-300">{s.ttl}</td>
                          <td className="p-4 font-bold text-emerald-400">{getDisplayClassName(s.kelasId, classes)}</td>
                          <td className="p-4 font-semibold">{s.jenisKelamin}</td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setEditingSiswa({ ...s })}
                                className="p-2 text-amber-400 hover:bg-amber-950/50 rounded-xl transition"
                                title="Edit Siswa"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSiswa(s.id, s.nama)}
                                className="p-2 text-rose-400 hover:bg-rose-950/50 rounded-xl transition"
                                title="Hapus Siswa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* 3. KELAS TABLE */}
      {subTab === 'kelas' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">No</th>
                  <th className="p-4">Nama Kelas</th>
                  <th className="p-4">Wali Kelas</th>
                  <th className="p-4">Jumlah Siswa Terdaftar</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {classes.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-slate-800/50 transition">
                    <td className="p-4 font-mono font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-4 font-bold text-emerald-400 text-sm">{c.namaKelas}</td>
                    <td className="p-4 font-medium text-slate-200">{c.waliKelas}</td>
                    <td className="p-4 font-mono font-bold text-slate-300">
                      {students.filter((s) => s.kelasId === c.id).length || c.jumlahSiswa} Siswa
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingKelas({ ...c })}
                          className="p-2 text-amber-400 hover:bg-amber-950/50 rounded-xl transition"
                          title="Edit Kelas"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteKelas(c.id, c.namaKelas)}
                          className="p-2 text-rose-400 hover:bg-rose-950/50 rounded-xl transition"
                          title="Hapus Kelas"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. MAPEL TABLE */}
      {subTab === 'mapel' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">No</th>
                  <th className="p-4">Kode Mapel</th>
                  <th className="p-4">Nama Mata Pelajaran</th>
                  <th className="p-4">Kelompok Mapel</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {subjects.map((m, idx) => (
                  <tr key={m.id} className="hover:bg-slate-800/50 transition">
                    <td className="p-4 font-mono font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-4 font-mono text-purple-400">{m.kode}</td>
                    <td className="p-4 font-bold text-white">{m.namaMapel}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-200 border border-slate-700">
                        {m.kelompok}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingMapel({ ...m })}
                          className="p-2 text-amber-400 hover:bg-amber-950/50 rounded-xl transition"
                          title="Edit Mapel"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMapel(m.id, m.namaMapel)}
                          className="p-2 text-rose-400 hover:bg-rose-950/50 rounded-xl transition"
                          title="Hapus Mapel"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. DAFTAR BACAAN PERPUSTAKAAN TABLE */}
      {subTab === 'bacaan' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">No</th>
                  <th className="p-4">Judul Buku & Kategori</th>
                  <th className="p-4">Pengarang & Penerbit</th>
                  <th className="p-4">Tahun & Stok</th>
                  <th className="p-4">Ringkasan Modul</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {libraryBooks
                  .filter(
                    (b) =>
                      b.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      b.pengarang.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      b.kategori.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((b, idx) => (
                    <tr key={b.id} className="hover:bg-slate-800/50 transition">
                      <td className="p-4 font-mono font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-4">
                        <p className="font-bold text-white text-sm">{b.judul}</p>
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800 mt-1">
                          {b.kategori}
                        </span>
                      </td>
                      <td className="p-4 text-slate-300">
                        <p className="font-semibold text-slate-200">{b.pengarang}</p>
                        <p className="text-[11px] text-slate-400">{b.penerbit}</p>
                      </td>
                      <td className="p-4 font-mono">
                        <p className="text-emerald-400 font-bold">{b.tahunTerbit}</p>
                        <p className="text-[11px] text-slate-400">Stok: {b.stok} unit</p>
                      </td>
                      <td className="p-4 text-slate-300 max-w-xs truncate">
                        {b.ringkasan}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setEditingBuku({ ...b })}
                            className="p-2 text-amber-400 hover:bg-amber-950/50 rounded-xl transition"
                            title="Edit Buku Perpustakaan"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBuku(b.id, b.judul)}
                            className="p-2 text-rose-400 hover:bg-rose-950/50 rounded-xl transition"
                            title="Hapus Buku"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- ADD DATA MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white uppercase tracking-tight">
                Tambah {subTab === 'bacaan' ? 'Buku Bacaan' : subTab} Baru
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Guru */}
            {subTab === 'guru' && (
              <form onSubmit={handleAddGuru} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Nama Lengkap & Gelar</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: SYAIFUDIN KUDSI, SHI. MA."
                    value={newGuru.nama}
                    onChange={(e) => setNewGuru({ ...newGuru, nama: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-400 mb-1">NUPTK / NIP</label>
                  <input
                    type="text"
                    required
                    placeholder="197805122005011002"
                    value={newGuru.nuptk}
                    onChange={(e) => setNewGuru({ ...newGuru, nuptk: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Mengajar Mapel</label>
                  <input
                    type="text"
                    placeholder="Fiqih / Bahasa Arab"
                    value={newGuru.mengajarMapel}
                    onChange={(e) => setNewGuru({ ...newGuru, mengajarMapel: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold text-white rounded-xl transition"
                >
                  Simpan Data Guru
                </button>
              </form>
            )}

            {/* Form Siswa */}
            {subTab === 'siswa' && (
              <form onSubmit={handleAddSiswa} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Nama Lengkap Siswa</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Ahmad Farisi Subakti"
                    value={newSiswa.nama}
                    onChange={(e) => setNewSiswa({ ...newSiswa, nama: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-400 mb-1">NISN</label>
                  <input
                    type="text"
                    required
                    placeholder="0051234567"
                    value={newSiswa.nisn}
                    onChange={(e) => setNewSiswa({ ...newSiswa, nisn: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Tempat, Tanggal Lahir (ttl)</label>
                  <input
                    type="text"
                    placeholder="Sumenep, 14 Mei 2006"
                    value={newSiswa.ttl}
                    onChange={(e) => setNewSiswa({ ...newSiswa, ttl: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Pilih Kelas</label>
                  <select
                    value={newSiswa.kelasId}
                    onChange={(e) => setNewSiswa({ ...newSiswa, kelasId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.namaKelas}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold text-white rounded-xl transition"
                >
                  Simpan Data Siswa
                </button>
              </form>
            )}

            {/* Form Kelas */}
            {subTab === 'kelas' && (
              <form onSubmit={handleAddKelas} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Nama Kelas</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: XII IPA 2"
                    value={newKelas.namaKelas}
                    onChange={(e) => setNewKelas({ ...newKelas, namaKelas: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Wali Kelas</label>
                  <select
                    value={newKelas.waliKelas}
                    onChange={(e) => setNewKelas({ ...newKelas, waliKelas: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  >
                    <option value="Belum Ditentukan">-- Pilih Wali Kelas (Dari Data Guru) --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.nama}>
                        {t.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold text-white rounded-xl transition"
                >
                  Simpan Data Kelas
                </button>
              </form>
            )}

            {/* Form Mapel */}
            {subTab === 'mapel' && (
              <form onSubmit={handleAddMapel} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Kode Mapel</label>
                  <input
                    type="text"
                    placeholder="MA-07"
                    value={newMapel.kode}
                    onChange={(e) => setNewMapel({ ...newMapel, kode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Nama Mata Pelajaran</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Akidah Akhlak"
                    value={newMapel.namaMapel}
                    onChange={(e) => setNewMapel({ ...newMapel, namaMapel: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold text-white rounded-xl transition"
                >
                  Simpan Mapel
                </button>
              </form>
            )}

            {/* Form Buku Bacaan */}
            {subTab === 'bacaan' && (
              <form onSubmit={handleAddBuku} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Judul Buku Bacaan</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Fiqih Ibadah Praktis Santri"
                    value={newBuku.judul}
                    onChange={(e) => setNewBuku({ ...newBuku, judul: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Pengarang / Penulis</label>
                  <input
                    type="text"
                    placeholder="Drs. SYAIFUDIN KUDSI, SHI. MA."
                    value={newBuku.pengarang}
                    onChange={(e) => setNewBuku({ ...newBuku, pengarang: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-400 mb-1">Penerbit</label>
                    <input
                      type="text"
                      placeholder="Pustaka Al-Amien"
                      value={newBuku.penerbit}
                      onChange={(e) => setNewBuku({ ...newBuku, penerbit: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-400 mb-1">Kategori</label>
                    <input
                      type="text"
                      placeholder="Keagamaan / Fiqih"
                      value={newBuku.kategori}
                      onChange={(e) => setNewBuku({ ...newBuku, kategori: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-400 mb-1">Tahun Terbit</label>
                    <input
                      type="number"
                      value={newBuku.tahunTerbit}
                      onChange={(e) => setNewBuku({ ...newBuku, tahunTerbit: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-400 mb-1">Stok Ekslempar</label>
                    <input
                      type="number"
                      value={newBuku.stok}
                      onChange={(e) => setNewBuku({ ...newBuku, stok: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-medium text-slate-400 mb-1">URL Link PDF / File Digital</label>
                  <input
                    type="url"
                    placeholder="https://example.com/buku-modul.pdf (Opsional)"
                    value={newBuku.filePdfDemoUrl}
                    onChange={(e) => setNewBuku({ ...newBuku, filePdfDemoUrl: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-blue-300 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Masukkan link PDF agar siswa dapat langsung membaca secara interaktif di aplikasi.</p>
                </div>
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Ringkasan / Deskripsi Modul</label>
                  <textarea
                    rows={3}
                    placeholder="Ringkasan singkat isi buku..."
                    value={newBuku.ringkasan}
                    onChange={(e) => setNewBuku({ ...newBuku, ringkasan: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold text-white rounded-xl transition"
                >
                  Simpan Buku Bacaan
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- EDIT GURU MODAL --- */}
      {editingGuru && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white uppercase tracking-tight">Edit Data Guru</h3>
              <button onClick={() => setEditingGuru(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateGuru} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-400 mb-1">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  required
                  value={editingGuru.nama}
                  onChange={(e) => setEditingGuru({ ...editingGuru, nama: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-400 mb-1">NUPTK / NIP</label>
                <input
                  type="text"
                  required
                  value={editingGuru.nuptk}
                  onChange={(e) => setEditingGuru({ ...editingGuru, nuptk: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-400 mb-1">Mengajar Mapel</label>
                <input
                  type="text"
                  value={editingGuru.mengajarMapel}
                  onChange={(e) => setEditingGuru({ ...editingGuru, mengajarMapel: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  value={editingGuru.email}
                  onChange={(e) => setEditingGuru({ ...editingGuru, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-400 mb-1">No Telepon</label>
                <input
                  type="text"
                  value={editingGuru.telepon}
                  onChange={(e) => setEditingGuru({ ...editingGuru, telepon: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 font-bold text-white rounded-xl transition mt-2"
              >
                Simpan Perubahan Guru
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT SISWA MODAL --- */}
      {editingSiswa && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white uppercase tracking-tight">Edit Data Murid</h3>
              <button onClick={() => setEditingSiswa(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateSiswa} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-400 mb-1">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  required
                  value={editingSiswa.nama}
                  onChange={(e) => setEditingSiswa({ ...editingSiswa, nama: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-400 mb-1">NISN</label>
                <input
                  type="text"
                  required
                  value={editingSiswa.nisn}
                  onChange={(e) => setEditingSiswa({ ...editingSiswa, nisn: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-400 mb-1">Tempat, Tanggal Lahir (ttl)</label>
                <input
                  type="text"
                  value={editingSiswa.ttl}
                  onChange={(e) => setEditingSiswa({ ...editingSiswa, ttl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-400 mb-1">Pilih Kelas</label>
                <select
                  value={editingSiswa.kelasId}
                  onChange={(e) => setEditingSiswa({ ...editingSiswa, kelasId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.namaKelas}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-400 mb-1">Jenis Kelamin</label>
                <select
                  value={editingSiswa.jenisKelamin}
                  onChange={(e) => setEditingSiswa({ ...editingSiswa, jenisKelamin: e.target.value as 'L' | 'P' })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                >
                  <option value="L">Laki-laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 font-bold text-white rounded-xl transition mt-2"
              >
                Simpan Perubahan Murid
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT KELAS MODAL --- */}
      {editingKelas && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white uppercase tracking-tight">Edit Data Kelas</h3>
              <button onClick={() => setEditingKelas(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateKelas} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-400 mb-1">Nama Kelas</label>
                <input
                  type="text"
                  required
                  value={editingKelas.namaKelas}
                  onChange={(e) => setEditingKelas({ ...editingKelas, namaKelas: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-400 mb-1">Wali Kelas</label>
                <select
                  value={editingKelas.waliKelas}
                  onChange={(e) => setEditingKelas({ ...editingKelas, waliKelas: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                >
                  <option value="Belum Ditentukan">-- Pilih Wali Kelas (Dari Data Guru) --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.nama}>
                      {t.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-400 mb-1">Jumlah Siswa</label>
                <input
                  type="number"
                  value={editingKelas.jumlahSiswa}
                  onChange={(e) => setEditingKelas({ ...editingKelas, jumlahSiswa: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 font-bold text-white rounded-xl transition mt-2"
              >
                Simpan Perubahan Kelas
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT MAPEL MODAL --- */}
      {editingMapel && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white uppercase tracking-tight">Edit Mata Pelajaran</h3>
              <button onClick={() => setEditingMapel(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateMapel} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-400 mb-1">Kode Mapel</label>
                <input
                  type="text"
                  value={editingMapel.kode}
                  onChange={(e) => setEditingMapel({ ...editingMapel, kode: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-400 mb-1">Nama Mata Pelajaran</label>
                <input
                  type="text"
                  required
                  value={editingMapel.namaMapel}
                  onChange={(e) => setEditingMapel({ ...editingMapel, namaMapel: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-400 mb-1">Kelompok Mapel</label>
                <select
                  value={editingMapel.kelompok}
                  onChange={(e) => setEditingMapel({ ...editingMapel, kelompok: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                >
                  <option value="Wajib">Wajib</option>
                  <option value="Peminatan">Peminatan</option>
                  <option value="Muatan Lokal">Muatan Lokal</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 font-bold text-white rounded-xl transition mt-2"
              >
                Simpan Perubahan Mapel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT BUKU BACAAN MODAL --- */}
      {editingBuku && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white uppercase tracking-tight">Edit Buku Perpustakaan</h3>
              <button onClick={() => setEditingBuku(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateBuku} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-400 mb-1">Judul Buku Bacaan</label>
                <input
                  type="text"
                  required
                  value={editingBuku.judul}
                  onChange={(e) => setEditingBuku({ ...editingBuku, judul: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-400 mb-1">Pengarang / Penulis</label>
                <input
                  type="text"
                  value={editingBuku.pengarang}
                  onChange={(e) => setEditingBuku({ ...editingBuku, pengarang: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Penerbit</label>
                  <input
                    type="text"
                    value={editingBuku.penerbit}
                    onChange={(e) => setEditingBuku({ ...editingBuku, penerbit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Kategori</label>
                  <input
                    type="text"
                    value={editingBuku.kategori}
                    onChange={(e) => setEditingBuku({ ...editingBuku, kategori: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Tahun Terbit</label>
                  <input
                    type="number"
                    value={editingBuku.tahunTerbit}
                    onChange={(e) => setEditingBuku({ ...editingBuku, tahunTerbit: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Stok Ekslempar</label>
                  <input
                    type="number"
                    value={editingBuku.stok}
                    onChange={(e) => setEditingBuku({ ...editingBuku, stok: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-slate-400 mb-1">URL Link PDF / File Digital</label>
                <input
                  type="url"
                  placeholder="https://example.com/buku-modul.pdf (Opsional)"
                  value={editingBuku.filePdfDemoUrl || ''}
                  onChange={(e) => setEditingBuku({ ...editingBuku, filePdfDemoUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-blue-300 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-400 mb-1">Ringkasan Modul</label>
                <textarea
                  rows={3}
                  value={editingBuku.ringkasan}
                  onChange={(e) => setEditingBuku({ ...editingBuku, ringkasan: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 font-bold text-white rounded-xl transition mt-2 flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" /> Simpan Perubahan Buku
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- TOAST NOTIFICATION BANNER --- */}
      {toastMessage && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400 font-semibold text-sm animate-bounce max-w-md text-center">
          <CheckCircle2 className="w-5 h-5 text-emerald-200 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* --- CUSTOM DELETE CONFIRMATION MODAL --- */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 bg-rose-950/80 rounded-xl border border-rose-800/50">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Konfirmasi Hapus</h3>
                <p className="text-xs text-slate-400">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>
            <p className="text-sm text-slate-300">
              Apakah Anda yakin ingin menghapus data <span className="font-bold text-white">{deleteTarget.name}</span>?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteAction}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-rose-950"
              >
                <Trash2 className="w-4 h-4" /> Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CUSTOM DELETE ALL CATEGORY CONFIRMATION MODAL --- */}
      {deleteAllCategory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 bg-rose-950/80 rounded-xl border border-rose-800/50">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">
                  Konfirmasi {
                    deleteAllCategory === 'guru' ? 'Hapus Guru' :
                    deleteAllCategory === 'siswa' ? 'Hapus Murid' :
                    deleteAllCategory === 'kelas' ? 'Hapus Kelas' :
                    deleteAllCategory === 'mapel' ? 'Hapus Mapel' :
                    'Hapus Buku'
                  }
                </h3>
                <p className="text-xs text-rose-300 font-semibold">Tindakan ini menghapus seluruh data pada tab ini!</p>
              </div>
            </div>
            <div className="bg-rose-950/40 border border-rose-900/60 rounded-xl p-3 text-xs text-rose-200 leading-relaxed">
              Apakah Anda yakin ingin menghapus <span className="font-black underline text-white">
                SEMUA DATA {
                  deleteAllCategory === 'guru' ? 'GURU' :
                  deleteAllCategory === 'siswa' ? 'MURID' :
                  deleteAllCategory === 'kelas' ? 'KELAS' :
                  deleteAllCategory === 'mapel' ? 'MAPEL' :
                  'BUKU'
                }
              </span>? 
              Tindakan ini tidak dapat dibatalkan dan seluruh catatan terkait akan terhapus permanen.
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteAllCategory(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteAllAction}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-rose-950"
              >
                <Trash2 className="w-4 h-4" /> Ya, {
                  deleteAllCategory === 'guru' ? 'Hapus Guru' :
                  deleteAllCategory === 'siswa' ? 'Hapus Murid' :
                  deleteAllCategory === 'kelas' ? 'Hapus Kelas' :
                  deleteAllCategory === 'mapel' ? 'Hapus Mapel' :
                  'Hapus Buku'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MASTER DELETE ALL DATA MODAL (FOR ALL 7 CATEGORIES) --- */}
      {showDeleteAllDataModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-slate-100 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5 text-rose-400">
                <div className="p-3 bg-rose-950/80 rounded-2xl border border-rose-800/60 shadow-lg shadow-rose-950/50">
                  <Trash2 className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white">Kosongkan / Hapus Semua Data</h3>
                  <p className="text-xs text-rose-300 font-medium">Pilih kategori data yang ingin Anda hapus secara permanen:</p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteAllDataModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              <div className="flex items-center justify-between px-1 pb-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kategori Data Akademik & Agenda</span>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAllDelete(true)}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAllDelete(false)}
                    className="text-slate-400 hover:text-slate-200 font-semibold"
                  >
                    Hapus Pilihan
                  </button>
                </div>
              </div>

              {/* Checkbox item 1: Guru */}
              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-rose-500/40 cursor-pointer transition">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedDeleteItems.teachers}
                    onChange={(e) => setSelectedDeleteItems({ ...selectedDeleteItems, teachers: e.target.checked })}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-700 bg-slate-900"
                  />
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-200">Data Guru</span>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-400">
                  {teachers.length} item
                </span>
              </label>

              {/* Checkbox item 2: Murid */}
              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-rose-500/40 cursor-pointer transition">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedDeleteItems.students}
                    onChange={(e) => setSelectedDeleteItems({ ...selectedDeleteItems, students: e.target.checked })}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-700 bg-slate-900"
                  />
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-200">Data Murid / Siswa</span>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-400">
                  {students.length} item
                </span>
              </label>

              {/* Checkbox item 3: Kelas */}
              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-rose-500/40 cursor-pointer transition">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedDeleteItems.classes}
                    onChange={(e) => setSelectedDeleteItems({ ...selectedDeleteItems, classes: e.target.checked })}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-700 bg-slate-900"
                  />
                  <div className="flex items-center gap-2">
                    <School className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-slate-200">Data Kelas</span>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-400">
                  {classes.length} item
                </span>
              </label>

              {/* Checkbox item 4: Mapel */}
              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-rose-500/40 cursor-pointer transition">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedDeleteItems.subjects}
                    onChange={(e) => setSelectedDeleteItems({ ...selectedDeleteItems, subjects: e.target.checked })}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-700 bg-slate-900"
                  />
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-teal-400" />
                    <span className="text-xs font-bold text-slate-200">Data Mata Pelajaran</span>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-400">
                  {subjects.length} item
                </span>
              </label>

              {/* Checkbox item 5: Bacaan Perpustakaan */}
              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-rose-500/40 cursor-pointer transition">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedDeleteItems.libraryBooks}
                    onChange={(e) => setSelectedDeleteItems({ ...selectedDeleteItems, libraryBooks: e.target.checked })}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-700 bg-slate-900"
                  />
                  <div className="flex items-center gap-2">
                    <BookMarked className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-slate-200">Daftar Bacaan Perpustakaan</span>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-400">
                  {libraryBooks.length} item
                </span>
              </label>

              {/* Checkbox item 6: Jadwal Mengajar */}
              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-rose-500/40 cursor-pointer transition">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedDeleteItems.schedules}
                    onChange={(e) => setSelectedDeleteItems({ ...selectedDeleteItems, schedules: e.target.checked })}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-700 bg-slate-900"
                  />
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-slate-200">Jadwal Mengajar</span>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-400">
                  {schedules.length} item
                </span>
              </label>

              {/* Checkbox item 7: Kalender Kegiatan */}
              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-rose-500/40 cursor-pointer transition">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedDeleteItems.calendarEvents}
                    onChange={(e) => setSelectedDeleteItems({ ...selectedDeleteItems, calendarEvents: e.target.checked })}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-700 bg-slate-900"
                  />
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-slate-200">Kalender Kegiatan / Agenda</span>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-400">
                  {calendarEvents.length} item
                </span>
              </label>
            </div>

            <div className="bg-rose-950/40 border border-rose-900/60 rounded-2xl p-3.5 text-xs text-rose-200 leading-relaxed">
              ⚠️ <span className="font-bold">Peringatan:</span> Kategori data yang dicentang di atas akan dihapus secara permanen dan tidak dapat dikembalikan.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteAllDataModal(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteAllData}
                disabled={!Object.values(selectedDeleteItems).some(Boolean)}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:hover:bg-rose-600 text-white font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-rose-950"
              >
                <Trash2 className="w-4 h-4" /> Ya, Hapus Data Terpilih
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
