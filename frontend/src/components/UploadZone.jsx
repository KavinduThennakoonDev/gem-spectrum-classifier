import React, { useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { UploadCloud, X, Loader2, Sparkles } from 'lucide-react';

export default function UploadZone({ onAnalyze, isLoading, onClear }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const containerRef = useRef();

  useGSAP(() => {
    if (file) {
      gsap.from('.preview-wrap', { 
        y: 20, opacity: 0, scale: 0.95, 
        duration: 0.5, ease: 'back.out(1.2)' 
      });
    }
  }, { scope: containerRef, dependencies: [file] });

  const handleFile = (f) => {
    if (!f || !f.type.startsWith('image/')) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    if (onClear) onClear();
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const submit = () => {
    if (file) onAnalyze(file);
  };

  return (
    <div className="panel active glass-card" ref={containerRef}>
      {!preview ? (
        <div 
          className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('fileInput').click()}
        >
          <input 
            type="file" 
            id="fileInput" 
            accept="image/*" 
            onChange={(e) => handleFile(e.target.files[0])} 
            style={{ display: 'none' }}
          />
          <div className="upload-icon-wrap">
            <UploadCloud size={36} strokeWidth={1.5} />
          </div>
          <p className="drop-text">
            <strong>Drag & Drop Spectrum Image</strong>
            PNG, JPG, BMP, or TIFF format
          </p>
        </div>
      ) : (
        <div style={{ padding: 24 }}>
          <div className="preview-wrap show">
            <img src={preview} alt="Preview" className="preview-img" />
            <button className="preview-clear" onClick={clearFile}>
              <X size={16} /> Discard
            </button>
          </div>
          <button 
            className="btn btn-primary btn-full" 
            onClick={submit} 
            disabled={!file || isLoading}
          >
            {isLoading ? <Loader2 size={20} className="loader-spinner" /> : <Sparkles size={20} />}
            {isLoading ? 'Analyzing Spectrum Data...' : 'Start Intelligence Scan'}
          </button>
        </div>
      )}
    </div>
  );
}
