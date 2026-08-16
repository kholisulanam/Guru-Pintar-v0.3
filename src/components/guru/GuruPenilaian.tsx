import React, { useState, useEffect } from 'react';
import { GradeRecord, StudentItem, ClassItem, SubjectItem, SchoolSettings, User, TeacherItem, ScheduleItem } from '../../types';
import { storageService } from '../../lib/storage';
import { Award, Save, FileSpreadsheet, Printer } from 'lucide-react';
import { exportToExcel, exportToPdfReport } from '../../lib/exportUtils';
import { getTeacherSubjects, isClassMatch, matchClass } from '../../lib/matchUtils';
import { KopSekolah } from '../common/KopSekolah';
import { TandaTangan } from '../common/TandaTangan';
import { useToast } from '../../context/ToastContext';

interface GuruPenilaianProps {
  currentUser: User;
  settings: SchoolSettings;
  students: StudentItem[];
  classes: ClassItem[];
  subjects: SubjectItem[];
  teachers?: TeacherItem[];
  schedules?: ScheduleItem[];
  gradeRecords: GradeRecord[];
  setGradeRecords: React.Dispatch<React.SetStateAction<GradeRecord[]>>;
}

export const GuruPenilaian: React.FC<GuruPenilaianProps> = ({
  currentUser,
  settings,
  students,
  classes,
  subjects,
  teachers = [],
  schedules = [],
  gradeRecords,
  setGradeRecords,
}) => {
  const toast = useToast();
  const availableSubjects = getTeacherSubjects(currentUser, subjects, teachers, schedules);

  const [selectedKelas, setSelectedKelas] = useState<string>(classes[0]?.id || 'cls-12a');
  const [selectedMapel, setSelectedMapel] = useState<string>(availableSubjects[0]?.id || subjects[0]?.id || 'sub-2');

  useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.some((s) => s.id === selectedMapel)) {
      setSelectedMapel(availableSubjects[0].id);
    }
  }, [availableSubjects]);

  useEffect(() => {
    if (classes.length > 0 && !classes.some((c) => c.id === selectedKelas)) {
      const matched = matchClass(selectedKelas, classes);
      setSelectedKelas(matched ? matched.id : classes[0].id);
    }
  }, [classes]);

  const classStudents = students.filter((s) => isClassMatch(s.kelasId, selectedKelas, classes));
  const currentClassObj = classes.find((c) => c.id === selectedKelas) || matchClass(selectedKelas, classes) || classes[0];
  const currentMapelObj = subjects.find((m) => m.id === selectedMapel);

  // Local state for grade form inputs
  const [gradesDraft, setGradesDraft] = useState<
    Record<string, { a1: number; a2: number; a3: number; asas: number }>
  >({});

  const handleScoreChange = (
    siswaId: string,
    field: 'a1' | 'a2' | 'a3' | 'asas',
    val: number
  ) => {
    setGradesDraft((prev) => {
      const existing = prev[siswaId] || { a1: 80, a2: 80, a3: 80, asas: 80 };
      return {
        ...prev,
        [siswaId]: {
          ...existing,
          [field]: Math.min(100, Math.max(0, val)),
        },
      };
    });
  };

  const handleSaveGrades = () => {
    if (classStudents.length === 0) {
      toast.warning('Tidak ada data murid di kelas ini.', 'Data Kosong');
      return;
    }

    try {
      const updatedRecords: GradeRecord[] = classStudents.map((s) => {
        const draft = gradesDraft[s.id] || { a1: 85, a2: 85, a3: 85, asas: 90 };
        const avg = (draft.a1 + draft.a2 + draft.a3 + draft.asas) / 4;

        return {
          id: `gr-${selectedKelas}-${selectedMapel}-${s.id}`,
          siswaId: s.id,
          siswaNama: s.nama,
          kelasId: selectedKelas,
          mapelId: selectedMapel,
          asesmen1: draft.a1,
          asesmen2: draft.a2,
          asesmen3: draft.a3,
          asas: draft.asas,
          nilaiAkhir: Number(avg.toFixed(2)),
        };
      });

      const filtered = gradeRecords.filter(
        (g) => !(g.kelasId === selectedKelas && g.mapelId === selectedMapel)
      );

      const newRecords = [...filtered, ...updatedRecords];
      setGradeRecords(newRecords);
      storageService.saveGradeRecords(newRecords, true);
      toast.success(
        `Nilai Asesmen 1-3 & ASAS berhasil disimpan untuk ${classStudents.length} murid (${currentClassObj?.namaKelas}, ${currentMapelObj?.namaMapel}) ke Cloud Firebase!`,
        'Nilai Berhasil Disimpan'
      );
    } catch (err) {
      toast.error('Gagal menyimpan nilai murid. Silakan coba beberapa saat lagi.');
    }
  };

  const currentClassGrades = gradeRecords.filter(
    (g) => g.kelasId === selectedKelas && g.mapelId === selectedMapel
  );

  const handleExportExcel = () => {
    const exportData = classStudents.map((s, idx) => {
      const rec = currentClassGrades.find((r) => r.siswaId === s.id);
      const draft = gradesDraft[s.id];
      const a1 = draft?.a1 ?? rec?.asesmen1 ?? 85;
      const a2 = draft?.a2 ?? rec?.asesmen2 ?? 85;
      const a3 = draft?.a3 ?? rec?.asesmen3 ?? 85;
      const asas = draft?.asas ?? rec?.asas ?? 90;
      const finalScore = (a1 + a2 + a3 + asas) / 4;

      return {
        No: idx + 1,
        'Nama Murid': s.nama,
        NISN: s.nisn,
        Mapel: currentMapelObj?.namaMapel,
        Kelas: currentClassObj?.namaKelas,
        'Asesmen 1': a1,
        'Asesmen 2': a2,
        'Asesmen 3': a3,
        'ASAS Semester': asas,
        'Nilai Akhir': finalScore.toFixed(2),
      };
    });

    exportToExcel(
      exportData,
      `Rekap_Nilai_${currentMapelObj?.namaMapel}_Kelas_${currentClassObj?.namaKelas}`
    );
  };

  const handleExportPdf = () => {
    const headers = ['No', 'Nama Murid', 'Asesmen 1', 'Asesmen 2', 'Asesmen 3', 'ASAS', 'Nilai Akhir'];
    const rows = classStudents.map((s, idx) => {
      const rec = currentClassGrades.find((r) => r.siswaId === s.id);
      const draft = gradesDraft[s.id];
      const a1 = draft?.a1 ?? rec?.asesmen1 ?? 85;
      const a2 = draft?.a2 ?? rec?.asesmen2 ?? 85;
      const a3 = draft?.a3 ?? rec?.asesmen3 ?? 85;
      const asas = draft?.asas ?? rec?.asas ?? 90;
      const finalScore = (a1 + a2 + a3 + asas) / 4;

      return [
        idx + 1,
        s.nama,
        a1,
        a2,
        a3,
        asas,
        finalScore.toFixed(2),
      ];
    });

    exportToPdfReport({
      title: `DAFTAR REKAP NILAI ASESMEN & ASAS`,
      subtitle: `Nama Mapel: ${currentMapelObj?.namaMapel} | Kelas: ${currentClassObj?.namaKelas}`,
      headers,
      rows,
      settings,
      teacherName: currentUser.name,
      filename: `Nilai_${currentMapelObj?.namaMapel}_${currentClassObj?.namaKelas}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-bold">Pilih Kelas Target</label>
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
            <label className="block text-slate-400 mb-1 font-bold">Pilih Mata Pelajaran</label>
            <select
              value={selectedMapel}
              onChange={(e) => setSelectedMapel(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-bold"
            >
              {availableSubjects.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.namaMapel}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grade Entry Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" /> Input Nilai Asesmen 1, 2, 3 dan ASAS
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Mapel: <span className="text-emerald-400 font-bold">{currentMapelObj?.namaMapel}</span> | Kelas: <span className="text-teal-300 font-bold">{currentClassObj?.namaKelas}</span>
            </p>
          </div>

          <button
            onClick={handleSaveGrades}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950 transition flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" /> Simpan Nilai
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
              <tr>
                <th className="p-3">No</th>
                <th className="p-3">Nama Murid</th>
                <th className="p-3 text-center">Asesmen 1</th>
                <th className="p-3 text-center">Asesmen 2</th>
                <th className="p-3 text-center">Asesmen 3</th>
                <th className="p-3 text-center">ASAS Semester</th>
                <th className="p-3 text-center font-bold text-emerald-400">Rata-rata / Nilai Akhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {classStudents.map((s, idx) => {
                const rec = currentClassGrades.find((r) => r.siswaId === s.id);
                const draft = gradesDraft[s.id];

                const a1 = draft?.a1 ?? rec?.asesmen1 ?? 85;
                const a2 = draft?.a2 ?? rec?.asesmen2 ?? 85;
                const a3 = draft?.a3 ?? rec?.asesmen3 ?? 85;
                const asas = draft?.asas ?? rec?.asas ?? 90;
                const finalScore = (a1 + a2 + a3 + asas) / 4;

                return (
                  <tr key={s.id} className="hover:bg-slate-800/50 transition">
                    <td className="p-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-bold text-white">{s.nama}</td>

                    <td className="p-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={a1}
                        onChange={(e) => handleScoreChange(s.id, 'a1', Number(e.target.value))}
                        className="w-16 bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-center font-mono font-bold text-slate-100"
                      />
                    </td>

                    <td className="p-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={a2}
                        onChange={(e) => handleScoreChange(s.id, 'a2', Number(e.target.value))}
                        className="w-16 bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-center font-mono font-bold text-slate-100"
                      />
                    </td>

                    <td className="p-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={a3}
                        onChange={(e) => handleScoreChange(s.id, 'a3', Number(e.target.value))}
                        className="w-16 bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-center font-mono font-bold text-slate-100"
                      />
                    </td>

                    <td className="p-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={asas}
                        onChange={(e) => handleScoreChange(s.id, 'asas', Number(e.target.value))}
                        className="w-16 bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-center font-mono font-bold text-amber-400"
                      />
                    </td>

                    <td className="p-3 text-center font-mono font-black text-emerald-400 text-sm">
                      {finalScore.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Report Card */}
      <div className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-200">
        <KopSekolah settings={settings} />
        <div className="text-center my-4">
          <h2 className="text-base font-black uppercase underline">
            DAFTAR REKAP NILAI MATA PELAJARAN {currentMapelObj?.namaMapel}
          </h2>
          <p className="text-xs text-slate-700 font-bold mt-1">
            Semester: {settings.semester} | Tahun Akademik: {settings.tahunAkademik}
          </p>
          <p className="text-xs text-slate-600 font-medium mt-0.5">Kelas: {currentClassObj?.namaKelas}</p>
        </div>

        <table className="w-full text-left text-xs border-collapse border border-slate-300 my-4">
          <thead className="bg-emerald-800 text-white font-bold uppercase">
            <tr>
              <th className="border border-slate-300 p-2 text-center">No</th>
              <th className="border border-slate-300 p-2">Nama Murid</th>
              <th className="border border-slate-300 p-2 text-center">A1</th>
              <th className="border border-slate-300 p-2 text-center">A2</th>
              <th className="border border-slate-300 p-2 text-center">A3</th>
              <th className="border border-slate-300 p-2 text-center">ASAS</th>
              <th className="border border-slate-300 p-2 text-center font-bold">Nilai Akhir</th>
            </tr>
          </thead>
          <tbody>
            {classStudents.map((s, idx) => {
              const rec = currentClassGrades.find((r) => r.siswaId === s.id);
              const draft = gradesDraft[s.id];
              const a1 = draft?.a1 ?? rec?.asesmen1 ?? 85;
              const a2 = draft?.a2 ?? rec?.asesmen2 ?? 85;
              const a3 = draft?.a3 ?? rec?.asesmen3 ?? 85;
              const asas = draft?.asas ?? rec?.asas ?? 90;
              const finalScore = (a1 + a2 + a3 + asas) / 4;

              return (
                <tr key={s.id}>
                  <td className="border border-slate-300 p-2 text-center font-mono">{idx + 1}</td>
                  <td className="border border-slate-300 p-2 font-bold">{s.nama}</td>
                  <td className="border border-slate-300 p-2 text-center font-mono">{a1}</td>
                  <td className="border border-slate-300 p-2 text-center font-mono">{a2}</td>
                  <td className="border border-slate-300 p-2 text-center font-mono">{a3}</td>
                  <td className="border border-slate-300 p-2 text-center font-mono">{asas}</td>
                  <td className="border border-slate-300 p-2 text-center font-mono font-bold text-emerald-800">
                    {finalScore.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <TandaTangan settings={settings} guruNama={currentUser.name} />

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
