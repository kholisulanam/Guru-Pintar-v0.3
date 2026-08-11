import React from 'react';
import { Assessment, ClassItem, SubjectItem, TeacherItem, User, StudentItem, ScheduleItem } from '../../types';
import { AdminAsesmen } from '../admin/AdminAsesmen';

interface GuruAsesmenProps {
  currentUser?: User;
  assessments: Assessment[];
  setAssessments: React.Dispatch<React.SetStateAction<Assessment[]>>;
  classes: ClassItem[];
  subjects: SubjectItem[];
  teachers: TeacherItem[];
  students?: StudentItem[];
  schedules?: ScheduleItem[];
}

export const GuruAsesmen: React.FC<GuruAsesmenProps> = (props) => {
  return <AdminAsesmen {...props} />;
};
