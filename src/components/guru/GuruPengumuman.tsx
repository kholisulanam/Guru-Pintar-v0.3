import React from 'react';
import { Announcement } from '../../types';
import { AdminPengumuman } from '../admin/AdminPengumuman';

interface GuruPengumumanProps {
  announcements: Announcement[];
  setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>;
}

export const GuruPengumuman: React.FC<GuruPengumumanProps> = (props) => {
  return <AdminPengumuman {...props} />;
};
