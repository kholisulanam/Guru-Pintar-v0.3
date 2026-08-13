import { TeacherItem, SubjectItem, ClassItem, ScheduleItem } from '../types';

/**
 * Clean string for alphanumeric comparisons
 */
export function cleanStr(s: string): string {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Remove Indonesian academic titles, honorifics, and degrees to get core name
 */
export function stripTeacherTitles(name: string): string {
  if (!name) return '';
  const normalized = name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[^a-z0-9\s]/g, ' ');

  return normalized
    .replace(/\b(dra|drs|dr|prof|h|hj|ir|kh|ust|ustadz|amd|spd|spdi|mpd|mpdi|ssi|msi|st|mt|ssos|ssosi|sag|mag|se|mm|lc|ma|skom|mkom|shum|mhum|sip|sh|mh|shi|pd|si|ag|sos)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Get core name tokens for a teacher (removing titles/degrees and short noise words)
 */
export function getTeacherCoreTokens(name: string): string[] {
  const stripped = stripTeacherTitles(name);
  return stripped
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !['moh', 'mohammad', 'muhammad', 'ahmad', 'nur'].includes(token));
}

/**
 * Match a teacher from Excel raw text or ID against a list of teachers
 */
export function matchTeacher(rawGuru: string, teachers: TeacherItem[]): TeacherItem | null {
  if (!rawGuru || !rawGuru.trim()) return null;
  const raw = rawGuru.trim();
  const rawLower = raw.toLowerCase();
  const rawClean = cleanStr(raw);

  // 1. Exact ID or Exact Name Match (case-insensitive)
  const exact = teachers.find(
    (t) =>
      t.id.toLowerCase() === rawLower ||
      t.nama.trim().toLowerCase() === rawLower ||
      (t.nuptk && t.nuptk.trim() === raw)
  );
  if (exact) return exact;

  // 2. Cleaned Alphanumeric Exact Match
  const cleanMatch = teachers.find((t) => cleanStr(t.nama) === rawClean || cleanStr(t.id) === rawClean);
  if (cleanMatch) return cleanMatch;

  // 3. Stripped Titles Core Name Exact Match
  const rawCore = stripTeacherTitles(raw);
  if (rawCore.length > 2) {
    const coreMatch = teachers.find((t) => {
      const tCore = stripTeacherTitles(t.nama);
      return tCore.length > 2 && tCore === rawCore;
    });
    if (coreMatch) return coreMatch;
  }

  // 4. Distinctive Tokens Exact Match
  const rawDistinctiveTokens = getTeacherCoreTokens(raw);
  if (rawDistinctiveTokens.length > 0) {
    const tokenMatch = teachers.find((t) => {
      const tTokens = getTeacherCoreTokens(t.nama);
      if (tTokens.length === 0) return false;
      return (
        rawDistinctiveTokens.every((tok) => tTokens.includes(tok)) &&
        tTokens.every((tok) => rawDistinctiveTokens.includes(tok))
      );
    });
    if (tokenMatch) return tokenMatch;

    // 5. Partial Token Match
    const partialMatch = teachers.find((t) => {
      const tTokens = getTeacherCoreTokens(t.nama);
      return rawDistinctiveTokens.some((tok) => tTokens.includes(tok));
    });
    if (partialMatch) return partialMatch;
  }

  return null;
}

/**
 * Check if a schedule's / journal's / attendance's guruId matches a given target teacher filter or User object.
 */
export function isTeacherMatch(
  schGuruId: string,
  targetGuruFilterOrUser: string | { id: string; nama?: string; name?: string; nuptk?: string; nuptkOrNisn?: string } | null | undefined,
  teachers: TeacherItem[] = []
): boolean {
  if (!schGuruId || !targetGuruFilterOrUser) return false;

  const filterStr = typeof targetGuruFilterOrUser === 'string'
    ? targetGuruFilterOrUser
    : (targetGuruFilterOrUser.id || targetGuruFilterOrUser.nama || targetGuruFilterOrUser.name || '');

  if (filterStr === 'Semua') return true;

  const schRaw = schGuruId.trim();
  const filterRaw = filterStr.trim();

  // 1. Direct string equality (case-insensitive)
  if (schRaw.toLowerCase() === filterRaw.toLowerCase()) return true;

  // 2. Direct cleanStr equality
  if (cleanStr(schRaw) === cleanStr(filterRaw)) return true;

  // 3. Compare stripped titles directly
  const schCore = stripTeacherTitles(schRaw);
  const filterCore = stripTeacherTitles(filterRaw);
  if (schCore && filterCore && schCore === filterCore) return true;

  // 4. Resolve target teacher
  let targetTeacher: TeacherItem | null = null;
  if (typeof targetGuruFilterOrUser !== 'string') {
    const tName = targetGuruFilterOrUser.nama || targetGuruFilterOrUser.name || '';
    const tNuptk = targetGuruFilterOrUser.nuptk || targetGuruFilterOrUser.nuptkOrNisn || '';
    targetTeacher = matchTeacher(targetGuruFilterOrUser.id, teachers) ||
                    matchTeacher(tName, teachers) ||
                    (tNuptk ? teachers.find((t) => t.nuptk === tNuptk) || null : null) ||
                    {
                      id: targetGuruFilterOrUser.id,
                      nama: tName,
                      nuptk: tNuptk,
                      mengajarMapel: '',
                      status: 'Aktif',
                    };
  } else {
    targetTeacher = teachers.find((t) => t.id === filterRaw) || matchTeacher(filterRaw, teachers);
  }

  // 5. Resolve schGuruId against teachers list
  const schTeacher = teachers.find((t) => t.id === schRaw) || matchTeacher(schRaw, teachers);

  // If both resolved to teachers, compare their resolved IDs or stripped names
  if (schTeacher && targetTeacher) {
    if (schTeacher.id === targetTeacher.id) return true;
    if (schTeacher.nama && targetTeacher.nama && cleanStr(schTeacher.nama) === cleanStr(targetTeacher.nama)) return true;
    if (schTeacher.nama && targetTeacher.nama && stripTeacherTitles(schTeacher.nama) === stripTeacherTitles(targetTeacher.nama)) return true;
  }

  // Fallback comparisons with schRaw
  if (targetTeacher) {
    if (schRaw.toLowerCase() === targetTeacher.id.toLowerCase()) return true;
    if (targetTeacher.nama && schRaw.toLowerCase() === targetTeacher.nama.toLowerCase()) return true;
    if (targetTeacher.nama && cleanStr(schRaw) === cleanStr(targetTeacher.nama)) return true;
    if (targetTeacher.nama && stripTeacherTitles(schRaw) === stripTeacherTitles(targetTeacher.nama)) return true;
  }

  // Fallback comparisons with filterRaw
  if (schTeacher) {
    if (filterRaw.toLowerCase() === schTeacher.id.toLowerCase()) return true;
    if (schTeacher.nama && filterRaw.toLowerCase() === schTeacher.nama.toLowerCase()) return true;
    if (schTeacher.nama && cleanStr(filterRaw) === cleanStr(schTeacher.nama)) return true;
    if (schTeacher.nama && stripTeacherTitles(filterRaw) === stripTeacherTitles(schTeacher.nama)) return true;
  }

  return false;
}

/**
 * Match a subject / mapel from Excel raw text or ID against a list of subjects
 */
export function matchSubject(rawMapel: string, subjects: SubjectItem[]): SubjectItem | null {
  if (!rawMapel || !rawMapel.trim()) return null;
  const raw = rawMapel.trim();
  const rawLower = raw.toLowerCase();
  const rawClean = cleanStr(raw);

  // 1. Exact ID, Code, or Name Match (case-insensitive)
  const exact = subjects.find(
    (s) =>
      s.id.toLowerCase() === rawLower ||
      s.namaMapel.trim().toLowerCase() === rawLower ||
      (s.kode && s.kode.trim().toLowerCase() === rawLower)
  );
  if (exact) return exact;

  // 2. Cleaned Alphanumeric Exact Match
  const cleanMatch = subjects.find((s) => cleanStr(s.namaMapel) === rawClean);
  if (cleanMatch) return cleanMatch;

  // 3. Word-by-Word Exact Set Match
  const rawWords = rawLower.split(/[^a-z0-9]+/).filter(Boolean).sort().join(' ');
  const wordMatch = subjects.find((s) => {
    const sWords = s.namaMapel.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).sort().join(' ');
    return sWords === rawWords;
  });
  if (wordMatch) return wordMatch;

  // NOTE: We strictly DO NOT use loose `.includes()` here!
  // "Matematika Lanjut" will NOT match "Matematika", and "Matematika" will NOT match "Matematika Lanjut".
  return null;
}

