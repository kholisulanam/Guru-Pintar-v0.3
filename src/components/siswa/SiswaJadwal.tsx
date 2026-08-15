import React, { useState } from 'react';
import { ScheduleItem, User, SubjectItem, ClassItem, TeacherItem } from '../../types';
import { Calendar, Clock, BookOpen, UserCheck, Filter } from 'lucide-react';
import { sortSchedulesByJam, getDisplayTeacherName, getDisplaySubjectName, getDisplayClassName, isClassMatch } from '../../lib/matchUtils';

interface SiswaJadwalProps {
  currentUser: User;
  schedules: ScheduleItem[];
  subjects: SubjectItem[];
  classes: ClassItem[];
  teachers?: TeacherItem[];
}

export const SiswaJadwal: React.FC<SiswaJadwalProps> = ({
  currentUser,
  schedules,
  subjects,
  classes,
  teachers = [],
}) => {
  // Find student's default class or first class available
  const defaultClass = classes.find((c) => isClassMatch(c.id, currentUser.kelasId, classes)) || classes[0];
  const [selectedClassId, setSelectedClassId] = useState<string>(defaultClass?.id || '');

  const currentClassObj = classes.find((c) => c.id === selectedClassId) || defaultClass;

  const classSchedules = schedules.filter((s) => isClassMatch(s.kelasId, selectedClassId, classes));

  const hariList: ScheduleItem['hari'][] = ['Sabtu', 'Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

  return (
    <div className="space-y-6">
      {/* Header & Class Filter */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" /> Jadwal Pelajaran {currentClassObj?.namaKelas ? `Kelas ${currentClassObj.namaKelas}` : 'Siswa'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Jadwal Kegiatan Belajar Mengajar (KBM) Tatap Muka MAS AL-AMIEN I PRAGAAN.
          </p>
        </div>

        {/* Class Selector */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-300 flex-shrink-0">Pilih Kelas:</span>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 font-semibold w-full md:w-auto"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                Kelas {c.namaKelas}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Schedules per Day */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {hariList.map((hari) => {
          const daySchedules = sortSchedulesByJam(classSchedules.filter((s) => s.hari === hari));

          return (
            <div key={hari} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-slate-100 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <span className="text-sm font-bold text-emerald-400 uppercase tracking-wider">{hari}</span>
                <span className="text-[10px] font-bold bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                  {daySchedules.length} Jam Pelajaran
                </span>
              </div>

              {daySchedules.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center italic">Tidak ada jadwal pelajaran.</p>
              ) : (
                <div className="space-y-2.5">
                  {daySchedules.map((s) => {
                    const displayMapel = getDisplaySubjectName(s.mapelId, subjects);
                    const displayGuru = getDisplayTeacherName(s.guruId, teachers);
                    const mapel = subjects.find((m) => m.id === s.mapelId);

                    return (
                      <div key={s.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs hover:border-emerald-500/50 transition">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {s.jamKe}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {mapel?.kelompok || 'Wajib'}
                          </span>
                        </div>
                        <p className="font-bold text-white text-sm mt-1 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
                          <span>{displayMapel}</span>
                        </p>
                        <p className="text-slate-400 text-[11px] mt-1 flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-slate-500" />
                          <span>Pengajar: {displayGuru}</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
