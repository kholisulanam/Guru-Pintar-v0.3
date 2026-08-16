import React, { useState, useEffect } from 'react';
import {
  StudentAttendance,
  TeacherAttendance,
  TeachingJournal,
  GradeRecord,
  ClassItem,
  SubjectItem,
  TeacherItem,
  SchoolSettings,
  StudentItem
} from '../../types';
import {
  FileSpreadsheet,
  FileText,
  Filter,
  Download,
  Printer,
  Users,
  UserCheck,
  BookOpen,
  Award,
  Calendar
} from 'lucide-react';
import { exportToExcel, exportToPdfReport } from '../../lib/exportUtils';
import { matchClass, isClassMatch } from '../../lib/matchUtils';
import { KopSekolah } from '../common/KopSekolah';
import { TandaTangan } from '../common/TandaTangan';
import { getTodayString } from '../../lib/storage';
import { formatLongDate, formatMonthYear, getMonthYearOptions } from '../../lib/dateUtils';

interface AdminLaporanProps {
  settings: SchoolSettings;
  studentAttendances: StudentAttendance[];
  teacherAttendances: TeacherAttendance[];
  teachingJournals: TeachingJournal[];
  gradeRecords: GradeRecord[];
  classes: ClassItem[];
  subjects: SubjectItem[];
  teachers: TeacherItem[];
  students: StudentItem[];
}