/**
 * Match a class / kelas from Excel raw text or ID against a list of classes
 */
export function matchClass(rawKelas: string, classes: ClassItem[]): ClassItem | null {
  if (!rawKelas || !rawKelas.trim()) return null;
  const raw = rawKelas.trim();
  const rawLower = raw.toLowerCase();
  const rawClean = cleanStr(raw);

  // 1. Exact ID or Name Match
  const exact = classes.find(
    (c) => c.id.toLowerCase() === rawLower || c.namaKelas.trim().toLowerCase() === rawLower
  );
  if (exact) return exact;

  // 2. Cleaned Alphanumeric Exact Match
  const cleanMatch = classes.find((c) => cleanStr(c.namaKelas) === rawClean);
  if (cleanMatch) return cleanMatch;

  // 3. Normalized Match (e.g., "X IPA 1" vs "Kelas 10 IPA 1" or "10-A" vs "X-A")
  const normClassStr = (s: string) =>
    s
      .toLowerCase()
      .replace(/^(kelas|kls|rombel)\s+/i, '')
      .replace(/\bxii\b/g, '12')
      .replace(/\bxi\b/g, '11')
      .replace(/\bx\b/g, '10')
      .replace(/[^a-z0-9]/g, '');

  const rawNorm = normClassStr(raw);
  const normMatch = classes.find((c) => normClassStr(c.namaKelas) === rawNorm);
  if (normMatch) return normMatch;

  return null;
}

