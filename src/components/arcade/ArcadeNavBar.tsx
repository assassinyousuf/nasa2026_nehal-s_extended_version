import React, { useState } from 'react';
import type { AppRoute } from '../../router/useAppRouter';
import type { User, UserRole } from '../../types/auth';
import { authService } from '../../utils/authService';
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
  currentUser: User | null;
  onUserChange: (user: User | null) => void;
  onOpenRoleAccountModal: (defaultRole?: UserRole) => void;
  onOpenJudgePreview: () => void;
  onOpenTeacherHub: () => void;
}

export const ArcadeNavBar: React.FC<ArcadeNavBarProps> = ({
  currentRoute,
  onNavigate,
  cadetProfile,
  onOpenEnlistModal,
  spaceXp,
  currentUser,
  onUserChange,
  onOpenRoleAccountModal,
}) => {
  const [isMuted, setIsMuted] = useState(() => spaceMusicEngine.getIsMuted());
  const isAuthenticated = Boolean(currentUser);
  const activeRole: UserRole = currentUser?.role || 'cadet';

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

  const handleLogout = () => {
    soundFx.playClick(450);
    authService.logout();
    onUserChange(null);
  };

  const roleMeta = isAuthenticated
    ? {
        cadet: {
          badge: '🟢 👨‍🚀 STUDENT CADET',
          tabLabel: '📊 5. STUDENT DASHBOARD',
          pillClass: 'bg-sky-500/20 text-sky-300 border-sky-400/50',
          activeTabClass: 'bg-sky-500 text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.5)] font-bold',
        },
        teacher: {
          badge: '🟢 👩‍🏫 EDUCATOR',
          tabLabel: '📊 5. TEACHER DASHBOARD',
          pillClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50',
          activeTabClass: 'bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.5)] font-bold',
        },
        judge: {
          badge: '🟢 ⚖️ NASA JUDGE',
          tabLabel: '📊 5. JUDGE DASHBOARD',
          pillClass: 'bg-purple-500/20 text-purple-300 border-purple-400/50',
          activeTabClass: 'bg-purple-500 text-slate-950 shadow-[0_0_20px_rgba(168,85,247,0.5)] font-bold',
        },
      }[activeRole]
    : {
        badge: '🔒 GUEST (LOGIN REQUIRED FOR DASHBOARD)',
        tabLabel: '🔒 5. DASHBOARD (LOCKED)',
        pillClass: 'bg-rose-500/20 text-rose-300 border-rose-400/50',
        activeTabClass: 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.5)] font-bold',
      };

  return (
    <header className="sticky top-0 z-50 bg-[#040816]/95 backdrop-blur-md border-b-2 border-sky-500/30 shadow-2xl">
      {/* Top Role & Account Telemetry Strip */}
      <div className="bg-slate-950/90 border-b border-slate-800/80 px-4 md:px-8 py-1.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Left: Active Role Identity & Auth Status */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className={`text-[10px] font-arcade px-2.5 py-0.5 rounded-full border font-bold ${roleMeta.pillClass}`}>
              {roleMeta.badge}
            </span>
            {currentUser ? (
              <span className="text-slate-300 font-mono-code">
                USER: <strong className="text-white">{currentUser.username}</strong>{' '}
                <span className="text-slate-500">({currentUser.cadetRank})</span>
              </span>
            ) : (
              <span className="text-slate-400 font-mono-code hidden sm:inline">
                Sign in as <strong className="text-sky-300">Student</strong>,{' '}
                <strong className="text-emerald-300">Teacher</strong>, or{' '}
                <strong className="text-purple-300">Judge</strong> to unlock Dashboards
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                soundFx.playClick(600);
                onOpenEnlistModal();
              }}
              className="text-amber-400 hover:underline font-mono-code text-[11px] flex items-center gap-1 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 cursor-pointer"
              title="Customize Avatar & Callsign"
            >
              <span>CALLSIGN: {cadetProfile.callsign || 'MAYA-01'}</span> ✏️
            </button>
          </div>

          {/* Right: Role Login / Switcher & Logout Controls */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-arcade text-slate-400 uppercase mr-1 hidden md:inline">
              {currentUser ? 'ACCOUNT ROLE:' : 'SIGN IN AS:'}
            </span>

            <button
              type="button"
              onClick={() => {
                soundFx.playClick(700);
                onOpenRoleAccountModal('cadet');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                currentUser?.role === 'cadet'
                  ? 'bg-sky-500 text-slate-950 border-sky-300 shadow'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-sky-400/50'
              }`}
            >
              <span>👨‍🚀</span> Student
            </button>

            <button
              type="button"
              onClick={() => {
                soundFx.playClick(700);
                onOpenRoleAccountModal('teacher');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                currentUser?.role === 'teacher'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-emerald-400/50'
              }`}
            >
              <span>👩‍🏫</span> Teacher
            </button>

            <button
              type="button"
              onClick={() => {
                soundFx.playClick(700);
                onOpenRoleAccountModal('judge');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                currentUser?.role === 'judge'
                  ? 'bg-purple-500 text-slate-950 border-purple-300 shadow'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-purple-400/50'
              }`}
            >
              <span>⚖️</span> Judge
            </button>

            {currentUser ? (
              <button
                type="button"
                onClick={handleLogout}
                className="ml-1 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-200 text-[11px] font-bold cursor-pointer flex items-center gap-1"
                title="Sign Out & Lock Dashboard"
              >
                <span>🚪</span> Logout
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick(700);
                  onOpenRoleAccountModal('cadet');
                }}
                className="ml-1 px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-arcade font-bold cursor-pointer flex items-center gap-1 shadow"
              >
                <span>🔐</span> Login / Demo Auth
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Flight Deck Navigation Row */}
      <div className="px-4 md:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left: Brand Logo */}
          <div className="flex items-center gap-3">
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
              <div className="text-[11px] text-slate-400 font-mono-code">
                Interactive Space Physics & Mission Control
              </div>
            </div>
          </div>

          {/* Center: 5 Chunky Game + Protected Role Dashboard Navigation Tabs */}
          <nav
            className="flex flex-wrap items-center gap-1.5 bg-slate-950/90 p-1.5 rounded-2xl border border-sky-500/30"
            style={{ display: 'flex' }}
          >
            <button
              type="button"
              onClick={() => handleNav('home')}
              className={`pillar-tab px-3.5 py-2 rounded-xl text-xs font-arcade tracking-wider transition-all cursor-pointer ${
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
              className={`pillar-tab px-3.5 py-2 rounded-xl text-xs font-arcade tracking-wider transition-all cursor-pointer ${
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
              className={`pillar-tab px-3.5 py-2 rounded-xl text-xs font-arcade tracking-wider transition-all cursor-pointer ${
                currentRoute === 'simulators'
                  ? 'bg-sky-500 text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.5)] font-bold'
                  : 'text-slate-200 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              🕹️ 3. ARCADE
            </button>

            <button
              type="button"
              onClick={() => handleNav('locker')}
              className={`pillar-tab px-3.5 py-2 rounded-xl text-xs font-arcade tracking-wider transition-all cursor-pointer ${
                currentRoute === 'locker'
                  ? 'bg-sky-500 text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.5)] font-bold'
                  : 'text-slate-200 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              🏅 4. LOCKER
            </button>

            <button
              type="button"
              onClick={() => handleNav('dashboard')}
              className={`pillar-tab px-3.5 py-2 rounded-xl text-xs font-arcade tracking-wider transition-all cursor-pointer ${
                currentRoute === 'dashboard'
                  ? roleMeta.activeTabClass
                  : isAuthenticated
                  ? 'text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20'
                  : 'text-rose-300 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20'
              }`}
            >
              {roleMeta.tabLabel}
            </button>
          </nav>

          {/* Right: XP Meter & Sound Toggle */}
          <div className="flex items-center gap-2">
            <div className="bg-amber-400/10 border-2 border-amber-400/40 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-inner">
              <span className="text-amber-400 text-base font-black">⚡</span>
              <div className="text-right">
                <div className="text-[9px] font-bold text-amber-300/80 uppercase tracking-wider">SPACE XP</div>
                <div className="text-amber-400 font-mono-code font-black text-sm leading-none">
                  {spaceXp.toLocaleString()}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleSound}
              className="w-10 h-10 rounded-xl bg-slate-900 border-2 border-sky-500/40 hover:border-sky-400 flex items-center justify-center text-sky-400 hover:scale-105 transition-all text-base shadow-lg cursor-pointer"
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
