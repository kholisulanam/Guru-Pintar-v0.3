import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Download,
  Eye,
  X,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  FileText,
  Bookmark,
  Sparkles
} from 'lucide-react';
import { LibraryBook } from '../../types';

interface SiswaPerpustakaanProps {
  libraryBooks?: LibraryBook[];
}

export const SiswaPerpustakaan: React.FC<SiswaPerpustakaanProps> = ({ libraryBooks = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBook, setSelectedBook] = useState<LibraryBook | null>(null);
  const [readerBook, setReaderBook] = useState<LibraryBook | null>(null);

  // Reader state
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isReaderFullscreen, setIsReaderFullscreen] = useState(false);
  const [activeReaderTab, setActiveReaderTab] = useState<'pdf' | 'info'>('pdf');

  // Fallback covers
  const fallbackCovers = [
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=400&auto=format&fit=crop&q=80',
  ];

  const filteredBooks = libraryBooks.filter(
    (b) =>
      b.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.pengarang.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.kategori.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const defaultPdfUrl = 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf';

  const getBookPdfUrl = (book: LibraryBook) => {
    if (book.filePdfDemoUrl && book.filePdfDemoUrl.trim().startsWith('http')) {
      return book.filePdfDemoUrl.trim();
    }
    return defaultPdfUrl;
  };

  const handleOpenReader = (book: LibraryBook) => {
    setReaderBook(book);
    setSelectedBook(null);
    setZoomLevel(100);
    setActiveReaderTab('pdf');
  };

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" /> Perpustakaan Digital & PDF Reader
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Baca e-book, modul KBM, dan kitab rujukan santri langsung di dalam aplikasi ({libraryBooks.length} Buku Terdaftar).
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Cari judul / pengarang / kategori..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Book Grid */}
      {filteredBooks.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 space-y-2">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="font-semibold text-white">Tidak ada buku bacaan ditemukan</p>
          <p className="text-xs">Coba kata kunci lain atau minta Admin menambah daftar bacaan di menu Pengelolaan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredBooks.map((book, idx) => {
            const coverImg = fallbackCovers[idx % fallbackCovers.length];
            const hasPdf = !!(book.filePdfDemoUrl && book.filePdfDemoUrl.trim().length > 0);

            return (
              <div
                key={book.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md hover:border-blue-500/60 transition group flex flex-col justify-between"
              >
                <div>
                  <div className="h-44 bg-slate-950 overflow-hidden relative">
                    <img
                      src={coverImg}
                      alt={book.judul}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <span className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur border border-slate-700 text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {book.kategori}
                    </span>
                    <span className="absolute bottom-2 right-2 bg-slate-950/80 backdrop-blur border border-slate-700 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded-full">
                      {book.tahunTerbit}
                    </span>
                    {hasPdf && (
                      <span className="absolute top-2 right-2 bg-blue-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow flex items-center gap-1">
                        <FileText className="w-2.5 h-2.5" /> PDF Digital
                      </span>
                    )}
                  </div>

                  <div className="p-4 space-y-1.5">
                    <h3 className="font-bold text-sm text-white line-clamp-2">{book.judul}</h3>
                    <p className="text-[11px] text-slate-400">{book.pengarang} ({book.penerbit})</p>
                    <p className="text-xs text-slate-300 line-clamp-2 mt-2 leading-relaxed">
                      {book.ringkasan}
                    </p>
                  </div>
                </div>

                <div className="p-4 pt-0 space-y-2">
                  <button
                    onClick={() => handleOpenReader(book)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-900/20"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Baca Buku Sekarang
                  </button>
                  <button
                    onClick={() => setSelectedBook(book)}
                    className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-[11px] font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3 h-3" /> Detail & Ringkasan
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Book Detail Modal */}
      {selectedBook && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-slate-100 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedBook(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex gap-4">
              <div className="w-24 h-36 bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-xl border border-slate-700 flex-shrink-0 flex items-center justify-center p-2 text-center shadow-lg">
                <BookOpen className="w-8 h-8 text-white/80" />
              </div>
              <div className="space-y-1">
                <span className="px-2 py-0.5 bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-bold rounded-full">
                  {selectedBook.kategori}
                </span>
                <h3 className="font-bold text-base text-white">{selectedBook.judul}</h3>
                <p className="text-xs text-slate-400">Penulis: {selectedBook.pengarang}</p>
                <p className="text-xs text-slate-400">Penerbit: {selectedBook.penerbit} ({selectedBook.tahunTerbit})</p>
                <p className="text-xs text-emerald-400 font-mono">Tersedia: {selectedBook.stok} unit</p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
              <p className="font-bold text-white mb-1">Sinopsis & Ringkasan Modul:</p>
              {selectedBook.ringkasan}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleOpenReader(selectedBook)}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-bold text-white rounded-xl text-xs shadow transition flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4" /> Buka PDF Reader
              </button>
              <a
                href={getBookPdfUrl(selectedBook)}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 font-bold text-slate-200 border border-slate-700 rounded-xl text-xs transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Unduh
              </a>
            </div>
          </div>
        </div>
      )}

      {/* FULL PDF READER MODAL */}
      {readerBook && (
        <div className={`fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex flex-col transition-all ${
          isReaderFullscreen ? 'p-0' : 'p-2 sm:p-4'
        }`}>
          <div className={`bg-slate-900 border border-slate-800 rounded-2xl w-full h-full flex flex-col overflow-hidden shadow-2xl`}>
            {/* Top Toolbar */}
            <div className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white max-w-xs sm:max-w-md truncate">
                      {readerBook.judul}
                    </h3>
                    <span className="bg-slate-800 text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-700 hidden sm:inline-block">
                      {readerBook.kategori}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Oleh {readerBook.pengarang} • {readerBook.penerbit}
                  </p>
                </div>
              </div>

              {/* Toolbar Actions */}
              <div className="flex items-center gap-2 text-xs">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 mr-2">
                  <button
                    onClick={() => setActiveReaderTab('pdf')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      activeReaderTab === 'pdf' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Viewer PDF
                  </button>
                  <button
                    onClick={() => setActiveReaderTab('info')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      activeReaderTab === 'info' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Info & Catatan
                  </button>
                </div>

                {/* Zoom Controls */}
                <div className="hidden md:flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-slate-300 mr-2">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(75, z - 25))}
                    className="p-1 hover:text-white transition"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-[10px] px-1">{zoomLevel}%</span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(175, z + 25))}
                    className="p-1 hover:text-white transition"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Open in New Tab */}
                <a
                  href={getBookPdfUrl(readerBook)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-semibold flex items-center gap-1 transition"
                  title="Buka PDF di Tab Baru"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tab Baru</span>
                </a>

                {/* Download PDF */}
                <a
                  href={getBookPdfUrl(readerBook)}
                  download
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl flex items-center gap-1 shadow transition"
                  title="Unduh File PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Unduh</span>
                </a>

                {/* Fullscreen Toggle */}
                <button
                  onClick={() => setIsReaderFullscreen(!isReaderFullscreen)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
                  title={isReaderFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
                >
                  {isReaderFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                {/* Close Reader */}
                <button
                  onClick={() => setReaderBook(null)}
                  className="p-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl border border-rose-500/30 transition"
                  title="Tutup PDF Reader"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Viewer Body */}
            <div className="flex-1 bg-slate-950 relative overflow-hidden flex flex-col justify-between">
              {activeReaderTab === 'pdf' ? (
                <div className="w-full h-full flex flex-col items-center justify-center relative overflow-auto bg-slate-950 p-1 sm:p-2">
                  <div
                    className="w-full h-full transition-all duration-200"
                    style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                  >
                    <iframe
                      src={getBookPdfUrl(readerBook)}
                      title={readerBook.judul}
                      className="w-full h-full border-0 rounded-xl shadow-2xl bg-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-6 max-w-3xl mx-auto space-y-6 overflow-y-auto text-slate-200">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold">
                      <Sparkles className="w-4 h-4" /> Detail & Informasi Buku
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-slate-400">Judul Lengkap:</p>
                        <p className="font-semibold text-white">{readerBook.judul}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Pengarang / Penulis:</p>
                        <p className="font-semibold text-white">{readerBook.pengarang}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Penerbit & Tahun:</p>
                        <p className="font-semibold text-white">{readerBook.penerbit} ({readerBook.tahunTerbit})</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Kategori & Stok:</p>
                        <p className="font-semibold text-teal-300">{readerBook.kategori} ({readerBook.stok} Stok Tersedia)</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <Bookmark className="w-4 h-4" /> Sinopsis & Ringkasan Materi
                    </div>
                    <p className="text-slate-300 leading-relaxed pt-1">
                      {readerBook.ringkasan}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Reader Navigation Footer */}
            <div className="bg-slate-950 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Mode Membaca Santri Active</span>
              </div>
              <div className="flex items-center gap-3 font-mono">
                <span>Perpustakaan Digital MAS AL-AMIEN I PRAGAAN</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
