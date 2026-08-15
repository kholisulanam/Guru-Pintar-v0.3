import React, { useState } from 'react';
import { ScheduleItem, User, SubjectItem, ClassItem, TeacherItem } from '../../types';
import { Calendar, Clock, Filter } from 'lucide-react';
import { sortSchedulesByJam, isTeacherMatch, getDisplayClassName, getDisplayTeacherName, getDisplaySubjectName } from '../../lib/matchUtils';

interface GuruJadwalProps {
  currentUser: User;
  schedules: ScheduleItem[];
  subjects: SubjectItem[];
  classes: ClassItem[];
  teachers?: TeacherItem[];
}

export const GuruJadwal: React.FC<GuruJadwalProps> = ({
  currentUser,
  schedules,
  subjects,
  classes,
  teachers = [],
}) => {
  const [selectedGuruFilter, setSelectedGuruFilter] = useState<string>(currentUser.id);

  const activeTeacher = teachers.find((t) => t.id === selectedGuruFilter);
  const displayTeacherName = selectedGuruFilter === currentUser.id 
    ? currentUser.name 
    : (activeTeacher?.nama || 'Guru');

  const mySchedules = schedules.filter((s) => {
    if (selectedGuruFilter === 'Semua') return true;
    const targetFilter = selectedGuruFilter === currentUser.id ? currentUser : selectedGuruFilter;
    return isTeacherMatch(s.guruId, targetFilter, teachers);
  });

  const hariList: ScheduleItem['hari'][] = ['Sabtu', 'Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" /> Jadwal Mengajar {displayTeacherName}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Daftar jadwal tatap muka KBM mengajar minggu ini di MAS AL-AMIEN I PRAGAAN.
          </p>
        </div>

        {teachers.length > 0 && (
          <div className="flex items-center gap-2 text-xs self-start md:self-auto bg-slate-950 p-2 rounded-xl border border-slate-800">
            <Filter className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="text-slate-400 whitespace-nowrap">Filter Guru:</span>
            <select
              value={selectedGuruFilter}
              onChange={(e) => setSelectedGuruFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value={currentUser.id}>Jadwal Saya ({currentUser.name})</option>
              <option value="Semua">Semua Guru</option>
              {teachers
                .filter((t) => t.id !== currentUser.id)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nama}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {hariList.map((hari) => {
          const daySchedules = sortSchedulesByJam(mySchedules.filter((s) => s.hari === hari));

          return (
            <div key={hari} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-slate-100 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <span className="text-sm font-bold text-emerald-400 uppercase tracking-wider">{hari}</span>
                <span className="text-[10px] font-bold bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                  {daySchedules.length} Sesi
                </span>
              </div>

              {daySchedules.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center italic">Tidak ada jadwal mengajar.</p>
              ) : (
                <div className="space-y-2">
                  {daySchedules.map((s) => {
                    const displayMapel = getDisplaySubjectName(s.mapelId, subjects);
                    const displayKelas = getDisplayClassName(s.kelasId, classes);
                    const displayGuru = getDisplayTeacherName(s.guruId, teachers);

                    return (
                      <div key={s.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                        <p className="font-mono text-emerald-400 font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {s.jamKe}
                        </p>
                        <p className="font-bold text-white mt-1">{displayMapel}</p>
                        <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                          <span>Kelas: <strong className="text-teal-300">{displayKelas}</strong></span>
                          {selectedGuruFilter === 'Semua' && (
                            <span className="text-slate-300 font-medium truncate max-w-[120px]">
                              {displayGuru}
                            </span>
                          )}
                        </div>
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
