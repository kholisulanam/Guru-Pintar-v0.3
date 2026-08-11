import React, { useState, useEffect } from 'react';
import { Assessment, User, AssessmentSubmission } from '../../types';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  Award,
  BookOpen,
  X
} from 'lucide-react';
import { storageService } from '../../lib/storage';

interface CbtExamModalProps {
  assessment: Assessment;
  student: User;
  onClose: () => void;
  onSubmitted: (submission: AssessmentSubmission) => void;
}

export const CbtExamModal: React.FC<CbtExamModalProps> = ({
  assessment,
  student,
  onClose,
  onSubmitted,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D' | 'E'>>({});
  const [raguState, setRaguState] = useState<Record<string, boolean>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(assessment.lamaUjianMenit * 60);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<AssessmentSubmission | null>(null);

  useEffect(() => {
    if (submittedResult) return;
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [submittedResult]);

  const currentQuestion = assessment.soalList[currentIndex];

  const handleSelectOption = (qId: string, optionKey: 'A' | 'B' | 'C' | 'D' | 'E') => {
    setAnswers((prev) => ({ ...prev, [qId]: optionKey }));
  };

  const toggleRagu = (qId: string) => {
    setRaguState((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  const calculateScore = () => {
    let totalScore = 0;
    assessment.soalList.forEach((q) => {
      if (answers[q.id] === q.kunciJawaban) {
        totalScore += q.bobot || 20;
      }
    });
    return Math.min(100, totalScore);
  };

  const handleFinalSubmit = () => {
    const finalScore = calculateScore();
    const submission: AssessmentSubmission = {
      id: `sub-${Date.now()}`,
      assessmentId: assessment.id,
      siswaId: student.id,
      siswaNama: student.name,
      kelasId: student.kelasId || 'cls-12a',
      waktuSelesai: new Date().toISOString(),
      nilai: finalScore,
      jawabanDetail: answers,
    };

    // Save submission to storage immediately
    const existing = storageService.getSubmissions();
    const updated = [...existing.filter((s) => !(s.assessmentId === assessment.id && s.siswaId === student.id)), submission];
    storageService.saveSubmissions(updated, true);

    setSubmittedResult(submission);
    onSubmitted(submission);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0f172a]/80 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#1e1b4b]/90 backdrop-blur-2xl border border-white/20 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-white">
        {/* CBT Header */}
        <div className="bg-white/10 backdrop-blur-md px-6 py-4 border-b border-white/15 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-indigo-300 uppercase bg-white/10 border border-white/20 px-2.5 py-0.5 rounded-full">
              CBT Computer Based Test
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white mt-1">
              {assessment.judul}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Timer */}
            {!submittedResult && (
              <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-400/40 text-amber-300 px-4 py-2 rounded-2xl font-mono text-base font-bold shadow-inner backdrop-blur-md">
                <Clock className="w-5 h-5 text-amber-300 animate-pulse" />
                <span>{formatTime(timeLeftSeconds)}</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* CBT Content Body */}
        {submittedResult ? (
          /* RESULT SCORE SCREEN */
          <div className="p-8 text-center overflow-y-auto space-y-6 my-auto">
            <div className="w-20 h-20 bg-indigo-500/20 border-2 border-indigo-400 rounded-full mx-auto flex items-center justify-center text-indigo-300 shadow-xl backdrop-blur-md">
              <Award className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white">Ujian Berhasil Diselesaikan!</h3>
              <p className="text-sm text-indigo-200/80 mt-1">
                Hasil penilaian otomatis untuk {student.name}
              </p>
            </div>

            <div className="bg-white/5 border border-white/15 rounded-3xl p-6 max-w-md mx-auto shadow-inner backdrop-blur-md">
              <p className="text-xs font-bold text-indigo-200 uppercase tracking-widest">
                Skor Akhir Asesmen
              </p>
              <p className="text-5xl font-black text-emerald-300 my-2 drop-shadow">
                {submittedResult.nilai}
              </p>
              <p className="text-xs text-indigo-200/70">
                Dari Total {assessment.soalList.length} Soal Pilihan Ganda
              </p>
            </div>

            <div className="pt-4 flex justify-center gap-4">
              <button
                onClick={onClose}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-sm transition shadow-lg shadow-indigo-600/30"
              >
                Kembali ke Beranda Asesmen
              </button>
            </div>
          </div>
        ) : (
          /* ACTIVE EXAM INTERFACE */
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 overflow-hidden">
            {/* Main Question Panel (3 cols) */}
            <div className="lg:col-span-3 p-6 overflow-y-auto flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10">
              {currentQuestion ? (
                <div>
                  <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                    <span className="text-xs font-bold bg-white/10 border border-white/15 px-3 py-1 rounded-full text-indigo-200">
                      Soal Nomor {currentIndex + 1} dari {assessment.soalList.length}
                    </span>
                    <button
                      onClick={() => toggleRagu(currentQuestion.id)}
                      className={`text-xs px-3 py-1 rounded-full font-semibold border transition ${
                        raguState[currentQuestion.id]
                          ? 'bg-amber-500/30 text-amber-200 border-amber-400'
                          : 'bg-white/10 text-white/70 border-white/15 hover:bg-white/15'
                      }`}
                    >
                      {raguState[currentQuestion.id] ? '✓ Ragu-ragu' : 'Tandai Ragu-ragu'}
                    </button>
                  </div>

                  <p className="text-base sm:text-lg font-medium text-white leading-relaxed mb-6">
                    {currentQuestion.pertanyaan}
                  </p>

                  {/* 5 Choice Options A-E */}
                  <div className="space-y-3">
                    {currentQuestion.opsi.map((opt) => {
                      const isSelected = answers[currentQuestion.id] === opt.key;
                      return (
                        <button
                          key={opt.key}
                          onClick={() => handleSelectOption(currentQuestion.id, opt.key)}
                          className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-4 ${
                            isSelected
                              ? 'bg-indigo-600/40 border-indigo-400 text-white shadow-lg ring-1 ring-indigo-400'
                              : 'bg-white/5 border-white/15 text-white/90 hover:bg-white/10'
                          }`}
                        >
                          <span
                            className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center flex-shrink-0 ${
                              isSelected
                                ? 'bg-indigo-500 text-white shadow'
                                : 'bg-white/10 text-white/80'
                            }`}
                          >
                            {opt.key}
                          </span>
                          <span className="text-sm font-medium pt-1 leading-snug">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Bottom Nav Controls */}
              <div className="pt-6 mt-6 border-t border-white/10 flex items-center justify-between">
                <button
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 disabled:opacity-30 text-xs font-bold text-white transition flex items-center gap-1.5 border border-white/15"
                >
                  <ChevronLeft className="w-4 h-4" /> Soal Sebelumnya
                </button>

                {currentIndex === assessment.soalList.length - 1 ? (
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-600/30"
                  >
                    <Send className="w-4 h-4" /> Selesai Ujian
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentIndex((prev) => Math.min(assessment.soalList.length - 1, prev + 1))}
                    className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
                  >
                    Soal Selanjutnya <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Sidebar Question Navigation Grid (1 col) */}
            <div className="p-5 bg-white/5 backdrop-blur-xl overflow-y-auto flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-indigo-200/80 uppercase tracking-wider mb-4">
                  Navigasi Soal
                </h4>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {assessment.soalList.map((q, idx) => {
                    const isAnswered = !!answers[q.id];
                    const isRagu = !!raguState[q.id];
                    const isCurrent = idx === currentIndex;

                    let bgClass = 'bg-white/10 text-white/70 border-white/15';
                    if (isRagu) {
                      bgClass = 'bg-amber-500 text-slate-950 font-bold border-amber-300';
                    } else if (isAnswered) {
                      bgClass = 'bg-indigo-600 text-white font-bold border-indigo-400';
                    }

                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentIndex(idx)}
                        className={`h-10 rounded-xl text-xs font-bold border transition flex items-center justify-center relative ${bgClass} ${
                          isCurrent ? 'ring-2 ring-white scale-105 shadow-lg' : ''
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="mt-6 space-y-2 text-[11px] text-indigo-200/80 border-t border-white/10 pt-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-indigo-600 inline-block"></span>
                    <span>Sudah Dijawab</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-amber-500 inline-block"></span>
                    <span>Ragu-ragu</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-white/10 border border-white/20 inline-block"></span>
                    <span>Belum Dijawab</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10">
                <button
                  onClick={() => setShowConfirmModal(true)}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Kumpulkan Ujian
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Submission Confirmation Popup Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-[#0f172a]/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1e1b4b] border border-white/20 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <AlertCircle className="w-12 h-12 text-amber-300 mx-auto" />
            <h3 className="text-lg font-bold text-white">Selesaikan Ujian?</h3>
            <p className="text-xs text-indigo-100/80">
              Anda telah menjawab {Object.keys(answers).length} dari {assessment.soalList.length} soal. Yakin ingin mengumpulkan jawaban sekarang?
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-2xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 border border-white/15"
              >
                Periksa Lagi
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  handleFinalSubmit();
                }}
                className="flex-1 py-2.5 rounded-2xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 shadow-lg shadow-indigo-600/30"
              >
                Ya, Kumpulkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
