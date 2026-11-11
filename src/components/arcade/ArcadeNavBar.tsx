import React, { useState } from 'react';
import type { AppRoute } from '../../router/useAppRouter';
import { soundFx } from '../../utils/audioEffects';
import { spaceMusicEngine } from '../../utils/spaceMusicEngine';
import { triggerWarpDrive } from './WarpBackgroundCanvas';
import type { CadetProfile } from './CadetEnlistModal';

interface ArcadeNavBarProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute, params?: Record<string, string>) => void;
  cadetProfile: CadetProfile;
  onOpenEnlistModal: () => void;
  spaceXp: number;
  onOpenJudgePreview: () => void;
  onOpenTeacherHub: () => void;
}

export const ArcadeNavBar: React.FC<ArcadeNavBarProps> = ({
  currentRoute,
  onNavigate,
  cadetProfile,
  onOpenEnlistModal,
  spaceXp,
  onOpenJudgePreview,
  onOpenTeacherHub,
}) => {
  const [isMuted, setIsMuted] = useState(() => spaceMusicEngine.getIsMuted());

  const handleToggleSound = () => {
    const muted = spaceMusicEngine.toggleMute();
    setIsMuted(muted);
    soundFx.playClick(muted ? 300 : 800);
  };

  const handleNav = (route: AppRoute) => {
    soundFx.playClick(750);
    onNavigate(route);
  };

  const handleLogoClick = () => {
    triggerWarpDrive();
    soundFx.playPowerUp();
    onNavigate('home');
  };

  return (
    <header className="sticky top-0 z-50 bg-[#040816]/95 backdrop-blur-md border-b-2 border-sky-500/30 px-4 md:px-8 py-3">
      <div className="arcade-nav-content max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Brand Logo & Callsign */}
        <div className="arcade-nav-brand flex items-center gap-3">
          <div
            onClick={handleLogoClick}
            title="Click for Hyperspace Warp Drive!"
            className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-amber-400 p-0.5 shadow-lg shadow-sky-500/30 flex items-center justify-center transform hover:rotate-6 transition-transform cursor-pointer"
          >
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-xl font-black">
              🚀
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                onClick={handleLogoClick}
                className="font-arcade tracking-wider text-white text-base md:text-xl drop-shadow-[0_2px_10px_rgba(56,189,248,0.5)] cursor-pointer"
              >
                Jr_AstroCamp
              </span>
              <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow">
                NASA 2026
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-mono-code">CADET CALLSIGN:</span>
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick(600);
                  onOpenEnlistModal();
                }}
                className="text-amber-400 font-bold hover:underline flex items-center gap-1 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 cursor-pointer"
              >
                <span>{cadetProfile.callsign || 'MAYA-01'}</span> ⚡
              </button>
            </div>
          </div>
        </div>

        {/* Center: 4 Chunky Game Navigation Tabs (Always Visible!) */}
        <nav
          className="arcade-nav-links flex flex-wrap items-center gap-2 bg-slate-950/90 p-1.5 rounded-2xl border border-sky-500/30"
          style={{ display: 'flex' }}
        >
          <button
            type="button"
            onClick={() => handleNav('home')}
            className={`pillar-tab px-4 py-2.5 rounded-xl text-xs md:text-sm font-arcade tracking-wider transition-all cursor-pointer ${
              currentRoute === 'home'
                ? 'bg-sky-500 text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.5)] font-bold'
                : 'text-slate-200 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            🌟 1. LAUNCHPAD
          </button>
          
          <button
            type="button"
            onClick={() => handleNav('academy')}
            className={`pillar-tab px-4 py-2.5 rounded-xl text-xs md:text-sm font-arcade tracking-wider transition-all cursor-pointer ${
              currentRoute === 'academy'
                ? 'bg-sky-500 text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.5)] font-bold'
                : 'text-slate-200 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            🎓 2. ACADEMY
          </button>

          <button
            type="button"
            onClick={() => handleNav('simulators')}
            className={`pillar-tab px-4 py-2.5 rounded-xl text-xs md:text-sm font-arcade tracking-wider transition-all cursor-pointer ${
              currentRoute === 'simulators'
                ? 'bg-sky-500 text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.5)] font-bold'
                : 'text-slate-200 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            🕹️ 3. ARCADE
          </button>

          <button
            type="button"
            onClick={() => handleNav('campaign')}
            className={`pillar-tab px-4 py-2.5 rounded-xl text-xs md:text-sm font-arcade tracking-wider transition-all cursor-pointer ${
              currentRoute === 'campaign'
                ? 'bg-sky-500 text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.5)] font-bold'
                : 'text-slate-200 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            🚀 76 MISSIONS
          </button>

          <button
            type="button"
            onClick={() => handleNav('locker' as AppRoute)}
            className={`pillar-tab px-4 py-2.5 rounded-xl text-xs md:text-sm font-arcade tracking-wider transition-all cursor-pointer ${
              (currentRoute as string) === 'locker'
                ? 'bg-sky-500 text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.5)] font-bold'
                : 'text-slate-200 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            🏅 4. LOCKER
          </button>
        </nav>

        {/* Right: XP Meter, Sound FX, Judge & Teacher */}
        <div className="arcade-nav-actions flex items-center gap-2">
          {/* Space XP Meter */}
          <div className="bg-amber-400/10 border-2 border-amber-400/40 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-inner">
            <span className="text-amber-400 text-base font-black">⚡</span>
            <div className="text-right">
              <div className="text-[9px] font-bold text-amber-300/80 uppercase tracking-wider">SPACE XP</div>
              <div className="text-amber-400 font-mono-code font-black text-sm leading-none">{spaceXp}</div>
            </div>
          </div>

          {/* Sound FX Toggle */}
          <button
            type="button"
            onClick={handleToggleSound}
            className="w-10 h-10 rounded-xl bg-slate-900 border-2 border-sky-500/40 hover:border-sky-400 flex items-center justify-center text-sky-400 hover:scale-105 transition-all text-base shadow-lg cursor-pointer"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>

          {/* Judge 1-Click Gateway */}
          <button
            type="button"
            onClick={() => {
              soundFx.playVictory();
              onOpenJudgePreview();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-900/40 hover:bg-purple-800/50 border-2 border-purple-500/50 text-purple-200 text-xs font-bold transition-all hover:scale-105 shadow-lg shadow-purple-500/20 cursor-pointer"
          >
            <span>🏆</span> Judge
          </button>

          {/* Teacher Portal */}
          <button
            type="button"
            onClick={() => {
              soundFx.playClick(600);
              onOpenTeacherHub();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 text-slate-300 text-xs font-bold transition-all hover:scale-105 cursor-pointer"
          >
            <span>👩‍🏫</span> Teacher
          </button>
        </div>

      </div>
    </header>
  );
};
