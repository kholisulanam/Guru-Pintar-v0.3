import React, { useState, useEffect, useRef } from 'react';
import { Clock, Check, ChevronDown, Sparkles, X, RotateCcw, Edit3 } from 'lucide-react';

export interface JamPelajaranItem {
  no: number;
  label: string;
  mulai: string;
  selesai: string;
  rentang: string;
}

export const DEFAULT_JAM_PELAJARAN: JamPelajaranItem[] = [
  { no: 1, label: 'Jam Ke-1', mulai: '07.00', selesai: '07.40', rentang: '07.00 - 07.40' },
  { no: 2, label: 'Jam Ke-2', mulai: '07.40', selesai: '08.20', rentang: '07.40 - 08.20' },
  { no: 3, label: 'Jam Ke-3', mulai: '08.20', selesai: '09.00', rentang: '08.20 - 09.00' },
  { no: 4, label: 'Jam Ke-4', mulai: '09.00', selesai: '09.40', rentang: '09.00 - 09.40' },
  { no: 5, label: 'Jam Ke-5', mulai: '10.00', selesai: '10.40', rentang: '10.00 - 10.40' },
  { no: 6, label: 'Jam Ke-6', mulai: '10.40', selesai: '11.20', rentang: '10.40 - 11.20' },
  { no: 7, label: 'Jam Ke-7', mulai: '12.20', selesai: '13.00', rentang: '12.20 - 13.00' },
  { no: 8, label: 'Jam Ke-8', mulai: '13.00', selesai: '13.40', rentang: '13.00 - 13.40' },
  { no: 9, label: 'Jam Ke-9', mulai: '13.40', selesai: '14.20', rentang: '13.40 - 14.20' },
  { no: 10, label: 'Jam Ke-10', mulai: '14.20', selesai: '15.00', rentang: '14.20 - 15.00' },
  { no: 11, label: 'Jam Ke-11', mulai: '15.00', selesai: '15.40', rentang: '15.00 - 15.40' },
];

/**
 * Format an array of selected period numbers into a readable string
 */
export function formatSelectedJam(selectedNos: number[], list = DEFAULT_JAM_PELAJARAN): string {
  if (!selectedNos || selectedNos.length === 0) return '';

  const sorted = [...selectedNos].sort((a, b) => a - b);
  const items = sorted.map((no) => list.find((j) => j.no === no)).filter(Boolean) as JamPelajaranItem[];

  if (items.length === 0) return '';

  if (items.length === 1) {
    const item = items[0];
    return `Jam Ke-${item.no} (${item.rentang})`;
  }

  // Check if consecutive
  let isConsecutive = true;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1] !== sorted[i] + 1) {
      isConsecutive = false;
      break;
    }
  }

  if (isConsecutive) {
    const first = items[0];
    const last = items[items.length - 1];
    return `Jam Ke ${first.no}-${last.no} (${first.mulai} - ${last.selesai})`;
  }

  // Non-consecutive list
  const jamLabels = sorted.map((n) => `Jam ${n}`).join(', ');
  const times = items.map((i) => i.rentang).join(' & ');
  return `${jamLabels} (${times})`;
}

/**
 * Parse an existing string value to determine which period numbers are selected
 */
export function parseJamValueToNumbers(val: string, list = DEFAULT_JAM_PELAJARAN): number[] {
  if (!val) return [];
  const clean = val.trim().toLowerCase();
  const matched = new Set<number>();

  // 1. Look for range like "jam ke 1-2" or "jam 1-3" or "1-2"
  const rangeMatch = clean.match(/jam\s*(?:ke\s*)?(\d{1,2})\s*[-–]\s*(\d{1,2})/i);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    if (start > 0 && end >= start && end <= 15) {
      for (let i = start; i <= end; i++) {
        if (list.some((l) => l.no === i)) matched.add(i);
      }
      return Array.from(matched).sort((a, b) => a - b);
    }
  }

  // 2. Look for comma separated numbers: "jam 1, 2" or "jam ke-1, 2"
  const commaMatches = clean.match(/jam\s*(?:ke\s*)?(\d{1,2}(?:\s*,\s*\d{1,2})+)/i);
  if (commaMatches) {
    const digits = commaMatches[1].split(',').map((s) => parseInt(s.trim(), 10));
    digits.forEach((d) => {
      if (list.some((l) => l.no === d)) matched.add(d);
    });
    if (matched.size > 0) return Array.from(matched).sort((a, b) => a - b);
  }

  // 3. Match by exact time strings in the default list
  for (const item of list) {
    const cleanRentang = item.rentang.replace(/\s+/g, '');
    const cleanVal = clean.replace(/\s+/g, '');
    if (cleanVal.includes(cleanRentang) || cleanVal.includes(item.mulai.replace(/\s+/g, ''))) {
      // Check if this single period is specifically in the string
      if (cleanVal.includes(cleanRentang)) {
        matched.add(item.no);
      }
    }
  }

  // If time range like "07.00 - 08.20" spans multiple consecutive items
  const timeSpanMatch = clean.match(/(\d{1,2}[:.]\d{2})\s*[-–]\s*(\d{1,2}[:.]\d{2})/);
  if (timeSpanMatch) {
    const startStr = timeSpanMatch[1].replace(':', '.');
    const endStr = timeSpanMatch[2].replace(':', '.');

    const startIndex = list.findIndex((j) => j.mulai === startStr);
    const endIndex = list.findIndex((j) => j.selesai === endStr);

    if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
      for (let i = startIndex; i <= endIndex; i++) {
        matched.add(list[i].no);
      }
      return Array.from(matched).sort((a, b) => a - b);
    }
  }

  // Fallback: search for single "jam ke-X" or "jam X"
  const singleJamMatch = clean.match(/jam\s*(?:ke\s*[-–]?)?(\d{1,2})\b/i);
  if (singleJamMatch) {
    const no = parseInt(singleJamMatch[1], 10);
    if (list.some((l) => l.no === no)) matched.add(no);
  }

  return Array.from(matched).sort((a, b) => a - b);
}

