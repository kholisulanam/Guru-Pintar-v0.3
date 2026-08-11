import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SchoolSettings } from '../types';

/**
 * Export array of JSON data to Excel (.xlsx) file with Kop Sekolah Header
 */
export function exportToExcel(
  data: Record<string, any>[],
  filename: string,
  sheetName = 'Data Rekap',
  settings?: SchoolSettings
) {
  if (!data || data.length === 0) {
    alert('Tidak ada data untuk diekspor ke Excel');
    return;
  }

  const thAkademik = settings?.tahunAkademik || '2025/2026';
  const smstr = settings?.semester || 'Ganjil';

  // Create Kop Header rows at top of sheet
  const headerRows = [
    ['YAYASAN AL-AMIEN PRENDUAN'],
    ['MADRASAH ALIYAH AL-AMIEN I PRAGAAN'],
    ['PRENDUAN SUMENEP MADURA INDONESIA'],
    ['NSM : 131235290001 | STATUS : TERAKREDITASI (A)'],
    ['Alamat : Jalan Raya Pamekasan-Sumenep No 2A Telp. (0328) 821020 Kode Pos 69465'],
    [`TAHUN AKADEMIK : ${thAkademik} | SEMESTER : ${smstr.toUpperCase()}`],
    [],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(headerRows);
  XLSX.utils.sheet_add_json(worksheet, data, { origin: 'A8' });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Export structured data to official PDF with Kop Sekolah and Double Signatures (Kepala Madrasah on Left, Teacher/Admin on Right)
 */
export function exportToPdfReport({
  title,
  subtitle,
  headers,
  rows,
  settings,
  teacherName,
  teacherTitle = 'Guru Mata Pelajaran',
  filename,
  hari,
  tanggal,
}: {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number)[][];
  settings: SchoolSettings;
  teacherName?: string;
  teacherTitle?: string;
  filename: string;
  hari?: string;
  tanggal?: string;
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // --- KOP SEKOLAH HEADER ---
  // Optional Logo Image on Top Left (larger size, clean without green border)
  if (settings?.logoUrl) {
    try {
      doc.addImage(settings.logoUrl, 'PNG', 15, 8, 24, 24);
    } catch (e) {
      // Ignore if image load fails
    }
  }

  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('YAYASAN AL-AMIEN PRENDUAN', pageWidth / 2, 11, { align: 'center' });

  doc.setFontSize(14);
  doc.text('MADRASAH ALIYAH AL-AMIEN I PRAGAAN', pageWidth / 2, 16, { align: 'center' });

  doc.setFontSize(10.5);
  doc.text('PRENDUAN SUMENEP MADURA INDONESIA', pageWidth / 2, 20.5, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.text('NSM : 131235290001', pageWidth / 2, 24.5, { align: 'center' });

  doc.setFont('times', 'bold');
  doc.text('STATUS : TERAKREDITASI (A)', pageWidth / 2, 28.5, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(8.5);
  doc.text('Alamat : Jalan Raya Pamekasan-Sumenep No 2A Telp. (0328) 821020 Kode Pos 69465', pageWidth / 2, 32.5, { align: 'center' });

  // Header separator double lines
  doc.setLineWidth(1.0);
  doc.line(15, 34.8, pageWidth - 15, 34.8);
  doc.setLineWidth(0.4);
  doc.line(15, 35.4, pageWidth - 15, 35.4);

  // --- DOCUMENT TITLE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(title, pageWidth / 2, 43, { align: 'center' });

  // --- TAHUN AKADEMIK, SEMESTER, HARI & TANGGAL BANNER ---
  const thAkademik = settings?.tahunAkademik || '2025/2026';
  const smstr = settings?.semester || 'Ganjil';
  
  const todayObj = new Date();
  let defaultHari = todayObj.toLocaleDateString('id-ID', { weekday: 'long' });
  let defaultTanggal = todayObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  if (tanggal && !hari) {
    const parsed = new Date(tanggal);
    if (!isNaN(parsed.getTime())) {
      defaultHari = parsed.toLocaleDateString('id-ID', { weekday: 'long' });
    }
  }

  const finalHari = hari || defaultHari;
  const finalTanggal = tanggal || defaultTanggal;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 118, 110);
  doc.text(
    `Semester: ${smstr}  |  Tahun Akademik: ${thAkademik}  |  Hari: ${finalHari}  |  Tanggal: ${finalTanggal}`,
    pageWidth / 2,
    48.5,
    { align: 'center' }
  );
  doc.setTextColor(0, 0, 0);

  if (subtitle) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text(subtitle, pageWidth / 2, 53, { align: 'center' });
  }

  const startY = subtitle ? 58 : 53.5;

  // --- TABLE CONTENT ---
  autoTable(doc, {
    startY: startY,
    head: [headers],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 118, 110], // Teal primary accent
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
    },
    margin: { left: 15, right: 15 },
  });

  // Calculate final Y position after table
  const finalY = (doc as any).lastAutoTable.finalY + 15;

  // Check if we need a new page for signatures
  const pageHeight = doc.internal.pageSize.getHeight();
  let signatureY = finalY;
  if (finalY + 45 > pageHeight) {
    doc.addPage();
    signatureY = 25;
  }

  // --- SIGNATURE BLOCK (TTD) ---
  const todayDateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);

  // Date on top right
  doc.text(`Pragaan, ${todayDateStr}`, pageWidth - 20, signatureY, { align: 'right' });

  signatureY += 7;

  // Left Side Signature Header: Mengetahui, Kepala Madrasah
  const leftX = 20;
  doc.text('Mengetahui,', leftX, signatureY);
  doc.text('Kepala Madrasah', leftX, signatureY + 5);

  // Right Side Signature Header
  const rightX = pageWidth - 20;
  const rightTitle = teacherTitle ? `${teacherTitle},` : 'Guru Mata Pelajaran,';
  doc.text(rightTitle, rightX, signatureY + 5, { align: 'right' });

  // Signature gap space
  const nameY = signatureY + 28;

  // Left Name & NIP/Title (Kepala Madrasah)
  doc.setFont('helvetica', 'bold');
  doc.text(settings.kepalaSekolah, leftX, nameY);
  doc.setFont('helvetica', 'normal');
  doc.text('NIP / NUPTK Terlampir', leftX, nameY + 5);

  // Right Name (Guru / Admin)
  const actualTeacherName = teacherName || 'Nur Aida, S.Pd.I.';
  doc.setFont('helvetica', 'bold');
  doc.text(actualTeacherName, rightX, nameY, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text('NIP / NUPTK Terlampir', rightX, nameY + 5, { align: 'right' });

  // Save PDF
  doc.save(`${filename}.pdf`);
}
