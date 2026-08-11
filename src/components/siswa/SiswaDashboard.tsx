import React from 'react';
import {
  User,
  ScheduleItem,
  StudentAttendance,
  Announcement,
  Assessment,
  SubjectItem,
  ClassItem,
  AssessmentSubmission
} from '../../types';
import { getTodayString } from '../../lib/storage';
import { canUserAccessAssessment } from '../../lib/assessmentUtils';
import { sortSchedulesByJam } from '../../lib/matchUtils';
import { Clock, CheckCircle2, Bell, FileCheck, BookOpen, ArrowRight, Award } from 'lucide-react';

interface SiswaDashboardProps {
  currentUser: User;
  schedules: ScheduleItem[];
  studentAttendances: StudentAttendance[];
  announcements: Announcement[];
  assessments: Assessment[];
  submissions: AssessmentSubmission[];
  subjects: SubjectItem[];
  classes: ClassItem[];
  onStartExam: (asm: Assessment) => void;
  onNavigateTab: (tabId: string) => void;
}

export const SiswaDashboard: React.FC<SiswaDashboardProps> = ({
  currentUser,
  schedules,
  studentAttendances,
  announcements,
  assessments,
  submissions,
  subjects,
  classes,
  onStartExam,
  onNavigateTab,
}) => {
  const todayStr = getTodayString();
  const daysMap = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const currentDayName = daysMap[new Date().getDay()];

  const myClassId = currentUser.kelasId || 'cls-12a';
  const myClassObj = classes.find((c) => c.id === myClassId);

  // Today's schedule for student's class
  const todaySchedules = sortSchedulesByJam(
    schedules.filter((s) => s.kelasId === myClassId && s.hari === currentDayName)
  );

  // Today's attendance status for this student
  const myAttendances = studentAttendances.filter((sa) => sa.siswaId === currentUser.id);
  const myTodayAttendance = myAttendances.find((sa) => sa.tanggal === todayStr);

  // Active assessments accessible by this student
  const activeAssessments = assessments.filter((a) => {
    if (!a.aktif) return false;
    return canUserAccessAssessment(a, currentUser, { schedules, subjects });
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-white/15 border border-white/20 text-indigo-200 uppercase tracking-wider backdrop-blur-md">
            PORTAL MURID MAS AL-AMIEN
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-3 drop-shadow">
            AHLAN WA SAHLAN, {currentUser.name}
          </h2>
          <p className="text-xs sm:text-sm text-indigo-100/80 mt-1">
            NISN: {currentUser.nuptkOrNisn || '0051234567'} | Kelas: <span className="font-bold text-amber-300">{myClassObj?.namaKelas || 'XII IPA 1'}</span>
          </p>
        </div>
      </div>

      {/* Grid Quick Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Status Presensi Hari ini */}
        <div
          onClick={() => onNavigateTab('presensi')}
          className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-5 cursor-pointer hover:bg-white/15 hover:scale-[1.02] transition-all duration-200 shadow-xl flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-indigo-200/90 uppercase tracking-wider">Presensi Murid Hari Ini</span>
            <div className="flex items-center gap-1.5">
              {myTodayAttendance ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span className="text-sm font-bold text-emerald-300">{myTodayAttendance.status}</span>
                </>
              ) : (
                <span className="text-sm font-bold text-amber-300">Belum Presensi</span>
              )}
            </div>
          </div>
          <CheckCircle2 className="w-8 h-8 text-indigo-200/50 group-hover:text-white transition" />
        </div>

        {/* Asesmen Mendatang / Aktif */}
        <div
          onClick={() => onNavigateTab('asesmen')}
          className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-5 cursor-pointer hover:bg-white/15 hover:scale-[1.02] transition-all duration-200 shadow-xl flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-indigo-200/90 uppercase tracking-wider">Asesmen Aktif Ujian</span>
            <p className="text-sm font-bold text-amber-300">
              {activeAssessments.length} Ujian Siap Dikerjakan
            </p>
          </div>
          <FileCheck className="w-8 h-8 text-indigo-200/50 group-hover:text-white transition" />
        </div>

        {/* Perpustakaan Digital */}
        <div
          onClick={() => onNavigateTab('perpustakaan')}
          className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-5 cursor-pointer hover:bg-white/15 hover:scale-[1.02] transition-all duration-200 shadow-xl flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-indigo-200/90 uppercase tracking-wider">Perpustakaan Digital</span>
            <p className="text-sm font-bold text-indigo-200">
              Akses Modul & Buku Paket
            </p>
          </div>
          <BookOpen className="w-8 h-8 text-indigo-200/50 group-hover:text-white transition" />
        </div>
      </div>

      {/* Today Schedule & Available Assessments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Jadwal Hari ini */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-300" /> Jadwal Pelajaran Hari Ini ({currentDayName})
            </h3>
          </div>

          {todaySchedules.length === 0 ? (
            <p className="text-xs text-indigo-200/60 py-6 text-center italic">
              Tidak ada jam pelajaran untuk kelas Anda pada hari {currentDayName}.
            </p>
          ) : (
            <div className="space-y-2">
              {todaySchedules.map((sch) => {
                const mapel = subjects.find((m) => m.id === sch.mapelId);
                return (
                  <div
                    key={sch.id}
                    className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex items-center justify-between text-xs hover:bg-white/10 transition"
                  >
                    <div>
                      <p className="font-bold text-white">{mapel?.namaMapel}</p>
                      <p className="text-[10px] text-indigo-200/70">Jam: {sch.jamKe}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                      Tatap Muka
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Asesmen Aktif */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-amber-300" /> Asesmen / Ujian Berlangsung
            </h3>
            <button
              onClick={() => onNavigateTab('asesmen')}
              className="text-xs text-amber-300 hover:text-white hover:underline font-semibold"
            >
              Lihat Semua
            </button>
          </div>

          <div className="space-y-2">
            {activeAssessments.length === 0 ? (
              <p className="text-xs text-indigo-200/60 py-6 text-center italic">
                Tidak ada ujian atau asesmen aktif untuk kelas Anda saat ini.
              </p>
            ) : (
              activeAssessments.map((asm) => {
                const sub = submissions.find((s) => s.assessmentId === asm.id && s.siswaId === currentUser.id);

                return (
                  <div
                    key={asm.id}
                    className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex items-center justify-between text-xs hover:bg-white/10 transition"
                  >
                    <div>
                      <p className="font-bold text-white">{asm.judul}</p>
                      <p className="text-[10px] text-indigo-200/70">
                        Durasi: {asm.lamaUjianMenit} Menit | {asm.soalList.length} Soal
                      </p>
                    </div>

                    {sub ? (
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 flex items-center gap-1">
                        <Award className="w-3 h-3 text-emerald-300" /> Nilai: {sub.nilai}
                      </span>
                    ) : (
                      <button
                        onClick={() => onStartExam(asm)}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition"
                      >
                        Mulai Asesmen
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Pengumuman Terbaru Preview */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-300" /> Pengumuman Terbaru Madrasah
          </h3>
          <button
            onClick={() => onNavigateTab('pengumuman')}
            className="text-xs text-indigo-300 hover:text-white hover:underline font-semibold flex items-center gap-1"
          >
            Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          {announcements.slice(0, 2).map((ann) => (
            <div
              key={ann.id}
              className={`p-4 rounded-2xl border transition ${
                ann.kategori === 'penting'
                  ? 'bg-rose-500/15 border-rose-400/30 text-rose-100'
                  : 'bg-white/5 border-white/10 text-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    ann.kategori === 'penting' ? 'bg-rose-500 text-white' : 'bg-white/15 text-white/90 border border-white/20'
                  }`}
                >
                  {ann.kategori}
                </span>
                <span className="text-[10px] text-indigo-200/70">{ann.tanggal}</span>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-white">{ann.judul}</h4>
              <p className="text-xs text-indigo-100/80 mt-1 line-clamp-2">{ann.isi}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
