import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { UploadCloud, Camera } from 'lucide-react';

export default function Tabs({ activeTab, setActiveTab }) {
  const containerRef = useRef();

  useGSAP(() => {
    // Animate the highlight pill behind the active tab
    const activeEl = containerRef.current.querySelector('.active');
    if (activeEl) {
      gsap.to('.tab-indicator', {
        x: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
        duration: 0.4,
        ease: 'power3.out'
      });
    }
  }, { scope: containerRef, dependencies: [activeTab] });

  return (
    <div className="tabs-container gsap-tabs">
      <div className="tabs" ref={containerRef}>
        <div className="tab-indicator" />
        <button 
          className={`tab ${activeTab === 'upload' ? 'active' : ''}`} 
          onClick={() => setActiveTab('upload')}
        >
          <UploadCloud size={18} /> Upload
        </button>
        <button 
          className={`tab ${activeTab === 'camera' ? 'active' : ''}`} 
          onClick={() => setActiveTab('camera')}
        >
          <Camera size={18} /> Camera
        </button>
      </div>
    </div>
  );
}
