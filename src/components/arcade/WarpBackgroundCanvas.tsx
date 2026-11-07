import React, { useEffect, useState } from 'react';

/**
 * Modern NASA Orbital & Planetary Horizon Backdrop
 * Replaces generic flying particles with an authentic NASA Mission Control /
 * ISS Cupola & Artemis Orbital Telemetry environment:
 *  - JWST Deep-Field cosmic aurora & nebula ambient lighting
 *  - Precision Aerospace Coordinate Grid & Polar Azimuth Rings
 *  - Animated Hohmann Transfer Orbital Trajectories with spacecraft telemetry tags
 *  - Glowing Planetary Atmospheric Horizon Limb (Earth/Moon orbital curvature)
 */
export const WarpBackgroundCanvas: React.FC = () => {
  const [pulseActive, setPulseActive] = useState(false);

  useEffect(() => {
    const handleWarp = () => {
      setPulseActive(true);
      setTimeout(() => setPulseActive(false), 1200);
    };
    window.addEventListener('trigger-warp', handleWarp);
    return () => window.removeEventListener('trigger-warp', handleWarp);
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        background:
          'radial-gradient(130% 95% at 50% 0%, #0a1936 0%, #050b1a 48%, #02050d 100%)',
      }}
    >
      {/* 1. Deep-Space Nebula & Solar Corona Ambient Glows */}
      <div
        style={{
          position: 'absolute',
          top: '-18%',
          left: '-10%',
          width: '65vw',
          height: '65vw',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(14, 165, 233, 0.14) 0%, rgba(59, 130, 246, 0.05) 45%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '8%',
          right: '-12%',
          width: '55vw',
          height: '55vw',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(99, 102, 241, 0.13) 0%, rgba(245, 158, 11, 0.05) 50%, transparent 72%)',
          filter: 'blur(48px)',
        }}
      />

      {/* 2. Precision NASA Mission Control Vector Grid & Orbital Mechanics SVG */}
      <svg
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: pulseActive ? 0.95 : 0.72,
          transition: 'opacity 0.5s ease',
        }}
      >
        <defs>
          {/* Subtle Engineering Blueprint Grid Pattern */}
          <pattern id="nasa-grid-minor" width="60" height="60" patternUnits="userSpaceOnUse">
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke="rgba(56, 189, 248, 0.045)"
              strokeWidth="1"
            />
          </pattern>
          <pattern id="nasa-grid-major" width="300" height="300" patternUnits="userSpaceOnUse">
            <rect width="300" height="300" fill="url(#nasa-grid-minor)" />
            <path
              d="M 300 0 L 0 0 0 300"
              fill="none"
              stroke="rgba(56, 189, 248, 0.09)"
              strokeWidth="1"
            />
            <circle cx="0" cy="0" r="2.5" fill="rgba(56, 189, 248, 0.22)" />
          </pattern>

          {/* Atmospheric Horizon Glow Gradient */}
          <linearGradient id="earth-limb-glow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.05" />
            <stop offset="30%" stopColor="#38bdf8" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#e0f2fe" stopOpacity="0.75" />
            <stop offset="70%" stopColor="#38bdf8" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.05" />
          </linearGradient>

          <radialGradient id="planet-body-grad" cx="50%" cy="15%" r="85%">
            <stop offset="0%" stopColor="#08203e" stopOpacity="0.92" />
            <stop offset="45%" stopColor="#030917" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#010308" stopOpacity="1" />
          </radialGradient>

          <linearGradient id="orbit-cyan" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="orbit-amber" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
            <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Background Telemetry Coordinate Grid */}
        <rect width="1920" height="1080" fill="url(#nasa-grid-major)" />

        {/* Polar Radar / Deep Space Network Azimuth Rings (Top Right) */}
        <g transform="translate(1580, 260)" opacity="0.55">
          <circle
            r="140"
            fill="none"
            stroke="rgba(56, 189, 248, 0.14)"
            strokeWidth="1"
            strokeDasharray="6 6"
          />
          <circle r="240" fill="none" stroke="rgba(56, 189, 248, 0.1)" strokeWidth="1" />
          <circle
            r="350"
            fill="none"
            stroke="rgba(99, 102, 241, 0.12)"
            strokeWidth="1"
            strokeDasharray="12 8"
          />
          <line x1="-380" y1="0" x2="380" y2="0" stroke="rgba(56, 189, 248, 0.08)" strokeWidth="1" />
          <line x1="0" y1="-380" x2="0" y2="380" stroke="rgba(56, 189, 248, 0.08)" strokeWidth="1" />
          <circle r="4" fill="#38bdf8" opacity="0.6" />
          <text
            x="14"
            y="-10"
            fill="rgba(148, 163, 184, 0.55)"
            fontFamily="JetBrains Mono, monospace"
            fontSize="11"
            letterSpacing="2"
          >
            DSN-GOLDSTONE // L2 TRACKING
          </text>
        </g>

        {/* Lunar / Martian Target Schematic (Top Left) */}
        <g transform="translate(260, 290)" opacity="0.5">
          <circle r="95" fill="rgba(15, 23, 42, 0.5)" stroke="rgba(251, 191, 36, 0.22)" strokeWidth="1.2" />
          <ellipse
            rx="95"
            ry="32"
            fill="none"
            stroke="rgba(251, 191, 36, 0.18)"
            strokeWidth="1"
            strokeDasharray="4 4"
            transform="rotate(-18)"
          />
          <ellipse
            rx="32"
            ry="95"
            fill="none"
            stroke="rgba(56, 189, 248, 0.15)"
            strokeWidth="1"
            transform="rotate(-18)"
          />
          <circle r="130" fill="none" stroke="rgba(251, 191, 36, 0.12)" strokeWidth="1" strokeDasharray="3 9" />
          <text
            x="-78"
            y="122"
            fill="rgba(251, 191, 36, 0.55)"
            fontFamily="JetBrains Mono, monospace"
            fontSize="10"
            letterSpacing="1.5"
          >
            TARGET: JEZERO / SHACKLETON
          </text>
        </g>

        {/* Hohmann Transfer Trajectory 1 — Artemis Cis-Lunar NRHO */}
        <path
          id="artemis-orbit-path"
          d="M -120 760 Q 960 190 2040 680"
          fill="none"
          stroke="url(#orbit-cyan)"
          strokeWidth="2"
          strokeDasharray="10 6"
        />

        {/* Hohmann Transfer Trajectory 2 — Mars Trans-Injection Arc */}
        <path
          id="mars-orbit-path"
          d="M -80 540 Q 980 40 2020 490"
          fill="none"
          stroke="url(#orbit-amber)"
          strokeWidth="1.5"
        />

        {/* Smoothly Gliding Spacecraft Telemetry Node 1 (Artemis Orion) */}
        <g>
          <circle r="5" fill="#38bdf8">
            <animateMotion dur="38s" repeatCount="indefinite" path="M -120 760 Q 960 190 2040 680" />
          </circle>
          <circle r="12" fill="none" stroke="#38bdf8" strokeWidth="1" opacity="0.5">
            <animateMotion dur="38s" repeatCount="indefinite" path="M -120 760 Q 960 190 2040 680" />
          </circle>
        </g>

        {/* Smoothly Gliding Spacecraft Telemetry Node 2 (Mars Perseverance Carrier) */}
        <g>
          <circle r="4.5" fill="#fbbf24">
            <animateMotion dur="52s" repeatCount="indefinite" path="M 2020 490 Q 980 40 -80 540" />
          </circle>
          <circle r="11" fill="none" stroke="#fbbf24" strokeWidth="1" opacity="0.45">
            <animateMotion dur="52s" repeatCount="indefinite" path="M 2020 490 Q 980 40 -80 540" />
          </circle>
        </g>

        {/* 3. Glowing Planetary Atmospheric Horizon Limb at Bottom */}
        {/* Outer Atmospheric Halo */}
        <ellipse
          cx="960"
          cy="1690"
          rx="1650"
          ry="760"
          fill="none"
          stroke="rgba(56, 189, 248, 0.12)"
          strokeWidth="45"
        />
        {/* Planetary Dark Body */}
        <ellipse cx="960" cy="1700" rx="1640" ry="755" fill="url(#planet-body-grad)" />
        {/* Crisp Glowing Horizon Rim */}
        <ellipse
          cx="960"
          cy="1700"
          rx="1640"
          ry="755"
          fill="none"
          stroke="url(#earth-limb-glow)"
          strokeWidth="3.5"
        />

        {/* Subtle Telemetry Readout Watermarks */}
        <text
          x="48"
          y="1040"
          fill="rgba(148, 163, 184, 0.35)"
          fontFamily="JetBrains Mono, monospace"
          fontSize="11"
          letterSpacing="2"
        >
          NASA DEEP SPACE NETWORK // TELEMETRY STREAM ACTIVE · EPOCH J2026.0
        </text>
        <text
          x="1490"
          y="1040"
          fill="rgba(56, 189, 248, 0.35)"
          fontFamily="JetBrains Mono, monospace"
          fontSize="11"
          letterSpacing="2"
        >
          INCLINATION 28.5° N · LEO / NRHO / AREOCENTRIC
        </text>
      </svg>
    </div>
  );
};

export const triggerWarpDrive = () => {
  window.dispatchEvent(new CustomEvent('trigger-warp'));
};
