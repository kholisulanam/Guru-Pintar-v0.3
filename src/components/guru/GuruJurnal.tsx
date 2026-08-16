import React, { useState, useEffect } from 'react';
import { TeachingJournal, SchoolSettings, User, ClassItem, SubjectItem, TeacherItem, ScheduleItem } from '../../types';
import { storageService, getTodayString } from '../../lib/storage';
import { BookOpen, Plus, Trash2, FileSpreadsheet, Printer } from 'lucide-react';
import { exportToExcel, exportToPdfReport } from '../../lib/exportUtils';
import { isTeacherMatch, getTeacherSubjects, isClassMatch, matchClass } from '../../lib/matchUtils';
import { KopSekolah } from '../common/KopSekolah';
import { TandaTangan } from '../common/TandaTangan';
import { JamPelajaranDropdown, parseJamValueToNumbers } from '../common/JamPelajaranDropdown';
import { useToast } from '../../context/ToastContext';

interface GuruJurnalProps {
  currentUser: User;
  settings: SchoolSettings;
  classes: ClassItem[];
  subjects: SubjectItem[];
  teachers?: TeacherItem[];
  schedules?: ScheduleItem[];
  teachingJournals: TeachingJournal[];
  setTeachingJournals: React.Dispatch<React.SetStateAction<TeachingJournal[]>>;
}

