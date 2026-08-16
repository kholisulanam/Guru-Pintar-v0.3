import React, { useState, useRef } from 'react';
import { ScheduleItem, TeacherItem, SubjectItem, ClassItem } from '../../types';
import { Calendar, Plus, Trash2, Edit, Download, Upload, Filter, Clock, CheckCircle2, Check, X } from 'lucide-react';
import { exportToExcel } from '../../lib/exportUtils';
import { storageService } from '../../lib/storage';
import { parseEntireWorkbook, extractExcelValue } from '../../lib/excelParser';
import {
  matchTeacher,
  matchSubject,
  matchClass,
  cleanStr,
  sortSchedulesByJam,
  isTeacherMatch,
  isClassMatch,
  getDisplayClassName,
  getDisplayTeacherName,
  getDisplaySubjectName,
  sanitizeAndDeduplicateSchedules,
  sanitizeAndDeduplicateClasses,
} from '../../lib/matchUtils';
import * as XLSX from 'xlsx';

interface AdminJadwalProps {
  schedules: ScheduleItem[];
  setSchedules: React.Dispatch<React.SetStateAction<ScheduleItem[]>>;
  teachers: TeacherItem[];
  setTeachers?: React.Dispatch<React.SetStateAction<TeacherItem[]>>;
  subjects: SubjectItem[];
  setSubjects?: React.Dispatch<React.SetStateAction<SubjectItem[]>>;
  classes: ClassItem[];
  setClasses?: React.Dispatch<React.SetStateAction<ClassItem[]>>;
}

