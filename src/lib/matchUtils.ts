import { TeacherItem, SubjectItem, ClassItem, ScheduleItem, StudentItem } from '../types';

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

  // 3. Normalized Match (e.g., "X IPA 1" vs "Kelas 10 IPA 1" or "10-A" vs "X-A" or "cls-12a" vs "XII-A")
  const normClassStr = (s: string) =>
    (s || '')
      .toLowerCase()
      .replace(/^(kelas|kls|rombel|cls-?)\s*/i, '')
      .replace(/\bxii\b/g, '12')
      .replace(/\bxi\b/g, '11')
      .replace(/\bx\b/g, '10')
      .replace(/[^a-z0-9]/g, '');

  const rawNorm = normClassStr(raw);
  if (rawNorm) {
    const normMatch = classes.find(
      (c) => normClassStr(c.namaKelas) === rawNorm || normClassStr(c.id) === rawNorm
    );
    if (normMatch) return normMatch;
  }

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

    // Skip legacy, junk, or header names, or raw ID strings
    if (
      LEGACY_CLASS_IDS.has(c.id) ||
      LEGACY_CLASS_NAMES.has(lowerName) ||
      INVALID_CLASS_NAMES.has(lowerName) ||
      INVALID_CLASS_NAMES.has(cleanName) ||
      rawName.length < 1 ||
      /^cls[-_]/i.test(rawName)
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

    // If still no valid wali kelas matched, assign from available teachers or '-'
    if (!validWaliName) {
      if (teachers.length > 0) {
        const fallbackTeacher = teachers[cleanedList.length % teachers.length];
        validWaliName = fallbackTeacher ? fallbackTeacher.nama : '-';
      } else {
        validWaliName = '-';
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

const LEGACY_DUMMY_STUDENT_NISNS = new Set([
  '0051234567',
  '0059876543',
  '0058881234',
  '0057774321',
  '0061122334',
  '0061122335',
  '0071122336',
  '0071122337',
  '0051122338',
  '0051122339',
  '0081122340',
  '0081122341',
  '0081122342',
  '0081122343',
  '0071122344',
  '0071122345',
  '0061122346',
  '0061122347',
  '0061122348',
]);

const LEGACY_DUMMY_STUDENT_NAMES = new Set([
  'ahmad farisi subakti',
  'siti fatimah az-zahra',
  'mohammad alif pratama',
  'nabila nur aini',
  'badrus sholeh',
  'fiki abdillah',
  'muhammad rizky ramadhan',
  'zulfah amalia',
  'khairul anam',
  'nurul hidayah',
  'abdullah al-mahdi',
  'aisyah putri rahmawati',
  'bagus sajiwo',
  'dina maulida',
  'faizal amir',
  'gita permata',
  'hasan basri',
  'intan nuraini',
  'jalaluddin rumi',
]);

export function isLegacyDummyStudent(student: any): boolean {
  if (!student) return false;
  if (student.nisn && LEGACY_DUMMY_STUDENT_NISNS.has(String(student.nisn).trim())) {
    return true;
  }
  if (student.nama) {
    const cleanName = String(student.nama).toLowerCase().trim();
    if (LEGACY_DUMMY_STUDENT_NAMES.has(cleanName)) {
      return true;
    }
  }
  const idStr = String(student.id || '');
  if (idStr === 'usr-siswa1' || idStr === 'usr-siswa2') {
    return true;
  }
  return false;
}

export function sanitizeAndDeduplicateStudents(students: StudentItem[]): StudentItem[] {
  if (!Array.isArray(students)) return [];
  const seenNisns = new Set<string>();
  const seenIds = new Set<string>();
  const cleaned: StudentItem[] = [];

  for (const student of students) {
    if (!student || isLegacyDummyStudent(student)) continue;
    
    const nisn = student.nisn ? String(student.nisn).trim() : '';
    const id = student.id ? String(student.id).trim() : '';

    if (nisn && seenNisns.has(nisn)) continue;
    if (id && seenIds.has(id)) continue;

    if (nisn) seenNisns.add(nisn);
    if (id) seenIds.add(id);

    cleaned.push(student);
  }

  return cleaned;
}

const LEGACY_DUMMY_TEACHER_IDS = new Set([
  'usr-guru1',
  'usr-guru2',
  'guru-3',
  'guru-4',
]);

const LEGACY_DUMMY_TEACHER_NUPTKS = new Set([
  '197805122005011002',
  '198203152009021005',
  '198507202011012003',
  '199011052018031001',
]);

export function isLegacyDummyTeacher(teacher: any): boolean {
  if (!teacher) return false;
  const id = String(teacher.id || '').trim();
  const nuptk = String(teacher.nuptk || teacher.nipNuptk || '').trim();
  if (LEGACY_DUMMY_TEACHER_IDS.has(id)) return true;
  if (LEGACY_DUMMY_TEACHER_NUPTKS.has(nuptk)) return true;
  return false;
}

export function sanitizeAndDeduplicateTeachers(teachers: TeacherItem[]): TeacherItem[] {
  if (!Array.isArray(teachers)) return [];
  const seenNuptks = new Set<string>();
  const seenNames = new Set<string>();
  const seenIds = new Set<string>();
  const cleaned: TeacherItem[] = [];

  for (const t of teachers) {
    if (!t || isLegacyDummyTeacher(t)) continue;
    const nuptk = (t.nuptk || '').trim();
    const rawNama = (t.nama || '').trim();
    const nama = rawNama.toLowerCase();
    const id = (t.id || '').trim();

    // Skip teachers whose name is an internal ID like guru-imp-... or usr-...
    if (/^(guru|usr|tch|tchr)[-_]/i.test(rawNama) || rawNama.length < 2) continue;

    if (nuptk && nuptk !== '-' && seenNuptks.has(nuptk)) continue;
    if (nama && seenNames.has(nama)) continue;
    if (id && seenIds.has(id)) continue;

    if (nuptk && nuptk !== '-') seenNuptks.add(nuptk);
    if (nama) seenNames.add(nama);
    if (id) seenIds.add(id);

    cleaned.push(t);
  }

  return cleaned;
}

const LEGACY_DUMMY_SUBJECT_IDS = new Set([
  'sub-1',
  'sub-2',
  'sub-3',
  'sub-4',
  'sub-5',
  'sub-6',
]);

const LEGACY_DUMMY_SUBJECT_CODES = new Set([
  'MA-01',
  'MA-02',
  'MA-03',
  'MA-04',
  'MA-05',
  'MA-06',
]);

export function isLegacyDummySubject(subject: any): boolean {
  if (!subject) return false;
  const id = String(subject.id || '').trim();
  const kode = String(subject.kode || '').trim().toUpperCase();
  if (LEGACY_DUMMY_SUBJECT_IDS.has(id) && LEGACY_DUMMY_SUBJECT_CODES.has(kode)) {
    return true;
  }
  return false;
}

export function sanitizeAndDeduplicateSubjects(subjects: SubjectItem[]): SubjectItem[] {
  if (!Array.isArray(subjects)) return [];
  const seenCodes = new Set<string>();
  const seenNames = new Set<string>();
  const seenIds = new Set<string>();
  const cleaned: SubjectItem[] = [];

  for (const s of subjects) {
    if (!s || isLegacyDummySubject(s)) continue;
    const kode = (s.kode || '').trim().toUpperCase();
    const nama = (s.namaMapel || '').trim().toLowerCase();
    const id = (s.id || '').trim();

    if (kode && seenCodes.has(kode)) continue;
    if (nama && seenNames.has(nama)) continue;
    if (id && seenIds.has(id)) continue;

    if (kode) seenCodes.add(kode);
    if (nama) seenNames.add(nama);
    if (id) seenIds.add(id);

    cleaned.push(s);
  }

  return cleaned;
}

export function isLegacyDummySchedule(schedule: any): boolean {
  if (!schedule) return false;
  const id = String(schedule.id || '').trim();
  const guruId = String(schedule.guruId || '').trim();
  const mapelId = String(schedule.mapelId || '').trim();
  
  if (/^sch-([1-9]|1[0-9]|2[0-6])$/.test(id)) {
    return true;
  }
  if (LEGACY_DUMMY_TEACHER_IDS.has(guruId)) {
    return true;
  }
  if (LEGACY_DUMMY_SUBJECT_IDS.has(mapelId)) {
    return true;
  }
  return false;
}

export function sanitizeAndDeduplicateSchedules(schedules: ScheduleItem[]): ScheduleItem[] {
  if (!Array.isArray(schedules)) return [];
  const seenKeys = new Set<string>();
  const cleaned: ScheduleItem[] = [];

  for (const sch of schedules) {
    if (!sch || isLegacyDummySchedule(sch)) continue;
    const key = `${(sch.hari || '').trim().toLowerCase()}_${(sch.jamKe || '').trim().toLowerCase()}_${(sch.kelasId || '').trim().toLowerCase()}_${(sch.guruId || '').trim().toLowerCase()}_${(sch.mapelId || '').trim().toLowerCase()}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    cleaned.push(sch);
  }

  return cleaned;
}

/**
 * Safely get a human-readable display name for a class, avoiding raw ID codes like cls-auto-xxx or cls-imp-xxx.
 */
export function getDisplayClassName(kelasIdOrName: string | undefined | null, classes: ClassItem[] = []): string {
  if (!kelasIdOrName || !kelasIdOrName.trim()) {
    return classes[0]?.namaKelas || 'Kelas';
  }
  const raw = kelasIdOrName.trim();
  const matched = matchClass(raw, classes);
  if (matched && matched.namaKelas && !/^cls[-_]/i.test(matched.namaKelas)) {
    return matched.namaKelas;
  }
  if (!/^cls[-_]/i.test(raw)) {
    return raw;
  }
  const byId = classes.find((c) => c.id === raw);
  if (byId && byId.namaKelas && !/^cls[-_]/i.test(byId.namaKelas)) {
    return byId.namaKelas;
  }
  return classes[0]?.namaKelas || 'Kelas';
}

/**
 * Safely get a human-readable display name for a teacher, avoiding raw ID codes like guru-imp-xxx or usr-xxx.
 */
export function getDisplayTeacherName(guruIdOrName: string | undefined | null, teachers: TeacherItem[] = []): string {
  if (!guruIdOrName || !guruIdOrName.trim()) {
    return teachers[0]?.nama || 'Guru Pengajar';
  }
  const raw = guruIdOrName.trim();
  const matched = matchTeacher(raw, teachers);
  if (matched && matched.nama && !/^(guru|usr|tch|tchr)[-_]/i.test(matched.nama)) {
    return matched.nama;
  }
  if (!/^(guru|usr|tch|tchr)[-_]/i.test(raw)) {
    return raw;
  }
  const byId = teachers.find((t) => t.id === raw);
  if (byId && byId.nama && !/^(guru|usr|tch|tchr)[-_]/i.test(byId.nama)) {
    return byId.nama;
  }
  return teachers[0]?.nama || 'Guru Pengajar';
}

/**
 * Safely get a human-readable display name for a subject, avoiding raw ID codes like sub-imp-xxx.
 */
export function getDisplaySubjectName(mapelIdOrName: string | undefined | null, subjects: SubjectItem[] = []): string {
  if (!mapelIdOrName || !mapelIdOrName.trim()) {
    return subjects[0]?.namaMapel || 'Mata Pelajaran';
  }
  const raw = mapelIdOrName.trim();
  const matched = matchSubject(raw, subjects);
  if (matched && matched.namaMapel && !/^(sub|mp|mapel)[-_]/i.test(matched.namaMapel)) {
    return matched.namaMapel;
  }
  if (!/^(sub|mp|mapel)[-_]/i.test(raw)) {
    return raw;
  }
  const byId = subjects.find((s) => s.id === raw || s.kode === raw);
  if (byId && byId.namaMapel && !/^(sub|mp|mapel)[-_]/i.test(byId.namaMapel)) {
    return byId.namaMapel;
  }
  return subjects[0]?.namaMapel || 'Mata Pelajaran';
}