export const GuruJurnal: React.FC<GuruJurnalProps> = ({
  currentUser,
  settings,
  classes,
  subjects,
  teachers = [],
  schedules = [],
  teachingJournals,
  setTeachingJournals,
}) => {
  const toast = useToast();
  const todayStr = getTodayString();

  // Get subjects taught by this teacher based on user profile, teacher data, and schedules
  const availableSubjects = getTeacherSubjects(currentUser, subjects, teachers, schedules);

  const [tanggal, setTanggal] = useState(todayStr);
  const [jamKe, setJamKe] = useState('08.30 - 10.00');
  const [kelasId, setKelasId] = useState(classes[0]?.id || 'cls-12a');
  const [mapelId, setMapelId] = useState(availableSubjects[0]?.id || subjects[0]?.id || 'sub-2');
  const [materi, setMateri] = useState('');
  const [catatanSiswa, setCatatanSiswa] = useState('');

  const [filterKelas, setFilterKelas] = useState(classes[0]?.id || 'cls-12a');

  // Helper to get Indonesian day name from date string
  const getDayNameFromDate = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const daysMap = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      return daysMap[d.getDay()];
    } catch {
      return '';
    }
  };

  const dayName = getDayNameFromDate(tanggal);

  // Filter schedules belonging to this teacher
  const teacherSchedules = schedules.filter((s) => isTeacherMatch(s.guruId, currentUser));

  // Match schedules specifically for this teacher, date/day, class, and mapel
  // Priority 1: Match Day + Class + Mapel
  const schedulesDayClassMapel = teacherSchedules.filter((s) => {
    const matchDay = !dayName || s.hari?.trim().toLowerCase() === dayName.toLowerCase();
    const matchCls = isClassMatch(s.kelasId, kelasId, classes);
    const matchMpl = s.mapelId === mapelId || (s.mapelId && mapelId && s.mapelId.toLowerCase().includes(mapelId.toLowerCase()));
    return matchDay && matchCls && matchMpl;
  });

  // Priority 2: Match Day + Class
  const schedulesDayClass = schedulesDayClassMapel.length > 0
    ? schedulesDayClassMapel
    : teacherSchedules.filter((s) => {
        const matchDay = !dayName || s.hari?.trim().toLowerCase() === dayName.toLowerCase();
        const matchCls = isClassMatch(s.kelasId, kelasId, classes);
        return matchDay && matchCls;
      });

  // Priority 3: Match Class (any day for this class)
  const schedulesClass = schedulesDayClass.length > 0
    ? schedulesDayClass
    : teacherSchedules.filter((s) => isClassMatch(s.kelasId, kelasId, classes));

  // Active matching schedule items
  const activeScheduleItems = schedulesDayClass.length > 0
    ? schedulesDayClass
    : (schedulesClass.length > 0 ? schedulesClass : teacherSchedules);

  // Extract period numbers from the matched schedule (e.g. [1, 2])
  const allowedPeriodNumbers: number[] = Array.from(
    new Set(
      activeScheduleItems.flatMap((s) => parseJamValueToNumbers(s.jamKe))
    )
  ).sort((a, b) => a - b);

  // Extract direct schedule label options
  const directScheduleOptions: string[] = Array.from(
    new Set(activeScheduleItems.map((s) => s.jamKe.trim()).filter(Boolean))
  );

  const selectedClassObj = classes.find((c) => c.id === kelasId);
  const scheduleInfo = schedulesDayClass.length > 0
    ? `Sesuai Jadwal: ${dayName || 'Hari'} (${selectedClassObj?.namaKelas || 'Kelas'})`
    : (teacherSchedules.length > 0 ? `Jadwal Guru (${selectedClassObj?.namaKelas || 'Kelas'})` : undefined);

  // Auto-sync jamKe with current schedule when date, class, or mapel changes
  useEffect(() => {
    if (directScheduleOptions.length > 0) {
      const currentNums = parseJamValueToNumbers(jamKe);
      const isCurrentInSchedule = directScheduleOptions.includes(jamKe) ||
        (allowedPeriodNumbers.length > 0 && currentNums.length > 0 && currentNums.every((n) => allowedPeriodNumbers.includes(n)));

      if (!isCurrentInSchedule || jamKe === '08.30 - 10.00' || !jamKe) {
        setJamKe(directScheduleOptions[0]);
      }
    }
  }, [tanggal, kelasId, mapelId, schedules]);

  // Keep mapelId in sync with availableSubjects
  useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.some((s) => s.id === mapelId)) {
      setMapelId(availableSubjects[0].id);
    }
  }, [availableSubjects]);

  useEffect(() => {
    if (classes.length > 0) {
      if (!classes.some((c) => c.id === kelasId)) {
        const matched = matchClass(kelasId, classes);
        setKelasId(matched ? matched.id : classes[0].id);
      }
      if (!classes.some((c) => c.id === filterKelas)) {
        const matched = matchClass(filterKelas, classes);
        setFilterKelas(matched ? matched.id : classes[0].id);
      }
    }
  }, [classes]);

  const myJournals = teachingJournals.filter((j) => isTeacherMatch(j.guruId, currentUser));
  const filteredJournals = myJournals.filter((j) => isClassMatch(j.kelasId, filterKelas, classes));

  const handleAddJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materi) {
      toast.warning('Silakan isi materi pembelajaran terlebih dahulu!', 'Materi Kosong');
      return;
    }

    try {
      const added: TeachingJournal = {
        id: `tj-${Date.now()}`,
        guruId: currentUser.id,
        guruNama: currentUser.name,
        tanggal,
        jamKe,
        kelasId,
        mapelId,
        materi,
        catatanSiswa: catatanSiswa || 'KBM berlangsung kondusif dan tertib.',
      };

      const updatedList = [added, ...teachingJournals];
      setTeachingJournals(updatedList);
      storageService.saveTeachingJournals(updatedList, true);
      setMateri('');
      setCatatanSiswa('');
      toast.success(
        `Jurnal Mengajar KBM (${tanggal}, ${jamKe}) berhasil disimpan ke sistem & Cloud Firebase!`
      );
    } catch (err: any) {
      toast.error('Gagal menyimpan Jurnal Mengajar. Silakan coba lagi.');
    }
  };

  const handleDeleteJournal = (id: string) => {
    try {
      const updatedList = teachingJournals.filter((j) => j.id !== id);
      setTeachingJournals(updatedList);
      storageService.saveTeachingJournals(updatedList, true);
      toast.info('Data Jurnal Mengajar berhasil dihapus.');
    } catch (err) {
      toast.error('Gagal menghapus data jurnal.');
    }
  };

  const currentClassObj = classes.find((c) => c.id === filterKelas);

  const handleExportExcel = () => {
    const exportData = filteredJournals.map((j, idx) => ({
      No: idx + 1,
      Tanggal: j.tanggal,
      Jam: j.jamKe,
      'Materi Pembelajaran': j.materi,
      'Catatan KBM': j.catatanSiswa,
    }));
    exportToExcel(exportData, `Jurnal_Mengajar_${currentUser.name}_${currentClassObj?.namaKelas}`);
  };

  const handleExportPdf = () => {
    const headers = ['No', 'Tanggal', 'Jam Ke', 'Materi Pembelajaran', 'Catatan KBM / Siswa'];
    const rows = filteredJournals.map((j, idx) => [
      idx + 1,
      j.tanggal,
      j.jamKe,
      j.materi,
      j.catatanSiswa,
    ]);

    exportToPdfReport({
      title: `REKAP JURNAL MENGAJAR GURU: ${currentUser.name.toUpperCase()}`,
      subtitle: `Kelas: ${currentClassObj?.namaKelas}`,
      headers,
      rows,
      settings,
      teacherName: currentUser.name,
      teacherTitle: 'Guru Mata Pelajaran',
      filename: `Jurnal_Mengajar_${currentClassObj?.namaKelas}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Form Input Jurnal */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100 shadow-md">
        <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> Input Jurnal Mengajar Harian
        </h2>

        <form onSubmit={handleAddJournal} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-bold">Tanggal KBM</label>
              <input
                type="date"
                required
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
              />
            </div>

            <div>
              <JamPelajaranDropdown
                label="Jam Ke / Waktu"
                value={jamKe}
                onChange={setJamKe}
                placeholder="Pilih Jam Ke..."
                allowedPeriodNumbers={allowedPeriodNumbers.length > 0 ? allowedPeriodNumbers : undefined}
                directScheduleOptions={directScheduleOptions}
                scheduleInfo={scheduleInfo}
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-bold">Pilih Kelas</label>
              <select
                value={kelasId}
                onChange={(e) => setKelasId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-bold"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.namaKelas}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-bold">Pilih Mapel</label>
              <select
                value={mapelId}
                onChange={(e) => setMapelId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-bold"
              >
                {availableSubjects.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.namaMapel}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-bold">Materi Pembelajaran KBM</label>
            <input
              type="text"
              required
              placeholder="Contoh: Pembahasan Rukun Wakaf & Penerapan Fiqih Kontemporer"
              value={materi}
              onChange={(e) => setMateri(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-bold">Catatan KBM & Perkembangan Siswa</label>
            <textarea
              rows={2}
              placeholder="Contoh: Siswa aktif berdiskusi. 2 orang izin ke UKS."
              value={catatanSiswa}
              onChange={(e) => setCatatanSiswa(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 font-bold text-white rounded-xl shadow transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Simpan Jurnal KBM
          </button>
        </form>
      </div>

      {/* Filter & Rekap Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400 font-bold">Filter Rekap Kelas:</span>
            <select
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-bold"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.namaKelas}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
              <tr>
                <th className="p-3">Tanggal</th>
                <th className="p-3">Jam Ke</th>
                <th className="p-3">Materi Pembelajaran</th>
                <th className="p-3">Catatan KBM</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredJournals.map((j) => (
                <tr key={j.id} className="hover:bg-slate-800/50 transition">
                  <td className="p-3 font-bold text-white">{j.tanggal}</td>
                  <td className="p-3 font-mono text-emerald-400">{j.jamKe}</td>
                  <td className="p-3 font-medium text-slate-200">{j.materi}</td>
                  <td className="p-3 text-slate-400">{j.catatanSiswa}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleDeleteJournal(j.id)}
                      className="p-1.5 text-rose-400 hover:bg-rose-950/50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Preview */}
      <div className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-200">
        <KopSekolah settings={settings} />
        <div className="text-center my-4">
          <h2 className="text-base font-black uppercase underline">
            REKAP JURNAL MENGAJAR HARIAN GURU
          </h2>
          <p className="text-xs text-slate-700 font-bold mt-1">
            Semester: {settings.semester} | Tahun Akademik: {settings.tahunAkademik}
          </p>
          <p className="text-xs text-slate-600 font-medium mt-0.5">Nama Guru: {currentUser.name} | Kelas: {currentClassObj?.namaKelas}</p>
        </div>

        <table className="w-full text-left text-xs border-collapse border border-slate-300 my-4">
          <thead className="bg-emerald-800 text-white font-bold uppercase">
            <tr>
              <th className="border border-slate-300 p-2">Tanggal</th>
              <th className="border border-slate-300 p-2">Jam Ke</th>
              <th className="border border-slate-300 p-2">Materi Pembelajaran</th>
              <th className="border border-slate-300 p-2">Catatan KBM</th>
            </tr>
          </thead>
          <tbody>
            {filteredJournals.map((j) => (
              <tr key={j.id}>
                <td className="border border-slate-300 p-2 font-bold">{j.tanggal}</td>
                <td className="border border-slate-300 p-2 font-mono">{j.jamKe}</td>
                <td className="border border-slate-300 p-2 font-medium">{j.materi}</td>
                <td className="border border-slate-300 p-2 text-slate-600">{j.catatanSiswa}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <TandaTangan settings={settings} guruNama={currentUser.name} jabatan="Guru Mata Pelajaran" />

        {/* Menu Cetak Excel & Cetak PDF dipindahkan ke bawah preview / akhir halaman */}
        <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center justify-end gap-3 print:hidden">
          <button
            onClick={handleExportExcel}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition"
          >
            <FileSpreadsheet className="w-4 h-4" /> Cetak Excel
          </button>
          <button
            onClick={handleExportPdf}
            className="px-5 py-2.5 bg-teal-700 hover:bg-teal-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition"
          >
            <Printer className="w-4 h-4" /> Cetak PDF
          </button>
        </div>
      </div>
    </div>
  );
};
