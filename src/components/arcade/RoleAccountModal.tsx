import React, { useState, useEffect } from 'react';
import type { User, UserRole } from '../../types/auth';
import { authService } from '../../utils/authService';
import { soundFx } from '../../utils/audioEffects';

interface RoleAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onAuthSuccess: (user: User | null, openDashboard?: boolean) => void;
  initialRole?: UserRole;
}

const ROLE_CONFIG: Record<
  UserRole,
  {
    label: string;
    badge: string;
    icon: string;
    accentColor: string;
    borderClass: string;
    bgClass: string;
    description: string;
    demoUser: string;
    demoPass: string;
    avatars: string[];
  }
> = {
  cadet: {
    label: 'Student Cadet',
    badge: 'JUNIOR SPACE CORPS',
    icon: '👨‍🚀',
    accentColor: '#38bdf8',
    borderClass: 'border-sky-400',
    bgClass: 'bg-sky-500/15',
    description: 'Fly interactive NASA missions, earn Space XP & collectible wings, and graduate with an official NASA diploma.',
    demoUser: 'CadetArtemis',
    demoPass: 'space2026',
    avatars: ['👨‍🚀', '👩‍🚀', '🚀', '🪐', '🌟', '🛰️'],
  },
  teacher: {
    label: 'Classroom Teacher',
    badge: 'STEM EDUCATOR COMMAND',
    icon: '👩‍🏫',
    accentColor: '#10b981',
    borderClass: 'border-emerald-400',
    bgClass: 'bg-emerald-500/15',
    description: 'Manage classroom student rosters, assign NASA simulators, track NGSS standard mastery, and export gradebooks.',
    demoUser: 'TeacherSarah',
    demoPass: 'teacher2026',
    avatars: ['👩‍🏫', '👨‍🏫', '🔬', '🔭', '📚', '🎓'],
  },
  judge: {
    label: 'NASA Judge',
    badge: 'SPACE APPS 2026 EVALUATOR',
    icon: '⚖️',
    accentColor: '#fbbf24',
    borderClass: 'border-amber-400',
    bgClass: 'bg-amber-500/15',
    description: 'Full evaluation sandbox: 1-click unlock of all 76 missions, interactive 5-criteria rubric scorecard, and NASA physics audit.',
    demoUser: 'NasaJudge2026',
    demoPass: 'judge2026',
    avatars: ['⚖️', '🏆', '🎖️', '🛸', '🌌', '⚡'],
  },
};