interface JamPelajaranDropdownProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  label?: string;
  isCompact?: boolean;
  allowedPeriodNumbers?: number[];
  scheduleInfo?: string;
  directScheduleOptions?: string[];
  allowShowAllToggle?: boolean;
}

export const JamPelajaranDropdown: React.FC<JamPelajaranDropdownProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'Pilih Jam Pelajaran...',
  label,
  isCompact = false,
  allowedPeriodNumbers,
  scheduleInfo,
  directScheduleOptions = [],
  allowShowAllToggle = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [showAllPeriods, setShowAllPeriods] = useState(false);
  const [customValue, setCustomValue] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter available items according to schedule
  const hasScheduleFilter = Array.isArray(allowedPeriodNumbers) && allowedPeriodNumbers.length > 0;
  
  const displayedItems = hasScheduleFilter && !showAllPeriods
    ? DEFAULT_JAM_PELAJARAN.filter((item) => allowedPeriodNumbers.includes(item.no))
    : DEFAULT_JAM_PELAJARAN;

  // Determine which numbers are selected based on current `value`
  const selectedNumbers = parseJamValueToNumbers(value);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleNumber = (num: number) => {
    let nextSelected: number[];
    if (selectedNumbers.includes(num)) {
      nextSelected = selectedNumbers.filter((n) => n !== num);
    } else {
      nextSelected = [...selectedNumbers, num].sort((a, b) => a - b);
    }

    if (nextSelected.length === 0) {
      onChange('');
    } else {
      const formatted = formatSelectedJam(nextSelected);
      onChange(formatted);
    }
  };

  const applyPreset = (numbers: number[]) => {
    const formatted = formatSelectedJam(numbers);
    onChange(formatted);
  };

  const clearAll = () => {
    onChange('');
  };

  const selectAll = () => {
    const all = DEFAULT_JAM_PELAJARAN.map((j) => j.no);
    onChange(formatSelectedJam(all));
  };

  const displayText = value || placeholder;
  const isFilled = Boolean(value && value.trim());

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && <label className="block font-semibold text-slate-400 mb-1 text-xs">{label}</label>}

      {/* Main Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-2.5 text-slate-100 flex items-center justify-between gap-2 cursor-pointer transition select-none ${
          isOpen ? 'ring-2 ring-emerald-500/40 border-emerald-500' : ''
        }`}
      >
        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
          <Clock className={`w-4 h-4 flex-shrink-0 ${isFilled ? 'text-emerald-400' : 'text-slate-500'}`} />
          <span className={`truncate text-xs ${isFilled ? 'text-emerald-300 font-medium' : 'text-slate-500'}`}>
            {displayText}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {selectedNumbers.length > 0 && (
            <span className="px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold rounded-md">
              {selectedNumbers.length} JP
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-400' : ''}`}
          />
        </div>
      </div>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-full min-w-[300px] sm:min-w-[340px] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header & Presets */}
          <div className="p-3 bg-slate-950/80 border-b border-slate-800 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Pilih Jam Pelajaran
                </span>
                {hasScheduleFilter && !showAllPeriods && (
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">
                    Jadwal Terdaftar ({displayedItems.length} JP)
                  </span>
                )}
              </div>
              {selectedNumbers.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition flex-shrink-0"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              )}
            </div>

            {scheduleInfo && (
              <p className="text-[10px] text-slate-400 font-medium">
                {scheduleInfo}
              </p>
            )}

            {/* Quick Presets / Schedule Pills */}
            <div className="flex flex-wrap gap-1.5">
              {directScheduleOptions.length > 0 ? (
                directScheduleOptions.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onChange(opt)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                      value === opt
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                        : 'bg-slate-800 hover:bg-emerald-600/30 hover:text-emerald-300 text-slate-300 border-slate-700'
                    }`}
                  >
                    {opt}
                  </button>
                ))
              ) : (
                <>
                  {(!hasScheduleFilter || showAllPeriods || (allowedPeriodNumbers && [1, 2].every((n) => allowedPeriodNumbers.includes(n)))) && (
                    <button
                      type="button"
                      onClick={() => applyPreset([1, 2])}
                      className="px-2 py-1 bg-slate-800 hover:bg-emerald-600/30 hover:text-emerald-300 text-slate-300 rounded-lg text-[10px] font-medium border border-slate-700 transition"
                    >
                      Jam 1-2 (07.00-08.20)
                    </button>
                  )}
                  {(!hasScheduleFilter || showAllPeriods || (allowedPeriodNumbers && [3, 4].every((n) => allowedPeriodNumbers.includes(n)))) && (
                    <button
                      type="button"
                      onClick={() => applyPreset([3, 4])}
                      className="px-2 py-1 bg-slate-800 hover:bg-emerald-600/30 hover:text-emerald-300 text-slate-300 rounded-lg text-[10px] font-medium border border-slate-700 transition"
                    >
                      Jam 3-4 (08.20-09.40)
                    </button>
                  )}
                  {(!hasScheduleFilter || showAllPeriods || (allowedPeriodNumbers && [5, 6].every((n) => allowedPeriodNumbers.includes(n)))) && (
                    <button
                      type="button"
                      onClick={() => applyPreset([5, 6])}
                      className="px-2 py-1 bg-slate-800 hover:bg-emerald-600/30 hover:text-emerald-300 text-slate-300 rounded-lg text-[10px] font-medium border border-slate-700 transition"
                    >
                      Jam 5-6 (10.00-11.20)
                    </button>
                  )}
                  {(!hasScheduleFilter || showAllPeriods || (allowedPeriodNumbers && [7, 8].every((n) => allowedPeriodNumbers.includes(n)))) && (
                    <button
                      type="button"
                      onClick={() => applyPreset([7, 8])}
                      className="px-2 py-1 bg-slate-800 hover:bg-emerald-600/30 hover:text-emerald-300 text-slate-300 rounded-lg text-[10px] font-medium border border-slate-700 transition"
                    >
                      Jam 7-8 (12.20-13.40)
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Checkbox List */}
          {!isCustomMode ? (
            <div className="max-h-60 overflow-y-auto p-2 space-y-1 divide-y divide-slate-800/40">
              {displayedItems.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">
                  <p>Tidak ada jam yang cocok dalam jadwal pelajaran.</p>
                  {hasScheduleFilter && (
                    <button
                      type="button"
                      onClick={() => setShowAllPeriods(true)}
                      className="mt-2 text-emerald-400 underline font-semibold text-[11px]"
                    >
                      Tampilkan Semua Jam (1-12)
                    </button>
                  )}
                </div>
              ) : (
                displayedItems.map((item) => {
                  const isSelected = selectedNumbers.includes(item.no);
                  return (
                    <div
                      key={item.no}
                      onClick={() => toggleNumber(item.no)}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition select-none ${
                        isSelected
                          ? 'bg-emerald-950/50 border border-emerald-500/40 text-white'
                          : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                              : 'border-slate-600 bg-slate-950'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-bold ${isSelected ? 'text-emerald-300' : 'text-slate-200'}`}>
                              {item.label}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">{item.rentang}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        {isSelected ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-900/40 px-2 py-0.5 rounded-full">
                            Terpilih
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-600">40 mnt</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="p-3 space-y-2">
              <label className="block text-xs font-semibold text-slate-300">Tulis Jam/Waktu Kustom</label>
              <input
                type="text"
                value={customValue}
                onChange={(e) => {
                  setCustomValue(e.target.value);
                  onChange(e.target.value);
                }}
                placeholder="Contoh: 07.00 - 08.30 atau Jam Ke-1 s/d 2"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                autoFocus
              />
            </div>
          )}

          {/* Footer Actions */}
          <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCustomMode(!isCustomMode)}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
              >
                <Edit3 className="w-3 h-3" /> {isCustomMode ? 'Pilih dari Daftar JP' : 'Mode Teks Bebas'}
              </button>

              {hasScheduleFilter && allowShowAllToggle && !isCustomMode && (
                <button
                  type="button"
                  onClick={() => setShowAllPeriods(!showAllPeriods)}
                  className="text-[10px] text-emerald-400/90 hover:text-emerald-300 font-medium transition"
                >
                  {showAllPeriods ? '• Hanya Jam Jadwal' : '• Buka Semua Jam'}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition"
            >
              Selesai ({selectedNumbers.length} JP)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