const INVALID_CLASS_NAMES = new Set([
  'kelas', 'kls', 'rombel', 'nama kelas', 'nama_kelas', 'header', 'total', 'jumlah',
  'siswa', 'murid', 'santri', '-', '0', 'null', 'undefined', 'dash', 'none', 'belum ditentukan'
]);

const LEGACY_CLASS_IDS = new Set(['cls-10ipa1', 'cls-11ipa1', 'cls-12ipa1', 'cls-12ips1']);
const LEGACY_CLASS_NAMES = new Set([
  'x ipa 1', 'xi ipa 1', 'xii ipa 1', 'xii ips 1', 'x ips 1',
  'kelas x ipa 1', 'kelas xi ipa 1', 'kelas xii ipa 1', 'kelas xii ips 1', 'kelas x ips 1'
]);

/**
 * Sanitize and deduplicate class lists, ensuring valid class names and valid wali kelas from teachers list.
 */
export function sanitizeAndDeduplicateClasses(
  classList: ClassItem[],
  teachers: TeacherItem[] = []
): ClassItem[] {
  if (!Array.isArray(classList) || classList.length === 0) return [];

  const validTeachersMap = new Map<string, string>();
  teachers.forEach((t) => {
    if (t.nama) {
      validTeachersMap.set(t.nama.trim().toLowerCase(), t.nama.trim());
      validTeachersMap.set(cleanStr(t.nama), t.nama.trim());
    }
  });

  const normClassStr = (s: string) =>
    s
      .toLowerCase()
      .replace(/^(kelas|kls|rombel)\s+/i, '')
      .replace(/\bxii\b/g, '12')
      .replace(/\bxi\b/g, '11')
      .replace(/\bx\b/g, '10')
      .replace(/[^a-z0-9]/g, '');

  const seenNorm = new Set<string>();
  const cleanedList: ClassItem[] = [];

  for (const c of classList) {
    if (!c || !c.namaKelas) continue;
    const rawName = c.namaKelas.trim();
    const lowerName = rawName.toLowerCase();
    const cleanName = cleanStr(rawName);

    // Skip legacy, junk, or header names
    if (
      LEGACY_CLASS_IDS.has(c.id) ||
      LEGACY_CLASS_NAMES.has(lowerName) ||
      INVALID_CLASS_NAMES.has(lowerName) ||
      INVALID_CLASS_NAMES.has(cleanName) ||
      rawName.length < 1
    ) {
      continue;
    }

    const normKey = normClassStr(rawName);
    if (!normKey || seenNorm.has(normKey)) {
      continue; // Skip duplicate normalized class
    }
    seenNorm.add(normKey);

    // Validate or fix Wali Kelas
    let currentWali = (c.waliKelas || '').trim();
    let validWaliName = '';

    if (currentWali && currentWali !== '-' && currentWali.toLowerCase() !== 'belum ditentukan') {
      if (validTeachersMap.has(currentWali.toLowerCase())) {
        validWaliName = validTeachersMap.get(currentWali.toLowerCase())!;
      } else if (validTeachersMap.has(cleanStr(currentWali))) {
        validWaliName = validTeachersMap.get(cleanStr(currentWali))!;
      } else {
        const matched = matchTeacher(currentWali, teachers);
        if (matched) {
          validWaliName = matched.nama;
        }
      }
    }

    // If still no valid wali kelas matched, assign from available teachers or keep first teacher as default
    if (!validWaliName) {
      if (teachers.length > 0) {
        const fallbackTeacher = teachers[cleanedList.length % teachers.length];
        validWaliName = fallbackTeacher ? fallbackTeacher.nama : 'SYAIFUDIN KUDSI, SHI. MA.';
      } else {
        validWaliName = 'SYAIFUDIN KUDSI, SHI. MA.';
      }
    }

    cleanedList.push({
      ...c,
      namaKelas: rawName,
      waliKelas: validWaliName,
    });
  }

  return cleanedList;
}