export const RoleAccountModal: React.FC<RoleAccountModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess,
  initialRole = 'cadet',
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentUser?.role || initialRole);
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Form fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [schoolOrOrg, setSchoolOrOrg] = useState('');
  const [judgeSpecialty, setJudgeSpecialty] = useState('Aerospace Systems & EdTech');
  const [selectedAvatar, setSelectedAvatar] = useState('👨‍🚀');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const activeRole = currentUser?.role || initialRole;
      setSelectedRole(activeRole);
      setSelectedAvatar(ROLE_CONFIG[activeRole].avatars[0]);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, currentUser, initialRole]);

  if (!isOpen) return null;

  const roleCfg = ROLE_CONFIG[selectedRole];

  const handleSelectRoleTab = (role: UserRole) => {
    soundFx.playClick(750);
    setSelectedRole(role);
    setSelectedAvatar(ROLE_CONFIG[role].avatars[0]);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleInstantDemoLogin = (role: UserRole) => {
    soundFx.playVictory();
    const demoUser = authService.quickDemoLogin(role);
    setSuccessMsg(`Logged in as ${demoUser.fullName || demoUser.username} (${ROLE_CONFIG[role].label})!`);
    onAuthSuccess(demoUser, true);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (mode === 'LOGIN') {
      const res = authService.login({ identifier, password, expectedRole: selectedRole });
      if (!res.success || !res.user) {
        soundFx.playWarningAlarm();
        setErrorMsg(res.error || 'Login failed.');
        return;
      }
      soundFx.playVictory();
      onAuthSuccess(res.user, true);
      onClose();
    } else {
      const res = authService.register({
        username: identifier,
        password,
        role: selectedRole,
        email: email || undefined,
        fullName: fullName || undefined,
        schoolOrOrg: schoolOrOrg || undefined,
        judgeSpecialty: selectedRole === 'judge' ? judgeSpecialty : undefined,
        avatar: selectedAvatar,
      });
      if (!res.success || !res.user) {
        soundFx.playWarningAlarm();
        setErrorMsg(res.error || 'Registration failed.');
        return;
      }
      soundFx.playVictory();
      onAuthSuccess(res.user, true);
      onClose();
    }
  };

  const handleLogout = () => {
    soundFx.playClick(450);
    authService.logout();
    onAuthSuccess(null, false);
    setSuccessMsg('Signed out of account.');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="cockpit-panel rounded-3xl max-w-3xl w-full relative overflow-hidden shadow-2xl border-2 border-sky-400/50 p-5 md:p-8 space-y-6 my-auto">
        <div className="hazard-stripes h-2 absolute top-0 left-0 right-0"></div>

        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 pt-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border-2 border-sky-400/40 flex items-center justify-center text-2xl shadow-lg">
              {roleCfg.icon}
            </div>
            <div>
              <span className="text-[10px] font-arcade tracking-widest text-amber-400 block">
                MULTI-ROLE ACCESS GATEWAY · NASA SPACE APPS 2026
              </span>
              <h2 className="font-space font-black text-xl md:text-2xl text-white">
                Select Account Portal: Student · Teacher · Judge
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Currently Active Session Banner */}
        {currentUser && (
          <div className="bg-slate-950/90 border-2 border-emerald-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-emerald-400 flex items-center justify-center text-2xl">
                {currentUser.avatar}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-space font-black text-white text-base">
                    {currentUser.fullName || currentUser.username}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-arcade text-[10px]">
                    {currentUser.role.toUpperCase()} ACTIVE
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono-code">
                  @{currentUser.username} · {currentUser.cadetRank} · {currentUser.schoolOrOrg || 'NASA Jr_AstroCamp'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  onAuthSuccess(currentUser, true);
                  onClose();
                }}
                className="btn-arcade-emerald px-4 py-2 rounded-xl font-arcade text-xs cursor-pointer"
              >
                Open {currentUser.role.toUpperCase()} Dashboard ▶
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-red-300 text-xs font-bold cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* 1. ROLE SELECTOR CARDS (3 ROLES) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(['cadet', 'teacher', 'judge'] as UserRole[]).map((r) => {
            const cfg = ROLE_CONFIG[r];
            const isSelected = selectedRole === r;
            return (
              <div
                key={r}
                onClick={() => handleSelectRoleTab(r)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? `${cfg.borderClass} ${cfg.bgClass} shadow-lg scale-[1.01]`
                    : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{cfg.icon}</span>
                    <span
                      className="text-[9px] font-arcade px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: `${cfg.accentColor}22`,
                        color: cfg.accentColor,
                        border: `1px solid ${cfg.accentColor}55`,
                      }}
                    >
                      {cfg.badge}
                    </span>
                  </div>
                  <h3 className="font-space font-black text-white text-base">{cfg.label}</h3>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{cfg.description}</p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInstantDemoLogin(r);
                  }}
                  className="w-full py-2 rounded-xl font-arcade text-[11px] transition-all cursor-pointer"
                  style={{
                    backgroundColor: cfg.accentColor,
                    color: '#020617',
                    fontWeight: 900,
                  }}
                >
                  ⚡ 1-Click {cfg.label} Demo ▶
                </button>
              </div>
            );
          })}
        </div>

        {/* 2. LOGIN / REGISTER FORM FOR SELECTED ROLE */}
        <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{roleCfg.icon}</span>
              <div>
                <h4 className="font-space font-black text-white text-base">
                  {roleCfg.label} Portal ({mode === 'LOGIN' ? 'Sign In' : 'Create New Account'})
                </h4>
                <p className="text-[11px] text-slate-400 font-mono-code">
                  Demo Credentials: User <strong className="text-amber-300">{roleCfg.demoUser}</strong> / Pass{' '}
                  <strong className="text-amber-300">{roleCfg.demoPass}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setErrorMsg(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  mode === 'LOGIN' ? 'bg-sky-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('REGISTER');
                  setErrorMsg(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  mode === 'REGISTER' ? 'bg-amber-400 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Register New {roleCfg.label}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold">
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
              ✅ {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono-code uppercase text-slate-400 mb-1">
                  {selectedRole === 'cadet' ? 'Cadet Callsign / Username *' : 'Username or Official Email *'}
                </label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={roleCfg.demoUser}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono-code focus:border-sky-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono-code uppercase text-slate-400 mb-1">
                  Security Password *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono-code focus:border-sky-400 outline-none"
                />
              </div>
            </div>

            {mode === 'REGISTER' && (
              <div className="space-y-4 pt-2 border-t border-slate-800/80">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono-code uppercase text-slate-400 mb-1">
                      Full Name / Display Title
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={
                        selectedRole === 'judge'
                          ? 'Dr. Elena Rostova'
                          : selectedRole === 'teacher'
                          ? 'Prof. Sarah Jenkins'
                          : 'Cadet Maya Lin'
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-sky-400 outline-none"
                    />
                  </div>

                  {(selectedRole === 'teacher' || selectedRole === 'judge') && (
                    <div>
                      <label className="block text-[11px] font-mono-code uppercase text-slate-400 mb-1">
                        Official Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={selectedRole === 'judge' ? 'evaluator@nasa.gov' : 'teacher@school.edu'}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-mono-code focus:border-sky-400 outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-mono-code uppercase text-slate-400 mb-1">
                      {selectedRole === 'judge'
                        ? 'NASA Center / Evaluation Panel'
                        : selectedRole === 'teacher'
                        ? 'School / STEM Academy Name'
                        : 'Grade / Squadron Name'}
                    </label>
                    <input
                      type="text"
                      value={schoolOrOrg}
                      onChange={(e) => setSchoolOrOrg(e.target.value)}
                      placeholder={
                        selectedRole === 'judge'
                          ? 'NASA Space Apps Global Judging Panel'
                          : selectedRole === 'teacher'
                          ? 'Horizon Middle School STEM'
                          : 'Artemis Junior Squadron'
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-sky-400 outline-none"
                    />
                  </div>

                  {selectedRole === 'judge' && (
                    <div>
                      <label className="block text-[11px] font-mono-code uppercase text-slate-400 mb-1">
                        Evaluation Specialty
                      </label>
                      <input
                        type="text"
                        value={judgeSpecialty}
                        onChange={(e) => setJudgeSpecialty(e.target.value)}
                        placeholder="Aerospace Engineering & Educational Impact"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-sky-400 outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Avatar Picker */}
                <div>
                  <label className="block text-[11px] font-mono-code uppercase text-slate-400 mb-1.5">
                    Choose Badge Avatar:
                  </label>
                  <div className="flex items-center gap-2">
                    {roleCfg.avatars.map((av) => (
                      <button
                        key={av}
                        type="button"
                        onClick={() => setSelectedAvatar(av)}
                        className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center border-2 cursor-pointer transition-all ${
                          selectedAvatar === av
                            ? 'border-amber-400 bg-amber-400/20 scale-110'
                            : 'border-slate-800 bg-slate-900'
                        }`}
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleInstantDemoLogin(selectedRole)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 text-xs font-bold cursor-pointer"
              >
                ⚡ Auto-Fill &amp; Instant Demo Login ({roleCfg.demoUser})
              </button>

              <button
                type="submit"
                className="btn-arcade-gold px-7 py-3 rounded-xl font-arcade text-xs cursor-pointer"
              >
                {mode === 'LOGIN'
                  ? `🚀 SIGN IN AS ${roleCfg.label.toUpperCase()}`
                  : `✨ REGISTER ${roleCfg.label.toUpperCase()} ACCOUNT`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RoleAccountModal;

