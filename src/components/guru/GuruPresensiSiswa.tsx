import React, { useState, useEffect } from 'react';
import { StudentAttendance, StudentItem, ClassItem, SchoolSettings, User, ScheduleItem } from '../../types';
import { storageService, getTodayString } from '../../lib/storage';
import { Users, CheckCircle2, FileSpreadsheet, Printer, Save, CheckCheck } from 'lucide-react';
import { exportToExcel, exportToPdfReport } from '../../lib/exportUtils';
import { isClassMatch, matchClass, isTeacherMatch } from '../../lib/matchUtils';
import { KopSekolah } from '../common/KopSekolah';
import { TandaTangan } from '../common/TandaTangan';
import { JamPelajaranDropdown, parseJamValueToNumbers } from '../common/JamPelajaranDropdown';
import { useToast } from '../../context/ToastContext';

interface GuruPresensiSiswaProps {
  currentUser: User;
  settings: SchoolSettings;
  students: StudentItem[];
  classes: ClassItem[];
  schedules?: ScheduleItem[];
  studentAttendances: StudentAttendance[];
  setStudentAttendances: React.Dispatch<React.SetStateAction<StudentAttendance[]>>;
}

export const GuruPresensiSiswa: React.FC<GuruPresensiSiswaProps> = ({
  currentUser,
  settings,
  students,
  classes,
  schedules = [],
  studentAttendances,
  setStudentAttendances,
}) => {
  const toast = useToast();
  const todayStr = getTodayString();

  const [selectedKelas, setSelectedKelas] = useState<string>(classes[0]?.id || 'cls-12a');
  const [tanggalInput, setTanggalInput] = useState<string>(todayStr);
  const [selectedJamKe, setSelectedJamKe] = useState<string>('07.00-07.40');

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

  const dayName = getDayNameFromDate(tanggalInput);

  // Filter schedules for this teacher
  const teacherSchedules = schedules.filter((s) => isTeacherMatch(s.guruId, currentUser));

  // Match schedules for chosen date/day and class
  const schedulesDayClass = teacherSchedules.filter((s) => {
    const matchDay = !dayName || s.hari?.trim().toLowerCase() === dayName.toLowerCase();
    const matchCls = isClassMatch(s.kelasId, selectedKelas, classes);
    return matchDay && matchCls;
  });

  const schedulesClass = schedulesDayClass.length > 0
    ? schedulesDayClass
    : teacherSchedules.filter((s) => isClassMatch(s.kelasId, selectedKelas, classes));

  const activeScheduleItems = schedulesDayClass.length > 0
    ? schedulesDayClass
    : (schedulesClass.length > 0 ? schedulesClass : teacherSchedules);

  const allowedPeriodNumbers: number[] = Array.from(
    new Set(activeScheduleItems.flatMap((s) => parseJamValueToNumbers(s.jamKe)))
  ).sort((a, b) => a - b);

  const directScheduleOptions: string[] = Array.from(
    new Set(activeScheduleItems.map((s) => s.jamKe.trim()).filter(Boolean))
  );

  const currentClassObj = classes.find((c) => c.id === selectedKelas) || matchClass(selectedKelas, classes) || classes[0];

  const scheduleInfo = schedulesDayClass.length > 0
    ? `Jadwal ${dayName || ''} (${currentClassObj?.namaKelas || 'Kelas'})`
    : undefined;

  // Auto sync selectedJamKe when date or class changes
  useEffect(() => {
    if (directScheduleOptions.length > 0) {
      const currentNums = parseJamValueToNumbers(selectedJamKe);
      const isValid = currentNums.length > 0 && currentNums.every((n) => allowedPeriodNumbers.includes(n));
      if (!isValid || selectedJamKe === '07.00-07.40' || !selectedJamKe) {
        setSelectedJamKe(directScheduleOptions[0]);
      }
    }
  }, [tanggalInput, selectedKelas, schedules]);

  // Local state for batch student attendance entry
  const [attendanceDraft, setAttendanceDraft] = useState<Record<string, 'Hadir' | 'Izin' | 'Sakit' | 'Alpa'>>({});

  useEffect(() => {
    if (classes.length > 0 && !classes.some((c) => c.id === selectedKelas)) {
      const matched = matchClass(selectedKelas, classes);
      setSelectedKelas(matched ? matched.id : classes[0].id);
    }
  }, [classes]);

  const classStudents = students.filter((s) => isClassMatch(s.kelasId, selectedKelas, classes));

  const handleSetAllHadir = () => {
    const draft: Record<string, 'Hadir' | 'Izin' | 'Sakit' | 'Alpa'> = {};
    classStudents.forEach((s) => {
      draft[s.id] = 'Hadir';
    });
    setAttendanceDraft(draft);
  };

  const handleStatusChange = (siswaId: string, status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa') => {
    setAttendanceDraft((prev) => ({ ...prev, [siswaId]: status }));
  };

  const handleSavePresensi = () => {
    if (classStudents.length === 0) {
      toast.warning('Tidak ada data murid di kelas ini.', 'Data Kosong');
      return;
    }

    try {
      const newRecords: StudentAttendance[] = classStudents.map((s) => ({
        id: `sa-${Date.now()}-${s.id}`,
        siswaId: s.id,
        siswaNama: s.nama,
        kelasId: selectedKelas,
        tanggal: tanggalInput,
        status: attendanceDraft[s.id] || 'Hadir',
        jamKe: selectedJamKe,
      }));

      // Filter out previous records for same class and date
      const filteredPrevious = studentAttendances.filter(
        (sa) => !(sa.kelasId === selectedKelas && sa.tanggal === tanggalInput)
      );

      const updatedList = [...filteredPrevious, ...newRecords];
      setStudentAttendances(updatedList);
      storageService.saveStudentAttendances(updatedList, true);
      toast.success(
        `Presensi ${classStudents.length} murid kelas ${currentClassObj?.namaKelas} (${selectedJamKe}) berhasil disimpan ke sistem & Cloud Firebase!`,
        'Presensi Murid Disimpan'
      );
    } catch (err) {
      toast.error('Gagal menyimpan presensi murid. Silakan coba kembali.');
    }
  };

  const currentRecords = studentAttendances.filter(
    (sa) => sa.kelasId === selectedKelas && sa.tanggal === tanggalInput
  );

  const handleExportExcel = () => {
    const exportData = classStudents.map((s, idx) => {
      const rec = currentRecords.find((r) => r.siswaId === s.id);
      return {
        No: idx + 1,
        'Nama Murid': s.nama,
        NISN: s.nisn,
        Kelas: currentClassObj?.namaKelas,
        Tanggal: tanggalInput,
        'Jam / Waktu': (rec as any)?.jamKe || selectedJamKe,
        Status: rec?.status || attendanceDraft[s.id] || 'Hadir',
      };
    });
    exportToExcel(exportData, `Presensi_Murid_${currentClassObj?.namaKelas}_${tanggalInput}`, 'Presensi Murid', settings);
  };

  const handleExportPdf = () => {
    const headers = ['No', 'Nama Murid', 'NISN', 'Jam / Waktu', 'Status Kehadiran', 'Keterangan'];
    const rows = classStudents.map((s, idx) => {
      const rec = currentRecords.find((r) => r.siswaId === s.id);
      return [
        idx + 1,
        s.nama,
        s.nisn,
        (rec as any)?.jamKe || selectedJamKe,
        rec?.status || attendanceDraft[s.id] || 'Hadir',
        '-',
      ];
    });

    exportToPdfReport({
      title: `REKAP PRESENSI HARIAN MURID KELAS ${currentClassObj?.namaKelas?.toUpperCase()}`,
      subtitle: `Tanggal: ${tanggalInput} | ${selectedJamKe}`,
      headers,
      rows,
      settings,
      teacherName: currentClassObj?.waliKelas || currentUser.name,
      teacherTitle: 'Wali Kelas',
      filename: `Presensi_Murid_${currentClassObj?.namaKelas}_${tanggalInput}`,
      tanggal: tanggalInput,
    });
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-bold">Pilih Kelas</label>
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-bold"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.namaKelas}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-bold">Pilih Tanggal</label>
            <input
              type="date"
              value={tanggalInput}
              onChange={(e) => setTanggalInput(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-bold"
            />
          </div>

          <div className="min-w-[180px]">
            <JamPelajaranDropdown
              label="Pilih Jam"
              value={selectedJamKe}
              onChange={setSelectedJamKe}
              placeholder="Pilih Jam Pelajaran..."
              allowedPeriodNumbers={allowedPeriodNumbers.length > 0 ? allowedPeriodNumbers : undefined}
              directScheduleOptions={directScheduleOptions}
              scheduleInfo={scheduleInfo}
            />
          </div>

          <div className="pt-5">
            <button
              onClick={handleSetAllHadir}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            >
              <CheckCheck className="w-4 h-4" /> Tandai Hadir Semua
            </button>
          </div>
        </div>
      </div>

      {/* Input Presensi Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg p-5">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white">
            Input Presensi Murid Kelas {currentClassObj?.namaKelas} ({classStudents.length} Murid) — {selectedJamKe}
          </h3>
          <button
            onClick={handleSavePresensi}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950 transition flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" /> Simpan Presensi Kelas
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">No</th>
                <th className="p-3">Nama Murid</th>
                <th className="p-3">NISN</th>
                <th className="p-3 text-center">Status Kehadiran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {classStudents.map((s, idx) => {
                const rec = currentRecords.find((r) => r.siswaId === s.id);
                const currentStatus = attendanceDraft[s.id] || rec?.status || 'Hadir';

                return (
                  <tr key={s.id} className="hover:bg-slate-800/50 transition">
                    <td className="p-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-bold text-white">{s.nama}</td>
                    <td className="p-3 font-mono text-cyan-400">{s.nisn}</td>
                    <td className="p-3 text-center">
                      <div className="inline-flex rounded-xl bg-slate-950 border border-slate-800 p-1 gap-1">
                        {(['Hadir', 'Izin', 'Sakit', 'Alpa'] as const).map((st) => (
                          <button
                            key={st}
                            onClick={() => handleStatusChange(s.id, st)}
                            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition ${
                              currentStatus === st
                                ? st === 'Hadir'
                                  ? 'bg-emerald-600 text-white'
                                  : st === 'Izin'
                                  ? 'bg-blue-600 text-white'
                                  : st === 'Sakit'
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-rose-600 text-white'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Preview Card */}
      <div className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-200">
        <KopSekolah settings={settings} />
        <div className="text-center my-4">
          <h2 className="text-base font-black uppercase text-slate-900 underline">
            REKAP PRESENSI HARIAN MURID KELAS {currentClassObj?.namaKelas}
          </h2>
          <p className="text-xs text-slate-700 font-bold mt-1">
            Semester: {settings.semester} | Tahun Akademik: {settings.tahunAkademik}
          </p>
          <p className="text-xs text-slate-600 font-medium mt-0.5">Tanggal: {tanggalInput} | {selectedJamKe}</p>
        </div>

        <table className="w-full text-left text-xs border-collapse border border-slate-300 my-4">
          <thead className="bg-emerald-800 text-white font-bold uppercase">
            <tr>
              <th className="border border-slate-300 p-2 text-center">No</th>
              <th className="border border-slate-300 p-2">Nama Murid</th>
              <th className="border border-slate-300 p-2">NISN</th>
              <th className="border border-slate-300 p-2 text-center">Jam / Waktu</th>
              <th className="border border-slate-300 p-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {classStudents.map((s, idx) => {
              const rec = currentRecords.find((r) => r.siswaId === s.id);
              return (
                <tr key={s.id}>
                  <td className="border border-slate-300 p-2 text-center font-mono">{idx + 1}</td>
                  <td className="border border-slate-300 p-2 font-bold">{s.nama}</td>
                  <td className="border border-slate-300 p-2 font-mono">{s.nisn}</td>
                  <td className="border border-slate-300 p-2 text-center font-mono font-medium">{(rec as any)?.jamKe || selectedJamKe}</td>
                  <td className="border border-slate-300 p-2 text-center font-semibold">
                    {rec?.status || attendanceDraft[s.id] || 'Hadir'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <TandaTangan settings={settings} guruNama={currentClassObj?.waliKelas || currentUser.name} jabatan="Wali Kelas" />

        {/* Action Export Buttons dipindahkan ke bawah preview */}
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
