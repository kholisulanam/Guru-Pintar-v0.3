import React, { useState } from 'react';
import { Announcement } from '../../types';
import { storageService } from '../../lib/storage';
import { Bell, Plus, Trash2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface AdminPengumumanProps {
  announcements: Announcement[];
  setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>;
}

export const AdminPengumuman: React.FC<AdminPengumumanProps> = ({
  announcements,
  setAnnouncements,
}) => {
  const toast = useToast();
  const [judul, setJudul] = useState('');
  const [isi, setIsi] = useState('');
  const [kategori, setKategori] = useState<'umum' | 'penting'>('umum');

  const handleAddAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul || !isi) {
      toast.warning('Judul dan isi pengumuman wajib diisi!', 'Form Belum Lengkap');
      return;
    }

    try {
      const added: Announcement = {
        id: `ann-${Date.now()}`,
        judul,
        isi,
        kategori,
        tanggal: new Date().toISOString().split('T')[0],
        pembuat: 'Administrator Madrasah',
      };

      const updatedList = [added, ...announcements];
      setAnnouncements(updatedList);
      storageService.saveAnnouncements(updatedList, true);
      setJudul('');
      setIsi('');
      toast.success(
        `Pengumuman '${judul}' berhasil diterbitkan dan tersimpan ke Cloud Firebase!`,
        'Pengumuman Diterbitkan'
      );
    } catch (err) {
      toast.error('Gagal menerbitkan pengumuman.');
    }
  };

  const handleDeleteAnnouncement = (id: string) => {
    try {
      const updatedList = announcements.filter((a) => a.id !== id);
      setAnnouncements(updatedList);
      storageService.saveAnnouncements(updatedList, true);
      toast.info('Pengumuman berhasil dihapus.');
    } catch (err) {
      toast.error('Gagal menghapus pengumuman.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Input Form */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-6 text-white shadow-xl">
        <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
          <Bell className="w-5 h-5 text-amber-300" /> Input Pengumuman Madrasah Baru
        </h2>

        <form onSubmit={handleAddAnnouncement} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-indigo-200/90 mb-1">Judul Pengumuman</label>
              <input
                type="text"
                required
                placeholder="Contoh: Pelaksanaan Asesmen Sumatif Akhir Semester (ASAS)"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                className="w-full bg-white/5 border border-white/15 rounded-2xl p-3 text-white placeholder-white/30 focus:bg-white/10 focus:border-indigo-400 outline-none transition"
              />
            </div>

            <div>
              <label className="block font-semibold text-indigo-200/90 mb-1">Kategori Pengumuman</label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value as any)}
                className="w-full bg-[#1e1b4b]/80 border border-white/15 rounded-2xl p-3 text-white font-bold focus:bg-[#1e1b4b] outline-none transition"
              >
                <option value="umum">Umum (Biasa)</option>
                <option value="penting">Penting (Highlight Merah)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-indigo-200/90 mb-1">Isi Pesan Pengumuman</label>
            <textarea
              rows={3}
              required
              placeholder="Tuliskan pengumuman lengkap untuk seluruh Guru dan Siswa..."
              value={isi}
              onChange={(e) => setIsi(e.target.value)}
              className="w-full bg-white/5 border border-white/15 rounded-2xl p-3 text-white placeholder-white/30 focus:bg-white/10 focus:border-indigo-400 outline-none transition"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Publikasikan Pengumuman
          </button>
        </form>
      </div>

      {/* List Announcements */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-indigo-200/70 uppercase tracking-wider px-1">
          Daftar Pengumuman Aktif ({announcements.length})
        </h3>

        {announcements.map((ann) => (
          <div
            key={ann.id}
            className={`p-5 rounded-3xl border transition shadow-lg backdrop-blur-xl flex items-start justify-between gap-4 ${
              ann.kategori === 'penting'
                ? 'bg-rose-500/15 border-rose-400/30 text-rose-100'
                : 'bg-white/10 border-white/15 text-white'
            }`}
          >
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    ann.kategori === 'penting'
                      ? 'bg-rose-500 text-white shadow-md'
                      : 'bg-white/15 text-white/90 border border-white/20'
                  }`}
                >
                  {ann.kategori}
                </span>
                <span className="text-[11px] text-indigo-200/80 font-mono">{ann.tanggal}</span>
                <span className="text-[11px] text-indigo-200/60">| Oleh: {ann.pembuat}</span>
              </div>

              <h4 className="text-sm sm:text-base font-bold text-white">{ann.judul}</h4>
              <p className="text-xs leading-relaxed opacity-90">{ann.isi}</p>
            </div>

            <button
              onClick={() => handleDeleteAnnouncement(ann.id)}
              className="p-2 text-rose-300 hover:bg-rose-500/20 rounded-xl transition flex-shrink-0"
              title="Hapus Pengumuman"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
