"use client"

import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Download } from 'lucide-react';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure the worker to use the unpkg CDN to avoid Next.js build configuration issues
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
  onDownload?: () => void;
  allowDownload?: boolean;
}

export function PdfViewer({ url, onDownload, allowDownload = false }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
    setPageNumber(1);
    setScale(1); // Reset scale on load
  }

  // Handle responsive width for the PDF
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    
    return () => {
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  const changePage = (offset: number) => {
    setPageNumber((prevPageNumber) => {
      const newPage = prevPageNumber + offset;
      if (newPage < 1) return 1;
      if (numPages && newPage > numPages) return numPages;
      return newPage;
    });
  }

  // Calculate optimum width for mobile versus desktop
  // On mobile, we want it to fit the screen width, minus padding. On desktop, standard width is fine unless zoomed
  const pageWidth = containerWidth > 0 && containerWidth < 800 ? containerWidth - 32 : undefined;

  return (
    <div className="flex flex-col h-full w-full bg-[#525659] relative">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between p-2 bg-[#323639] text-white shadow-md z-10 shrink-0">
        <div className="flex items-center gap-1 md:gap-2">
          <button 
            disabled={pageNumber <= 1}
            onClick={() => changePage(-1)}
            className="p-1.5 hover:bg-white/10 rounded-lg disabled:opacity-30 transition-colors"
            title="Halaman Sebelumnya"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-xs md:text-sm font-medium w-16 md:w-20 text-center">
            {pageNumber} / {numPages || '-'}
          </div>
          <button 
            disabled={pageNumber >= (numPages || 1)}
            onClick={() => changePage(1)}
            className="p-1.5 hover:bg-white/10 rounded-lg disabled:opacity-30 transition-colors"
            title="Halaman Selanjutnya"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        
        <div className="flex items-center gap-1 md:gap-2 bg-black/20 rounded-lg p-1">
          <button 
            onClick={() => setScale(s => Math.max(0.5, s - 0.25))} 
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title="Perkecil"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-xs md:text-sm font-medium w-12 text-center select-none">
            {Math.round(scale * 100)}%
          </span>
          <button 
            onClick={() => setScale(s => Math.min(3, s + 0.25))} 
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title="Perbesar"
          >
            <ZoomIn size={16} />
          </button>
        </div>
        
        <div>
          {allowDownload && onDownload && (
            <button 
              onClick={onDownload} 
              className="p-1.5 hover:bg-white/10 rounded-lg text-white/90 hover:text-white transition-colors flex items-center gap-2 px-3 bg-[var(--accent)]/80 hover:bg-[var(--accent)]"
              title="Unduh Dokumen"
            >
              <Download size={16} />
              <span className="text-xs font-bold hidden md:inline">Unduh</span>
            </button>
          )}
        </div>
      </div>
      
      {/* PDF Container */}
      <div 
        ref={containerRef} 
        className="flex-1 overflow-auto flex justify-center p-4 md:p-8 relative custom-pdf-scrollbar"
      >
        {containerWidth > 0 && (
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50">
                <svg className="animate-spin h-8 w-8 mb-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                </svg>
                <span className="text-sm font-medium">Memuat dokumen PDF...</span>
              </div>
            }
            error={
              <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 p-6">
                <svg className="w-12 h-12 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm font-medium text-center">Gagal memuat dokumen PDF. <br/>Mungkin format tidak didukung atau file rusak.</span>
              </div>
            }
            className="flex flex-col items-center"
          >
            <Page 
              pageNumber={pageNumber} 
              scale={scale} 
              width={pageWidth}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="shadow-2xl max-w-full bg-white transition-transform duration-200"
            />
          </Document>
        )}
      </div>
      
      <style jsx global>{`
        .custom-pdf-scrollbar::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .custom-pdf-scrollbar::-webkit-scrollbar-track {
          background: #323639;
        }
        .custom-pdf-scrollbar::-webkit-scrollbar-thumb {
          background: #6a6f73;
          border-radius: 5px;
          border: 2px solid #323639;
        }
        .custom-pdf-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #80868b;
        }
        
        /* React-PDF text layer fixes for proper selection */
        .react-pdf__Page__textContent {
          opacity: 0.5; /* Useful for debugging if needed, but react-pdf sets opacity:0 when drawing */
        }
      `}</style>
    </div>
  );
}