/**
 * Check if a student's or schedule's kelasId matches a target class filter or ID.
 */
export function isClassMatch(
  studentKelasId: string,
  targetKelasId: string,
  classes: ClassItem[] = []
): boolean {
  if (!studentKelasId || !targetKelasId) return false;
  if (targetKelasId === 'semua' || targetKelasId === 'Semua') return true;

  const sRaw = studentKelasId.trim();
  const tRaw = targetKelasId.trim();

  // 1. Direct equality
  if (sRaw.toLowerCase() === tRaw.toLowerCase()) return true;

  // 2. Cleaned equality
  if (cleanStr(sRaw) === cleanStr(tRaw)) return true;

  // 3. Match against classes list
  const studentClass = classes.find((c) => c.id === sRaw) || matchClass(sRaw, classes);
  const targetClass = classes.find((c) => c.id === tRaw) || matchClass(tRaw, classes);

  if (studentClass && targetClass) {
    return studentClass.id === targetClass.id;
  }

  if (targetClass) {
    if (sRaw.toLowerCase() === targetClass.id.toLowerCase()) return true;
    if (cleanStr(sRaw) === cleanStr(targetClass.namaKelas)) return true;
  }

  if (studentClass) {
    if (tRaw.toLowerCase() === studentClass.id.toLowerCase()) return true;
    if (cleanStr(tRaw) === cleanStr(studentClass.namaKelas)) return true;
  }

  return false;
}

/**
 * Converts a schedule time string or period label (e.g. "07.00 - 08.30", "08.30", "Jam Ke-1", "1") into total minutes from midnight for chronological sorting.
 */
export function parseJamKeToMinutes(jamKe: string): number {
  if (!jamKe) return 9999;
  const str = jamKe.trim();

  // 1. Look for time pattern like HH:MM or HH.MM (e.g. "07.00 - 08.30", "07:30")
  const timeMatch = str.match(/(\d{1,2})[:.](\d{2})/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    return hours * 60 + minutes;
  }

  // 2. Look for single hour number if specified as HH
  const hourMatch = str.match(/^(\d{1,2})\b/);
  if (hourMatch) {
    const val = parseInt(hourMatch[1], 10);
    if (val >= 6 && val <= 18) {
      return val * 60;
    }
    return val * 60;
  }

  // 3. Fallback: extract any digits as period number
  const numMatch = str.match(/\d+/);
  if (numMatch) {
    return parseInt(numMatch[0], 10) * 60;
  }

  return 9999;
}

/**
 * Sorts an array of schedule items chronologically based on their jamKe / teaching time order.
 */
export function sortSchedulesByJam<T extends Record<string, any>>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const minA = parseJamKeToMinutes(a.jamKe || '');
    const minB = parseJamKeToMinutes(b.jamKe || '');
    if (minA !== minB) {
      return minA - minB;
    }
    return (a.jamKe || '').localeCompare(b.jamKe || '');
  });
}

/**
 * Gets the list of subjects taught by a specific teacher based on User profile, TeacherItem profile, and Jadwal Mengajar (Schedules).
 */
