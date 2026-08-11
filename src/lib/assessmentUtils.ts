import { Assessment, User, ScheduleItem, TeacherItem, SubjectItem, ClassItem } from '../types';
import { isTeacherMatch, isClassMatch } from './matchUtils';

/**
 * Checks if an assessment/soal is visible to a user according to the visibility rules:
 * 1. Admin
 * 2. Pembuat soal atau pengampu mapel
 * 3. Murid yang dipilih untuk melakukan ujian
 */
export function canUserAccessAssessment(
  asm: Assessment,
  currentUser: User | null | undefined,
  extra?: {
    schedules?: ScheduleItem[];
    teachers?: TeacherItem[];
    subjects?: SubjectItem[];
    classes?: ClassItem[];
  }
): boolean {
  if (!currentUser) return false;

  // 1. Admin role can access all assessments
  if (currentUser.role === 'admin') {
    return true;
  }

  // 2. Pembuat soal atau pengampu mapel (Guru)
  if (currentUser.role === 'guru') {
    const userId = currentUser.id;
    const userNuptk = currentUser.nuptkOrNisn || '';
    const userName = currentUser.name || '';
    const userUsername = currentUser.username || '';

    // Check if creator
    const teachers = extra?.teachers || [];
    const isCreator =
      isTeacherMatch(asm.guruId, currentUser, teachers) ||
      (asm.createdBy && asm.createdBy === userId) ||
      (asm.createdBy && asm.createdBy === userUsername);

    if (isCreator) return true;

    // Check if pengampu mapel (Subject Teacher) via schedule
    const schedules = extra?.schedules || [];
    const isSubjectTeacherInSchedule = schedules.some(
      (s) =>
        isTeacherMatch(s.guruId, currentUser, teachers) &&
        s.mapelId === asm.mapelId
    );

    if (isSubjectTeacherInSchedule) return true;

    // Check if teacher profile has matching mengajarMapel
    const teacherObj = teachers.find(
      (t) =>
        t.id === userId ||
        (userNuptk && t.nuptk === userNuptk) ||
        (userName && t.nama === userName)
    );

    if (teacherObj) {
      const subjects = extra?.subjects || [];
      const mapelObj = subjects.find((sub) => sub.id === asm.mapelId);
      if (
        teacherObj.mengajarMapel === asm.mapelId ||
        (mapelObj && teacherObj.mengajarMapel === mapelObj.namaMapel)
      ) {
        return true;
      }
    }

    return false;
  }

  // 3. Murid yang dipilih untuk melakukan ujian (Siswa)
  if (currentUser.role === 'siswa') {
    const studentId = currentUser.id;
    const studentNisn = currentUser.nuptkOrNisn || '';

    // If specific target students are set, student must be in targetSiswaIds
    if (asm.targetSiswaIds && asm.targetSiswaIds.length > 0) {
      return (
        asm.targetSiswaIds.includes(studentId) ||
        (!!studentNisn && asm.targetSiswaIds.includes(studentNisn))
      );
    }

    // Default: if targetSiswaIds is empty/undefined, visible to students in assigned class
    const studentClassId = currentUser.kelasId || '';
    if (!asm.kelasId || asm.kelasId === 'semua' || asm.kelasId === 'all') return true;
    return isClassMatch(studentClassId, asm.kelasId, extra?.classes || []);
  }

  return false;
}
