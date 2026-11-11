import React, { useState } from 'react';
import type { AppRoute } from '../router/useAppRouter';
import { soundFx } from '../utils/audioEffects';
import { speechEngine } from '../utils/speechEngine';
import { triggerWarpDrive } from '../components/arcade/WarpBackgroundCanvas';
import type { CadetProfile } from '../components/arcade/CadetEnlistModal';
import { ShackletonSurvivalModal } from '../components/arcade/ShackletonSurvivalModal';
import { MarsEDLArcadeModal } from '../components/arcade/MarsEDLArcadeModal';
import { MarsRoverDroneModal } from '../components/arcade/MarsRoverDroneModal';

interface LaunchpadPageProps {
  onNavigate: (route: AppRoute, params?: Record<string, string>) => void;
  cadetProfile: CadetProfile;
  onOpenEnlistModal: () => void;
  onAddXp: (amount: number) => void;
  onStartBaseMission: () => void;
  onOpenComic: (issueId?: number) => void;
}

export const LaunchpadPage: React.FC<LaunchpadPageProps> = ({
  onNavigate,
  cadetProfile,
  onOpenEnlistModal,
  onAddXp,
  onStartBaseMission,
  onOpenComic,
}) => {
  const [quizState, setQuizState] = useState<'UNANSWERED' | 'CORRECT' | 'WRONG'>('UNANSWERED');
  const [isSurvivalModalOpen, setIsSurvivalModalOpen] = useState(false);
  const [isEDLModalOpen, setIsEDLModalOpen] = useState(false);
  const [isRoverModalOpen, setIsRoverModalOpen] = useState(false);

  const handleLaunchHeroMission = () => {
    triggerWarpDrive();
    soundFx.playPowerUp();
    onNavigate('simulators', { sim: 'moon-lander' });
  };

  const handleCapComVoice = () => {
    soundFx.playClick(900);
    speechEngine.speak(
      "Houston CapCom to Flight Cadet. Shackleton Base solar arrays are going dark. Deploy the Kilopower reactor and begin descent immediately. You are go for landing!",
      'HOUSTON_CAPCOM'
    );
  };

  const handleQuizChoice = (isCorrect: boolean) => {
    if (quizState !== 'UNANSWERED') return;
    if (isCorrect) {
      soundFx.playVictory();
      setQuizState('CORRECT');
      onAddXp(50);
    } else {
      soundFx.playWarningAlarm();
      setQuizState('WRONG');
    }
  };

  return (
    <div className="launchpad-page space-y-8 pb-12">

      {/* ======================================================== */}
      {/* 1. GIANT CINEMATIC HERO FLIGHT CARD */}
      {/* ======================================================== */}
      <div className="launchpad-hero cockpit-panel rounded-3xl overflow-hidden relative border-2 border-sky-400/40 shadow-2xl">
        <div className="scan-beam"></div>

        {/* Background Cinematic Image with Gradient Vignette */}
        <div className="absolute inset-0 z-0">
          <img
            src="/cinematic/lunar_shackleton.jpg"
            alt="Lunar Shackleton Base"
            className="w-full h-full object-cover object-center brightness-75 scale-105 transform hover:scale-110 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#040816] via-[#040816]/85 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#040816] via-transparent to-transparent"></div>
        </div>

        {/* Card Content Over Image */}
        <div className="launchpad-hero-content relative z-10 p-6 md:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          
          <div className="space-y-4 max-w-2xl">
            {/* Mission Status Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-mono-code font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span> MISSION SOL 04 READY
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-mono-code font-bold">
                🌑 354-HR LUNAR NIGHT IMMINENT
              </span>
            </div>

            {/* Epic Title */}
            <h1 className="text-3xl md:text-6xl font-black font-space text-white leading-tight drop-shadow-lg">
              DEFEND THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-sky-300 to-sky-400">SHACKLETON BASE</span>!
            </h1>

            {/* Mission Briefing */}
            <p className="text-slate-200 text-sm md:text-lg leading-relaxed">
              The Sun is setting behind the south polar crater rim. Solar panels will drop to 0 kW for the next 14 Earth days! Pilot the lunar lander, balance life support, and deploy the Kilopower reactor!
            </p>

            {/* Cockpit Action Buttons */}
            <div className="launchpad-hero-actions flex flex-wrap items-center gap-4 pt-3">
              <button
                type="button"
                onClick={handleLaunchHeroMission}
                className="btn-arcade-gold px-8 py-5 rounded-2xl font-arcade text-base md:text-xl flex items-center gap-3"
              >
                <span>🔥 IGNITE ENGINES &amp; LAUNCH</span>
                <span className="text-2xl">▶</span>
              </button>

              {/* Survival Mode Button */}
              <button
                type="button"
                onClick={() => {
                  soundFx.playReactorStart();
                  setIsSurvivalModalOpen(true);
                }}
                className="btn-arcade-emerald px-6 py-5 rounded-2xl font-arcade text-sm flex items-center gap-2"
              >
                <span>⚡ DEFEND BASE NIGHT (354-HR)</span>
              </button>

              {/* Voice Audio Briefing Button */}
              <button
                type="button"
                onClick={handleCapComVoice}
                className="btn-arcade-cyan px-6 py-5 rounded-2xl font-space font-black text-sm flex items-center gap-2"
              >
                <span>🎙️ CAPCOM RADIO</span>
              </button>
            </div>
          </div>

          {/* Right: Interactive Cadet Character Holo-Dossier */}
          <div className="w-full lg:w-80 bg-slate-950/80 rounded-3xl p-6 border-2 border-sky-400/40 shadow-2xl relative space-y-4 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono-code font-bold text-sky-400">CADET FLIGHT STATUS</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded">ONLINE</span>
            </div>

            {/* Character Portrait */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-lg relative bg-slate-900 flex-shrink-0">
                <img
                  src={cadetProfile.avatar || '/cinematic/maya.jpg'}
                  alt="Cadet Avatar"
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div>
                <h3 className="font-space font-black text-lg text-white">{cadetProfile.callsign || 'MAYA-01'}</h3>
                <div className="text-xs text-amber-400 font-bold">{cadetProfile.rank || 'ASCAN Grade 1 Pilot'}</div>
                <div className="text-[11px] text-slate-400 font-mono-code mt-1">Wings: 4 / 8 Badges</div>
              </div>
            </div>

            {/* Life Support Gauges (Real NASA Stoichiometry) */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs">
              <div>
                <div className="flex justify-between text-slate-300 font-bold mb-1">
                  <span>OXYGEN RESERVES (BVAD)</span>
                  <span className="text-emerald-400 font-mono-code font-bold">98.4%</span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5">
                  <div className="bg-gradient-to-r from-emerald-500 to-sky-400 h-full rounded-full w-[98%]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-300 font-bold mb-1">
                  <span>BATTERY STORAGE (LUNAR NIGHT)</span>
                  <span className="text-amber-400 font-mono-code font-bold">142 / 200 kWh</span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5">
                  <div className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full w-[71%]"></div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenEnlistModal}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-sky-300 border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Customize Spacesuit Avatar</span> ⚙️
            </button>
          </div>

        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. PLAYABLE NASA ARCADE GAMES (1-CLICK LAUNCH DECK)      */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <div className="launchpad-section-heading flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-xl font-black">🕹️</span>
              <h2 className="text-2xl md:text-3xl font-black font-space text-white">Playable NASA Arcade Simulators</h2>
              <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                4 GAMES READY
              </span>
            </div>
            <p className="text-slate-400 text-sm">Click any simulator below to launch directly into gameplay and earn Space XP!</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('simulators')}
            className="text-sky-400 hover:text-sky-300 text-sm font-bold cursor-pointer"
          >
            Open Full Arcade Hub →
          </button>
        </div>

        <div className="launchpad-games-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Game 1: Lunar Lander */}
          <div className="cockpit-panel rounded-2xl p-5 border-2 border-sky-500/40 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl">🌕</span>
                <span className="bg-sky-500/20 text-sky-300 font-mono-code font-bold text-[10px] px-2 py-0.5 rounded">+150 XP</span>
              </div>
              <h4 className="font-space font-black text-white text-base">1. Apollo 11 Touchdown</h4>
              <p className="text-slate-400 text-xs">Feather descent thrusters against 1.62 m/s² lunar gravity for a soft landing.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                soundFx.playPowerUp();
                onNavigate('simulators');
              }}
              className="btn-arcade-cyan w-full py-3 rounded-xl font-arcade text-xs cursor-pointer"
            >
              🚀 PLAY LUNAR LANDER ▶
            </button>
          </div>

          {/* Game 2: Mars 7 Minutes of Terror EDL */}
          <div className="cockpit-panel rounded-2xl p-5 border-2 border-red-500/40 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl">🔴</span>
                <span className="bg-red-500/20 text-red-300 font-mono-code font-bold text-[10px] px-2 py-0.5 rounded">+200 XP</span>
              </div>
              <h4 className="font-space font-black text-white text-base">2. Mars 7 Mins of Terror</h4>
              <p className="text-slate-400 text-xs">Balance Mach 20 heat shield, fire supersonic chute, and winch Sky Crane!</p>
            </div>
            <button
              type="button"
              onClick={() => {
                soundFx.playPowerUp();
                setIsEDLModalOpen(true);
              }}
              className="btn-arcade-gold w-full py-3 rounded-xl font-arcade text-xs cursor-pointer"
            >
              🔥 PLAY MARS EDL ▶
            </button>
          </div>

          {/* Game 3: Shackleton 354-Hr Night Survival */}
          <div className="cockpit-panel rounded-2xl p-5 border-2 border-amber-500/40 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl">🌑</span>
                <span className="bg-amber-500/20 text-amber-300 font-mono-code font-bold text-[10px] px-2 py-0.5 rounded">+150 XP</span>
              </div>
              <h4 className="font-space font-black text-white text-base">3. 354-Hr Lunar Night</h4>
              <p className="text-slate-400 text-xs">Solar drops to 0 kW! Deploy Kilopower fission &amp; Sabatier CO2 scrubbers!</p>
            </div>
            <button
              type="button"
              onClick={() => {
                soundFx.playReactorStart();
                setIsSurvivalModalOpen(true);
              }}
              className="btn-arcade-emerald w-full py-3 rounded-xl font-arcade text-xs cursor-pointer"
            >
              ⚡ PLAY SURVIVAL LAB ▶
            </button>
          </div>

          {/* Game 4: Perseverance Rover & Ingenuity Drone */}
          <div className="cockpit-panel rounded-2xl p-5 border-2 border-purple-500/40 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl">🚜</span>
                <span className="bg-purple-500/20 text-purple-300 font-mono-code font-bold text-[10px] px-2 py-0.5 rounded">+150 XP</span>
              </div>
              <h4 className="font-space font-black text-white text-base">4. Rover &amp; Mars Drone</h4>
              <p className="text-slate-400 text-xs">Manage sand wheel-slip, fire Raman laser, and spin drone blades to 2,400 RPM!</p>
            </div>
            <button
              type="button"
              onClick={() => {
                soundFx.playPowerUp();
                setIsRoverModalOpen(true);
              }}
              className="btn-arcade-cyan w-full py-3 rounded-xl font-arcade text-xs cursor-pointer"
            >
              🚁 PLAY ROVER &amp; DRONE ▶
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. GRAPHIC NOVEL COMIC ADVENTURES (EPISODES 1-4) */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <div className="launchpad-section-heading flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-xl font-black">⚡</span>
              <h2 className="text-2xl md:text-3xl font-black font-space text-white">Interactive Mission Comics</h2>
              <span className="bg-sky-500/20 text-sky-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-sky-400/30">READ &amp; PLAY</span>
            </div>
            <p className="text-slate-400 text-sm">Follow Cadet Maya &amp; Commander Dadu into high-stakes NASA emergencies!</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenComic(1)}
            className="text-sky-400 hover:text-sky-300 text-sm font-bold cursor-pointer"
          >
            Open Comic Reader →
          </button>
        </div>

        {/* Comic Cards Grid with High-Res Covers */}
        <div className="launchpad-comics-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Issue 1 */}
          <div
            onClick={() => onOpenComic(1)}
            className="comic-pop-card cockpit-panel rounded-2xl overflow-hidden border-2 border-slate-800 hover:border-sky-400 cursor-pointer"
          >
            <div className="h-64 overflow-hidden relative">
              <img
                src="/comics/covers/cover_issue_1.jpg"
                alt="Comic Issue 1"
                className="w-full h-full object-cover"
              />
              <span className="absolute top-3 left-3 bg-red-600 text-white font-arcade text-xs px-2.5 py-1 rounded shadow">ISSUE #01</span>
              <span className="absolute bottom-3 right-3 bg-slate-950/80 text-amber-300 font-mono-code font-bold text-[10px] px-2 py-0.5 rounded">FREE TO PLAY</span>
            </div>
            <div className="p-4 space-y-1">
              <h4 className="font-space font-black text-white text-base">The Artemis Launch Pad</h4>
              <p className="text-slate-400 text-xs">Airlock Delta-P and escaping Earth's gravitational well.</p>
            </div>
          </div>

          {/* Issue 2 */}
          <div
            onClick={() => onOpenComic(2)}
            className="comic-pop-card cockpit-panel rounded-2xl overflow-hidden border-2 border-slate-800 hover:border-amber-400 cursor-pointer"
          >
            <div className="h-64 overflow-hidden relative">
              <img
                src="/comics/covers/cover_issue_2.jpg"
                alt="Comic Issue 2"
                className="w-full h-full object-cover"
              />
              <span className="absolute top-3 left-3 bg-amber-500 text-slate-950 font-arcade text-xs px-2.5 py-1 rounded shadow">ISSUE #02</span>
            </div>
            <div className="p-4 space-y-1">
              <h4 className="font-space font-black text-white text-base">The Oxygen Factory</h4>
              <p className="text-slate-400 text-xs">Sabatier chemical catalytic reactions on the Moon.</p>
            </div>
          </div>

          {/* Issue 3 */}
          <div
            onClick={() => onOpenComic(3)}
            className="comic-pop-card cockpit-panel rounded-2xl overflow-hidden border-2 border-slate-800 hover:border-purple-400 cursor-pointer"
          >
            <div className="h-64 overflow-hidden relative">
              <img
                src="/comics/covers/cover_issue_3.jpg"
                alt="Comic Issue 3"
                className="w-full h-full object-cover"
              />
              <span className="absolute top-3 left-3 bg-purple-600 text-white font-arcade text-xs px-2.5 py-1 rounded shadow">ISSUE #03</span>
            </div>
            <div className="p-4 space-y-1">
              <h4 className="font-space font-black text-white text-base">The 354-Hour Darkness</h4>
              <p className="text-slate-400 text-xs">Kilopower nuclear Stirling reactors vs freezing habitats.</p>
            </div>
          </div>

          {/* Issue 4: Mars */}
          <div
            onClick={() => onOpenComic(4)}
            className="comic-pop-card cockpit-panel rounded-2xl overflow-hidden border-2 border-slate-800 hover:border-red-400 cursor-pointer"
          >
            <div className="h-64 overflow-hidden relative">
              <img
                src="/comics/covers/cover_issue_4.jpg"
                alt="Comic Issue 4"
                className="w-full h-full object-cover"
              />
              <span className="absolute top-3 left-3 bg-red-600 text-white font-arcade text-xs px-2.5 py-1 rounded shadow">ISSUE #04</span>
            </div>
            <div className="p-4 space-y-1">
              <h4 className="font-space font-black text-white text-base">Red Dunes of Jezero</h4>
              <p className="text-slate-400 text-xs">Perseverance rover drills for biosignatures in crater ice.</p>
            </div>
          </div>

        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. DAILY SPACE MYSTERY MINI-QUIZ */}
      {/* ======================================================== */}
      <div className="cockpit-panel-amber rounded-3xl p-6 border-amber-500/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-xl font-black">⚡</span>
              <h3 className="font-arcade text-lg text-white">DAILY SPACE MYSTERY (+50 XP)</h3>
            </div>
            <p className="text-slate-200 text-sm">
              Houston Emergency! A sudden Martian dust storm has reduced sunlight by 80%. What is the safest immediate action?
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleQuizChoice(true)}
              className="btn-arcade-cyan px-5 py-3 rounded-xl font-bold text-xs"
            >
              A) Switch Base to Kilopower Nuclear Reactor
            </button>
            <button
              type="button"
              onClick={() => handleQuizChoice(false)}
              className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 text-xs font-bold text-slate-300"
            >
              B) Drive Rover at Full Speed Outside
            </button>
          </div>
        </div>

        {quizState === 'CORRECT' && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-sm font-bold flex items-center gap-2 animate-bounce">
            <span>🎉</span>
            <span>CORRECT! Kilopower Stirling nuclear fission reactors provide 24/7 continuous energy during dust storms when solar output drops to zero! (+50 XP AWARDED)</span>
          </div>
        )}

        {quizState === 'WRONG' && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/20 text-red-300 border border-red-500/40 text-sm font-bold flex items-center gap-2">
            <span>⚠️</span>
            <span>DANGER! High rover speed in an opaque dust storm leads to regolith wheel-slip and battery exhaustion. Kilopower nuclear generation was the correct call!</span>
          </div>
        )}
      </div>

      {/* Mounted Interactive Simulators */}
      <ShackletonSurvivalModal
        isOpen={isSurvivalModalOpen}
        onClose={() => setIsSurvivalModalOpen(false)}
        onAddXp={onAddXp}
      />

      <MarsEDLArcadeModal
        isOpen={isEDLModalOpen}
        onClose={() => setIsEDLModalOpen(false)}
        onAddXp={onAddXp}
      />

      <MarsRoverDroneModal
        isOpen={isRoverModalOpen}
        onClose={() => setIsRoverModalOpen(false)}
        onAddXp={onAddXp}
      />

    </div>
  );
};

export default LaunchpadPage;
