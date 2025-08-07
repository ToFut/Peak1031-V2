import React, { useState, useEffect, useRef } from 'react';
import { 
  XMarkIcon, 
  ArrowDownTrayIcon, 
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  DocumentTextIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';

interface DocumentViewerProps {
  documentUrl?: string;
  documentId?: string;
  documentName?: string;
  onClose: () => void;
  onDownload?: () => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentUrl,
  documentId,
  documentName = 'Document',
  onClose,
  onDownload
}) => {
  const [zoom, setZoom] = useState(100);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  
  const viewerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (documentUrl) {
      setUrl(documentUrl);
    }
    setLoading(false);
  }, [documentUrl]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 25));
  };

  const handleZoomReset = () => {
    setZoom(100);
  };

  const handlePrevPage = () => {
    setPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setPage(prev => Math.min(prev + 1, totalPages));
  };

  const handleFullscreen = () => {
    if (!isFullscreen && viewerRef.current) {
      if (viewerRef.current.requestFullscreen) {
        viewerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.print();
    } else {
      window.print();
    }
  };

  const handleDownload = async () => {
    if (onDownload) {
      onDownload();
    } else if (url) {
      // Fallback download
      const link = document.createElement('a');
      link.href = url;
      link.download = `${documentName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-lg font-medium text-gray-900">Loading document...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <div className="text-center">
            <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load document</h3>
            <p className="text-gray-600 mb-6">{error || 'Document not available'}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={viewerRef}
      className={`fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col ${isFullscreen ? 'bg-black' : ''}`}
    >
      {/* Header Toolbar */}
      <div className="bg-gray-900 text-white p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-4">
          <DocumentTextIcon className="w-6 h-6" />
          <h2 className="text-lg font-semibold truncate max-w-md">{documentName}</h2>
        </div>
        
        {/* Controls */}
        <div className="flex items-center space-x-2">
          {/* Zoom Controls */}
          <div className="flex items-center space-x-1 bg-gray-800 rounded-lg px-2 py-1">
            <button
              onClick={handleZoomOut}
              className="p-1 hover:bg-gray-700 rounded"
              title="Zoom Out"
            >
              <MagnifyingGlassMinusIcon className="w-4 h-4" />
            </button>
            <span 
              className="px-2 text-sm cursor-pointer hover:bg-gray-700 rounded"
              onClick={handleZoomReset}
              title="Reset Zoom"
            >
              {zoom}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1 hover:bg-gray-700 rounded"
              title="Zoom In"
            >
              <MagnifyingGlassPlusIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Page Controls (for PDFs) */}
          <div className="flex items-center space-x-1 bg-gray-800 rounded-lg px-2 py-1">
            <button
              onClick={handlePrevPage}
              className="p-1 hover:bg-gray-700 rounded"
              title="Previous Page"
              disabled={page <= 1}
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <span className="px-2 text-sm">
              {page} / {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              className="p-1 hover:bg-gray-700 rounded"
              title="Next Page"
              disabled={page >= totalPages}
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Action Controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handlePrint}
              className="p-2 hover:bg-gray-700 rounded"
              title="Print"
            >
              <PrinterIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-gray-700 rounded"
              title="Download"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleFullscreen}
              className="p-2 hover:bg-gray-700 rounded"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <ArrowsPointingInIcon className="w-4 h-4" />
              ) : (
                <ArrowsPointingOutIcon className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded"
              title="Close"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Document Viewer */}
      <div className="flex-1 overflow-hidden bg-gray-100">
        <div 
          className="w-full h-full flex items-center justify-center p-4"
          style={{ 
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'center center'
          }}
        >
          <div className="bg-white shadow-2xl rounded-lg overflow-hidden max-w-4xl w-full h-full">
            {/* PDF.js Viewer with fallback */}
            <iframe
              ref={iframeRef}
              src={`/pdfjs-dist/web/viewer.html?file=${encodeURIComponent(url || '')}`}
              className="w-full h-full border-0"
              title={documentName}
              onLoad={() => {
                setLoading(false);
                // Try to get page count from PDF.js if possible
                setTimeout(() => {
                  try {
                    const iframe = iframeRef.current;
                    if (iframe?.contentWindow) {
                      const pdfViewer = (iframe.contentWindow as any).PDFViewerApplication;
                      if (pdfViewer && pdfViewer.pagesCount) {
                        setTotalPages(pdfViewer.pagesCount);
                      }
                    }
                  } catch (e) {
                    // Ignore cross-origin errors - try fallback
                    
                  }
                }, 1000);
              }}
              onError={() => {
                
                // Fallback to direct PDF viewing
                if (iframeRef.current && url) {
                  iframeRef.current.src = url;
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-gray-800 text-white px-4 py-2 text-sm flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span>Document: {documentName}</span>
          <span>•</span>
          <span>Zoom: {zoom}%</span>
          {totalPages > 1 && (
            <>
              <span>•</span>
              <span>Page: {page} of {totalPages}</span>
            </>
          )}
        </div>
        <div className="text-gray-400">
          Use mouse wheel + Ctrl to zoom • Press Esc to close
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;