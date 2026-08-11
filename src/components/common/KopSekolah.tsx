import React from 'react';
import { SchoolSettings } from '../../types';

interface KopSekolahProps {
  settings: SchoolSettings;
}

export const KopSekolah: React.FC<KopSekolahProps> = ({ settings }) => {
  return (
    <div className="bg-white p-4 sm:p-5 rounded-t-xl text-slate-900 border-b-2 border-slate-900 mb-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-4xl mx-auto text-center sm:text-left">
        {/* Logo Sekolah - Bigger size without green circle border */}
        <div className="w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0 flex items-center justify-center p-1 overflow-hidden bg-white">
          <img
            src={settings.logoUrl || "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150&auto=format&fit=crop&q=80"}
            alt="Logo Sekolah"
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Official Header Content with tighter line spacing */}
        <div className="flex-1 text-center font-serif text-slate-900 space-y-0.5">
          <h2 className="text-sm sm:text-base font-bold tracking-wider uppercase leading-tight text-slate-900">
            YAYASAN AL-AMIEN PRENDUAN
          </h2>
          <h1 className="text-lg sm:text-2xl font-black tracking-tight uppercase leading-none text-slate-900 py-0.5">
            MADRASAH ALIYAH AL-AMIEN I PRAGAAN
          </h1>
          <p className="text-xs sm:text-sm font-bold tracking-wider uppercase text-slate-800">
            PRENDUAN SUMENEP MADURA INDONESIA
          </p>
          <p className="text-xs sm:text-sm font-semibold tracking-wide text-slate-800">
            NSM : 131235290001
          </p>
          <p className="text-xs sm:text-sm font-extrabold tracking-widest text-slate-900">
            STATUS : TERAKREDITASI (A)
          </p>
        </div>
      </div>

      {/* Address line separated by matching double/parallel line */}
      <div className="border-t-2 border-slate-900 mt-2.5 pt-1.5 text-center text-xs sm:text-sm font-medium text-slate-900 font-sans">
        Alamat : Jalan Raya Pamekasan-Sumenep No 2A Telp. (0328) 821020 Kode Pos 69465
      </div>
    </div>
  );
};

