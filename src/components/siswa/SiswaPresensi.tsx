import React, { useState } from 'react';
import { User, StudentAttendance } from '../../types';
import { Calendar, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

interface SiswaPresensiProps {
  currentUser: User;
  studentAttendances: StudentAttendance[];
}

export const SiswaPresensi: React.FC<SiswaPresensiProps> = ({
  currentUser,
  studentAttendances,
}) => {
  const [selectedBulan, setSelectedBulan] = useState<string>('2026-08');

  const monthNames = [
    { value: '2026-01', label: 'Januari 2026' },
    { value: '2026-02', label: 'Februari 2026' },
    { value: '2026-03', label: 'Maret 2026' },
    { value: '2026-04', label: 'April 2026' },
    { value: '2026-05', label: 'Mei 2026' },
    { value: '2026-06', label: 'Juni 2026' },
    { value: '2026-07', label: 'Juli 2026' },
    { value: '2026-08', label: 'Agustus 2026' },
  ];

  const myMonthRecords = studentAttendances.filter(
    (sa) => sa.siswaId === currentUser.id && sa.tanggal.startsWith(selectedBulan)
  );

  const hadirCount = myMonthRecords.filter((r) => r.status === 'Hadir').length;
  const izinCount = myMonthRecords.filter((r) => r.status === 'Izin').length;
  const sakitCount = myMonthRecords.filter((r) => r.status === 'Sakit').length;
  const alpaCount = myMonthRecords.filter((r) => r.status === 'Alpa').length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header & Filter */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" /> Rekapitulasi Presensi Kehadiran Murid
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Nama: <span className="text-white font-bold">{currentUser.name}</span> | NISN: {currentUser.nuptkOrNisn}
          </p>
        </div>

        <div>
          <span className="text-xs text-slate-400 mr-2 font-bold">Pilih Bulan:</span>
          <select
            value={selectedBulan}
            onChange={(e) => setSelectedBulan(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-bold"
          >
            {monthNames.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="bg-emerald-950/40 border border-emerald-800/80 p-4 rounded-2xl">
          <p className="text-xs text-emerald-400 font-bold uppercase">Hadir</p>
          <p className="text-2xl font-black text-emerald-300 mt-1">{hadirCount}</p>
        </div>
        <div className="bg-blue-950/40 border border-blue-800/80 p-4 rounded-2xl">
          <p className="text-xs text-blue-400 font-bold uppercase">Izin</p>
          <p className="text-2xl font-black text-blue-300 mt-1">{izinCount}</p>
        </div>
        <div className="bg-amber-950/40 border border-amber-800/80 p-4 rounded-2xl">
          <p className="text-xs text-amber-400 font-bold uppercase">Sakit</p>
          <p className="text-2xl font-black text-amber-300 mt-1">{sakitCount}</p>
        </div>
        <div className="bg-rose-950/40 border border-rose-800/80 p-4 rounded-2xl">
          <p className="text-xs text-rose-400 font-bold uppercase">Alpa</p>
          <p className="text-2xl font-black text-rose-300 mt-1">{alpaCount}</p>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Riwayat Presensi Bulan {selectedBulan} ({myMonthRecords.length} Catatan)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
              <tr>
                <th className="p-3">No</th>
                <th className="p-3">Tanggal</th>
                <th className="p-3">Status Kehadiran</th>
                <th className="p-3">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {myMonthRecords.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-500 italic">
                    Belum ada riwayat presensi tercatat untuk bulan ini.
                  </td>
                </tr>
              ) : (
                myMonthRecords.map((rec, idx) => (
                  <tr key={rec.id} className="hover:bg-slate-800/50 transition">
                    <td className="p-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-bold text-white">{rec.tanggal}</td>
                    <td className="p-3">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                          rec.status === 'Hadir'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : rec.status === 'Izin'
                            ? 'bg-blue-950 text-blue-300 border-blue-800'
                            : rec.status === 'Sakit'
                            ? 'bg-amber-950 text-amber-300 border-amber-800'
                            : 'bg-rose-950 text-rose-300 border-rose-800'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">{rec.catatan || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
