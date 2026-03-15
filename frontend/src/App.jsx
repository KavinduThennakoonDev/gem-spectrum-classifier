import React, { useState, useRef } from 'react';
import Header from './components/Header';
import Tabs from './components/Tabs';
import UploadZone from './components/UploadZone';
import WebcamZone from './components/WebcamZone';
import ResultsDisplay from './components/ResultsDisplay';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { AlertTriangle } from 'lucide-react';

gsap.registerPlugin(useGSAP);

function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  
  const appRef = useRef();

  // Hardcoded API endpoint - completely hidden from user.
  const API_BASE = 'http://localhost:5000';

  useGSAP(() => {
    gsap.from('.gsap-ambient', { opacity: 0, duration: 2, ease: 'power2.inOut' });
    gsap.from('.gsap-header', { y: -40, opacity: 0, duration: 1, ease: 'power4.out', delay: 0.1 });
    gsap.from('.gsap-tabs', { y: 20, opacity: 0, duration: 0.8, ease: 'back.out(1.5)', delay: 0.3 });
    gsap.from('.gsap-panel-wrapper', { y: 30, opacity: 0, duration: 0.8, delay: 0.5, ease: 'power3.out' });
  }, { scope: appRef, dependencies: [] });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleUploadAnalyze = async (file) => {
    setIsLoading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch(`${API_BASE}/predict/upload`, { method: 'POST', body: form });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      showToast('Connection to analysis engine failed. Is the server running?');
      setResult({ error: 'Server unreachable' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWebcamAnalyze = async (b64) => {
    setIsLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/predict/base64`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: b64 })
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      showToast('Connection to analysis engine failed.');
      setResult({ error: 'Server unreachable' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabSwitch = (t) => {
    setActiveTab(t);
    setResult(null); // Clear result on tab switch
  };

  return (
    <div ref={appRef} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
      {/* Immersive background elements */}
      <div className="ambient-bg gsap-ambient">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      <div className="wrap">
        <Header />
        
        <Tabs activeTab={activeTab} setActiveTab={handleTabSwitch} />
        
        <div className="gsap-panel-wrapper" style={{ position: 'relative' }}>
          {activeTab === 'upload' && (
            <UploadZone onAnalyze={handleUploadAnalyze} isLoading={isLoading} onClear={() => setResult(null)} />
          )}
          
          {activeTab === 'camera' && (
            <WebcamZone onAnalyze={handleWebcamAnalyze} isLoading={isLoading} onClear={() => setResult(null)} />
          )}
        </div>
        
        <ResultsDisplay result={result} />
        
        <footer>Powered by EfficientNet-B0 · GemScan Intelligence</footer>
        
        {toastMsg && (
          <div className="toast-container">
            <div className="toast">
              <AlertTriangle color="var(--danger)" size={20} />
              {toastMsg}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
