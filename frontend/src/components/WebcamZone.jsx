import React, { useRef, useState, useEffect } from 'react';
import { Camera, StopCircle, Loader2, Focus } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export default function WebcamZone({ onAnalyze, isLoading }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const uiRef = useRef(null);
  const [stream, setStream] = useState(null);

  useGSAP(() => {
    if (isLoading) {
      gsap.to('.scan-line', {
        y: () => uiRef.current.querySelector('.cam-wrap').offsetHeight,
        opacity: 1,
        duration: 2.5,
        ease: 'power1.inOut',
        repeat: -1,
        yoyo: true
      });
    } else {
      gsap.killTweensOf('.scan-line');
      gsap.set('.scan-line', { opacity: 0, y: 0 });
    }
  }, { scope: uiRef, dependencies: [isLoading] });

  const startCamera = async () => {
    try {
      const ms = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: 'environment' } });
      setStream(ms);
      if (videoRef.current) videoRef.current.srcObject = ms;
    } catch (e) {
      alert('Camera access denied format unavailable: ' + e.message);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [stream]);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const b64 = canvas.toDataURL('image/jpeg', 0.95);
    onAnalyze(b64);
  };

  return (
    <div className="panel active glass-card" style={{ padding: 24 }} ref={uiRef}>
      <div className={`cam-wrap ${isLoading ? 'scanning' : ''}`}>
        <video ref={videoRef} autoPlay playsInline muted className="cam-video"></video>
        <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
        
        <div className="scan-line"></div>
        
        {!stream && (
          <div className="cam-overlay">
            <div className="upload-icon-wrap">
               <Camera size={32} />
            </div>
            <p>Initialize Lens Camera</p>
          </div>
        )}
        
        {stream && !isLoading && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Focus size={80} color="rgba(255,255,255,0.3)" strokeWidth={1} />
          </div>
        )}
      </div>

      <div className="cam-controls">
        {!stream ? (
          <button className="btn btn-secondary" onClick={startCamera}>
            <Camera size={20} /> Connect Lens
          </button>
        ) : (
          <button className="btn btn-secondary" onClick={stopCamera}>
            <StopCircle size={20} /> Stop Feed
          </button>
        )}
        
        <button 
          className="btn btn-primary" 
          onClick={capture} 
          disabled={!stream || isLoading} 
          style={{ marginLeft: 'auto', flex: 1, justifySelf: 'stretch' }}
        >
          {isLoading ? <Loader2 size={20} className="loader-spinner" /> : <Camera size={20} />}
          {isLoading ? 'Processing Scene...' : 'Capture & Analyze'}
        </button>
      </div>
    </div>
  );
}
