import React, { useState } from 'react';
import { User, Assessment, AssessmentSubmission, SubjectItem, ClassItem, ScheduleItem } from '../../types';
import { canUserAccessAssessment } from '../../lib/assessmentUtils';
import { FileCheck, Clock, Award, PlayCircle, Filter } from 'lucide-react';

interface SiswaAsesmenProps {
  currentUser: User;
  assessments: Assessment[];
  submissions: AssessmentSubmission[];
  subjects: SubjectItem[];
  classes?: ClassItem[];
  schedules?: ScheduleItem[];
  onStartExam: (asm: Assessment) => void;
}

export const SiswaAsesmen: React.FC<SiswaAsesmenProps> = ({
  currentUser,
  assessments,
  submissions,
  subjects,
  classes = [],
  schedules = [],
  onStartExam,
}) => {
  const [filterMode, setFilterMode] = useState<'kelas_saya' | 'semua'>('kelas_saya');
  const myClassId = currentUser.kelasId || 'cls-12a';
  const myClassObj = classes.find((c) => c.id === myClassId);

  // Filter assessments based on access rules first
  const accessibleAssessments = assessments.filter((a) =>
    canUserAccessAssessment(a, currentUser, { schedules, subjects })
  );

  // Filter assessments based on student class and filter selection
  const filteredAssessments = accessibleAssessments.filter((a) => {
    if (filterMode === 'semua') {
      return true;
    }
    // 'kelas_saya': include matching class, 'semua', 'all', or unassigned
    return (
      a.kelasId === myClassId ||
      a.kelasId === 'semua' ||
      a.kelasId === 'all' ||
      !a.kelasId
    );
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-amber-400" /> Asesmen Sumatif & CBT Online
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Kerjakan ujian online pilihan ganda secara mandiri dengan sistem scoring otomatis.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setFilterMode('kelas_saya')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
              filterMode === 'kelas_saya'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Filter className="w-3.5 h-3.5" /> Kelas Saya ({myClassObj?.namaKelas || 'XII IPA 1'})
          </button>
          <button
            onClick={() => setFilterMode('semua')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              filterMode === 'semua'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Semua Asesmen ({assessments.length})
          </button>
        </div>
      </div>

      {/* List Assessments */}
      <div className="space-y-4">
        {filteredAssessments.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 italic space-y-2">
            <FileCheck className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold">Belum Ada Asesmen Ditampilkan</p>
            <p className="text-xs text-slate-500">
              {filterMode === 'kelas_saya'
                ? 'Belum ada ujian yang dijadwalkan khusus untuk kelas Anda. Coba ganti filter ke "Semua Asesmen".'
                : 'Belum ada asesmen yang ditambahkan oleh Admin atau Guru.'}
            </p>
          </div>
        ) : (
          filteredAssessments.map((asm) => {
            const mapel = subjects.find((m) => m.id === asm.mapelId);
            const targetClass = classes.find((c) => c.id === asm.kelasId);
            const classNameLabel =
              asm.kelasId === 'semua' || asm.kelasId === 'all' || !asm.kelasId
                ? 'Semua Kelas'
                : targetClass?.namaKelas || asm.kelasId;

            const sub = submissions.find(
              (s) => s.assessmentId === asm.id && s.siswaId === currentUser.id
            );

            return (
              <div
                key={asm.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100 shadow-md flex flex-wrap items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                      {mapel?.namaMapel || 'Mata Pelajaran'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                      {classNameLabel}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {asm.soalList.length} Soal | {asm.lamaUjianMenit} Menit
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white">{asm.judul}</h3>
                  <p className="text-xs text-slate-400">
                    Sistem Penilaian: Pilihan Ganda (5 Opsi A/B/C/D/E)
                  </p>
                </div>

                <div>
                  {sub ? (
                    <div className="bg-emerald-950/80 border border-emerald-800 rounded-2xl p-3 text-center min-w-[140px]">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                        Ujian Selesai
                      </span>
                      <p className="text-xl font-black text-white mt-0.5 flex items-center justify-center gap-1">
                        <Award className="w-5 h-5 text-emerald-400" /> {sub.nilai} / 100
                      </p>
                    </div>
                  ) : asm.aktif ? (
                    <button
                      onClick={() => onStartExam(asm)}
                      className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-bold text-white rounded-xl text-xs shadow-lg shadow-emerald-950 transition flex items-center gap-2"
                    >
                      <PlayCircle className="w-4 h-4" /> Mulai Kerjakan CBT
                    </button>
                  ) : (
                    <span className="px-4 py-2 bg-slate-800 text-slate-500 rounded-xl text-xs font-bold">
                      Ujian Ditutup
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
