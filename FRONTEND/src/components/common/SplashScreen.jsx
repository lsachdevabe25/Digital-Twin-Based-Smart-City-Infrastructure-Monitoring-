import React, { useState, useEffect, useCallback, useRef } from 'react';
import '../../styles/splashScreen.css';

export function SplashScreen({ onComplete }) {
  const [fadingOut, setFadingOut] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imageError, setImageError] = useState(false);

  const overlayRef = useRef(null);
  const previousFocusRef = useRef(null);
  const isDismissedRef = useRef(false);

  // Store previously focused element and lock body scroll on mount
  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus into dialog for accessibility
    if (overlayRef.current) {
      overlayRef.current.focus();
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, []);

  const handleDismiss = useCallback(() => {
    if (isDismissedRef.current) return;
    isDismissedRef.current = true;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fadeDuration = prefersReducedMotion ? 50 : 400;

    setFadingOut(true);
    setTimeout(() => {
      if (onComplete) onComplete();
    }, fadeDuration);
  }, [onComplete]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = prefersReducedMotion ? 1200 : 3000;

    // Progress bar animation
    const startTime = performance.now();
    let frameId;

    const updateProgress = (currentTime) => {
      const elapsed = currentTime - startTime;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);

      if (pct < 100) {
        frameId = requestAnimationFrame(updateProgress);
      }
    };

    frameId = requestAnimationFrame(updateProgress);

    // Auto-dismissal timer for exactly 3 seconds (or 1.2s for reduced motion)
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    // Keyboard 'Esc' skip listener
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleDismiss]);

  return (
    <div
      ref={overlayRef}
      className={`splash-overlay ${fadingOut ? 'fade-out' : ''}`}
      onClick={handleDismiss}
      role="dialog"
      aria-modal="true"
      aria-label="Loading Digital Twin-Based Smart City Infrastructure Monitoring"
      tabIndex={-1}
    >
      <div className="splash-container">
        {/* Centered Artwork: /splash.jpg with fallback to inline SVG */}
        <div className="splash-artwork-wrap">
          {!imageError ? (
            <img
              src="/splash.jpg"
              alt="Digital Twin Overview"
              className="splash-custom-image"
              onError={() => setImageError(true)}
            />
          ) : (
            <svg
              className="splash-svg"
              viewBox="0 0 560 320"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>
                <pattern id="isoGrid" width="40" height="23" patternUnits="userSpaceOnUse">
                  <path d="M 0 11.5 L 20 0 L 40 11.5 L 20 23 Z" fill="none" stroke="#e2edf8" strokeWidth="0.8" />
                </pattern>
              </defs>

              <ellipse cx="280" cy="200" rx="240" ry="105" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.2" />
              <ellipse cx="280" cy="200" rx="230" ry="100" fill="url(#isoGrid)" opacity="0.8" />

              <path
                d="M 130 175 L 210 205 L 290 190 L 390 200 L 440 170"
                stroke="#93c5fd"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                fill="none"
              />
              <path
                d="M 210 205 L 270 245 L 360 235 L 390 200"
                stroke="#5eead4"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                fill="none"
              />

              {/* Factory */}
              <g id="factory">
                <polygon points="100,165 140,188 140,225 100,202" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                <polygon points="140,188 190,160 190,197 140,225" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
                <polygon points="100,165 150,137 190,160 140,188" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />

                <polygon points="115,130 125,136 125,158 115,152" fill="#93c5fd" />
                <polygon points="125,136 135,130 135,152 125,158" fill="#60a5fa" />
                <polygon points="115,130 125,124 135,130 125,136" fill="#bfdbfe" />
                <ellipse cx="125" cy="128" rx="7" ry="3" fill="#2563eb" opacity="0.6" />

                <polygon points="135,120 145,126 145,148 135,142" fill="#93c5fd" />
                <polygon points="145,126 155,120 155,142 145,148" fill="#60a5fa" />
                <polygon points="135,120 145,114 155,120 145,126" fill="#bfdbfe" />
                <ellipse cx="145" cy="118" rx="7" ry="3" fill="#2563eb" opacity="0.6" />

                <polygon points="152,148 165,141 165,146 152,153" fill="#2563eb" opacity="0.7" />
                <polygon points="168,139 181,132 181,137 168,144" fill="#2563eb" opacity="0.7" />
                <polygon points="148,206 170,194 170,212 148,224" fill="#1e293b" opacity="0.8" />
              </g>

              {/* Robotic Arm */}
              <g id="robotic-arm">
                <ellipse cx="210" cy="205" rx="14" ry="7" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
                <polygon points="202,201 218,201 218,193 202,193" fill="#64748b" />
                <ellipse cx="210" cy="193" rx="10" ry="4" fill="#0d9488" />
                <path d="M 210 193 L 218 168" stroke="#0f766e" strokeWidth="4.5" strokeLinecap="round" />
                <circle cx="218" cy="168" r="4.5" fill="#14b8a6" stroke="#0f766e" strokeWidth="1" />
                <path d="M 218 168 L 235 156" stroke="#2563eb" strokeWidth="3.5" strokeLinecap="round" />
                <circle cx="235" cy="156" r="3.5" fill="#3b82f6" />
                <path d="M 235 156 L 243 150 M 241 147 L 246 150 M 241 153 L 246 150" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" />
              </g>

              {/* Solar Panels */}
              <g id="solar-panels">
                <line x1="250" y1="240" x2="250" y2="248" stroke="#94a3b8" strokeWidth="2" />
                <line x1="285" y1="255" x2="285" y2="263" stroke="#94a3b8" strokeWidth="2" />
                <polygon points="240,240 280,222 305,234 265,252" fill="#0284c7" stroke="#0369a1" strokeWidth="1" />
                <line x1="260" y1="231" x2="285" y2="243" stroke="#e0f2fe" strokeWidth="0.8" />
                <line x1="252" y1="243" x2="292" y2="225" stroke="#e0f2fe" strokeWidth="0.8" />
              </g>

              {/* Telemetry Monitor */}
              <g id="telemetry-monitor">
                <polygon points="340,230 354,236 354,242 340,236" fill="#94a3b8" />
                <line x1="347" y1="233" x2="347" y2="222" stroke="#64748b" strokeWidth="2" />
                <polygon points="332,208 368,192 368,218 332,234" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />
                <polygon points="335,210 365,196 365,215 335,229" fill="#0f172a" />
                <polyline points="337,222 344,216 350,220 356,206 362,209" stroke="#14b8a6" strokeWidth="1.5" fill="none" />
                <circle cx="356" cy="206" r="1.5" fill="#38bdf8" />
              </g>

              {/* Smart City Blocks */}
              <g id="city-blocks">
                <polygon points="410,120 435,132 435,200 410,188" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                <polygon points="435,132 465,116 465,184 435,200" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
                <polygon points="410,120 440,104 465,116 435,132" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
                <line x1="420" y1="135" x2="420" y2="180" stroke="#3b82f6" strokeWidth="1.2" strokeDasharray="2 3" opacity="0.7" />
                <line x1="428" y1="139" x2="428" y2="184" stroke="#3b82f6" strokeWidth="1.2" strokeDasharray="2 3" opacity="0.7" />
                <line x1="445" y1="130" x2="445" y2="175" stroke="#0d9488" strokeWidth="1.2" strokeDasharray="2 3" opacity="0.7" />
                <line x1="455" y1="125" x2="455" y2="170" stroke="#0d9488" strokeWidth="1.2" strokeDasharray="2 3" opacity="0.7" />

                <polygon points="380,150 405,162 405,215 380,203" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
                <polygon points="405,162 430,149 430,202 405,215" fill="#94a3b8" stroke="#64748b" strokeWidth="1" />
                <polygon points="380,150 405,137 430,149 405,162" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                <line x1="390" y1="162" x2="390" y2="198" stroke="#2563eb" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                <line x1="398" y1="166" x2="398" y2="202" stroke="#2563eb" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                <line x1="415" y1="158" x2="415" y2="194" stroke="#0d9488" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />

                <polygon points="435,178 455,188 455,215 435,205" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                <polygon points="455,188 475,178 475,205 455,215" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
                <polygon points="435,178 455,168 475,178 455,188" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
              </g>

              {/* Floating Nodes */}
              <g id="node-cloud" transform="translate(130, 85)">
                <circle cx="16" cy="16" r="16" fill="#ffffff" stroke="#93c5fd" strokeWidth="1.5" />
                <path d="M10 18a4 4 0 0 1 7.5-1.5A3.5 3.5 0 0 1 23 18H10z" fill="#2563eb" />
                <line x1="16" y1="32" x2="16" y2="50" stroke="#93c5fd" strokeWidth="1.2" strokeDasharray="2 2" />
              </g>

              <g id="node-gear" transform="translate(215, 105)">
                <circle cx="16" cy="16" r="16" fill="#ffffff" stroke="#99f6e4" strokeWidth="1.5" />
                <circle cx="16" cy="16" r="5" fill="none" stroke="#0d9488" strokeWidth="2.5" />
                <path d="M16 8v3 M16 21v3 M8 16h3 M21 16h3" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" />
                <line x1="16" y1="32" x2="16" y2="48" stroke="#99f6e4" strokeWidth="1.2" strokeDasharray="2 2" />
              </g>

              <g id="node-chip" transform="translate(315, 120)">
                <circle cx="16" cy="16" r="16" fill="#ffffff" stroke="#93c5fd" strokeWidth="1.5" />
                <rect x="10" y="10" width="12" height="12" rx="2" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.5" />
                <rect x="13" y="13" width="6" height="6" fill="#2563eb" />
                <path d="M12 7v3 M16 7v3 M20 7v3 M12 22v3 M16 22v3 M20 22v3 M7 12h3 M7 16h3 M7 20h3 M22 12h3 M22 16h3 M22 20h3" stroke="#2563eb" strokeWidth="1" />
                <line x1="16" y1="32" x2="16" y2="65" stroke="#93c5fd" strokeWidth="1.2" strokeDasharray="2 2" />
              </g>

              <g id="node-wifi" transform="translate(425, 65)">
                <circle cx="16" cy="16" r="16" fill="#ffffff" stroke="#99f6e4" strokeWidth="1.5" />
                <path d="M10 14a8 8 0 0 1 12 0" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                <path d="M12.5 17a5 5 0 0 1 7 0" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                <circle cx="16" cy="20" r="1.5" fill="#0d9488" />
                <line x1="16" y1="32" x2="16" y2="48" stroke="#99f6e4" strokeWidth="1.2" strokeDasharray="2 2" />
              </g>
            </svg>
          )}
        </div>

        {/* Project Branding & Progress Bar */}
        <div className="splash-info">
          <h1 className="splash-title">Digital Twin-Based Smart City Infrastructure Monitoring</h1>
          <p className="splash-tagline">Digital Twin for Smart City & Manufacturing Systems</p>
        </div>

        <div className="splash-progress-track">
          <div
            className="splash-progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>

        <span className="splash-skip-hint">Click or press Esc to skip</span>
      </div>
    </div>
  );
}

export default SplashScreen;
