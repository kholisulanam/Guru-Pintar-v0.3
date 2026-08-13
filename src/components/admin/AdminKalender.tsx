import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  UserCheck,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Tag,
  BookOpen,
  Users,
  Award,
  Sparkles,
  RefreshCw,
  BellRing,
  Send,
  Building2,
  LayoutGrid,
  List,
  Volume2,
  Radio
} from 'lucide-react';
import { CalendarEvent, CalendarEventType, ScheduleItem, TeacherItem, ClassItem, SubjectItem } from '../../types';
import { getTodayString } from '../../lib/storage';
import { matchTeacher, matchSubject, matchClass } from '../../lib/matchUtils';
import {
  broadcastReminderToAll,
  playReminderChime,
  requestNotificationPermission,
  sendBrowserNotification
} from '../../lib/reminderService';

interface AdminKalenderProps {
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  schedules?: ScheduleItem[];
  teachers?: TeacherItem[];
  classes?: ClassItem[];
  subjects?: SubjectItem[];
}

export const AdminKalender: React.FC<AdminKalenderProps> = ({
  events,
  setEvents,
  schedules = [],
  teachers = [],
  classes = [],
  subjects = [],
}) => {
  const todayStr = getTodayString();
  const todayDateObj = new Date();

  // Calendar State
  const [currentYear, setCurrentYear] = useState<number>(todayDateObj.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(todayDateObj.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [filterType, setFilterType] = useState<string>('semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    judul: string;
    deskripsi: string;
    tanggal: string;
    jamMulai: string;
    jamSelesai: string;
    tipe: CalendarEventType;
    lokasi: string;
    penanggungJawab: string;
    warna: 'emerald' | 'amber' | 'indigo' | 'rose' | 'purple' | 'cyan';
    kirimReminder: boolean;
  }>({
    judul: '',
    deskripsi: '',
    tanggal: todayStr,
    jamMulai: '08:00',
    jamSelesai: '10:00',
    tipe: 'kegiatan_sekolah',
    lokasi: '',
    penanggungJawab: '',
    warna: 'indigo',
    kirimReminder: true,
  });

  // Delete confirmation & Toast
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);
  const [showDeleteSyncModal, setShowDeleteSyncModal] = useState<boolean>(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState<boolean>(false);
  const [showDeleteSelectedDateModal, setShowDeleteSelectedDateModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleGoToday = () => {
    const d = new Date();
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth());
    setSelectedDate(todayStr);
  };

  // Feature 1: Sinkronisasi Jadwal Mengajar
  const handleSyncTeachingSchedules = () => {
    const targetDateStr = selectedDate || todayStr;
    const targetDateObj = new Date(targetDateStr);

    const dayMap = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const targetDayIndex = targetDateObj.getDay();
    const targetDayName = dayMap[targetDayIndex];

    // Filter schedules for the target day
    const matchingSchedules = schedules.filter((s) => {
      const schHari = s.hari.toLowerCase().trim();
      const targetHari = targetDayName.toLowerCase().trim();
      return schHari.startsWith(targetHari.slice(0, 3));
    });

    const schedulesToSync = matchingSchedules.length > 0 ? matchingSchedules : schedules;

    if (schedulesToSync.length === 0) {
      showToast('Tidak ada data jadwal mengajar di sistem untuk disinkronkan.');
      return;
    }

    const syncedItems: CalendarEvent[] = [];
    const seenSyncKeys = new Set<string>();

    schedulesToSync.forEach((sch) => {
      const guruObj = matchTeacher(sch.guruId, teachers);
      const guru = guruObj?.nama || sch.guruId || 'Guru Pengajar';

      const kelasObj = matchClass(sch.kelasId, classes);
      const kelas = kelasObj?.namaKelas || sch.kelasId || 'Kelas';

      const mapelObj = matchSubject(sch.mapelId, subjects);
      const mapel = mapelObj?.namaMapel || sch.mapelId || 'Mata Pelajaran';

      const jamText = sch.jamKe || '08:00 - 09:30';
      const parts = jamText.split('-');
      const jamMulaiRaw = parts[0]?.trim() || '08:00';
      const jamSelesaiRaw = parts[1]?.trim() || '09:30';

      const jamMulaiFormatted = jamMulaiRaw.replace('.', ':');
      const jamSelesaiFormatted = jamSelesaiRaw.replace('.', ':');

      // Uniqueness key to avoid duplicate schedules
      const syncKey = `${targetDateStr}_${mapel.toLowerCase().trim()}_${kelas.toLowerCase().trim()}_${jamMulaiFormatted}_${jamSelesaiFormatted}_${guru.toLowerCase().trim()}`;

      if (seenSyncKeys.has(syncKey)) {
        return; // Skip internal duplicates
      }
      seenSyncKeys.add(syncKey);

      syncedItems.push({
        id: `sync-sch-${sch.id}-${targetDateStr}`,
        judul: `KBM: ${mapel} (${kelas})`,
        deskripsi: `Mata Pelajaran: ${mapel} | Jam: ${jamText} | Kelas: ${kelas} | Guru Pengajar: ${guru}`,
        tanggal: targetDateStr,
        jamMulai: jamMulaiFormatted,
        jamSelesai: jamSelesaiFormatted,
        tipe: 'jam_mengajar',
        lokasi: `Kelas ${kelas}`,
        penanggungJawab: guru,
        warna: 'emerald',
      });
    });

    setEvents((prev) => {
      // Build set of existing keys in current events for targetDateStr
      const existingKeys = new Set(
        prev.map((e) => {
          const eMapel = e.judul.replace(/^KBM:\s*/i, '').replace(/\s*\([^)]*\)$/, '').toLowerCase().trim();
          const eKelas = (e.lokasi || '').replace(/^Ruang\s*/i, '').replace(/^Kelas\s*/i, '').toLowerCase().trim();
          const eGuru = (e.penanggungJawab || '').toLowerCase().trim();
          return `${e.tanggal}_${eMapel}_${eKelas}_${e.jamMulai}_${e.jamSelesai}_${eGuru}`;
        })
      );

      const newItems = syncedItems.filter((e) => {
        const eMapel = e.judul.replace(/^KBM:\s*/i, '').replace(/\s*\([^)]*\)$/, '').toLowerCase().trim();
        const eKelas = (e.lokasi || '').replace(/^Ruang\s*/i, '').replace(/^Kelas\s*/i, '').toLowerCase().trim();
        const eGuru = (e.penanggungJawab || '').toLowerCase().trim();
        const key = `${e.tanggal}_${eMapel}_${eKelas}_${e.jamMulai}_${e.jamSelesai}_${eGuru}`;

        if (existingKeys.has(key)) {
          return false;
        }
        existingKeys.add(key);
        return true;
      });

      if (newItems.length === 0) {
        showToast(`Semua (${syncedItems.length}) jadwal mengajar hari ${targetDayName} sudah tersinkronisasi di Kalender (tidak ada duplikat)!`);
        return prev;
      }

      showToast(`Berhasil menyinkronkan ${newItems.length} Jadwal Mengajar hari ${targetDayName} ke Kalender Kegiatan!`);
      return [...prev, ...newItems];
    });
  };

  // Feature 2: Send Reminder Notification to All Teachers (Real-time Broadcast to All Devices)
  const handleSendReminderToAllTeachers = (evt?: CalendarEvent) => {
    playReminderChime();

    if (evt) {
      broadcastReminderToAll({
        id: `broadcast-${evt.id}-${Date.now()}`,
        judul: evt.judul,
        deskripsi: evt.deskripsi || `Pemberitahuan khusus dari Admin/Kurikulum MAS AL-AMIEN untuk kegiatan ${evt.tipe.replace('_', ' ')}.`,
        tanggal: evt.tanggal,
        jamMulai: evt.jamMulai || 'Sesuai Jadwal',
        lokasi: evt.lokasi || 'Ruang Madrasah',
        penanggungJawab: evt.penanggungJawab || 'Admin / Kurikulum',
        senderName: 'Admin Madrasah',
        timestamp: Date.now(),
        type: 'manual_broadcast'
      });
      sendBrowserNotification('⏰ REMINDER KBM & AGENDA GURU', `${evt.judul} - ${evt.jamMulai || ''} (${evt.lokasi || 'Madrasah'})`);
      showToast(`🔔 Broadcast Reminder "${evt.judul}" telah disiarkan ke seluruh perangkat & portal Guru!`);
    } else {
      const activeEvents = events.filter((e) => e.tanggal >= todayStr);
      const nextEvt = activeEvents[0];
      const title = nextEvt ? `Reminder Agenda: ${nextEvt.judul}` : 'Peringatan Agenda & KBM Guru';
      const desc = nextEvt
        ? `Kegiatan mendatang "${nextEvt.judul}" pada ${nextEvt.tanggal} (${nextEvt.jamMulai || 'TBA'}). Dimohon seluruh guru bersiap.`
        : 'Semua guru dimohon memeriksa jadwal KBM dan kalender kegiatan madrasah.';

      broadcastReminderToAll({
        id: `broadcast-general-${Date.now()}`,
        judul: title,
        deskripsi: desc,
        tanggal: nextEvt?.tanggal || todayStr,
        jamMulai: nextEvt?.jamMulai || '07.00 WIB',
        lokasi: nextEvt?.lokasi || 'Komplek MAS AL-AMIEN I',
        penanggungJawab: 'Kurikulum & Kesiswaan',
        senderName: 'Admin Utama',
        timestamp: Date.now(),
        type: 'manual_broadcast'
      });
      sendBrowserNotification('⏰ BROADCAST REMINDER GURU', title);
      showToast(`🔔 Notifikasi Reminder untuk ${activeEvents.length} agenda berhasil disiarkan ke SEMUA perangkat Guru!`);
    }
  };

  // Generate calendar grid days
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    // Previous month padding days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        dayNumber: day,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        dayNumber: day,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // Next month padding days to make full grid of 35 or 42 cells
    const totalCells = days.length > 35 ? 42 : 35;
    const remaining = totalCells - days.length;
    for (let day = 1; day <= remaining; day++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        dayNumber: day,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    return days;
  }, [currentYear, currentMonth, todayStr]);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Open Add Event Modal
  const handleOpenAddModal = (dateForEvent?: string) => {
    setEditingEvent(null);
    setFormData({
      judul: '',
      deskripsi: '',
      tanggal: dateForEvent || selectedDate || todayStr,
      jamMulai: '08:00',
      jamSelesai: '10:00',
      tipe: 'kegiatan_sekolah',
      lokasi: 'Aula MAS Al-Amien',
      penanggungJawab: 'Panitia Madrasah',
      warna: 'indigo',
      kirimReminder: true,
    });
    setShowModal(true);
  };

  // Open Edit Event Modal
  const handleOpenEditModal = (evt: CalendarEvent) => {
    setEditingEvent(evt);
    setFormData({
      judul: evt.judul,
      deskripsi: evt.deskripsi || '',
      tanggal: evt.tanggal,
      jamMulai: evt.jamMulai || '08:00',
      jamSelesai: evt.jamSelesai || '10:00',
      tipe: evt.tipe,
      lokasi: evt.lokasi || '',
      penanggungJawab: evt.penanggungJawab || '',
      warna: evt.warna || 'indigo',
      kirimReminder: false,
    });
    setShowModal(true);
  };

  // Save Event Form Submit
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.judul.trim() || !formData.tanggal) {
      alert('Judul acara dan tanggal wajib diisi!');
      return;
    }

    const eventPayload: CalendarEvent = {
      id: editingEvent ? editingEvent.id : `evt-${Date.now()}`,
      judul: formData.judul,
      deskripsi: formData.deskripsi,
      tanggal: formData.tanggal,
      jamMulai: formData.jamMulai,
      jamSelesai: formData.jamSelesai,
      tipe: formData.tipe,
      lokasi: formData.lokasi,
      penanggungJawab: formData.penanggungJawab,
      warna: formData.warna,
    };

    if (editingEvent) {
      setEvents((prev) =>
        prev.map((item) => (item.id === editingEvent.id ? eventPayload : item))
      );
      showToast('Acara kalender berhasil diperbarui!');
    } else {
      setEvents((prev) => [...prev, eventPayload]);
      if (formData.kirimReminder) {
        showToast(`Acara baru disimpan & Reminder disiarkan ke seluruh Guru!`);
      } else {
        showToast('Acara kalender baru berhasil disimpan!');
      }
    }

    setShowModal(false);
  };

  // Delete Event
  const handleDeleteConfirm = () => {
    if (!eventToDelete) return;
    setEvents((prev) => prev.filter((item) => item.id !== eventToDelete.id));
    showToast('Acara berhasil dihapus dari kalender.');
    setEventToDelete(null);
  };

  // Delete Synced Teaching Schedules
  const handleDeleteSyncConfirm = () => {
    const syncedCount = events.filter(
      (e) => e.tipe === 'jam_mengajar' || e.id.startsWith('sync-sch-')
    ).length;
    if (syncedCount === 0) {
      showToast('Tidak ada data jadwal tersinkronisasi di kalender.');
      setShowDeleteSyncModal(false);
      return;
    }
    setEvents((prev) =>
      prev.filter((e) => e.tipe !== 'jam_mengajar' && !e.id.startsWith('sync-sch-'))
    );
    showToast(`Berhasil menghapus ${syncedCount} jadwal KBM tersinkronisasi dari kalender!`);
    setShowDeleteSyncModal(false);
  };

  // Delete All Events
  const handleDeleteAllConfirm = () => {
    if (events.length === 0) {
      showToast('Kalender sudah kosong, tidak ada acara untuk dihapus.');
      setShowDeleteAllModal(false);
      return;
    }
    const count = events.length;
    setEvents([]);
    showToast(`Berhasil menghapus seluruh (${count}) acara dari kalender!`);
    setShowDeleteAllModal(false);
  };

  // Delete Events on Selected Date
  const handleDeleteSelectedDateConfirm = () => {
    if (eventsOnSelectedDate.length === 0) {
      showToast('Tidak ada acara pada tanggal terpilih.');
      setShowDeleteSelectedDateModal(false);
      return;
    }
    const count = eventsOnSelectedDate.length;
    setEvents((prev) => prev.filter((e) => e.tanggal !== selectedDate));
    showToast(`Berhasil menghapus ${count} acara pada tanggal ${selectedDate}!`);
    setShowDeleteSelectedDateModal(false);
  };

  // Filtered Events List
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const matchType = filterType === 'semua' || evt.tipe === filterType;
      const matchSearch =
        evt.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (evt.deskripsi && evt.deskripsi.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (evt.lokasi && evt.lokasi.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchType && matchSearch;
    });
  }, [events, filterType, searchQuery]);

  // Selected Date Events
  const eventsOnSelectedDate = useMemo(() => {
    return filteredEvents.filter((evt) => evt.tanggal === selectedDate);
  }, [filteredEvents, selectedDate]);

  // Upcoming Events (from today onwards)
  const upcomingEvents = useMemo(() => {
    return filteredEvents
      .filter((evt) => evt.tanggal >= todayStr)
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  }, [filteredEvents, todayStr]);

  // Helper badge renderers
  const getTypeBadge = (tipe: CalendarEventType) => {
    switch (tipe) {
      case 'jam_mengajar':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> Jam Mengajar
          </span>
        );
      case 'rapat_orang_tua':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <Users className="w-3 h-3" /> Rapat Orang Tua
          </span>
        );
      case 'kegiatan_sekolah':
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
            <Award className="w-3 h-3" /> Kegiatan Madrasah
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
            <Tag className="w-3 h-3" /> Agenda Lainnya
          </span>
        );
    }
  };

  const getWarnaBorderClass = (warna?: string) => {
    switch (warna) {
      case 'emerald':
        return 'border-l-4 border-l-emerald-500 bg-emerald-950/20 hover:bg-emerald-900/30';
      case 'amber':
        return 'border-l-4 border-l-amber-500 bg-amber-950/20 hover:bg-amber-900/30';
      case 'rose':
        return 'border-l-4 border-l-rose-500 bg-rose-950/20 hover:bg-rose-900/30';
      case 'cyan':
        return 'border-l-4 border-l-cyan-500 bg-cyan-950/20 hover:bg-cyan-900/30';
      case 'purple':
        return 'border-l-4 border-l-purple-500 bg-purple-950/20 hover:bg-purple-900/30';
      default:
        return 'border-l-4 border-l-indigo-500 bg-indigo-950/20 hover:bg-indigo-900/30';
    }
  };

  const getTipeLabel = (tipe: CalendarEventType) => {
    switch (tipe) {
      case 'jam_mengajar': return 'Jam Mengajar';
      case 'rapat_orang_tua': return 'Rapat Orang Tua';
      case 'kegiatan_sekolah': return 'Kegiatan Madrasah';
      default: return 'Lainnya';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-bounce border border-emerald-400">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900/70 via-slate-900 to-emerald-900/70 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Kalender Akademik & Agenda
            </span>
          </div>

          {/* Kalender Kegiatan with MAS AL-AMIEN I PRAGAAN directly below */}
          <h2 className="text-xl md:text-2xl font-bold text-white mt-2 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-indigo-400" /> Kalender Kegiatan
          </h2>
          <p className="text-sm font-semibold text-emerald-400 mt-0.5 tracking-wider uppercase flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-emerald-400" /> MAS AL-AMIEN I PRAGAAN
          </p>

          <p className="text-xs text-slate-300 mt-1.5">
            Kelola jadwal jam mengajar, rapat orang tua/wali murid, serta agenda kegiatan madrasah secara terpadu.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleSyncTeachingSchedules}
            className="px-3.5 py-2.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg transition transform hover:-translate-y-0.5"
            title="Sinkronisasi jadwal KBM guru ke kalender"
          >
            <RefreshCw className="w-4 h-4 text-indigo-300" /> Sinkronisasi Jadwal
          </button>

          <button
            onClick={() => setShowDeleteSyncModal(true)}
            className="px-3 py-2.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg transition transform hover:-translate-y-0.5"
            title="Hapus semua jadwal mengajar tersinkronisasi dari kalender"
          >
            <Trash2 className="w-4 h-4 text-rose-400" /> Hapus Sinkronisasi
          </button>

          <button
            onClick={() => handleSendReminderToAllTeachers()}
            className="px-3 py-2.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg transition transform hover:-translate-y-0.5"
            title="Kirimkan pemberitahuan ke semua guru"
          >
            <BellRing className="w-4 h-4 text-amber-300" /> Reminder Guru
          </button>

          <button
            onClick={() => handleOpenAddModal()}
            className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/30 transition transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" /> Tambah Acara Baru
          </button>

          <button
            onClick={() => setShowDeleteAllModal(true)}
            className="px-3 py-2.5 bg-rose-900/80 hover:bg-rose-800 text-white border border-rose-700/80 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/50 transition transform hover:-translate-y-0.5"
            title="Hapus seluruh acara dari kalender"
          >
            <Trash2 className="w-4 h-4" /> Hapus Semua Acara
          </button>
        </div>
      </div>

      {/* --- PANEL REMINDER SEMUA GURU (10 MENIT SEBELUM KEGIATAN) --- */}
      <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-indigo-950/80 p-4 rounded-2xl border border-amber-500/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/40 shrink-0">
            <Radio className="w-5 h-5 text-amber-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-amber-300 flex items-center gap-1.5">
                <BellRing className="w-4 h-4 text-amber-400" />
                Reminder Semua Guru (10 Menit Sebelum Kegiatan)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                Otomatis Aktif
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Sistem secara otomatis mengirimkan notifikasi suara & banner reminder <strong>10 menit sebelum jam KBM / kegiatan dimulai</strong> ke seluruh perangkat hp/laptop guru yang membuka aplikasi ini.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={requestNotificationPermission}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
            title="Aktifkan notifikasi browser di perangkat ini"
          >
            <BellRing className="w-3.5 h-3.5 text-indigo-400" />
            <span>Notifikasi Perangkat</span>
          </button>

          <button
            type="button"
            onClick={playReminderChime}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
            title="Uji coba bel suara reminder"
          >
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Tes Suara Bel</span>
          </button>

          <button
            type="button"
            onClick={() => handleSendReminderToAllTeachers()}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-950/60 transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Siarkan Broadcast Sekarang</span>
          </button>
        </div>
      </div>

      {/* Filters & Navigation Controls */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Event Type Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {[
            { id: 'semua', label: 'Semua Acara' },
            { id: 'jam_mengajar', label: 'Jam Mengajar' },
            { id: 'rapat_orang_tua', label: 'Rapat Orang Tua' },
            { id: 'kegiatan_sekolah', label: 'Kegiatan Madrasah' },
            { id: 'lainnya', label: 'Lainnya' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                filterType === tab.id
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar & View Mode Toggle */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari acara / lokasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* View Mode Toggle Switch (Grid vs List) */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
              title="Tampilan Kalender Grid"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
              title="Tampilan Daftar Agenda"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Daftar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Layout: Calendar Grid + Events Sidebar Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Calendar View (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4">
          {/* Month Header Controls */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {monthNames[currentMonth]} {currentYear}
              </h3>
              <button
                onClick={handleGoToday}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 rounded-lg text-[11px] font-semibold transition"
              >
                Hari Ini
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <>
              {/* Day Names Header */}
              <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-400 py-2 bg-slate-950/60 rounded-xl">
                <div className="text-rose-400">Ahad</div>
                <div>Senin</div>
                <div>Selasa</div>
                <div>Rabu</div>
                <div>Kamis</div>
                <div className="text-emerald-400">Jum'at</div>
                <div>Sabtu</div>
              </div>

              {/* Calendar Day Cells Grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((dayItem, idx) => {
                  const dayEvents = filteredEvents.filter((e) => e.tanggal === dayItem.dateStr);
                  const isSelected = selectedDate === dayItem.dateStr;

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDate(dayItem.dateStr)}
                      className={`min-h-[76px] p-1.5 rounded-xl border text-xs cursor-pointer transition relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-950/40 ring-2 ring-indigo-500/50'
                          : dayItem.isToday
                          ? 'border-emerald-500/80 bg-emerald-950/20'
                          : dayItem.isCurrentMonth
                          ? 'border-slate-800 bg-slate-950/40 hover:bg-slate-800/60'
                          : 'border-slate-800/40 bg-slate-950/10 opacity-40 hover:opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                            dayItem.isToday
                              ? 'bg-emerald-500 text-slate-950 shadow-md'
                              : isSelected
                              ? 'bg-indigo-600 text-white'
                              : dayItem.isCurrentMonth
                              ? 'text-slate-200'
                              : 'text-slate-500'
                          }`}
                        >
                          {dayItem.dayNumber}
                        </span>

                        {dayEvents.length > 0 && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        )}
                      </div>

                      {/* Micro event badges in day cell */}
                      <div className="space-y-1 mt-1 overflow-hidden">
                        {dayEvents.slice(0, 2).map((evt) => (
                          <div
                            key={evt.id}
                            className={`text-[10px] truncate px-1.5 py-0.5 rounded font-medium ${
                              evt.tipe === 'jam_mengajar'
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50'
                                : evt.tipe === 'rapat_orang_tua'
                                ? 'bg-amber-950/80 text-amber-300 border border-amber-800/50'
                                : evt.tipe === 'kegiatan_sekolah'
                                ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/50'
                                : 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/50'
                            }`}
                            title={evt.judul}
                          >
                            {evt.judul}
                          </div>
                        ))}

                        {dayEvents.length > 2 && (
                          <div className="text-[9px] text-slate-400 font-semibold text-right pr-0.5">
                            +{dayEvents.length - 2} acara lagi
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Legend Footer */}
              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Jam Mengajar
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Rapat Orang Tua
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> Kegiatan Madrasah
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  *Klik pada tanggal untuk melihat detail acara
                </span>
              </div>
            </>
          ) : (
            /* List / Agenda View */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                <span>Daftar Seluruh Agenda Bulan {monthNames[currentMonth]} {currentYear}</span>
                <span className="font-semibold text-indigo-400">{filteredEvents.length} Acara Ditemukan</span>
              </div>

              {filteredEvents.length === 0 ? (
                <div className="text-center py-12 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                  <CalendarIcon className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 font-medium">Tidak ada acara yang sesuai filter / pencarian di bulan ini.</p>
                  <button
                    onClick={() => handleOpenAddModal()}
                    className="mt-3 px-4 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-semibold"
                  >
                    + Buat Acara Baru
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {filteredEvents.map((evt) => (
                    <div
                      key={evt.id}
                      onClick={() => setSelectedDate(evt.tanggal)}
                      className={`p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer ${
                        selectedDate === evt.tanggal ? 'ring-2 ring-indigo-500/50 border-indigo-500' : ''
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800/60 rounded text-[10px] font-bold">
                            {evt.tanggal}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              evt.tipe === 'jam_mengajar'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : evt.tipe === 'rapat_orang_tua'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : evt.tipe === 'kegiatan_sekolah'
                                ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                                : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                            }`}
                          >
                            {getTipeLabel(evt.tipe)}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" /> {evt.jamMulai} - {evt.jamSelesai}
                          </span>
                        </div>
                        {evt.tipe === 'jam_mengajar' ? (
                          <div className="pt-1.5 space-y-1">
                            <h4 className="text-sm font-bold text-white">{evt.judul}</h4>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                              <span className="flex items-center gap-1 font-semibold text-emerald-300">
                                <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                                {evt.judul.replace(/^KBM:\s*/i, '').replace(/\s*\([^)]*\)$/, '')}
                              </span>
                              <span className="flex items-center gap-1 font-semibold text-amber-300">
                                <Clock className="w-3.5 h-3.5 text-amber-400" />
                                {evt.jamMulai} - {evt.jamSelesai} WIB
                              </span>
                              <span className="flex items-center gap-1 font-semibold text-teal-300">
                                <MapPin className="w-3.5 h-3.5 text-teal-400" />
                                {evt.lokasi}
                              </span>
                              <span className="flex items-center gap-1 font-semibold text-indigo-300">
                                <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                                {evt.penanggungJawab || '-'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <>
                            <h4 className="text-sm font-bold text-white">{evt.judul}</h4>
                            {evt.deskripsi && <p className="text-xs text-slate-300">{evt.deskripsi}</p>}
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                              {evt.lokasi && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-emerald-400" /> {evt.lokasi}
                                </span>
                              )}
                              {evt.penanggungJawab && (
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3 text-amber-400" /> PJ: {evt.penanggungJawab}
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(evt);
                          }}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1"
                          title="Edit Acara"
                        >
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEventToDelete(evt);
                          }}
                          className="px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 rounded-lg text-xs font-semibold flex items-center gap-1"
                          title="Hapus Acara"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Events Details & Agenda Panel (1 Col) */}
        <div className="space-y-5">
          {/* Selected Date Header Panel */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                  Agenda Tanggal Terpilih
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {selectedDate === todayStr ? (
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" /> Hari Ini ({selectedDate})
                    </span>
                  ) : (
                    selectedDate
                  )}
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                {eventsOnSelectedDate.length > 0 && (
                  <button
                    onClick={() => setShowDeleteSelectedDateModal(true)}
                    className="px-2.5 py-1.5 bg-rose-950/70 hover:bg-rose-900/90 text-rose-300 border border-rose-800/80 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                    title={`Hapus (${eventsOnSelectedDate.length}) acara di tanggal ${selectedDate}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Tanggal Ini</span>
                  </button>
                )}
                <button
                  onClick={() => handleOpenAddModal(selectedDate)}
                  className="p-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Plus className="w-4 h-4" /> Acara
                </button>
              </div>
            </div>

            {/* List of Events on Selected Date */}
            {eventsOnSelectedDate.length === 0 ? (
              <div className="text-center py-8 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                <CalendarIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">Tidak ada acara pada tanggal ini.</p>
                <button
                  onClick={() => handleOpenAddModal(selectedDate)}
                  className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 font-semibold underline"
                >
                  + Tambah Acara di Tanggal Ini
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {eventsOnSelectedDate.map((evt) => (
                  <div
                    key={evt.id}
                    className={`p-3.5 rounded-xl border border-slate-800 transition ${getWarnaBorderClass(
                      evt.warna
                    )}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        {getTypeBadge(evt.tipe)}
                        <h4 className="text-sm font-bold text-white mt-1.5">{evt.judul}</h4>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSendReminderToAllTeachers(evt)}
                          className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg transition"
                          title="Kirim Reminder ke Guru"
                        >
                          <BellRing className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(evt)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                          title="Edit Acara"
                        >
                          <Edit className="w-3.5 h-3.5 text-indigo-400" />
                        </button>
                        <button
                          onClick={() => setEventToDelete(evt)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                          title="Hapus Acara"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                      {evt.tipe === 'jam_mengajar' ? (
                        <div className="p-2.5 bg-slate-950/80 rounded-xl border border-emerald-800/50 space-y-2 my-1.5">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">Mata Pelajaran</span>
                              <span className="font-bold text-emerald-300">{evt.judul.replace(/^KBM:\s*/i, '').replace(/\s*\([^)]*\)$/, '')}</span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">Jam</span>
                              <span className="font-bold text-amber-300">{evt.jamMulai} - {evt.jamSelesai} WIB</span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">Kelas</span>
                              <span className="font-bold text-teal-300">{evt.lokasi}</span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">Guru Pengajar</span>
                              <span className="font-bold text-indigo-300">{evt.penanggungJawab || '-'}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {(evt.jamMulai || evt.jamSelesai) && (
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>
                                {evt.jamMulai || '08:00'} - {evt.jamSelesai || 'Selesai'} WIB
                              </span>
                            </div>
                          )}

                          {evt.lokasi && (
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>{evt.lokasi}</span>
                            </div>
                          )}

                          {evt.penanggungJawab && (
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <UserCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              <span>PJ: {evt.penanggungJawab}</span>
                            </div>
                          )}

                          {evt.deskripsi && (
                            <p className="text-slate-400 text-xs mt-2 pt-2 border-t border-slate-800/60 leading-relaxed italic">
                              "{evt.deskripsi}"
                            </p>
                          )}
                        </>
                      )}

                      <button
                        onClick={() => handleSendReminderToAllTeachers(evt)}
                        className="mt-2 text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 pt-1 border-t border-slate-800/40"
                      >
                        <Send className="w-3 h-3" /> Kirim Reminder WhatsApp/Portal Guru
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Events Overview Card */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" /> Acara Mendatang ({upcomingEvents.length})
              </span>
            </h3>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {upcomingEvents.slice(0, 5).map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => setSelectedDate(evt.tanggal)}
                  className="p-3 bg-slate-950/60 hover:bg-slate-800/80 rounded-xl border border-slate-800/80 transition cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-indigo-400 block">
                      {evt.tanggal}
                    </span>
                    <h5 className="text-xs font-semibold text-white line-clamp-1">{evt.judul}</h5>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-400" /> {evt.lokasi || 'Madrasah'}
                    </p>
                  </div>

                  <div className="shrink-0">{getTypeBadge(evt.tipe)}</div>
                </div>
              ))}

              {upcomingEvents.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">Belum ada agenda mendatang.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Event Modal with fixed max-height & bottom sticky actions */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5 overflow-hidden">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full max-h-[85vh] h-auto flex flex-col shadow-2xl relative my-auto">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-indigo-400" />
                {editingEvent ? 'Edit Acara' : 'Tambah Acara Baru'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form
              id="calendar-event-form"
              onSubmit={handleSubmitForm}
              className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1 min-h-0"
            >
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Judul Acara *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rapat Orang Tua Wali Murid Kelas XII"
                  value={formData.judul}
                  onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tipe Acara</label>
                  <select
                    value={formData.tipe}
                    onChange={(e) =>
                      setFormData({ ...formData, tipe: e.target.value as CalendarEventType })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="jam_mengajar">Jam Mengajar</option>
                    <option value="rapat_orang_tua">Rapat Orang Tua</option>
                    <option value="kegiatan_sekolah">Kegiatan Madrasah</option>
                    <option value="lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tanggal *</label>
                  <input
                    type="date"
                    required
                    value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    value={formData.jamMulai}
                    onChange={(e) => setFormData({ ...formData, jamMulai: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    value={formData.jamSelesai}
                    onChange={(e) => setFormData({ ...formData, jamSelesai: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Lokasi</label>
                  <input
                    type="text"
                    placeholder="Contoh: Aula MAS Al-Amien"
                    value={formData.lokasi}
                    onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Penanggung Jawab</label>
                  <input
                    type="text"
                    placeholder="Contoh: Syaifudin Kudsi, MA"
                    value={formData.penanggungJawab}
                    onChange={(e) => setFormData({ ...formData, penanggungJawab: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Deskripsi / Catatan Tambahan</label>
                <textarea
                  rows={3}
                  placeholder="Keterangan agenda, persyaratan peserta, atau catatan rapat..."
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Pilihan Akses Warna</label>
                <div className="flex items-center gap-3 pt-1">
                  {[
                    { id: 'indigo', name: 'Indigo', bg: 'bg-indigo-600' },
                    { id: 'emerald', name: 'Emerald', bg: 'bg-emerald-600' },
                    { id: 'amber', name: 'Amber', bg: 'bg-amber-600' },
                    { id: 'rose', name: 'Rose', bg: 'bg-rose-600' },
                    { id: 'cyan', name: 'Cyan', bg: 'bg-cyan-600' },
                    { id: 'purple', name: 'Purple', bg: 'bg-purple-600' },
                  ].map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, warna: color.id as any })}
                      className={`w-7 h-7 rounded-full ${color.bg} transition transform ${
                        formData.warna === color.id
                          ? 'ring-2 ring-white scale-110 shadow-lg'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Automatic Reminder Toggle */}
              <div className="p-3 bg-amber-950/30 border border-amber-800/50 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-semibold text-white block">Kirim Reminder ke Semua Guru</span>
                    <span className="text-[11px] text-slate-400">Notifikasi otomatis akan disiarkan ke seluruh akun Guru MAS AL-AMIEN.</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.kirimReminder}
                  onChange={(e) => setFormData({ ...formData, kirimReminder: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>
            </form>

            {/* Pinned Bottom Action Footer with Batal and Simpan */}
            <div className="p-4 border-t border-slate-800 bg-slate-900 rounded-b-2xl flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition"
              >
                Batal
              </button>
              <button
                type="submit"
                form="calendar-event-form"
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-900/40 text-xs transition"
              >
                {editingEvent ? 'Simpan Perubahan' : 'Simpan Acara'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h4 className="text-base font-bold text-white">Hapus Acara?</h4>
            <p className="text-xs text-slate-400">
              Apakah Anda yakin ingin menghapus acara <span className="font-semibold text-white">"{eventToDelete.judul}"</span>? Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setEventToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-900/40"
              >
                Hapus Acara
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Sync Schedules Confirmation Modal */}
      {showDeleteSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/30">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">Hapus Jadwal Tersinkronisasi?</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus seluruh jadwal KBM/Mengajar hasil sinkronisasi dari kalender?
            </p>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span>Jumlah Jadwal KBM Tersinkron:</span>
              <span className="font-bold text-rose-400 text-sm">
                {events.filter((e) => e.tipe === 'jam_mengajar' || e.id.startsWith('sync-sch-')).length} Acara
              </span>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              *Acara manual seperti Rapat Orang Tua dan Kegiatan Madrasah tidak akan terhapus.
            </p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowDeleteSyncModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteSyncConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-900/40"
              >
                Hapus Sinkronisasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Events Confirmation Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/30">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">Hapus Seluruh Acara Kalender?</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus <strong>SELURUH ACARA</strong> di Kalender Kegiatan? Tindakan ini akan mengosongkan seluruh agenda kalender.
            </p>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span>Total Acara Saat Ini:</span>
              <span className="font-bold text-rose-400 text-sm">{events.length} Acara</span>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowDeleteAllModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteAllConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-900/40"
              >
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Selected Date Events Confirmation Modal */}
      {showDeleteSelectedDateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/30">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">Hapus Acara Tanggal {selectedDate}?</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus seluruh acara pada tanggal <span className="font-semibold text-white">{selectedDate}</span>?
            </p>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span>Jumlah Acara pada Tanggal Ini:</span>
              <span className="font-bold text-rose-400 text-sm">{eventsOnSelectedDate.length} Acara</span>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowDeleteSelectedDateModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteSelectedDateConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-900/40"
              >
                Hapus Acara Tanggal Ini
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
