import React, { useState } from 'react';
import { Assessment, ClassItem, SubjectItem, TeacherItem, Question, User, StudentItem, ScheduleItem } from '../../types';
import { storageService } from '../../lib/storage';
import { canUserAccessAssessment } from '../../lib/assessmentUtils';
import { isClassMatch } from '../../lib/matchUtils';
import { FileCheck, Plus, Trash2, Power, Clock, HelpCircle, Sparkles, Bot, Wand2, Loader2, Check, Pencil, Eye, Save, X, RotateCcw, Users, UserCheck, ShieldCheck, Copy, Files } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface AdminAsesmenProps {
  currentUser?: User;
  assessments: Assessment[];
  setAssessments: React.Dispatch<React.SetStateAction<Assessment[]>>;
  classes: ClassItem[];
  subjects: SubjectItem[];
  teachers: TeacherItem[];
  students?: StudentItem[];
  schedules?: ScheduleItem[];
}

export const AdminAsesmen: React.FC<AdminAsesmenProps> = ({
  currentUser,
  assessments,
  setAssessments,
  classes,
  subjects,
  teachers,
  students = [],
  schedules = [],
}) => {
  const toast = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAssessmentId, setEditingAssessmentId] = useState<string | null>(null);

  // Form Assessment Fields
  const [judul, setJudul] = useState('');
  const [kelasId, setKelasId] = useState(classes[0]?.id || 'cls-12ipa1');
  const [mapelId, setMapelId] = useState(subjects[0]?.id || 'sub-1');
  const [guruId, setGuruId] = useState(teachers[0]?.id || 'usr-guru1');
  const [lamaUjianMenit, setLamaUjianMenit] = useState(30);

  // Target Siswa Fields (Rule: Murid yang dipilih untuk ujian)
  const [targetSiswaOption, setTargetSiswaOption] = useState<'semua' | 'terpilih'>('semua');
  const [selectedSiswaIds, setSelectedSiswaIds] = useState<string[]>([]);
  const [studentFilterKelas, setStudentFilterKelas] = useState<string>('semua');

  const activeClasses = classes || [];
  const activeStudents = students || [];

  const getClassName = (clsId: string) => {
    if (!clsId || clsId === 'semua' || clsId === 'all') return 'Semua Kelas';
    const found = activeClasses.find((c) => c.id === clsId) || activeClasses.find((c) => isClassMatch(clsId, c.id, activeClasses));
    return found ? found.namaKelas : clsId;
  };

  // Soal Builder List
  const [soalList, setSoalList] = useState<Question[]>([]);

  // Draft Soal currently editing
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [draftPertanyaan, setDraftPertanyaan] = useState('');
  const [draftOpsiA, setDraftOpsiA] = useState('');
  const [draftOpsiB, setDraftOpsiB] = useState('');
  const [draftOpsiC, setDraftOpsiC] = useState('');
  const [draftOpsiD, setDraftOpsiD] = useState('');
  const [draftOpsiE, setDraftOpsiE] = useState('');
  const [draftKunci, setDraftKunci] = useState<'A' | 'B' | 'C' | 'D' | 'E'>('A');

  // AI Generator States
  const [aiTopic, setAiTopic] = useState('');
  const [aiMapelId, setAiMapelId] = useState(subjects[0]?.id || mapelId);
  const [aiFaseKelas, setAiFaseKelas] = useState('Fase E (Kelas X Aliyah)');
  const [aiCount, setAiCount] = useState(5);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPreviewQuestions, setAiPreviewQuestions] = useState<Question[]>([]);

  // Import / Salin Soal dari Asesmen Lain
  const [selectedSourceAsmId, setSelectedSourceAsmId] = useState<string>('');

  // Filter assessments based on user permission / visibility rules
  const visibleAssessments = assessments.filter((asm) =>
    canUserAccessAssessment(asm, currentUser, { schedules, teachers, subjects, classes: activeClasses })
  );

  const handleOpenCreateModal = () => {
    const initialClassId = activeClasses[0]?.id || 'semua';
    setEditingAssessmentId(null);
    setJudul('');
    setKelasId(initialClassId);
    setMapelId(subjects[0]?.id || 'sub-1');
    setGuruId(currentUser?.role === 'guru' ? currentUser.id : teachers[0]?.id || 'usr-guru1');
    setLamaUjianMenit(30);
    setTargetSiswaOption('semua');
    setSelectedSiswaIds([]);
    setStudentFilterKelas(initialClassId);
    setSelectedSourceAsmId('');
    setSoalList([
      {
        id: `q-init-${Date.now()}`,
        pertanyaan: 'Contoh Soal 1: Apakah nama kitab Fiqih utama yang dipelajari di Aliyah?',
        opsi: [
          { key: 'A', text: 'Fathul Qarib / Mabadi Fiqhiyyah' },
          { key: 'B', text: 'Smaradah' },
          { key: 'C', text: 'Tafsir Jalalain' },
          { key: 'D', text: 'Bulughul Maram' },
          { key: 'E', text: 'Al-Ibriz' },
        ],
        kunciJawaban: 'A',
        bobot: 20,
      },
    ]);
    resetQuestionDraft();
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (asm: Assessment) => {
    setEditingAssessmentId(asm.id);
    setJudul(asm.judul);
    setKelasId(asm.kelasId);
    setMapelId(asm.mapelId);
    setGuruId(asm.guruId);
    setLamaUjianMenit(asm.lamaUjianMenit);
    setSoalList([...asm.soalList]);
    if (asm.targetSiswaIds && asm.targetSiswaIds.length > 0) {
      setTargetSiswaOption('terpilih');
      setSelectedSiswaIds([...asm.targetSiswaIds]);
    } else {
      setTargetSiswaOption('semua');
      setSelectedSiswaIds([]);
    }
    setStudentFilterKelas(asm.kelasId || 'semua');
    setSelectedSourceAsmId('');
    resetQuestionDraft();
    setShowCreateModal(true);
  };

  const resetQuestionDraft = () => {
    setEditingQuestionId(null);
    setDraftPertanyaan('');
    setDraftOpsiA('');
    setDraftOpsiB('');
    setDraftOpsiC('');
    setDraftOpsiD('');
    setDraftOpsiE('');
    setDraftKunci('A');
  };

  const handleDuplicateQuestionFromList = (q: Question, idx: number) => {
    const dup: Question = {
      ...q,
      id: `q-dup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      pertanyaan: `${q.pertanyaan} (Salinan)`,
      opsi: q.opsi.map((o) => ({ ...o })),
    };
    setSoalList((prev) => {
      const next = [...prev];
      next.splice(idx + 1, 0, dup);
      return next;
    });
  };

  const handleDuplicateAssessment = (asm: Assessment) => {
    const newSoalList: Question[] = asm.soalList.map((q, idx) => ({
      ...q,
      id: `q-dup-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
      opsi: q.opsi.map((o) => ({ ...o })),
    }));

    const duplicated: Assessment = {
      ...asm,
      id: `asm-${Date.now()}`,
      judul: `${asm.judul} (Salinan)`,
      waktuMulai: new Date().toISOString().slice(0, 16).replace('T', ' '),
      soalList: newSoalList,
      jumlahSoal: newSoalList.length,
      createdBy: currentUser?.id || currentUser?.username || asm.createdBy || 'usr-guru1',
      aktif: false,
    };

    const updatedList = [duplicated, ...assessments];
    setAssessments(updatedList);
    storageService.saveAssessments(updatedList, true);
    alert(`Asesmen "${asm.judul}" berhasil disalin beserta ${newSoalList.length} soalnya!`);
  };

  const handleCopyQuestionsFromOtherAssessment = (sourceAsmId: string) => {
    if (!sourceAsmId) return;
    const sourceAsm = assessments.find((a) => a.id === sourceAsmId);
    if (!sourceAsm || sourceAsm.soalList.length === 0) {
      alert('Asesmen pilihan tidak memiliki soal.');
      return;
    }

    const copiedSoal: Question[] = sourceAsm.soalList.map((q, idx) => ({
      ...q,
      id: `q-copied-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
      opsi: q.opsi.map((o) => ({ ...o })),
    }));

    setSoalList((prev) => [...prev, ...copiedSoal]);
    alert(`${copiedSoal.length} Soal berhasil disalin dari "${sourceAsm.judul}" ke daftar soal saat ini!`);
    setSelectedSourceAsmId('');
  };

  const handleEditQuestionInList = (q: Question) => {
    setEditingQuestionId(q.id);
    setDraftPertanyaan(q.pertanyaan);
    const opsiA = q.opsi.find((o) => o.key === 'A')?.text || '';
    const opsiB = q.opsi.find((o) => o.key === 'B')?.text || '';
    const opsiC = q.opsi.find((o) => o.key === 'C')?.text || '';
    const opsiD = q.opsi.find((o) => o.key === 'D')?.text || '';
    const opsiE = q.opsi.find((o) => o.key === 'E')?.text || '';
    setDraftOpsiA(opsiA);
    setDraftOpsiB(opsiB);
    setDraftOpsiC(opsiC);
    setDraftOpsiD(opsiD);
    setDraftOpsiE(opsiE);
    setDraftKunci(q.kunciJawaban || 'A');
  };

  const handleDeleteQuestionFromList = (qId: string) => {
    setSoalList((prev) => prev.filter((item) => item.id !== qId));
    if (editingQuestionId === qId) {
      resetQuestionDraft();
    }
  };

  const handleSaveQuestionEdit = () => {
    if (!editingQuestionId) return;
    if (!draftPertanyaan || !draftOpsiA || !draftOpsiB) {
      alert('Mohon isi teks pertanyaan dan minimal opsi A & B');
      return;
    }

    setSoalList((prev) =>
      prev.map((q) =>
        q.id === editingQuestionId
          ? {
              ...q,
              pertanyaan: draftPertanyaan,
              opsi: [
                { key: 'A', text: draftOpsiA },
                { key: 'B', text: draftOpsiB },
                { key: 'C', text: draftOpsiC || 'Opsi C' },
                { key: 'D', text: draftOpsiD || 'Opsi D' },
                { key: 'E', text: draftOpsiE || 'Opsi E' },
              ],
              kunciJawaban: draftKunci,
            }
          : q
      )
    );
    resetQuestionDraft();
  };

  const handleAddDraftQuestion = () => {
    if (!draftPertanyaan || !draftOpsiA || !draftOpsiB) {
      alert('Mohon isi teks pertanyaan dan minimal opsi A & B');
      return;
    }

    const q: Question = {
      id: `q-${Date.now()}`,
      pertanyaan: draftPertanyaan,
      opsi: [
        { key: 'A', text: draftOpsiA },
        { key: 'B', text: draftOpsiB },
        { key: 'C', text: draftOpsiC || 'Opsi C' },
        { key: 'D', text: draftOpsiD || 'Opsi D' },
        { key: 'E', text: draftOpsiE || 'Opsi E' },
      ],
      kunciJawaban: draftKunci,
      bobot: 20,
    };

    setSoalList((prev) => [...prev, q]);
    resetQuestionDraft();
  };

  const handleGenerateAISoal = async () => {
    const selectedMapel = subjects.find((m) => m.id === aiMapelId) || subjects.find((m) => m.id === mapelId);
    const mapelName = selectedMapel?.namaMapel || 'Mata Pelajaran';
    const className = aiFaseKelas || 'Kelas Aliyah';

    const topicPrompt = aiTopic.trim() || judul.trim() || mapelName || 'Materi Pembelajaran Aliyah';

    setIsGeneratingAI(true);
    setAiError(null);
    setAiPreviewQuestions([]);

    try {
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topicPrompt,
          mapelName: mapelName,
          className: className,
          count: aiCount,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal membuat soal dengan Gemini AI.');
      }

      if (Array.isArray(data.questions) && data.questions.length > 0) {
        const formatted: Question[] = data.questions.map((q: any, idx: number) => ({
          id: `q-ai-${Date.now()}-${idx}`,
          pertanyaan: q.pertanyaan || 'Pertanyaan AI',
          opsi: Array.isArray(q.opsi) ? q.opsi : [
            { key: 'A', text: 'Opsi A' },
            { key: 'B', text: 'Opsi B' },
            { key: 'C', text: 'Opsi C' },
            { key: 'D', text: 'Opsi D' },
            { key: 'E', text: 'Opsi E' },
          ],
          kunciJawaban: (q.kunciJawaban as 'A' | 'B' | 'C' | 'D' | 'E') || 'A',
          bobot: q.bobot || 20,
        }));
        setAiPreviewQuestions(formatted);
      } else {
        setAiError('Tidak ada soal yang dihasilkan. Silakan coba topik lain.');
      }
    } catch (err: any) {
      setAiError(err.message || 'Terjadi kesalahan saat memanggil Gemini AI.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleAddAIQuestionsToDraft = () => {
    if (aiPreviewQuestions.length === 0) return;
    setSoalList((prev) => [...prev, ...aiPreviewQuestions]);
    alert(`${aiPreviewQuestions.length} Soal AI berhasil ditambahkan ke daftar soal!`);
    setAiPreviewQuestions([]);
  };

  const handleSaveAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul) {
      alert('Isi judul asesmen terlebih dahulu!');
      return;
    }

    if (soalList.length === 0) {
      toast.warning('Minimal harus ada 1 soal dalam asesmen!', 'Soal Masih Kosong');
      return;
    }

    const finalTargetSiswaIds = targetSiswaOption === 'terpilih' ? selectedSiswaIds : [];
    const creatorId = currentUser?.id || currentUser?.username || guruId;

    try {
      if (editingAssessmentId) {
        // Update existing assessment
        const updatedList = assessments.map((a) =>
          a.id === editingAssessmentId
            ? {
                ...a,
                judul,
                kelasId,
                mapelId,
                guruId,
                createdBy: a.createdBy || creatorId,
                targetSiswaIds: finalTargetSiswaIds,
                lamaUjianMenit,
                jumlahSoal: soalList.length,
                soalList,
              }
            : a
        );
        setAssessments(updatedList);
        storageService.saveAssessments(updatedList, true);
        toast.success(
          `Perubahan paket soal '${judul}' (${soalList.length} soal) berhasil disimpan ke Cloud Firebase!`,
          'Asesmen Berhasil Diperbarui'
        );
      } else {
        // Create new assessment
        const added: Assessment = {
          id: `asm-${Date.now()}`,
          judul,
          kelasId,
          mapelId,
          guruId,
          createdBy: creatorId,
          targetSiswaIds: finalTargetSiswaIds,
          jumlahSoal: soalList.length,
          jenisSoal: 'Pilihan Ganda 5 Opsi',
          waktuMulai: new Date().toISOString().slice(0, 16).replace('T', ' '),
          lamaUjianMenit,
          aktif: true,
          soalList,
        };

        const updatedList = [added, ...assessments];
        setAssessments(updatedList);
        storageService.saveAssessments(updatedList, true);
        toast.success(
          `Asesmen baru '${judul}' (${soalList.length} butir soal) berhasil diterbitkan & tersimpan!`,
          'Asesmen Berhasil Diterbitkan'
        );
      }

      setShowCreateModal(false);
      setEditingAssessmentId(null);
    } catch (err) {
      toast.error('Gagal menyimpan asesmen CBT. Silakan coba lagi.');
    }
  };

  const handleToggleAktif = (id: string) => {
    try {
      const assessment = assessments.find((a) => a.id === id);
      const newStatus = assessment ? !assessment.aktif : false;
      const updatedList = assessments.map((a) => (a.id === id ? { ...a, aktif: !a.aktif } : a));
      setAssessments(updatedList);
      storageService.saveAssessments(updatedList, true);
      toast.info(
        newStatus
          ? `Ujian '${assessment?.judul}' diaktifkan untuk murid.`
          : `Ujian '${assessment?.judul}' dinonaktifkan.`
      );
    } catch (err) {
      toast.error('Gagal mengubah status aktif ujian.');
    }
  };

  const handleDeleteAssessment = (id: string) => {
    try {
      const assessment = assessments.find((a) => a.id === id);
      const updatedList = assessments.filter((a) => a.id !== id);
      setAssessments(updatedList);
      storageService.saveAssessments(updatedList, true);
      toast.info(`Asesmen '${assessment?.judul || id}' berhasil dihapus.`);
    } catch (err) {
      toast.error('Gagal menghapus asesmen.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-amber-400" /> Modul Buat & Kelola Asesmen
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Buat, lihat, dan edit soal pilihan ganda (A-E), tentukan durasi, aktifkan ujian, serta atur akses peserta ujian.
          </p>
        </div>
      </div>

      {/* List Assessments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleAssessments.length === 0 ? (
          <div className="col-span-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 space-y-2">
            <FileCheck className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold">Tidak Ada Asesmen Ditampilkan</p>
            <p className="text-xs text-slate-500">
              Hanya Admin, Pembuat soal / Pengampu Mapel, dan Murid yang dipilih yang dapat melihat asesmen ini.
            </p>
          </div>
        ) : (
          visibleAssessments.map((asm) => {
            const cls = classes.find((c) => c.id === asm.kelasId);
            const mapel = subjects.find((m) => m.id === asm.mapelId);
            const teacher = teachers.find((t) => t.id === asm.guruId || t.nuptk === asm.guruId);

            const isTargeted = asm.targetSiswaIds && asm.targetSiswaIds.length > 0;

            return (
              <div
                key={asm.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100 shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-emerald-400 border border-slate-700">
                      {asm.kelasId === 'semua' || asm.kelasId === 'all' || !asm.kelasId ? 'Semua Kelas' : (cls?.namaKelas || 'Semua Kelas')} | {mapel?.namaMapel || 'Mata Pelajaran'}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        asm.aktif
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border-rose-800'
                      }`}
                    >
                      {asm.aktif ? 'Aktif' : 'Non-Aktif'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-2">{asm.judul}</h3>

                  <div className="space-y-1.5 text-xs text-slate-400 mb-4">
                    <p className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" /> Waktu & Durasi: {asm.lamaUjianMenit} Menit
                    </p>
                    <p className="flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-cyan-400" /> Jumlah Soal: {asm.soalList.length} Soal (Pilihan Ganda 5 Opsi A-E)
                    </p>
                    <p className="flex items-center gap-1.5 text-slate-300">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                      Pengampu / Pembuat: <span className="font-semibold text-white">{teacher?.nama || asm.createdBy || asm.guruId}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      Peserta Ujian: {isTargeted ? (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-800 text-[10px] font-bold">
                          {asm.targetSiswaIds?.length} Murid Terpilih
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold">
                          Semua Murid ({asm.kelasId === 'semua' || !asm.kelasId ? 'Semua Kelas' : cls?.namaKelas || asm.kelasId})
                        </span>
                      )}
                    </p>
                  </div>
                </div>

              <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditModal(asm)}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-indigo-400/40"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Lihat / Edit Asesmen
                  </button>
                  <button
                    onClick={() => handleDuplicateAssessment(asm)}
                    className="px-3 py-2 bg-cyan-950 text-cyan-300 hover:bg-cyan-900 border border-cyan-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                    title="Salin/Duplikat Asesmen Ini & Seluruh Soalnya"
                  >
                    <Copy className="w-3.5 h-3.5" /> Salin Asesmen
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleAktif(asm.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      asm.aktif
                        ? 'bg-amber-950 text-amber-300 hover:bg-amber-900 border border-amber-800'
                        : 'bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-800'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" /> {asm.aktif ? 'Non-Aktifkan' : 'Aktifkan'}
                  </button>

                  <button
                    onClick={() => handleDeleteAssessment(asm.id)}
                    className="p-2 text-rose-400 hover:bg-rose-950/50 rounded-xl transition"
                    title="Hapus Ujian"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
      </div>

      {/* Tombol Buat Asesmen Baru dipindahkan dibawah bagian tengah soal/asesmen yang sudah dibuat */}
      <div className="flex justify-center pt-2 pb-2">
        <button
          onClick={handleOpenCreateModal}
          className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs sm:text-sm font-extrabold flex items-center gap-2.5 shadow-xl shadow-emerald-950/60 hover:scale-105 transition duration-200 border border-emerald-400/30"
        >
          <Plus className="w-5 h-5 text-amber-300" /> Buat Asesmen Baru
        </button>
      </div>

      {/* Modal Form Buat & Edit Asesmen & Input Soal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-3xl w-full shadow-2xl space-y-6 my-auto text-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-tight flex items-center gap-2">
                  {editingAssessmentId ? (
                    <>
                      <Pencil className="w-4 h-4 text-indigo-400" />
                      <span>Edit Asesmen & Daftar Soal</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-emerald-400" />
                      <span>Form Buat Asesmen & Input Soal</span>
                    </>
                  )}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {editingAssessmentId
                    ? 'Kelola judul, kelas, durasi, serta edit atau tambah soal pilihan ganda.'
                    : 'Buat ujian baru dan tambahkan soal secara manual atau gunakan AI Gemini.'}
                </p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssessment} className="space-y-5 text-xs">
              {/* Setting Asesmen */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Judul Asesmen / Ujian</label>
                  <input
                    type="text"
                    required
                    placeholder="Asesmen Fiqih: Bab Zakat & Wakaf"
                    value={judul}
                    onChange={(e) => setJudul(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Lama Ujian (Menit)</label>
                  <input
                    type="number"
                    required
                    value={lamaUjianMenit}
                    onChange={(e) => setLamaUjianMenit(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Pilih Kelas Target</label>
                  <select
                    value={kelasId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setKelasId(val);
                      setStudentFilterKelas(val);
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="semua">🌟 Semua Kelas (Seluruh Siswa)</option>
                    {activeClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.namaKelas}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Pilih Mapel</label>
                  <select
                    value={mapelId}
                    onChange={(e) => setMapelId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-1 focus:ring-emerald-500"
                  >
                    {subjects.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.namaMapel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Peserta Ujian (Target Murid Rule) */}
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="block font-bold text-slate-200">
                      Peserta Ujian (Target Murid)
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Tentukan apakah ujian ini untuk semua murid di kelas atau hanya murid-murid tertentu yang dipilih.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setTargetSiswaOption('semua')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        targetSiswaOption === 'semua'
                          ? 'bg-emerald-600 text-white font-bold shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Semua Murid
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetSiswaOption('terpilih')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        targetSiswaOption === 'terpilih'
                          ? 'bg-indigo-600 text-white font-bold shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Pilih Murid Spesifik ({selectedSiswaIds.length})
                    </button>
                  </div>
                </div>

                {targetSiswaOption === 'semua' && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300">
                        Daftar Murid Peserta Ujian ({
                          activeStudents.filter((s) => kelasId === 'semua' || isClassMatch(s.kelasId, kelasId, activeClasses)).length
                        } Murid):
                      </span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-0.5 rounded-full font-semibold">
                        Otomatis Semua Murid di {getClassName(kelasId)}
                      </span>
                    </div>

                    <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 bg-slate-900/90 rounded-xl border border-slate-800 text-xs">
                      {(() => {
                        const classStudents = activeStudents.filter(
                          (s) => kelasId === 'semua' || isClassMatch(s.kelasId, kelasId, activeClasses)
                        );
                        if (classStudents.length === 0) {
                          return (
                            <div className="p-3 bg-slate-950 rounded-lg text-center col-span-2">
                              <p className="text-slate-400 italic text-[11px]">
                                Belum ada murid terdaftar di {getClassName(kelasId)}.
                              </p>
                            </div>
                          );
                        }
                        return classStudents.map((student) => {
                          const clsName = getClassName(student.kelasId);
                          return (
                            <div
                              key={student.id}
                              className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/80 text-slate-300"
                            >
                              <div className="overflow-hidden min-w-0 pr-2">
                                <p className="font-semibold truncate text-[11px] text-white">{student.nama}</p>
                                <p className="text-[10px] text-slate-400">NISN: {student.nisn || student.id}</p>
                              </div>
                              <span className="text-[10px] text-indigo-300 font-medium bg-indigo-950/60 border border-indigo-800/50 px-1.5 py-0.5 rounded shrink-0">
                                {clsName}
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

                {targetSiswaOption === 'terpilih' && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-300">
                          Filter Kelas:
                        </span>
                        <select
                          value={studentFilterKelas}
                          onChange={(e) => setStudentFilterKelas(e.target.value)}
                          className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="semua">Semua Kelas ({activeStudents.length} murid)</option>
                          {activeClasses.map((cls) => {
                            const count = activeStudents.filter((s) => isClassMatch(s.kelasId, cls.id, activeClasses)).length;
                            return (
                              <option key={cls.id} value={cls.id}>
                                {cls.namaKelas} ({count} murid)
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const classStudents = activeStudents.filter(
                              (s) => studentFilterKelas === 'semua' || isClassMatch(s.kelasId, studentFilterKelas, activeClasses)
                            );
                            const newIds = Array.from(new Set([...selectedSiswaIds, ...classStudents.map((s) => s.id)]));
                            setSelectedSiswaIds(newIds);
                          }}
                          className="text-[10px] text-indigo-400 hover:underline font-semibold"
                        >
                          Pilih Semua
                        </button>
                        <span className="text-slate-600">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedSiswaIds([])}
                          className="text-[10px] text-rose-400 hover:underline font-semibold"
                        >
                          Reset Pilihan
                        </button>
                      </div>
                    </div>

                    {(() => {
                      const displayList = activeStudents.filter(
                        (s) => studentFilterKelas === 'semua' || isClassMatch(s.kelasId, studentFilterKelas, activeClasses)
                      );

                      if (displayList.length === 0) {
                        return (
                          <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 text-center space-y-2">
                            <p className="text-slate-400 italic text-[11px]">
                              Tidak ada data murid terdaftar untuk filter kelas ini.
                            </p>
                            <button
                              type="button"
                              onClick={() => setStudentFilterKelas('semua')}
                              className="px-3 py-1 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-lg text-[11px] font-semibold transition"
                            >
                              Tampilkan Semua Kelas ({activeStudents.length} Murid)
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 bg-slate-900/90 rounded-xl border border-slate-800 text-xs">
                          {displayList.map((student) => {
                            const isChecked = selectedSiswaIds.some(
                              (id) => id === student.id || (student.nisn && id === student.nisn)
                            );
                            const clsName = getClassName(student.kelasId);

                            return (
                              <label
                                key={student.id}
                                className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer transition ${
                                  isChecked
                                    ? 'bg-indigo-950/80 border-indigo-500/60 text-white'
                                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedSiswaIds((prev) => Array.from(new Set([...prev, student.id])));
                                    } else {
                                      setSelectedSiswaIds((prev) =>
                                        prev.filter((id) => id !== student.id && id !== student.nisn)
                                      );
                                    }
                                  }}
                                  className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                                />
                                <div className="overflow-hidden text-left flex-1 min-w-0">
                                  <p className="font-semibold truncate text-[11px]">{student.nama}</p>
                                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                                    <span>NISN: {student.nisn || student.id}</span>
                                    <span className="text-indigo-300 font-medium bg-indigo-950/50 px-1.5 py-0.5 rounded">{clsName}</span>
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* View / Manage List of Saved Questions in this Assessment */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="font-bold text-amber-300 text-xs uppercase flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-cyan-400" />
                    <span>Daftar Soal Dalam Asesmen ({soalList.length} Soal)</span>
                  </h4>
                  {editingQuestionId && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-900/80 text-indigo-300 border border-indigo-500/40 font-semibold animate-pulse">
                      Mode Edit Soal Aktif
                    </span>
                  )}
                </div>

                {soalList.length === 0 ? (
                  <p className="text-slate-500 text-center py-4 text-xs italic">
                    Belum ada soal. Tambahkan soal secara manual atau buat otomatis dengan AI Gemini di bawah.
                  </p>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1">
                    {soalList.map((q, idx) => {
                      const isEditingThis = editingQuestionId === q.id;

                      return (
                        <div
                          key={q.id}
                          className={`p-3 rounded-xl border text-xs transition ${
                            isEditingThis
                              ? 'bg-indigo-950/70 border-indigo-400/80 ring-1 ring-indigo-400'
                              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <p className="font-bold text-white text-xs">
                              {idx + 1}. {q.pertanyaan}
                            </p>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => handleDuplicateQuestionFromList(q, idx)}
                                className="px-2 py-1 bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 border border-cyan-700 rounded text-[10px] font-bold flex items-center gap-1 transition"
                                title="Salin / Duplikat Soal Ini"
                              >
                                <Copy className="w-3 h-3" /> Salin Soal
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditQuestionInList(q)}
                                className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition ${
                                  isEditingThis
                                    ? 'bg-amber-500 text-slate-950'
                                    : 'bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700'
                                }`}
                              >
                                <Pencil className="w-3 h-3" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestionFromList(q.id)}
                                className="p-1 text-rose-400 hover:bg-rose-950/80 rounded transition"
                                title="Hapus Soal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                            {q.opsi.map((o) => (
                              <div
                                key={o.key}
                                className={`px-2 py-1 rounded border ${
                                  o.key === q.kunciJawaban
                                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/80 font-bold'
                                    : 'bg-slate-950/50 text-slate-300 border-slate-800'
                                }`}
                              >
                                {o.key}. {o.text}
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-emerald-400 font-bold mt-1">
                            Kunci Jawaban: {q.kunciJawaban}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Salin Soal dari Asesmen Lain */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    <Files className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    <span>Salin Soal Dari Asesmen Lain:</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                    <select
                      value={selectedSourceAsmId}
                      onChange={(e) => setSelectedSourceAsmId(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-cyan-500 flex-1 sm:w-64"
                    >
                      <option value="">-- Pilih Asesmen Sumber --</option>
                      {assessments
                        .filter((a) => a.id !== editingAssessmentId && a.soalList && a.soalList.length > 0)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.judul} ({a.soalList.length} Soal)
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      disabled={!selectedSourceAsmId}
                      onClick={() => handleCopyQuestionsFromOtherAssessment(selectedSourceAsmId)}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition flex items-center gap-1 flex-shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" /> Salin Soal
                    </button>
                  </div>
                </div>
              </div>

              {/* Input & Edit Form Soal Pilihan Ganda 5 Opsi */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="font-bold text-emerald-400 text-xs uppercase flex items-center gap-1.5">
                    {editingQuestionId ? (
                      <>
                        <Pencil className="w-4 h-4 text-amber-300" />
                        <span>Edit Detail Soal No. {soalList.findIndex((q) => q.id === editingQuestionId) + 1}</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 text-emerald-400" />
                        <span>Input / Tambah Soal Manual (5 Opsi A-E)</span>
                      </>
                    )}
                  </h4>
                  {editingQuestionId && (
                    <button
                      type="button"
                      onClick={resetQuestionDraft}
                      className="text-[10px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> Batal Edit Soal
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Teks Pertanyaan Soal</label>
                  <textarea
                    rows={2}
                    placeholder="Tuliskan pertanyaan di sini..."
                    value={draftPertanyaan}
                    onChange={(e) => setDraftPertanyaan(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400">Opsi A</label>
                    <input
                      type="text"
                      placeholder="Jawaban A"
                      value={draftOpsiA}
                      onChange={(e) => setDraftOpsiA(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-slate-100 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400">Opsi B</label>
                    <input
                      type="text"
                      placeholder="Jawaban B"
                      value={draftOpsiB}
                      onChange={(e) => setDraftOpsiB(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-slate-100 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400">Opsi C</label>
                    <input
                      type="text"
                      placeholder="Jawaban C"
                      value={draftOpsiC}
                      onChange={(e) => setDraftOpsiC(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-slate-100 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400">Opsi D</label>
                    <input
                      type="text"
                      placeholder="Jawaban D"
                      value={draftOpsiD}
                      onChange={(e) => setDraftOpsiD(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-slate-100 mt-1"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-slate-400">Opsi E</label>
                    <input
                      type="text"
                      placeholder="Jawaban E"
                      value={draftOpsiE}
                      onChange={(e) => setDraftOpsiE(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-slate-100 mt-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Pilih Kunci Jawaban Benar</label>
                  <select
                    value={draftKunci}
                    onChange={(e) => setDraftKunci(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-slate-100 font-bold text-emerald-400"
                  >
                    <option value="A">Kunci Jawaban A</option>
                    <option value="B">Kunci Jawaban B</option>
                    <option value="C">Kunci Jawaban C</option>
                    <option value="D">Kunci Jawaban D</option>
                    <option value="E">Kunci Jawaban E</option>
                  </select>
                </div>

                {editingQuestionId ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveQuestionEdit}
                      className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow"
                    >
                      <Save className="w-4 h-4" /> Simpan Perubahan Soal
                    </button>
                    <button
                      type="button"
                      onClick={resetQuestionDraft}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <X className="w-4 h-4" /> Batal
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddDraftQuestion}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Tambah Soal Manual Ke Daftar
                  </button>
                )}
              </div>

              {/* Pembuat Soal Otomatis dengan AI Gemini */}
              <div className="bg-indigo-950/40 border border-indigo-500/30 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500/20 text-amber-300">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-indigo-200 text-xs flex items-center gap-1.5">
                        <span>Pembuat Soal Otomatis AI</span>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-[10px] text-amber-300 border border-indigo-400/30 font-semibold">
                          Gemini 3.6 Flash
                        </span>
                      </h4>
                      <p className="text-[10px] text-indigo-300/70">
                        Hasilkan soal pilihan ganda 5 opsi (A-E) beserta kunci jawaban secara otomatis.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Mapel Selector */}
                  <div>
                    <label className="block text-[11px] font-semibold text-indigo-200 mb-1">
                      Mata Pelajaran (Mapel)
                    </label>
                    <select
                      value={aiMapelId}
                      onChange={(e) => setAiMapelId(e.target.value)}
                      className="w-full bg-slate-900 border border-indigo-500/30 rounded-xl p-2 text-slate-100 text-xs font-semibold focus:ring-1 focus:ring-indigo-400"
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.namaMapel} ({s.kelompok})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Fase / Kelas Selector */}
                  <div>
                    <label className="block text-[11px] font-semibold text-indigo-200 mb-1">
                      Fase / Kelas Target
                    </label>
                    <select
                      value={aiFaseKelas}
                      onChange={(e) => setAiFaseKelas(e.target.value)}
                      className="w-full bg-slate-900 border border-indigo-500/30 rounded-xl p-2 text-slate-100 text-xs font-semibold focus:ring-1 focus:ring-indigo-400"
                    >
                      <option value="Fase E (Kelas X Aliyah)">Fase E (Kelas X Aliyah)</option>
                      <option value="Fase F (Kelas XI Aliyah)">Fase F (Kelas XI Aliyah)</option>
                      <option value="Fase F (Kelas XII Aliyah)">Fase F (Kelas XII Aliyah)</option>
                      {classes.map((c) => (
                        <option key={c.id} value={`Kelas ${c.namaKelas}`}>
                          Kelas {c.namaKelas}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Topik / Materi */}
                  <div>
                    <label className="block text-[11px] font-semibold text-indigo-200 mb-1">
                      Topik / Materi / Pokok Bahasan
                    </label>
                    <input
                      type="text"
                      placeholder={judul ? `Misal: ${judul}` : 'Masukkan topik bahasan atau bab...'}
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      className="w-full bg-slate-900 border border-indigo-500/30 rounded-xl p-2 text-slate-100 placeholder-indigo-300/40 text-xs focus:ring-1 focus:ring-indigo-400"
                    />
                  </div>

                  {/* Jumlah Soal */}
                  <div>
                    <label className="block text-[11px] font-semibold text-indigo-200 mb-1">
                      Jumlah Soal
                    </label>
                    <select
                      value={aiCount}
                      onChange={(e) => setAiCount(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-indigo-500/30 rounded-xl p-2 text-slate-100 text-xs font-semibold focus:ring-1 focus:ring-indigo-400"
                    >
                      <option value={3}>3 Soal</option>
                      <option value={5}>5 Soal</option>
                      <option value={10}>10 Soal</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isGeneratingAI}
                  onClick={handleGenerateAISoal}
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold rounded-xl shadow-md shadow-indigo-950 transition flex items-center justify-center gap-2 border border-indigo-400/40 text-xs disabled:opacity-60"
                >
                  {isGeneratingAI ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                      <span>Gemini AI Menyusun Soal...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 text-amber-300" />
                      <span>Generate Soal Otomatis dengan Gemini AI</span>
                    </>
                  )}
                </button>

                {aiError && (
                  <div className="p-2.5 bg-rose-950/60 border border-rose-800 text-rose-200 text-xs rounded-xl">
                    ⚠️ {aiError}
                  </div>
                )}

                {/* Preview Hasil Soal Gemini AI */}
                {aiPreviewQuestions.length > 0 && (
                  <div className="mt-3 bg-slate-900/90 border border-indigo-500/30 p-3 rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Bot className="w-4 h-4 text-indigo-400" />
                        Hasil Soal AI ({aiPreviewQuestions.length} Soal)
                      </span>
                      <button
                        type="button"
                        onClick={handleAddAIQuestionsToDraft}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition flex items-center gap-1 shadow"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambahkan Semua ke Daftar ({aiPreviewQuestions.length})
                      </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                      {aiPreviewQuestions.map((q, i) => (
                        <div key={q.id} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] space-y-1">
                          <p className="font-bold text-white">
                            {i + 1}. {q.pertanyaan}
                          </p>
                          <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-300">
                            {q.opsi.map((o) => (
                              <span
                                key={o.key}
                                className={`px-1.5 py-0.5 rounded border ${
                                  o.key === q.kunciJawaban
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700 font-bold'
                                    : 'bg-slate-900 text-slate-400 border-slate-800'
                                }`}
                              >
                                {o.key}. {o.text}
                              </span>
                            ))}
                          </div>
                          <p className="text-[10px] text-emerald-400 font-semibold pt-0.5">
                            Kunci Jawaban: {q.kunciJawaban}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold text-white rounded-xl shadow-lg shadow-emerald-950 transition text-xs flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>
                  {editingAssessmentId ? 'Simpan Perubahan Asesmen' : `Terbitkan Asesmen Sekarang (${soalList.length} Soal)`}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