export function getTeacherSubjects(
  currentUser: { id: string; role: string; name?: string; nama?: string; nuptkOrNisn?: string; nipNuptk?: string; mataPelajaranId?: string; mataPelajaranNama?: string },
  subjects: SubjectItem[],
  teachers: TeacherItem[] = [],
  schedules: ScheduleItem[] = []
): SubjectItem[] {
  if (!subjects || subjects.length === 0) return [];

  // Admins see all subjects
  if (currentUser.role === 'admin') {
    return subjects;
  }

  // Find matching TeacherItem for currentUser
  const currentTeacher = teachers.find(
    (t) =>
      t.id === currentUser.id ||
      isTeacherMatch(t.id, currentUser, teachers) ||
      (currentUser.nipNuptk && t.nuptk === currentUser.nipNuptk) ||
      (currentUser.nuptkOrNisn && t.nuptk === currentUser.nuptkOrNisn) ||
      (t.nama && currentUser.name && cleanStr(t.nama) === cleanStr(currentUser.name)) ||
      (t.nama && currentUser.nama && cleanStr(t.nama) === cleanStr(currentUser.nama))
  );

  // Collect all matching subject IDs
  const matchedSubjectIds = new Set<string>();

  // 1. Match from currentUser object properties
  if (currentUser.mataPelajaranId) {
    const s = subjects.find(
      (sub) => sub.id === currentUser.mataPelajaranId || sub.kode === currentUser.mataPelajaranId
    );
    if (s) matchedSubjectIds.add(s.id);
  }

  if (currentUser.mataPelajaranNama) {
    const names = currentUser.mataPelajaranNama
      .split(/[,&/]/)
      .map((n) => n.trim().toLowerCase())
      .filter(Boolean);

    subjects.forEach((sub) => {
      const sName = sub.namaMapel ? sub.namaMapel.toLowerCase() : '';
      const sKode = sub.kode ? sub.kode.toLowerCase() : '';
      if (
        names.some(
          (n) => sName === n || sName.includes(n) || n.includes(sName) || (sKode && sKode === n)
        )
      ) {
        matchedSubjectIds.add(sub.id);
      }
    });
  }

  // 2. Match from currentTeacher object properties
  if (currentTeacher) {
    if (currentTeacher.mataPelajaranIds && Array.isArray(currentTeacher.mataPelajaranIds)) {
      currentTeacher.mataPelajaranIds.forEach((id) => {
        const s = subjects.find((sub) => sub.id === id || sub.kode === id);
        if (s) matchedSubjectIds.add(s.id);
      });
    }

    const teacherMapelStr = currentTeacher.mataPelajaranNama || currentTeacher.mengajarMapel;
    if (teacherMapelStr) {
      const names = teacherMapelStr
        .split(/[,&/]/)
        .map((n) => n.trim().toLowerCase())
        .filter(Boolean);

      subjects.forEach((sub) => {
        const sName = sub.namaMapel ? sub.namaMapel.toLowerCase() : '';
        const sKode = sub.kode ? sub.kode.toLowerCase() : '';
        if (
          names.some(
            (n) => sName === n || (n.length >= 3 && sName.includes(n)) || (sName.length >= 3 && n.includes(sName)) || (sKode && sKode === n)
          )
        ) {
          matchedSubjectIds.add(sub.id);
        }
      });
    }
  }

  // 3. Match from Schedules (Jadwal Mengajar)
  if (schedules && schedules.length > 0) {
    schedules.forEach((sch) => {
      const isMySchedule = isTeacherMatch(sch.guruId, currentUser, teachers);
      if (isMySchedule && sch.mapelId) {
        const s = subjects.find(
          (sub) =>
            sub.id === sch.mapelId ||
            sub.kode === sch.mapelId ||
            (sub.namaMapel && sub.namaMapel.toLowerCase() === sch.mapelId.toLowerCase())
        );
        if (s) {
          matchedSubjectIds.add(s.id);
        }
      }
    });
  }

  // Filter subjects that match
  const filtered = subjects.filter((s) => matchedSubjectIds.has(s.id));

  // If a teacher is configured with specific subjects, return ONLY those subjects
  if (filtered.length > 0) {
    return filtered;
  }

  // Fallback: If no subjects matched, return all subjects
  return subjects;
}