export const AdminJadwal: React.FC<AdminJadwalProps> = ({
  schedules,
  setSchedules,
  teachers,
  setTeachers,
  subjects,
  setSubjects,
  classes,
  setClasses,
}) => {
  const [selectedHariFilter, setSelectedHariFilter] = useState<string>('Semua');
  const [selectedKelasFilter, setSelectedKelasFilter] = useState<string>('Semua');
  const [selectedGuruFilter, setSelectedGuruFilter] = useState<string>('Semua');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast & Delete & Edit States
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // New Schedule form
  const [newHari, setNewHari] = useState<ScheduleItem['hari']>('Sabtu');
  const [newJamKe, setNewJamKe] = useState('07.00-07.40');
  const [newGuruId, setNewGuruId] = useState(teachers[0]?.id || '');
  const [newMapelId, setNewMapelId] = useState(subjects[0]?.id || '');
  const [newKelasId, setNewKelasId] = useState(classes[0]?.id || '');

  const jamPelajaranList = [
    '07.00-07.40',
    '07.40-08.20',
    '08.20-09.00',
    '09.00-09.40',
    '10.00-10.40',
    '10.40-11.20',
    '12.20-13.00',
    '13.00-13.40',
  ];

  const handleAddJadwal = (e: React.FormEvent) => {
    e.preventDefault();
    const added: ScheduleItem = {
      id: `sch-${Date.now()}`,
      hari: newHari,
      jamKe: newJamKe,
      kelasId: newKelasId,
      guruId: newGuruId,
      mapelId: newMapelId,
    };
    const updated = sanitizeAndDeduplicateSchedules([...schedules, added]);
    setSchedules(updated);
    storageService.saveSchedules(updated, true);
    showToast('Jadwal pelajaran berhasil ditambahkan!');
  };

  const handleUpdateJadwal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule) return;
    const updated = sanitizeAndDeduplicateSchedules(schedules.map((s) => (s.id === editingSchedule.id ? editingSchedule : s)));
    setSchedules(updated);
    storageService.saveSchedules(updated, true);
    showToast('Perubahan jadwal pelajaran berhasil disimpan!');
    setEditingSchedule(null);
  };

  const confirmDeleteJadwal = () => {
    if (!deleteScheduleId) return;
    const updated = schedules.filter((s) => s.id !== deleteScheduleId);
    setSchedules(updated);
    storageService.saveSchedules(updated, true);
    showToast('Jadwal pelajaran berhasil dihapus.');
    setDeleteScheduleId(null);
  };

  const confirmDeleteAllJadwal = () => {
    if (selectedHariFilter !== 'Semua' || selectedKelasFilter !== 'Semua' || selectedGuruFilter !== 'Semua') {
      const remaining = schedules.filter((s) => !filteredSchedules.some((fs) => fs.id === s.id));
      setSchedules(remaining);
      storageService.saveSchedules(remaining, true);
      showToast('Semua jadwal pelajaran yang difilter berhasil dihapus!');
    } else {
      setSchedules([]);
      storageService.saveSchedules([], true);
      showToast('Semua data jadwal pelajaran berhasil dikosongkan!');
    }
    setShowDeleteAllModal(false);
  };

  const downloadTemplate = () => {
    const sampleKelas1 = classes[0]?.namaKelas || 'X-A';
    const sampleKelas2 = classes[1]?.namaKelas || 'XI-A';
    const sampleKelas3 = classes[2]?.namaKelas || 'XII-A';
    const sampleGuru1 = teachers[0]?.nama || 'SYAIFUDIN KUDSI, SHI. MA.';
    const sampleGuru2 = teachers[1]?.nama || 'Nur Aida, S.Pd.I.';
    const sampleMapel1 = subjects[0]?.namaMapel || 'Fiqih';
    const sampleMapel2 = subjects[1]?.namaMapel || 'Bahasa Arab';

    const templateData = [
      { Hari: 'Senin', JamKe: '07.00-07.40', Kelas: sampleKelas1, Guru: sampleGuru1, Mapel: sampleMapel1 },
      { Hari: 'Senin', JamKe: '07.40-08.20', Kelas: sampleKelas1, Guru: sampleGuru2, Mapel: sampleMapel2 },
      { Hari: 'Senin', JamKe: '07.00-07.40', Kelas: sampleKelas2, Guru: sampleGuru1, Mapel: sampleMapel1 },
      { Hari: 'Selasa', JamKe: '07.00-07.40', Kelas: sampleKelas3, Guru: sampleGuru2, Mapel: sampleMapel2 },
    ];
    exportToExcel(templateData, 'Template_Jadwal_Pelajaran_MAS_Al_Amien', 'Jadwal Hari');
  };

  const handleUploadJadwal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const sheets = parseEntireWorkbook(wb);

        const data: any[] = [];
        sheets.forEach((s) => data.push(...s.rows));

        if (!data || data.length === 0) {
          showToast('File Excel kosong atau format tidak sesuai.');
          return;
        }

        let curTeachers = [...teachers];
        let curSubjects = [...subjects];
        let curClasses = [...classes];

        let teachersAdded = false;
        let subjectsAdded = false;
        let classesAdded = false;

        const imported: ScheduleItem[] = [];

        data.forEach((item, idx) => {
          if (!item || typeof item !== 'object') return;

          const rawHariStr = (extractExcelValue(item, ['Hari', 'Day', 'Nama Hari', 'NamaHari', 'Hari KBM']) || 'Senin').trim();
          const lowerHari = rawHariStr.toLowerCase();
          let validHari: ScheduleItem['hari'] = 'Senin';
          if (lowerHari.includes('sabtu')) validHari = 'Sabtu';
          else if (lowerHari.includes('ahad') || lowerHari.includes('minggu')) validHari = 'Ahad';
          else if (lowerHari.includes('senin')) validHari = 'Senin';
          else if (lowerHari.includes('selasa')) validHari = 'Selasa';
          else if (lowerHari.includes('rabu')) validHari = 'Rabu';
          else if (lowerHari.includes('kamis')) validHari = 'Kamis';
          else if (lowerHari.includes('jumat') || lowerHari.includes("jum'at")) validHari = 'Jumat';

          const rawJam = (extractExcelValue(item, ['JamKe', 'Jam Ke', 'Jam', 'Waktu', 'Pukul', 'Time', 'Jam_Ke', 'Sesi']) || '07.00-07.40').trim();

          const rawKelas = extractExcelValue(item, ['Kelas', 'NamaKelas', 'Nama Kelas', 'Rombel', 'Rombongan Belajar', 'RombonganBelajar', 'Tingkat', 'Ruang', 'Class', 'Nama_Kelas']).trim();
          let matchedClass = curClasses.find(
            (c) => c.namaKelas.trim().toLowerCase() === rawKelas.toLowerCase() || c.id.toLowerCase() === rawKelas.toLowerCase()
          );
          if (!matchedClass && rawKelas) {
            matchedClass = matchClass(rawKelas, curClasses) || undefined;
          }
          if (!matchedClass && rawKelas) {
            const fallbackWali = curTeachers[curClasses.length % (curTeachers.length || 1)]?.nama || '-';
            matchedClass = {
              id: `cls-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
              namaKelas: rawKelas,
              waliKelas: fallbackWali,
              jumlahSiswa: 0,
            };
            curClasses.push(matchedClass);
            classesAdded = true;
          }

          const rawGuru = extractExcelValue(item, ['Guru', 'NamaGuru', 'Nama Guru', 'Pengajar', 'Guru Pengajar', 'GuruPengajar', 'Teacher', 'Pendidik', 'Nama_Guru', 'Ustadz', 'Ustadzah']).trim();
          let matchedGuru = curTeachers.find(
            (t) => t.nama.trim().toLowerCase() === rawGuru.toLowerCase() || t.id.toLowerCase() === rawGuru.toLowerCase()
          );
          if (!matchedGuru && rawGuru) {
            matchedGuru = matchTeacher(rawGuru, curTeachers) || undefined;
          }
          if (!matchedGuru && rawGuru) {
            const newTeacherId = `guru-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`;
            matchedGuru = {
              id: newTeacherId,
              nama: rawGuru,
              nipNuptk: '-',
              nuptk: '-',
              email: `${rawGuru.toLowerCase().replace(/[^a-z0-9]/g, '')}@al-amien.sch.id`,
              telepon: '081234567890',
              mengajarMapel: extractExcelValue(item, ['Mapel', 'NamaMapel', 'Nama Mapel', 'Mata Pelajaran', 'MataPelajaran', 'Pelajaran', 'Subject']).trim(),
              status: 'Aktif',
            };
            curTeachers.push(matchedGuru);
            teachersAdded = true;
          }

          const rawMapel = extractExcelValue(item, ['Mapel', 'NamaMapel', 'Nama Mapel', 'Mata Pelajaran', 'MataPelajaran', 'Pelajaran', 'Subject', 'Nama_Mapel']).trim();
          let matchedMapel = curSubjects.find(
            (s) =>
              s.namaMapel.trim().toLowerCase() === rawMapel.toLowerCase() ||
              s.kode.trim().toLowerCase() === rawMapel.toLowerCase() ||
              s.id.toLowerCase() === rawMapel.toLowerCase()
          );
          if (!matchedMapel && rawMapel) {
            matchedMapel = matchSubject(rawMapel, curSubjects) || undefined;
          }
          if (!matchedMapel && rawMapel) {
            matchedMapel = {
              id: `sub-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
              kode: `MP-${curSubjects.length + 1}`,
              namaMapel: rawMapel,
              kelompok: 'Wajib',
            };
            curSubjects.push(matchedMapel);
            subjectsAdded = true;
          }

          const finalClassId = matchedClass?.id || rawKelas || '-';
          const finalGuruId = matchedGuru?.id || rawGuru || '-';
          const finalMapelId = matchedMapel?.id || rawMapel || '-';

          imported.push({
            id: `sch-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
            hari: validHari,
            jamKe: rawJam,
            kelasId: finalClassId,
            guruId: finalGuruId,
            mapelId: finalMapelId,
          });
        });

        if (teachersAdded) {
          if (setTeachers) setTeachers([...curTeachers]);
          storageService.saveTeachers(curTeachers, true);
        }
        if (subjectsAdded) {
          if (setSubjects) setSubjects([...curSubjects]);
          storageService.saveSubjects(curSubjects, true);
        }
        if (classesAdded) {
          if (setClasses) setClasses([...curClasses]);
          storageService.saveClasses(curClasses, true);
        }

        const sanitizedImported = sanitizeAndDeduplicateSchedules(imported);
        setSchedules(sanitizedImported);
        storageService.saveSchedules(sanitizedImported, true);
        showToast(`Berhasil mengimpor ${sanitizedImported.length} data jadwal pelajaran dari template ke Cloud Firestore!`);
      } catch (err) {
        console.error('Error parsing Excel schedule template:', err);
        showToast('Gagal mengimpor file template jadwal.');
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  const hariList: ScheduleItem['hari'][] = ['Sabtu', 'Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis'];

  const filteredSchedules = sortSchedulesByJam(
    schedules.filter((s) => {
      const matchHari = selectedHariFilter === 'Semua' || s.hari === selectedHariFilter;
      const matchKelas = selectedKelasFilter === 'Semua' || isClassMatch(s.kelasId, selectedKelasFilter, classes);
      const matchGuru = selectedGuruFilter === 'Semua' || isTeacherMatch(s.guruId, selectedGuruFilter, teachers);
      return matchHari && matchKelas && matchGuru;
    })
  );

  return (
    <div className="space-y-6">
      {/* Header & Templates */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" /> Pengelolaan Jadwal Pelajaran
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Input jadwal kelas, dropdown pengajar & mapel, serta unduh template & unggah template jadwal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={downloadTemplate}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" /> Unduh Template
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Upload className="w-3.5 h-3.5" /> Upload Template Jadwal
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleUploadJadwal}
            className="hidden"
          />
        </div>
      </div>

      {/* Form Input Dropdown Jadwal */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100 shadow-md">
        <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
          + Input Jadwal Baru
        </h3>

        <form onSubmit={handleAddJadwal} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          {/* Dropdown Hari */}
          <div>
            <label className="block font-semibold text-slate-400 mb-1">Hari</label>
            <select
              value={newHari}
              onChange={(e) => setNewHari(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
            >
              {hariList.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          {/* Jam Ke Dropdown */}
          <div>
            <label className="block font-semibold text-slate-400 mb-1">Jam Pelajaran</label>
            <select
              value={newJamKe}
              onChange={(e) => setNewJamKe(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-mono"
            >
              {jamPelajaranList.map((jam) => (
                <option key={jam} value={jam}>
                  {jam}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown Guru */}
          <div>
            <label className="block font-semibold text-slate-400 mb-1">Guru Pengajar</label>
            <select
              value={newGuruId}
              onChange={(e) => setNewGuruId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 truncate"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown Mapel */}
          <div>
            <label className="block font-semibold text-slate-400 mb-1">Mata Pelajaran</label>
            <select
              value={newMapelId}
              onChange={(e) => setNewMapelId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 truncate"
            >
              {subjects.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.namaMapel}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown Kelas & Submit */}
          <div>
            <label className="block font-semibold text-slate-400 mb-1">Kelas Target</label>
            <div className="flex gap-2">
              <select
                value={newKelasId}
                onChange={(e) => setNewKelasId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.namaKelas}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 font-bold text-white rounded-xl shadow transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-300 font-bold">
          <Filter className="w-4 h-4 text-emerald-400" /> Filter Jadwal:
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div>
            <span className="text-slate-400 mr-2">Filter Hari:</span>
            <select
              value={selectedHariFilter}
              onChange={(e) => setSelectedHariFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200"
            >
              <option value="Semua">Semua Hari</option>
              {hariList.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="text-slate-400 mr-2">Filter Kelas:</span>
            <select
              value={selectedKelasFilter}
              onChange={(e) => setSelectedKelasFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200"
            >
              <option value="Semua">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.namaKelas}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="text-slate-400 mr-2">Filter Guru:</span>
            <select
              value={selectedGuruFilter}
              onChange={(e) => setSelectedGuruFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200"
            >
              <option value="Semua">Semua Guru</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nama}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowDeleteAllModal(true)}
            className="px-3.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition ml-auto"
            title="Hapus Semua Jadwal Pelajaran"
          >
            <Trash2 className="w-3.5 h-3.5" /> Hapus Semua Jadwal
          </button>
        </div>
      </div>

      {/* Schedule Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Hari</th>
                <th className="p-4">Jam Pelajaran</th>
                <th className="p-4">Kelas</th>
                <th className="p-4">Mata Pelajaran</th>
                <th className="p-4">Guru Pengajar</th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredSchedules.map((sch) => {
                const guru = matchTeacher(sch.guruId, teachers);
                const mapel = matchSubject(sch.mapelId, subjects);
                const kelas = matchClass(sch.kelasId, classes);

                const displayKelas = getDisplayClassName(sch.kelasId, classes);
                const displayMapel = getDisplaySubjectName(sch.mapelId, subjects);
                const displayGuru = getDisplayTeacherName(sch.guruId, teachers);

                return (
                  <tr key={sch.id} className="hover:bg-slate-800/50 transition">
                    <td className="p-4">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {sch.hari}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> {sch.jamKe}
                    </td>
                    <td className="p-4 font-bold text-teal-400">{displayKelas}</td>
                    <td className="p-4 font-bold text-white">{displayMapel}</td>
                    <td className="p-4 text-slate-300 font-medium">{displayGuru}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingSchedule({ ...sch })}
                          className="p-2 text-amber-400 hover:bg-amber-950/50 rounded-xl transition"
                          title="Edit Jadwal"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteScheduleId(sch.id)}
                          className="p-2 text-rose-400 hover:bg-rose-950/50 rounded-xl transition"
                          title="Hapus Jadwal"
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
      </div>

      {/* EDIT JADWAL MODAL */}
      {editingSchedule && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-amber-400 flex items-center gap-2">
                <Edit className="w-5 h-5" /> Edit Jadwal Pelajaran
              </h3>
              <button
                onClick={() => setEditingSchedule(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateJadwal} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Hari</label>
                  <select
                    value={editingSchedule.hari}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, hari: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-semibold"
                  >
                    {['Sabtu', 'Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis'].map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-400 mb-1">Jam Pelajaran</label>
                  <select
                    value={editingSchedule.jamKe}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, jamKe: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-mono"
                  >
                    {jamPelajaranList.map((j) => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-medium text-slate-400 mb-1">Kelas Target</label>
                <select
                  value={editingSchedule.kelasId}
                  onChange={(e) => setEditingSchedule({ ...editingSchedule, kelasId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.namaKelas}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-400 mb-1">Mata Pelajaran</label>
                <select
                  value={editingSchedule.mapelId}
                  onChange={(e) => setEditingSchedule({ ...editingSchedule, mapelId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.namaMapel}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-400 mb-1">Guru Pengajar</label>
                <select
                  value={editingSchedule.guruId}
                  onChange={(e) => setEditingSchedule({ ...editingSchedule, guruId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.nama}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 font-bold text-white rounded-xl transition mt-2 flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" /> Simpan Perubahan Jadwal
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteScheduleId && (
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
              Apakah Anda yakin ingin menghapus jadwal pelajaran ini?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteScheduleId(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteJadwal}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-rose-950"
              >
                <Trash2 className="w-4 h-4" /> Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ALL CONFIRMATION MODAL */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 bg-rose-950/80 rounded-xl border border-rose-800/50">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Konfirmasi Hapus Semua</h3>
                <p className="text-xs text-slate-400">Peringatan: Seluruh data jadwal akan dikosongkan</p>
              </div>
            </div>
            <p className="text-sm text-slate-300">
              Apakah Anda yakin ingin menghapus {selectedHariFilter !== 'Semua' || selectedKelasFilter !== 'Semua' || selectedGuruFilter !== 'Semua' ? `semua jadwal pada filter aktif (${filteredSchedules.length} item)` : `seluruh (${schedules.length} item) jadwal pelajaran`}?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteAllModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteAllJadwal}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-rose-950"
              >
                <Trash2 className="w-4 h-4" /> Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST BANNER */}
      {toastMessage && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400 font-semibold text-sm animate-bounce max-w-md text-center">
          <CheckCircle2 className="w-5 h-5 text-emerald-200 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
