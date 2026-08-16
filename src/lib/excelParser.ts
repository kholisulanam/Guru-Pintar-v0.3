import * as XLSX from 'xlsx';

/**
 * Intelligent Excel Row Extractor that handles:
 * - Complex Indonesian school templates (Emis, Simpatika, Dapodik, Custom Excel)
 * - Kop headers / Title rows / Merged cells
 * - Multi-sheet workbooks
 * - Column variations and fuzzy header matching
 */

export interface ParsedExcelSheet {
  sheetName: string;
  headers: string[];
  rows: Record<string, any>[];
  rawMatrix: string[][];
}

const KNOWN_HEADER_KEYWORDS = [
  'no', 'nomor', 'nama', 'name', 'siswa', 'santri', 'murid', 'peserta',
  'nisn', 'nis', 'nik', 'nim', 'jk', 'l/p', 'lp', 'gender', 'sex', 'kelamin',
  'ttl', 'tempat', 'tgl', 'tanggal', 'lahir', 'kelas', 'rombel', 'tingkat',
  'wali', 'mapel', 'guru', 'pengajar', 'judul', 'pengarang', 'penerbit',
  'kategori', 'tahun', 'stok', 'user', 'username', 'pass', 'password',
  'sandi', 'status', 'alamat', 'telepon', 'hp', 'email', 'hari', 'jam',
  'waktu', 'ruang', 'kode', 'pelajaran'
];

/**
 * Clean numeric string (e.g. converting 2.023E+09 or 12345.0 to 12345)
 */
export function cleanExcelNumberString(val: any): string {
  if (val === undefined || val === null) return '';
  let str = String(val).trim();
  if (str.endsWith('.0')) {
    str = str.slice(0, -2);
  }
  // Handle exponential numbers like 2.02305E+11 if any
  if (/^\d+(\.\d+)?[eE][+-]?\d+$/.test(str)) {
    try {
      const num = Number(str);
      if (!isNaN(num)) {
        str = BigInt(Math.round(num)).toString();
      }
    } catch {
      // ignore
    }
  }
  return str;
}

/**
 * Parse an Excel worksheet into structured rows, accurately locating the table header row
 */
export function parseWorksheet(ws: XLSX.WorkSheet, sheetName = ''): ParsedExcelSheet {
  const matrix: string[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: false,
    defval: '',
  });

  if (!matrix || matrix.length === 0) {
    return { sheetName, headers: [], rows: [], rawMatrix: [] };
  }

  // Score first 30 rows to find true table header row
  let bestHeaderIndex = 0;
  let highestScore = -1;

  const maxScanRows = Math.min(matrix.length, 30);
  for (let r = 0; r < maxScanRows; r++) {
    const row = matrix[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    let score = 0;
    const recognizedTokens = new Set<string>();

    for (let c = 0; c < row.length; c++) {
      const cellVal = String(row[c] || '').toLowerCase().trim();
      if (!cellVal) continue;

      for (const kw of KNOWN_HEADER_KEYWORDS) {
        if (cellVal === kw || cellVal.includes(kw)) {
          if (!recognizedTokens.has(kw)) {
            recognizedTokens.add(kw);
            score++;
          }
        }
      }
    }

    // Give slight bonus for row having multiple filled columns
    const filledCells = row.filter((c) => String(c || '').trim() !== '').length;
    if (filledCells >= 3) {
      score += 0.5;
    }

    if (score > highestScore && score >= 1) {
      highestScore = score;
      bestHeaderIndex = r;
    }
  }

  const rawHeaders = matrix[bestHeaderIndex] || [];
  const headers: string[] = [];

  for (let c = 0; c < Math.max(rawHeaders.length, 1); c++) {
    const h = String(rawHeaders[c] || '').trim();
    headers.push(h || `Kolom_${c + 1}`);
  }

  const rows: Record<string, any>[] = [];

  for (let r = bestHeaderIndex + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!Array.isArray(row)) continue;

    const hasValue = row.some((cell) => cell !== undefined && cell !== null && String(cell).trim() !== '');
    if (!hasValue) continue;

    const rowObj: Record<string, any> = {
      _sheetName: sheetName,
      _rowIndex: r + 1,
      _rawCells: row.map((cell) => cleanExcelNumberString(cell)),
    };

    headers.forEach((hKey, colIdx) => {
      const val = cleanExcelNumberString(row[colIdx]);
      rowObj[hKey] = val;
      rowObj[`__col_${colIdx}`] = val;
    });

    rows.push(rowObj);
  }

  return {
    sheetName,
    headers,
    rows,
    rawMatrix: matrix,
  };
}

/**
 * Parse an entire Workbook (all sheets)
 */
export function parseEntireWorkbook(wb: XLSX.WorkBook): ParsedExcelSheet[] {
  const result: ParsedExcelSheet[] = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (ws) {
      const parsed = parseWorksheet(ws, sheetName);
      if (parsed.rows.length > 0) {
        result.push(parsed);
      }
    }
  }
  return result;
}

/**
 * Extract value from row object matching candidate keys or positional fallback
 */
export function extractExcelValue(row: any, candidateKeys: string[]): string {
  if (!row || typeof row !== 'object') return '';
  const rowKeys = Object.keys(row).filter((k) => !k.startsWith('_'));

  // 1. Exact match (case & punctuation insensitive)
  for (const cand of candidateKeys) {
    const candClean = cand.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!candClean) continue;
    for (const key of rowKeys) {
      const keyClean = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (keyClean === candClean) {
        const val = row[key];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return String(val).trim();
        }
      }
    }
  }

  // 2. Substring match
  for (const cand of candidateKeys) {
    const candClean = cand.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!candClean) continue;
    for (const key of rowKeys) {
      const keyClean = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (keyClean.includes(candClean) || candClean.includes(keyClean)) {
        const val = row[key];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return String(val).trim();
        }
      }
    }
  }

  return '';
}