export const AdminLaporan: React.FC<AdminLaporanProps> = ({
  settings,
  studentAttendances,
  teacherAttendances,
  teachingJournals,
  gradeRecords,
  classes,
  subjects,
  teachers,
  students,
}) => {
  const [reportType, setReportType] = useState<'presensi_siswa' | 'presensi_guru' | 'jurnal' | 'nilai'>('presensi_siswa');
  const [modePeriode, setModePeriode] = useState<'harian' | 'bulanan'>('bulanan');

  // Filters
  const [selectedKelas, setSelectedKelas] = useState<string>(classes[0]?.id || 'cls-12a');
  const [selectedBulan, setSelectedBulan] = useState<string>('2026-08');
  const [selectedTanggal, setSelectedTanggal] = useState<string>(getTodayString());
  const [selectedGuru, setSelectedGuru] = useState<string>(teachers[0]?.id || 'usr-guru1');
  const [selectedMapel, setSelectedMapel] = useState<string>(subjects[0]?.id || 'sub-2');

  const monthNames = getMonthYearOptions(2026);

  useEffect(() => {
    if (classes.length > 0 && !classes.some((c) => c.id === selectedKelas)) {
      const matched = matchClass(selectedKelas, classes);
      setSelectedKelas(matched ? matched.id : classes[0].id);
    }
  }, [classes]);

  const currentClassObj = classes.find((c) => c.id === selectedKelas) || matchClass(selectedKelas, classes) || classes[0];
  const currentMapelObj = subjects.find((m) => m.id === selectedMapel);
  const currentGuruObj = teachers.find((t) => t.id === selectedGuru);

  // --- FILTERED DATA GENERATORS ---

  // 1. Rekap Presensi Murid
  const getPresensiSiswaData = () => {
    return studentAttendances.filter((sa) => {
      const matchKelas = isClassMatch(sa.kelasId, selectedKelas, classes);
      if (modePeriode === 'harian') {
        return matchKelas && sa.tanggal === selectedTanggal;
      }
      return matchKelas && sa.tanggal.startsWith(selectedBulan);
    });
  };

  // 2. Rekap Presensi Guru
  const getPresensiGuruData = () => {
    return teacherAttendances.filter((ta) => {
      const matchGuru = ta.guruId === selectedGuru;
      if (modePeriode === 'harian') {
        return matchGuru && ta.tanggal === selectedTanggal;
      }
      return matchGuru && ta.tanggal.startsWith(selectedBulan);
    });
  };

  // 3. Rekap Jurnal Mengajar
  const getJurnalData = () => {
    return teachingJournals.filter((tj) => {
      const matchKelas = isClassMatch(tj.kelasId, selectedKelas, classes);
      if (modePeriode === 'harian') {
        return matchKelas && tj.tanggal === selectedTanggal;
      }
      return matchKelas && tj.tanggal.startsWith(selectedBulan);
    });
  };

  // 4. Rekap Nilai
  const getNilaiData = () => {
    return gradeRecords.filter((gr) => {
      const matchKelas = isClassMatch(gr.kelasId, selectedKelas, classes);
      const matchMapel = gr.mapelId === selectedMapel;
      return matchKelas && matchMapel;
    });
  };

  // --- EXPORT TO EXCEL ---
  const handleExportExcel = () => {
    let exportData: any[] = [];
    let filename = `Rekap_${reportType}_${Date.now()}`;

    if (reportType === 'presensi_siswa') {
      exportData = getPresensiSiswaData().map((s, idx) => ({
        No: idx + 1,
        'Nama Murid': s.siswaNama,
        Tanggal: formatLongDate(s.tanggal),
        'Jam / Waktu': (s as any).jamKe || '07.00-07.40',
        Status: s.status,
        Catatan: s.catatan || '-',
      }));
      filename = `Rekap_Presensi_Murid_${currentClassObj?.namaKelas || 'Kelas'}_${modePeriode === 'harian' ? selectedTanggal : selectedBulan}`;
    } else if (reportType === 'presensi_guru') {
      exportData = getPresensiGuruData().map((g, idx) => ({
        No: idx + 1,
        'Nama Guru': g.guruNama,
        Tanggal: formatLongDate(g.tanggal),
        'Jam Masuk': g.jamMasuk,
        'Jam Pulang': g.jamPulang || '-',
        Status: g.status,
        Catatan: g.catatan || '-',
      }));
      filename = `Rekap_Presensi_Guru_${currentGuruObj?.nama || 'Guru'}_${modePeriode === 'harian' ? selectedTanggal : selectedBulan}`;
    } else if (reportType === 'jurnal') {
      exportData = getJurnalData().map((j, idx) => ({
        No: idx + 1,
        Tanggal: formatLongDate(j.tanggal),
        Jam: j.jamKe,
        'Materi Pembelajaran': j.materi,
        'Catatan KBM': j.catatanSiswa,
      }));
      filename = `Rekap_Jurnal_${currentClassObj?.namaKelas || 'Kelas'}_${modePeriode === 'harian' ? selectedTanggal : selectedBulan}`;
    } else if (reportType === 'nilai') {
      exportData = getNilaiData().map((n, idx) => ({
        No: idx + 1,
        'Nama Murid': n.siswaNama,
        'Asesmen 1': n.asesmen1,
        'Asesmen 2': n.asesmen2,
        'Asesmen 3': n.asesmen3,
        'ASAS Semester': n.asas,
        'Nilai Akhir': n.nilaiAkhir,
      }));
      filename = `Rekap_Nilai_${currentMapelObj?.namaMapel || 'Mapel'}_${currentClassObj?.namaKelas || 'Kelas'}`;
    }

    exportToExcel(exportData, filename, 'Data Rekap', settings);
  };

  // --- EXPORT TO PDF ---
  const handleExportPdf = () => {
    let title = '';
    let subtitle = '';
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    const periodeText = modePeriode === 'harian' ? `Harian (Tanggal: ${formatLongDate(selectedTanggal)})` : `Bulanan (${formatMonthYear(selectedBulan)})`;

    if (reportType === 'presensi_siswa') {
      title = `REKAP PRESENSI MURID KELAS ${currentClassObj?.namaKelas?.toUpperCase()}`;
      subtitle = `Periode: ${periodeText}`;
      headers = ['No', 'Nama Murid', 'Tanggal', 'Jam / Waktu', 'Status Kehadiran', 'Keterangan'];
      rows = getPresensiSiswaData().map((s, idx) => [
        idx + 1,
        s.siswaNama,
        formatLongDate(s.tanggal),
        (s as any).jamKe || '07.00-07.40',
        s.status,
        s.catatan || '-',
      ]);
    } else if (reportType === 'presensi_guru') {
      title = `REKAP PRESENSI GURU: ${currentGuruObj?.nama?.toUpperCase()}`;
      subtitle = `Periode: ${periodeText}`;
      headers = ['No', 'Tanggal', 'Jam Masuk', 'Jam Pulang', 'Status', 'Lokasi GPS'];
      rows = getPresensiGuruData().map((g, idx) => [
        idx + 1,
        formatLongDate(g.tanggal),
        g.jamMasuk,
        g.jamPulang || '-',
        g.status,
        g.dalamRadius ? 'Dalam Radius' : 'Luar Radius (Peringatan)',
      ]);
    } else if (reportType === 'jurnal') {
      title = `REKAP JURNAL MENGAJAR KELAS ${currentClassObj?.namaKelas?.toUpperCase()}`;
      subtitle = `Periode: ${periodeText}`;
      headers = ['No', 'Tanggal', 'Jam Ke', 'Materi Pembelajaran', 'Catatan KBM'];
      rows = getJurnalData().map((j, idx) => [
        idx + 1,
        formatLongDate(j.tanggal),
        j.jamKe,
        j.materi,
        j.catatanSiswa,
      ]);
    } else if (reportType === 'nilai') {
      title = `DAFTAR REKAP NILAI MATA PELAJARAN ${currentMapelObj?.namaMapel?.toUpperCase()}`;
      subtitle = `Kelas: ${currentClassObj?.namaKelas}`;
      headers = ['No', 'Nama Murid', 'Asesmen 1', 'Asesmen 2', 'Asesmen 3', 'ASAS', 'Nilai Akhir'];
      rows = getNilaiData().map((n, idx) => [
        idx + 1,
        n.siswaNama,
        n.asesmen1,
        n.asesmen2,
        n.asesmen3,
        n.asas,
        n.nilaiAkhir,
      ]);
    }

    const signerName =
      reportType === 'presensi_siswa'
        ? (currentClassObj?.waliKelas || currentGuruObj?.nama || 'Nur Aida, S.Pd.I.')
        : (currentGuruObj?.nama || 'Nur Aida, S.Pd.I.');

    const signerTitle =
      reportType === 'presensi_siswa'
        ? 'Wali Kelas'
        : 'Guru Mata Pelajaran';

    exportToPdfReport({
      title,
      subtitle,
      headers,
      rows,
      settings,
      teacherName: signerName,
      teacherTitle: signerTitle,
      filename: `Laporan_${reportType}_${Date.now()}`,
      tanggal: modePeriode === 'harian' ? selectedTanggal : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Category Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setReportType('presensi_siswa')}
          className={`p-4 rounded-2xl border text-left transition flex items-center gap-3 ${
            reportType === 'presensi_siswa'
              ? 'bg-emerald-950 border-emerald-500 text-white shadow-lg'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
          }`}
        >
          <Users className="w-6 h-6 text-emerald-400" />
          <div>
            <p className="text-xs font-bold uppercase">Presensi Murid</p>
            <p className="text-[10px] text-slate-400">Filter Kelas & Harian/Bulanan</p>
          </div>
        </button>

        <button
          onClick={() => setReportType('presensi_guru')}
          className={`p-4 rounded-2xl border text-left transition flex items-center gap-3 ${
            reportType === 'presensi_guru'
              ? 'bg-emerald-950 border-emerald-500 text-white shadow-lg'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
          }`}
        >
          <UserCheck className="w-6 h-6 text-teal-400" />
          <div>
            <p className="text-xs font-bold uppercase">Presensi Guru</p>
            <p className="text-[10px] text-slate-400">Filter Nama & Harian/Bulanan</p>
          </div>
        </button>

        <button
          onClick={() => setReportType('jurnal')}
          className={`p-4 rounded-2xl border text-left transition flex items-center gap-3 ${
            reportType === 'jurnal'
              ? 'bg-emerald-950 border-emerald-500 text-white shadow-lg'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-6 h-6 text-blue-400" />
          <div>
            <p className="text-xs font-bold uppercase">Jurnal Mengajar</p>
            <p className="text-[10px] text-slate-400">Filter Kelas & Harian/Bulanan</p>
          </div>
        </button>

        <button
          onClick={() => setReportType('nilai')}
          className={`p-4 rounded-2xl border text-left transition flex items-center gap-3 ${
            reportType === 'nilai'
              ? 'bg-emerald-950 border-emerald-500 text-white shadow-lg'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
          }`}
        >
          <Award className="w-6 h-6 text-amber-400" />
          <div>
            <p className="text-xs font-bold uppercase">Rekap Nilai</p>
            <p className="text-[10px] text-slate-400">Filter Mapel & Kelas</p>
          </div>
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-slate-300">
            <Filter className="w-4 h-4 text-emerald-400" /> Filter Laporan:
          </div>

          {/* Mode Periode Harian vs Bulanan */}
          {reportType !== 'nilai' && (
            <div>
              <span className="text-slate-400 mr-2">Mode Rekap:</span>
              <select
                value={modePeriode}
                onChange={(e) => setModePeriode(e.target.value as 'harian' | 'bulanan')}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-300 font-bold"
              >
                <option value="bulanan">Rekap Bulanan</option>
                <option value="harian">Cetak Harian (Tanggal)</option>
              </select>
            </div>
          )}

          {(reportType === 'presensi_siswa' || reportType === 'jurnal' || reportType === 'nilai') && (
            <div>
              <span className="text-slate-400 mr-2">Kelas:</span>
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
          )}

          {reportType === 'presensi_guru' && (
            <div>
              <span className="text-slate-400 mr-2">Pilih Nama Guru:</span>
              <select
                value={selectedGuru}
                onChange={(e) => setSelectedGuru(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-bold"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nama}
                  </option>
                ))}
              </select>
            </div>
          )}

          {reportType === 'nilai' && (
            <div>
              <span className="text-slate-400 mr-2">Pilih Mapel:</span>
              <select
                value={selectedMapel}
                onChange={(e) => setSelectedMapel(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-bold"
              >
                {subjects.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.namaMapel}
                  </option>
                ))}
              </select>
            </div>
          )}

          {reportType !== 'nilai' && modePeriode === 'bulanan' && (
            <div>
              <span className="text-slate-400 mr-2">Pilih Bulan:</span>
              <select
                value={selectedBulan}
                onChange={(e) => setSelectedBulan(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-bold"
              >
                {monthNames.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {reportType !== 'nilai' && modePeriode === 'harian' && (
            <div>
              <span className="text-slate-400 mr-2">Pilih Tanggal:</span>
              <input
                type="date"
                value={selectedTanggal}
                onChange={(e) => setSelectedTanggal(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-300 font-bold"
              />
            </div>
          )}
        </div>
      </div>

      {/* Printable Report View Card */}
      <div className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-200">
        <KopSekolah settings={settings} />

        <div className="text-center my-4">
          <h2 className="text-base sm:text-lg font-black uppercase text-slate-900 underline decoration-2 decoration-emerald-600">
            {reportType === 'presensi_siswa' && `REKAP PRESENSI MURID KELAS ${currentClassObj?.namaKelas}`}
            {reportType === 'presensi_guru' && `REKAP PRESENSI GURU: ${currentGuruObj?.nama}`}
            {reportType === 'jurnal' && `REKAP JURNAL MENGAJAR KELAS ${currentClassObj?.namaKelas}`}
            {reportType === 'nilai' && `DAFTAR REKAP NILAI MATA PELAJARAN ${currentMapelObj?.namaMapel}`}
          </h2>
          <p className="text-xs text-slate-700 font-bold mt-1">
            Semester: {settings.semester} | Tahun Akademik: {settings.tahunAkademik}
          </p>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            {reportType !== 'nilai'
              ? modePeriode === 'harian'
                ? `Cetak Harian | Tanggal: ${formatLongDate(selectedTanggal)}`
                : `Rekap Bulanan | Bulan: ${formatMonthYear(selectedBulan)}`
              : `Kelas: ${currentClassObj?.namaKelas}`}
          </p>
        </div>

        {/* Dynamic Table Preview */}
        <div className="overflow-x-auto my-6">
          <table className="w-full text-left text-xs border-collapse border border-slate-300">
            {reportType === 'presensi_siswa' && (
              <>
                <thead className="bg-emerald-800 text-white font-bold uppercase text-[11px]">
                  <tr>
                    <th className="border border-slate-300 p-2.5 text-center">No</th>
                    <th className="border border-slate-300 p-2.5">Nama Murid</th>
                    <th className="border border-slate-300 p-2.5">Tanggal</th>
                    <th className="border border-slate-300 p-2.5">Jam / Waktu</th>
                    <th className="border border-slate-300 p-2.5">Status Kehadiran</th>
                    <th className="border border-slate-300 p-2.5">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {getPresensiSiswaData().length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-500 italic">
                        Tidak ada data presensi murid pada filter ini.
                      </td>
                    </tr>
                  ) : (
                    getPresensiSiswaData().map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="border border-slate-300 p-2.5 text-center font-mono">{idx + 1}</td>
                        <td className="border border-slate-300 p-2.5 font-bold">{s.siswaNama}</td>
                        <td className="border border-slate-300 p-2.5">{formatLongDate(s.tanggal)}</td>
                        <td className="border border-slate-300 p-2.5 font-mono">{(s as any).jamKe || '07.00-07.40'}</td>
                        <td className="border border-slate-300 p-2.5 font-semibold">{s.status}</td>
                        <td className="border border-slate-300 p-2.5">{s.catatan || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </>
            )}

            {reportType === 'presensi_guru' && (
              <>
                <thead className="bg-emerald-800 text-white font-bold uppercase text-[11px]">
                  <tr>
                    <th className="border border-slate-300 p-2.5 text-center">No</th>
                    <th className="border border-slate-300 p-2.5">Tanggal</th>
                    <th className="border border-slate-300 p-2.5">Jam Masuk</th>
                    <th className="border border-slate-300 p-2.5">Jam Pulang</th>
                    <th className="border border-slate-300 p-2.5">Status</th>
                    <th className="border border-slate-300 p-2.5">Radius GPS</th>
                  </tr>
                </thead>
                <tbody>
                  {getPresensiGuruData().length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-500 italic">
                        Tidak ada data presensi guru pada filter ini.
                      </td>
                    </tr>
                  ) : (
                    getPresensiGuruData().map((g, idx) => (
                      <tr key={g.id} className="hover:bg-slate-50">
                        <td className="border border-slate-300 p-2.5 text-center font-mono">{idx + 1}</td>
                        <td className="border border-slate-300 p-2.5 font-bold">{formatLongDate(g.tanggal)}</td>
                        <td className="border border-slate-300 p-2.5 font-mono">{g.jamMasuk}</td>
                        <td className="border border-slate-300 p-2.5 font-mono">{g.jamPulang || '-'}</td>
                        <td className="border border-slate-300 p-2.5 font-semibold">{g.status}</td>
                        <td className="border border-slate-300 p-2.5">
                          {g.dalamRadius ? (
                            <span className="text-emerald-700 font-bold">Dalam Radius</span>
                          ) : (
                            <span className="text-rose-600 font-bold">Luar Radius (Peringatan)</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </>
            )}

            {reportType === 'jurnal' && (
              <>
                <thead className="bg-emerald-800 text-white font-bold uppercase text-[11px]">
                  <tr>
                    <th className="border border-slate-300 p-2.5 text-center">No</th>
                    <th className="border border-slate-300 p-2.5">Tanggal</th>
                    <th className="border border-slate-300 p-2.5">Jam Ke</th>
                    <th className="border border-slate-300 p-2.5">Materi Pembelajaran</th>
                    <th className="border border-slate-300 p-2.5">Catatan KBM</th>
                  </tr>
                </thead>
                <tbody>
                  {getJurnalData().length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-500 italic">
                        Tidak ada jurnal mengajar pada filter ini.
                      </td>
                    </tr>
                  ) : (
                    getJurnalData().map((j, idx) => (
                      <tr key={j.id} className="hover:bg-slate-50">
                        <td className="border border-slate-300 p-2.5 text-center font-mono">{idx + 1}</td>
                        <td className="border border-slate-300 p-2.5 font-bold">{formatLongDate(j.tanggal)}</td>
                        <td className="border border-slate-300 p-2.5 font-mono">{j.jamKe}</td>
                        <td className="border border-slate-300 p-2.5 font-medium">{j.materi}</td>
                        <td className="border border-slate-300 p-2.5 text-slate-600">{j.catatanSiswa}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </>
            )}

            {reportType === 'nilai' && (
              <>
                <thead className="bg-emerald-800 text-white font-bold uppercase text-[11px]">
                  <tr>
                    <th className="border border-slate-300 p-2.5 text-center">No</th>
                    <th className="border border-slate-300 p-2.5">Nama Murid</th>
                    <th className="border border-slate-300 p-2.5 text-center">Asesmen 1</th>
                    <th className="border border-slate-300 p-2.5 text-center">Asesmen 2</th>
                    <th className="border border-slate-300 p-2.5 text-center">Asesmen 3</th>
                    <th className="border border-slate-300 p-2.5 text-center">ASAS</th>
                    <th className="border border-slate-300 p-2.5 text-center font-black">Nilai Akhir</th>
                  </tr>
                </thead>
                <tbody>
                  {getNilaiData().length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-500 italic">
                        Tidak ada data nilai pada filter ini.
                      </td>
                    </tr>
                  ) : (
                    getNilaiData().map((n, idx) => (
                      <tr key={n.id} className="hover:bg-slate-50">
                        <td className="border border-slate-300 p-2.5 text-center font-mono">{idx + 1}</td>
                        <td className="border border-slate-300 p-2.5 font-bold">{n.siswaNama}</td>
                        <td className="border border-slate-300 p-2.5 text-center font-mono">{n.asesmen1}</td>
                        <td className="border border-slate-300 p-2.5 text-center font-mono">{n.asesmen2}</td>
                        <td className="border border-slate-300 p-2.5 text-center font-mono">{n.asesmen3}</td>
                        <td className="border border-slate-300 p-2.5 text-center font-mono">{n.asas}</td>
                        <td className="border border-slate-300 p-2.5 text-center font-mono font-bold text-emerald-700">
                          {n.nilaiAkhir}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </>
            )}
          </table>
        </div>

        {/* TTD Official Signature Block */}
        <TandaTangan
          settings={settings}
          guruNama={
            reportType === 'presensi_siswa'
              ? (currentClassObj?.waliKelas || currentGuruObj?.nama || 'Nur Aida, S.Pd.I.')
              : (currentGuruObj?.nama || 'Nur Aida, S.Pd.I.')
          }
          jabatan={
            reportType === 'presensi_siswa'
              ? 'Wali Kelas'
              : 'Guru Mata Pelajaran'
          }
        />

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
