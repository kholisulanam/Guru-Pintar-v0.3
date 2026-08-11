import React from 'react';
import { Announcement } from '../../types';
import { Bell, AlertCircle } from 'lucide-react';

interface SiswaPengumumanProps {
  announcements: Announcement[];
}

export const SiswaPengumuman: React.FC<SiswaPengumumanProps> = ({ announcements }) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" /> Pengumuman Resmi Pimpinan Madrasah
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Informasi penting terkait KBM, jadwal asesmen, dan kegiatan akademik MAS AL-AMIEN.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {announcements.map((ann) => (
          <div
            key={ann.id}
            className={`p-5 rounded-2xl border transition shadow-md ${
              ann.kategori === 'penting'
                ? 'bg-rose-950/30 border-rose-800 text-rose-100'
                : 'bg-slate-900 border-slate-800 text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  ann.kategori === 'penting'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                {ann.kategori}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">{ann.tanggal}</span>
              <span className="text-[11px] text-slate-500">| Oleh: {ann.pembuat}</span>
            </div>

            <h3 className="text-base font-bold text-white">{ann.judul}</h3>
            <p className="text-xs leading-relaxed text-slate-300 mt-2">{ann.isi}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
