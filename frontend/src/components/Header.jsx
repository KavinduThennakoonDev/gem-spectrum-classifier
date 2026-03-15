import { Gem } from 'lucide-react';

export default function Header() {
  return (
    <header className="gsap-header">
      <div className="logo-row">
        <Gem className="gem-icon" color="var(--gold)" size={42} strokeWidth={1.5} />
      </div>
      <h1>GemScan</h1>
      <p className="subtitle">High-Fidelity Spectrum Analysis</p>
    </header>
  );
}
