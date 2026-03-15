import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ShieldAlert, Crosshair } from 'lucide-react';

export default function ResultsDisplay({ result }) {
  const compRef = useRef(null);

  useEffect(() => {
    if (!result) return;
    
    const ctx = gsap.context(() => {
      // Card entrance jump
      gsap.from('.result-card', {
        y: 40,
        opacity: 0,
        scale: 0.98,
        duration: 0.8,
        ease: 'back.out(1.1)'
      });

      if (!result.error) {
        // Stagger score pills
        gsap.from('.score-pill', {
          y: 20,
          opacity: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: 'power3.out',
          delay: 0.2
        });
        
        // Setup numerical counter animation
        const confTarget = result.confidence || 0;
        gsap.to('.conf-number', {
          innerHTML: confTarget,
          duration: 1.5,
          delay: 0.3,
          ease: 'power4.out',
          snap: { innerHTML: 0.1 },
          onUpdate: function() {
            document.querySelector('.conf-number').innerHTML = Number(this.targets()[0].innerHTML).toFixed(1);
          }
        });

        // Fill bar animations
        gsap.to('.bar-fill', {
          width: (index, target) => `${target.dataset.target}%`,
          duration: 1.2,
          stagger: 0.1,
          ease: 'power3.out',
          delay: 0.4
        });
      }
    }, compRef);

    return () => ctx.revert();
  }, [result]);

  if (!result) return null;

  if (result.error) {
    const isServerDown = result.error === 'Server unreachable';
    const errorMessage = isServerDown
      ? 'Cannot connect to the GemScan engine. Please ensure your backend services are active.'
      : result.error;

    return (
      <div className="result-wrap" ref={compRef}>
        <div className="result-card glass-card reject-card">
          <div className="reject-icon-wrap">
            <ShieldAlert size={36} />
          </div>
          <div className="result-class" style={{ color: 'var(--danger)', fontSize: '1.8rem' }}>
            Analysis Rejected
          </div>
          <div style={{ fontSize: '1rem', color: 'var(--text)', maxWidth: 500, lineHeight: 1.6, fontWeight: 300 }}>
            {errorMessage}
          </div>
        </div>
      </div>
    );
  }

  // Success formatting
  const sortedScores = Object.entries(result.all_scores || {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="result-wrap" ref={compRef}>
      <div className="result-card glass-card">
        
        <div className="result-header">
          <div className="result-main">
            <div className="result-icon-wrap">
              <Crosshair size={32} />
            </div>
            <div>
              <div className="result-label">Identified Signature</div>
              <div className="result-class">{result.predicted_class}</div>
            </div>
          </div>
          <div className="result-conf-wrap">
            <div className="result-label">Algorithmic Confidence</div>
            <div className="result-conf">
              <span className="conf-number" style={{ display: 'inline-block', minWidth: '90px' }}>0.0</span><span>%</span>
            </div>
          </div>
        </div>
        
        <div className="scores-grid">
          {sortedScores.map(([cls, pct]) => {
            const isPrimary = cls === result.predicted_class;
            return (
              <div className={`score-pill ${isPrimary ? 'primary' : ''}`} key={cls}>
                <div className="score-name-row">
                  <span className="score-name">{cls}</span>
                  <span className="score-pct">{pct.toFixed(2)}%</span>
                </div>
                <div className="bar-track">
                  <div 
                    className="bar-fill" 
                    data-target={pct}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
