import React from 'react';
import { SchoolSettings } from '../../types';

interface TandaTanganProps {
  settings: SchoolSettings;
  guruNama?: string;
  jabatan?: string;
  locationName?: string;
}

export const TandaTangan: React.FC<TandaTanganProps> = ({
  settings,
  guruNama = 'Nur Aida, S.Pd.I.',
  jabatan = 'Guru Mata Pelajaran',
  locationName = 'Pragaan'
}) => {
  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="mt-10 pt-6 border-t border-slate-200 text-slate-800 text-xs sm:text-sm">
      <div className="flex justify-end mb-4">
        <p className="font-medium text-slate-600">
          {locationName}, {todayStr}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-8">
        {/* Left Signature: Kepala Madrasah */}
        <div className="flex flex-col items-start text-left">
          <p className="font-semibold text-slate-700">Mengetahui,</p>
          <p className="font-bold text-slate-900 mb-16">Kepala Madrasah</p>
          <p className="font-bold text-slate-900 underline">{settings.kepalaSekolah}</p>
          <p className="text-slate-500 text-[11px] mt-0.5">NIP / NUPTK Terlampir</p>
        </div>

        {/* Right Signature: Nama Guru */}
        <div className="flex flex-col items-end text-right">
          <p className="font-semibold text-slate-700">&nbsp;</p>
          <p className="font-bold text-slate-900 mb-16">{jabatan}</p>
          <p className="font-bold text-slate-900 underline">{guruNama}</p>
          <p className="text-slate-500 text-[11px] mt-0.5">NIP / NUPTK Terlampir</p>
        </div>
      </div>
    </div>
  );
};
