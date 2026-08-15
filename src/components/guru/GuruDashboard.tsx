import React, { useState } from 'react';
import { User, ScheduleItem, TeacherAttendance, TeachingJournal, Assessment, SubjectItem, ClassItem, AssessmentSubmission, StudentItem } from '../../types';
import { getTodayString } from '../../lib/storage';
import { canUserAccessAssessment } from '../../lib/assessmentUtils';
import { sortSchedulesByJam, isTeacherMatch, getDisplayClassName, getDisplaySubjectName } from '../../lib/matchUtils';
import { 
  Clock, CalendarCheck, BookOpen, FileCheck, CheckCircle2, AlertCircle, ArrowRight,
  BellRing, Calendar, Sparkles, AlertTriangle, FileSpreadsheet, ListChecks, Filter, Users, ChevronRight
} from 'lucide-react';

interface GuruDashboardProps {
  currentUser: User;
  schedules: ScheduleItem[];
  teacherAttendances: TeacherAttendance[];
  teachingJournals: TeachingJournal[];
  assessments: Assessment[];
  submissions?: AssessmentSubmission[];
  students?: StudentItem[];
  subjects: SubjectItem[];
  classes: ClassItem[];
  onNavigateTab: (tabId: string) => void;
}

export const GuruDashboard: React.FC<GuruDashboardProps> = ({
  currentUser,
  schedules,
  teacherAttendances,
  teachingJournals,
  assessments,
  submissions = [],
  students = [],
  subjects,
  classes,
  onNavigateTab,
}) => {
  const [filterCategory, setFilterCategory] = useState<'semua' | 'jadwal' | 'asesmen' | 'presensi'>('semua');
  const todayStr = getTodayString();

  // Map today's day string to Indonesian day
  const daysMap = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const dayIndex = new Date().getDay();
  const currentDayName = daysMap[dayIndex];

  // Teacher's today schedule
  const todaySchedules = sortSchedulesByJam<ScheduleItem>(
    schedules.filter((s) => isTeacherMatch(s.guruId, currentUser) && s.hari === currentDayName)
  );

  // Teacher's today attendance status
  const myTeacherAttendances = teacherAttendances.filter((ta) => isTeacherMatch(ta.guruId, currentUser));
  const myTodayAttendance = myTeacherAttendances.find((ta) => ta.tanggal === todayStr);

  // Teacher's today journal status
  const myJournals = teachingJournals.filter((tj) => isTeacherMatch(tj.guruId, currentUser));
  const myTodayJournals = myJournals.filter((tj) => tj.tanggal === todayStr);
  const displayJournalCount = myTodayJournals.length > 0 ? myTodayJournals.length : myJournals.length;

  // Teacher's active assessments (Pembuat soal atau pengampu mapel)
  const myActiveAssessments = assessments.filter(
    (a) => a.aktif && canUserAccessAssessment(a, currentUser, { schedules, subjects })
  );

  // Reminders calculation
  const needsAttendance = !myTodayAttendance;
  
  // Schedules with journal status
  const scheduleReminders = todaySchedules.map((sch) => {
    const isJournalFilled = myTodayJournals.some((tj) => tj.kelasId === sch.kelasId && tj.mapelId === sch.mapelId);
    const mapel = subjects.find((m) => m.id === sch.mapelId);
    const kelas = classes.find((c) => c.id === sch.kelasId);
    return {
      ...sch,
      mapel,
      kelas,
      isJournalFilled,
    };
  });

  const uncompletedJournalsCount = scheduleReminders.filter((s) => !s.isJournalFilled).length;

  // Assessments with deadline & submission stats
  const assessmentReminders = myActiveAssessments.map((a) => {
    const mapel = subjects.find((m) => m.id === a.mapelId);
    const kelas = classes.find((c) => c.id === a.kelasId);
    const submittedList = submissions.filter((s) => s.assessmentId === a.id);
    const classStudentCount = kelas 
      ? (students.filter((s) => s.kelasId === kelas.id).length || kelas.jumlahSiswa) 
      : 30;
    const isTodayDeadline = a.waktuMulai ? a.waktuMulai.includes(todayStr) : true;

    return {
      ...a,
      mapel,
      kelas,
      submittedCount: submittedList.length,
      classStudentCount,
      isTodayDeadline,
    };
  });

  const totalPendingReminders = (needsAttendance ? 1 : 0) + uncompletedJournalsCount + assessmentReminders.length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/20 to-teal-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-white/15 border border-white/20 text-indigo-200 uppercase tracking-wider backdrop-blur-md">
            PORTAL GURU MAS AL-AMIEN
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-3 drop-shadow">
            AHLAN WA SAHLAN, {currentUser.name}
          </h2>
          <p className="text-xs sm:text-sm text-indigo-100/80 mt-1">
            NUPTK: {currentUser.nuptkOrNisn || '197805122005011002'} | Hari ini: <span className="font-bold text-amber-300">{currentDayName}, {todayStr}</span>
          </p>
        </div>
      </div>

      {/* Quick Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Status Presensi Guru */}
        <div
          onClick={() => onNavigateTab('presensi_guru')}
          className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-5 cursor-pointer hover:bg-white/15 hover:scale-[1.02] transition-all duration-200 shadow-xl flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-indigo-200/90 uppercase tracking-wider">Status Presensi Guru</span>
            <div className="flex items-center gap-2">
              {myTodayAttendance ? (
                <span className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Hadir ({myTodayAttendance.jamMasuk})
                </span>
              ) : (
                <span className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-300" /> Belum Presensi
                </span>
              )}
            </div>
          </div>
          <CalendarCheck className="w-8 h-8 text-indigo-200/50 group-hover:text-white transition" />
        </div>

        {/* Status Jurnal Mengajar */}
        <div
          onClick={() => onNavigateTab('jurnal')}
          className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-5 cursor-pointer hover:bg-white/15 hover:scale-[1.02] transition-all duration-200 shadow-xl flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-indigo-200/90 uppercase tracking-wider">Jurnal Mengajar</span>
            <p className="text-sm font-bold text-white">
              {displayJournalCount} Jurnal Terisi
            </p>
          </div>
          <BookOpen className="w-8 h-8 text-indigo-200/50 group-hover:text-white transition" />
        </div>

        {/* Asesmen Aktif */}
        <div
          onClick={() => onNavigateTab('asesmen')}
          className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-5 cursor-pointer hover:bg-white/15 hover:scale-[1.02] transition-all duration-200 shadow-xl flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-indigo-200/90 uppercase tracking-wider">Asesmen Aktif Anda</span>
            <p className="text-sm font-bold text-amber-300">
              {myActiveAssessments.length} Ujian Berlangsung
            </p>
          </div>
          <FileCheck className="w-8 h-8 text-indigo-200/50 group-hover:text-white transition" />
        </div>
      </div>

      {/* ================= PANEL PENGINGAT TUGAS HARIAN GURU ================= */}
      <div className="bg-gradient-to-br from-indigo-950/80 via-slate-900/90 to-indigo-900/80 backdrop-blur-2xl border border-indigo-400/30 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute -top-10 -right-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Panel Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-400/20 border border-amber-400/40 rounded-2xl text-amber-300 animate-pulse">
              <BellRing className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-wide">
                  Panel Pengingat Tugas Harian Guru
                </h3>
                {totalPendingReminders > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 shadow-md">
                    {totalPendingReminders} Tugas Harian
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Otomatis menampilkan Jadwal Mengajar {currentDayName} & Tenggat Asesmen Siswa
              </p>
            </div>
          </div>

          {/* Filter Options */}
          <div className="flex items-center gap-1.5 bg-black/30 p-1.5 rounded-2xl border border-white/10 text-xs overflow-x-auto">
            <button
              onClick={() => setFilterCategory('semua')}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                filterCategory === 'semua'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-indigo-200/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" /> Semua ({totalPendingReminders})
            </button>
            <button
              onClick={() => setFilterCategory('jadwal')}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                filterCategory === 'jadwal'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-indigo-200/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Jadwal Hari Ini ({todaySchedules.length})
            </button>
            <button
              onClick={() => setFilterCategory('asesmen')}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                filterCategory === 'asesmen'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-indigo-200/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" /> Tenggat Asesmen ({assessmentReminders.length})
            </button>
          </div>
        </div>

        {/* Panel Content List */}
        <div className="mt-5 space-y-4">
          {/* 1. Presensi Warning (If needed & matches filter) */}
          {(filterCategory === 'semua' || filterCategory === 'presensi') && needsAttendance && (
            <div className="bg-amber-500/15 border border-amber-400/30 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-300">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-200 text-sm">Presensi Kehadiran Guru belum diisi</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-400 text-slate-900 uppercase">
                      Penting
                    </span>
                  </div>
                  <p className="text-amber-100/70 text-xs mt-0.5">
                    Harap lakukan presensi kehadiran lokasi/GPS untuk tanggal {todayStr} ({currentDayName}).
                  </p>
                </div>
              </div>

              <button
                onClick={() => onNavigateTab('presensi_guru')}
                className="w-full sm:w-auto px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-black shadow-lg shadow-amber-400/20 transition flex items-center justify-center gap-1.5 text-xs whitespace-nowrap"
              >
                Presensi Sekarang <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 2. Jadwal Mengajar Hari Ini */}
          {(filterCategory === 'semua' || filterCategory === 'jadwal') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-indigo-200 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" /> Pengingat Jadwal Mengajar ({currentDayName})
                </h4>
                <span className="text-[11px] text-indigo-300/80 font-medium">
                  {uncompletedJournalsCount > 0 
                    ? `${uncompletedJournalsCount} jurnal perlu diisi` 
                    : 'Semua jurnal mengajar terisi'}
                </span>
              </div>

              {scheduleReminders.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center text-indigo-200/60 text-xs italic">
                  Tidak ada jadwal mengajar pada hari {currentDayName}.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {scheduleReminders.map((sch) => (
                    <div
                      key={sch.id}
                      className={`p-4 rounded-2xl border transition flex flex-col justify-between gap-3 ${
                        sch.isJournalFilled
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-white'
                          : 'bg-white/5 border-amber-400/30 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                              {sch.jamKe}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                              Kelas {sch.kelas?.namaKelas}
                            </span>
                          </div>
                          <h5 className="font-bold text-white text-sm mt-1.5">{sch.mapel?.namaMapel}</h5>
                        </div>

                        {sch.isJournalFilled ? (
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Jurnal Terisi
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Perlu Jurnal
                          </span>
                        )}
                      </div>

                      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                        <span className="text-indigo-200/70 text-[11px]">
                          Ruang: {sch.kelas?.namaKelas || 'Kelas MAS'}
                        </span>
                        <button
                          onClick={() => onNavigateTab('jurnal')}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1 ${
                            sch.isJournalFilled
                              ? 'bg-white/10 hover:bg-white/20 text-indigo-200'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                          }`}
                        >
                          {sch.isJournalFilled ? 'Lihat Jurnal' : 'Isi Jurnal Mengajar'} <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. Tenggat Waktu Asesmen Siswa */}
          {(filterCategory === 'semua' || filterCategory === 'asesmen') && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-indigo-200 uppercase tracking-wider flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-amber-400" /> Pengingat Tenggat Waktu Asesmen Siswa
                </h4>
                <span className="text-[11px] text-indigo-300/80 font-medium">
                  {assessmentReminders.length} Asesmen Aktif
                </span>
              </div>

              {assessmentReminders.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center text-indigo-200/60 text-xs italic">
                  Tidak ada asesmen aktif atau mendekati tenggat saat ini.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {assessmentReminders.map((asm) => (
                    <div
                      key={asm.id}
                      className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-200 border border-teal-400/30">
                              {asm.jenisSoal || 'Pilihan Ganda'}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                              Kelas {asm.kelas?.namaKelas}
                            </span>
                          </div>
                          <h5 className="font-bold text-white text-sm mt-1.5">{asm.judul}</h5>
                          <p className="text-xs text-indigo-200/80 font-medium">{asm.mapel?.namaMapel}</p>
                        </div>

                        {asm.isTodayDeadline ? (
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-400/40 flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5" /> Tenggat Hari Ini!
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                            Aktif
                          </span>
                        )}
                      </div>

                      {/* Detail & Progress Bar */}
                      <div className="bg-black/20 p-2.5 rounded-xl border border-white/5 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-indigo-200/80 text-[11px]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-amber-300" /> {asm.waktuMulai || 'Jadwal Aktif'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-teal-300" /> {asm.lamaUjianMenit} Menit ({asm.jumlahSoal} Soal)
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-indigo-200/90 font-medium flex items-center gap-1">
                              <Users className="w-3 h-3 text-emerald-300" /> Pengumpulan Siswa
                            </span>
                            <span className="font-bold text-amber-300">
                              {asm.submittedCount} / {asm.classStudentCount} Murid
                            </span>
                          </div>
                          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-teal-400 to-emerald-400 h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.round((asm.submittedCount / (asm.classStudentCount || 1)) * 100)
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => onNavigateTab('asesmen')}
                          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[11px] font-bold transition flex items-center gap-1"
                        >
                          Kelola Soal
                        </button>
                        <button
                          onClick={() => onNavigateTab('penilaian')}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-bold shadow-md shadow-emerald-600/30 transition flex items-center gap-1"
                        >
                          Cek Penilaian <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Ringkasan Jadwal Mengajar Hari Ini */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-300" /> Jadwal Mengajar Hari Ini ({currentDayName})
          </h3>
          <button
            onClick={() => onNavigateTab('jadwal')}
            className="text-xs text-indigo-300 hover:text-white hover:underline font-semibold flex items-center gap-1"
          >
            Lihat Semua Jadwal <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {todaySchedules.length === 0 ? (
          <p className="text-xs text-indigo-200/60 py-6 text-center italic">
            Tidak ada jadwal mengajar untuk Anda pada hari {currentDayName}.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {todaySchedules.map((sch) => {
              const displayMapel = getDisplaySubjectName(sch.mapelId, subjects);
              const displayKelas = getDisplayClassName(sch.kelasId, classes);

              return (
                <div
                  key={sch.id}
                  className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center justify-between text-xs hover:bg-white/10 transition"
                >
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                      {sch.jamKe}
                    </span>
                    <h4 className="font-bold text-white text-sm mt-1">{displayMapel}</h4>
                    <p className="text-indigo-200/70">Kelas: <span className="font-semibold text-amber-300">{displayKelas}</span></p>
                  </div>

                  <button
                    onClick={() => onNavigateTab('jurnal')}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[11px] font-bold shadow-lg shadow-indigo-600/30 transition"
                  >
                    Isi Jurnal
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
