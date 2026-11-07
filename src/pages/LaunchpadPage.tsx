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

interface TacticalOperation {
  id: 'SHACKLETON' | 'MARS_EDL' | 'APOLLO_LANDER';
  code: string;
  seasonTag: string;
  title: string;
  highlight: string;
  coordinates: string;
  threatLevel: string;
  briefing: string;
  bgImage: string;
  useVideo?: boolean;
  primaryCta: string;
  telemetrySpecs: { label: string; value: string }[];
}

const ACTIVE_OPERATIONS: TacticalOperation[] = [
  {
    id: 'SHACKLETON',
    code: 'OP-01 // SHACKLETON BLACKOUT',
    seasonTag: 'SEASON 04 · ARTEMIS SOUTH POLE DROP ZONE',
    title: 'DEFEND SECTOR',
    highlight: 'SHACKLETON RIM',
    coordinates: '89.9° S, 0.0° E // ELEV -4.2 KM',
    threatLevel: 'CRITICAL // 354-HR LUNAR NIGHT',
    briefing:
      'Solar illumination drops to 0.0 kW across the permanently shadowed crater rim. Deploy the 10 kWe Kilopower nuclear fission core, harvest polar water ice for O₂ electrolysis, and shield the crew from incoming Solar Particle Events.',
    bgImage: '/cinematic/lunar_shackleton_base_1789760538021.jpg',
    useVideo: true,
    primaryCta: 'DEPLOY TO SHACKLETON BASE',
    telemetrySpecs: [
      { label: 'SURFACE GRAVITY', value: '1.625 m/s²' },
      { label: 'CRATER TEMP', value: '-203 °C (70 K)' },
      { label: 'FISSION OUTPUT', value: '10.0 kWe U-235' },
    ],
  },
  {
    id: 'MARS_EDL',
    code: 'OP-02 // 7 MINUTES OF TERROR',
    seasonTag: 'HYPERSONIC ENTRY · JEZERO CRATER DROP',
    title: 'SURVIVE MACH 20',
    highlight: 'SKYCRANE DROP',
    coordinates: '18.38° N, 77.58° E // JEZERO DELTA',
    threatLevel: 'EXTREME // 1,480°C PLASMA ENTRY',
    briefing:
      'Enter the thin Martian CO₂ atmosphere at 19,500 km/h. Hold the heat-shield attitude vector, trigger the 21.5m supersonic parachute inside the Mach 1.4–2.1 corridor, and winch Perseverance down on bridle cables.',
    bgImage: '/cinematic/mars_jezero.jpg',
    useVideo: false,
    primaryCta: 'INITIATE MARS EDL DROP',
    telemetrySpecs: [
      { label: 'MARS GRAVITY', value: '3.721 m/s²' },
      { label: 'CHUTE CORRIDOR', value: 'MACH 1.4 – 2.1' },
      { label: 'PEAK HEATING', value: '1,480 °C' },
    ],
  },
  {
    id: 'APOLLO_LANDER',
    code: 'OP-03 // SEA OF TRANQUILITY',
    seasonTag: 'HISTORICAL RECON · EAGLE DESCENT',
    title: 'PILOT LUNAR',
    highlight: 'MODULE EAGLE',
    coordinates: '00°40′26″ N, 23°28′22″ E // MARE TRANQUILLITATIS',
    threatLevel: 'HIGH // LOW PROPELLANT RESERVE',
    briefing:
      'Computer alarm 1202 active! Take manual attitude and throttle control of the Apollo 11 Descent Propulsion System. Counteract 1.62 m/s² lunar gravity and touch down below 2.0 m/s before propellant exhaustion.',
    bgImage: '/assets/nasa/buzz-aldrin-with-apollo-11-lunar-module.jpg',
    useVideo: false,
    primaryCta: 'LAUNCH EAGLE FLIGHT SIM',
    telemetrySpecs: [
      { label: 'DPS THRUST', value: '45.04 kN' },
      { label: 'SAFE TOUCHDOWN', value: '< 2.0 m/s' },
      { label: 'FUEL RESERVE', value: '60 SEC' },
    ],
  },
];

interface ArmoryLoadout {
  id: string;
  code: string;
  name: string;
  category: string;
  image: string;
  description: string;
  stats: { label: string; pct: number; value: string }[];
  actionLabel: string;
  targetSim: 'SHACKLETON' | 'ROVER' | 'EDL';
}

const ARMORY_LOADOUTS: ArmoryLoadout[] = [
  {
    id: 'xemu',
    code: 'RIG-01 // xEMU EVA SUIT',
    name: 'ARTEMIS xEMU SPACESUIT RIG',
    category: 'EXTRATERRESTRIAL MOBILITY UNIT',
    image: '/models/artemis_hangar_render_full.png',
    description:
      'Pressurized at 29.6 kPa (4.3 psi) pure O₂ with Portable Life Support System (PLSS) Li-ion battery arrays and rapid-cycling amine CO₂ scrubbers for 8-hour lunar crater sorties.',
    stats: [
      { label: 'THERMAL INSULATION (-203°C TO +120°C)', pct: 96, value: '96 / 100' },
      { label: 'MICROMETEOROID KEVLAR ARMOR', pct: 91, value: '91 / 100' },
      { label: 'O₂ CLOSED-LOOP ENDURANCE', pct: 88, value: '8.0 HRS' },
      { label: 'JOINT MOBILITY & TORQUE', pct: 84, value: 'GRADE-A' },
    ],
    actionLabel: 'TEST IN SHACKLETON EVA LAB',
    targetSim: 'SHACKLETON',
  },
  {
    id: 'rover-drone',
    code: 'RIG-02 // DUAL ROBOTIC RECON',
    name: 'PERSEVERANCE + INGENUITY CO-OP',
    category: 'AUTONOMOUS ASTROBIOLOGY PLATFORM',
    image: '/assets/nasa/curiosity-robot-geologist-and-chemist-in-one.jpg',
    description:
      'MMRTG plutonium-powered 1,025 kg rover paired with the 1.8 kg coaxial Ingenuity rotorcraft spinning carbon-fiber blades at 2,537 RPM in Mars’ 1% density atmosphere.',
    stats: [
      { label: 'SHERLOC UV RAMAN SPECTROMETER', pct: 98, value: '98 / 100' },
      { label: 'AERIAL LINE-OF-SIGHT RECON', pct: 94, value: '300M RANGE' },
      { label: 'MMRTG NUCLEAR POWER ENDURANCE', pct: 92, value: '14 EARTH YRS' },
      { label: 'REGOLITH CORE DRILL TORQUE', pct: 89, value: '42 TUBES' },
    ],
    actionLabel: 'DEPLOY ROVER + DRONE CO-OP',
    targetSim: 'ROVER',
  },
  {
    id: 'skycrane',
    code: 'RIG-03 // HYPERSONIC AEROSHELL',
    name: 'MARS EDL HEAT SHIELD & SKYCRANE',
    category: 'ATMOSPHERIC ENTRY DESCENT SYSTEM',
    image: '/assets/nasa/jezero-crater-on-mars-sol-31-of.png',
    description:
      'Phenolic-Impregnated Carbon Ablator (PICA) thermal shield rated to 1,480°C, 21.5m disk-gap-band supersonic parachute, and 8-hydrazine-thruster Skycrane descent stage.',
    stats: [
      { label: 'ABLATIVE PLASMA SHIELDING', pct: 99, value: '1,480 °C' },
      { label: 'SUPERSONIC CHUTE DRAG DECEL', pct: 93, value: 'MACH 1.8' },
      { label: 'RADAR TERRAIN RELATIVE NAV', pct: 95, value: 'TRN ACTIVE' },
      { label: 'BRIDLE WINCH PRECISION', pct: 90, value: '0.75 m/s' },
    ],
    actionLabel: 'LAUNCH 7-MIN EDL DROP',
    targetSim: 'EDL',
  },
];

export const LaunchpadPage: React.FC<LaunchpadPageProps> = ({
  onNavigate,
  cadetProfile,
  onOpenEnlistModal,
  onAddXp,
  onOpenComic,
}) => {
  const [selectedOpIndex, setSelectedOpIndex] = useState(0);
  const [selectedArmoryIndex, setSelectedArmoryIndex] = useState(0);
  const [quizState, setQuizState] = useState<'UNANSWERED' | 'CORRECT' | 'WRONG'>('UNANSWERED');
  const [isSurvivalModalOpen, setIsSurvivalModalOpen] = useState(false);
  const [isEDLModalOpen, setIsEDLModalOpen] = useState(false);
  const [isRoverModalOpen, setIsRoverModalOpen] = useState(false);

  const activeOp = ACTIVE_OPERATIONS[selectedOpIndex];
  const activeArmory = ARMORY_LOADOUTS[selectedArmoryIndex];

  const handleTriggerOperation = (op: TacticalOperation) => {
    triggerWarpDrive();
    soundFx.playPowerUp();
    if (op.id === 'SHACKLETON') {
      setIsSurvivalModalOpen(true);
    } else if (op.id === 'MARS_EDL') {
      setIsEDLModalOpen(true);
    } else {
      onNavigate('simulators', { sim: 'moon-lander' });
    }
  };

  const handleCapComVoice = () => {
    soundFx.playClick(900);
    speechEngine.speak(
      'Houston Tactical CapCom to Flight Operator. Shackleton Rim solar arrays are going dark. Spin up the 10 kilowatt Kilopower reactor and clear the drop zone immediately!',
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
    <div className="space-y-10 pb-16">
      {/* =====================================================================
          0. CALL OF DUTY HQ STYLE LIVE TELEMETRY & THREAT TICKER BAR
          ===================================================================== */}
      <div className="bg-[#090d16]/95 border border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono-code">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-2 text-amber-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            // NASA TACTICAL HQ · LIVE TELEMETRY
          </span>
          <span className="text-slate-400 hidden sm:inline">
            SECTOR: <strong className="text-white">SHACKLETON / JEZERO</strong>
          </span>
          <span className="text-slate-400 hidden md:inline">
            SOLAR WEATHER: <strong className="text-rose-400">KP-6 SPE WARNING</strong>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-emerald-400 font-bold">● 4 COMBAT-PHYSICS SIMULATORS ONLINE</span>
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="text-sky-400 hover:text-amber-300 font-bold uppercase tracking-wider cursor-pointer"
          >
            [ OPEN COMMAND DASHBOARD ▸ ]
          </button>
        </div>
      </div>

      {/* =====================================================================
          1. FULL-BLEED "DROP ZONE" TACTICAL HERO STAGE (CALL OF DUTY HQ LAYOUT)
          ===================================================================== */}
      <section className="cod-clip-panel overflow-hidden relative border border-amber-500/40">
        {/* Background Video / High-Contrast Key Art Layer */}
        <div className="absolute inset-0 z-0 bg-slate-950">
          {activeOp.useVideo ? (
            <video
              autoPlay
              loop
              muted
              playsInline
              poster={activeOp.bgImage}
              className="w-full h-full object-cover object-center opacity-45 scale-105"
            >
              <source src="/assets/nasa/jack-king-s-apollo-11-launch-commentary.webm" type="video/webm" />
            </video>
          ) : (
            <img
              src={activeOp.bgImage}
              alt={activeOp.title}
              className="w-full h-full object-cover object-center opacity-45 scale-105 transition-all duration-700"
            />
          )}
          {/* Tactical Vignette & Scanline Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#05070e] via-[#05070e]/85 to-[#05070e]/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05070e] via-transparent to-[#05070e]/60" />
          <div className="absolute inset-0 cod-scanlines pointer-events-none" />
        </div>

        {/* Top HUD Crosshair & Coordinate Bar inside Hero */}
        <div className="relative z-10 px-6 md:px-10 pt-5 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 text-[11px] font-mono-code text-slate-400">
          <div className="flex items-center gap-3">
            <span className="cod-tag-stamp">{activeOp.code}</span>
            <span className="hidden sm:inline text-slate-300">{activeOp.coordinates}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-rose-400 font-bold">[{activeOp.threatLevel}]</span>
            <span className="text-sky-400 hidden md:inline">+ HUD LOCK: ACTIVE</span>
          </div>
        </div>

        {/* Main Hero Grid: Left Mission Briefing + Right Operator Loadout Rig */}
        <div className="relative z-10 p-6 md:p-10 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left 8 Columns: Stencil Headline, Telemetry Specs & Chamfered Deploy CTAs */}
          <div className="lg:col-span-8 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/15 border-l-4 border-amber-400 text-amber-300 font-mono-code text-xs font-bold tracking-widest uppercase">
              {activeOp.seasonTag}
            </div>

            <h1 className="font-arcade text-3xl md:text-6xl text-white tracking-tight leading-none uppercase drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]">
              {activeOp.title}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-sky-400">
                {activeOp.highlight}
              </span>
            </h1>

            <p className="text-slate-200 text-sm md:text-base max-w-2xl leading-relaxed font-medium">
              {activeOp.briefing}
            </p>

            {/* 3 Tactical Telemetry Readout Boxes */}
            <div className="grid grid-cols-3 gap-3 max-w-xl pt-1">
              {activeOp.telemetrySpecs.map((spec) => (
                <div
                  key={spec.label}
                  className="bg-slate-950/85 border border-slate-800 border-l-2 border-l-sky-400 px-3.5 py-2.5"
                >
                  <div className="text-[10px] font-mono-code text-slate-400 uppercase">{spec.label}</div>
                  <div className="text-sm md:text-base font-mono-code font-extrabold text-white mt-0.5">
                    {spec.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Primary & Secondary Call of Duty Chamfered Action Triggers */}
            <div className="flex flex-wrap items-center gap-4 pt-3">
              <button
                type="button"
                onClick={() => handleTriggerOperation(activeOp)}
                className="cod-btn-primary px-8 py-4 text-sm md:text-base flex items-center gap-3"
              >
                <span>▶ {activeOp.primaryCta}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundFx.playPowerUp();
                  setIsEDLModalOpen(true);
                }}
                className="cod-btn-tactical px-6 py-4 text-xs md:text-sm flex items-center gap-2"
              >
                <span>🪂 MARS 7-MIN DROP</span>
              </button>

              <button
                type="button"
                onClick={handleCapComVoice}
                className="cod-btn-tactical px-5 py-4 text-xs md:text-sm flex items-center gap-2"
              >
                <span>🎙️ CAPCOM BRIEFING</span>
              </button>
            </div>

            {/* Bottom Operation Selector Tabs (Switch Active Drop Zone like COD HQ Game Switcher) */}
            <div className="pt-4 border-t border-white/10">
              <div className="text-[10px] font-mono-code text-slate-400 uppercase tracking-widest mb-2">
                // SELECT ACTIVE THEATER OPERATION:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-2xl">
                {ACTIVE_OPERATIONS.map((op, idx) => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => {
                      soundFx.playClick(750);
                      setSelectedOpIndex(idx);
                    }}
                    className={`text-left px-3.5 py-2.5 border transition-all cursor-pointer ${
                      selectedOpIndex === idx
                        ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-[10px] font-mono-code text-amber-400 font-bold">{op.code}</div>
                    <div className="font-arcade text-xs mt-0.5 truncate">
                      {op.title} {op.highlight}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right 4 Columns: Call of Duty Warzone Operator Dossier & Biometrics Card */}
          <div className="lg:col-span-4">
            <div className="cod-clip-card p-6 bg-slate-950/90 border border-sky-500/40 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <div className="text-[10px] font-mono-code text-amber-400 uppercase tracking-widest">
                    // ACTIVE OPERATOR DOSSIER
                  </div>
                  <div className="font-arcade text-base text-white">COMBAT TELEMETRY RIG</div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-mono-code text-[10px] font-bold">
                  ● READY FOR DROP
                </span>
              </div>

              {/* Operator Portrait & Callsign */}
              <div className="flex items-center gap-4 bg-slate-900/90 p-3.5 border border-slate-800">
                <div className="w-20 h-20 overflow-hidden border-2 border-amber-400 shrink-0 relative bg-slate-950">
                  <img
                    src={cadetProfile.avatar || '/cinematic/maya.jpg'}
                    alt="Operator Avatar"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-mono-code text-slate-400">CALLSIGN // ID</div>
                  <h3 className="font-arcade text-lg text-white truncate">
                    {cadetProfile.callsign || 'MAYA-01'}
                  </h3>
                  <div className="text-xs font-bold text-amber-400 truncate">
                    {cadetProfile.rank || 'ASCAN Grade 1 Pilot'}
                  </div>
                  <div className="text-[11px] font-mono-code text-sky-300 mt-0.5">
                    CLEARANCE: LEVEL 04 · 4/8 WINGS
                  </div>
                </div>
              </div>

              {/* Tactical Suit Telemetry Bars */}
              <div className="space-y-3 text-xs font-mono-code">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>PLSS O₂ PRESSURE (BVAD)</span>
                    <span className="text-emerald-400 font-bold">98.4% [NOMINAL]</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-500 to-sky-400 h-full w-[98%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>KILOPOWER GRID RESERVE</span>
                    <span className="text-amber-400 font-bold">142 / 200 kWh</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 overflow-hidden">
                    <div className="bg-gradient-to-r from-amber-500 to-orange-400 h-full w-[71%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>RADIATION DOSIMETRY SHIELD</span>
                    <span className="text-sky-400 font-bold">180 CM REGOLITH</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 overflow-hidden">
                    <div className="bg-sky-400 h-full w-[90%]" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onOpenEnlistModal}
                  className="cod-btn-tactical py-2.5 px-3 text-[11px] text-center"
                >
                  ⚙️ OPERATOR RIG
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('locker')}
                  className="cod-btn-tactical py-2.5 px-3 text-[11px] text-center"
                >
                  🏅 BADGE LOCKER
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. "SELECT DEPLOYMENT MODE" — 4 VERTICAL-SLICE TACTICAL GAME CARDS
             (Inspired by Call of Duty HQ Mode Select: Campaign / Warzone / Co-Op)
          ===================================================================== */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-3">
          <div>
            <div className="cod-tag-stamp inline-block mb-1.5">// TACTICAL SIMULATOR PLAYLIST</div>
            <h2 className="font-arcade text-2xl md:text-4xl text-white tracking-wide uppercase">
              SELECT YOUR DEPLOYMENT MODE
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('simulators')}
            className="cod-btn-tactical px-4 py-2.5 text-xs"
          >
            OPEN FULL SIMULATOR COMMAND ▸
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              code: 'MODE 01 // FLIGHT SIM',
              title: 'APOLLO 11 LUNAR TOUCHDOWN',
              subtitle: '1.62 m/s² Retro-Propulsion Physics',
              image: '/assets/nasa/buzz-aldrin-with-apollo-11-lunar-module.jpg',
              xp: '+150 XP BOUNTY',
              badgeColor: 'text-sky-300 border-sky-400/50 bg-sky-500/20',
              desc: 'Feather the Descent Propulsion System thrusters and land Eagle inside the Sea of Tranquility safe zone.',
              cta: 'DEPLOY EAGLE LANDER',
              onClick: () => {
                soundFx.playPowerUp();
                onNavigate('simulators');
              },
            },
            {
              code: 'MODE 02 // HYPERSONIC DROP',
              title: 'MARS 7 MINUTES OF TERROR',
              subtitle: 'Mach 20 Entry & Skycrane Winch',
              image: '/cinematic/mars_jezero.jpg',
              xp: '+250 XP BOUNTY',
              badgeColor: 'text-amber-300 border-amber-400/50 bg-amber-500/20',
              desc: 'Survive 1,480°C plasma heating, trigger the supersonic chute at Mach 1.8, and lower Perseverance on bridles.',
              cta: 'DEPLOY MARS EDL',
              onClick: () => {
                soundFx.playPowerUp();
                setIsEDLModalOpen(true);
              },
            },
            {
              code: 'MODE 03 // BASE DEFENSE',
              title: 'SHACKLETON 354-HR NIGHT',
              subtitle: 'Kilopower Fission & ISRU Survival',
              image: '/cinematic/lunar_shackleton_base_1789760538021.jpg',
              xp: '+300 XP BOUNTY',
              badgeColor: 'text-emerald-300 border-emerald-400/50 bg-emerald-500/20',
              desc: 'Solar arrays drop to 0 kW! Balance nuclear power, water-ice mining, and solar storm vault shielding.',
              cta: 'DEPLOY BASE DEFENSE',
              onClick: () => {
                soundFx.playReactorStart();
                setIsSurvivalModalOpen(true);
              },
            },
            {
              code: 'MODE 04 // RECON CO-OP',
              title: 'ROVER + INGENUITY DRONE',
              subtitle: 'Jezero Crater Biosignature Ops',
              image: '/assets/nasa/curiosity-robot-geologist-and-chemist-in-one.jpg',
              xp: '+250 XP BOUNTY',
              badgeColor: 'text-purple-300 border-purple-400/50 bg-purple-500/20',
              desc: 'Fly Ingenuity at 2,537 RPM to scout safe rover paths, then fire the UV Raman laser and drill core samples.',
              cta: 'DEPLOY RECON CO-OP',
              onClick: () => {
                soundFx.playPowerUp();
                setIsRoverModalOpen(true);
              },
            },
          ].map((mode) => (
            <div
              key={mode.code}
              onClick={mode.onClick}
              className="cod-clip-card group overflow-hidden flex flex-col justify-between cursor-pointer"
            >
              {/* Top Vertical Poster Image */}
              <div>
                <div className="h-52 overflow-hidden relative bg-slate-950">
                  <img
                    src={mode.image}
                    alt={mode.title}
                    className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500 brightness-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#090d16] via-transparent to-black/50" />
                  <span className="absolute top-3 left-3 font-mono-code text-[10px] font-bold px-2.5 py-1 bg-slate-950/90 text-amber-400 border-l-2 border-amber-400">
                    {mode.code}
                  </span>
                  <span
                    className={`absolute bottom-3 right-3 font-mono-code text-[10px] font-bold px-2.5 py-0.5 border ${mode.badgeColor}`}
                  >
                    {mode.xp}
                  </span>
                </div>

                {/* Card Copy */}
                <div className="p-5 space-y-2">
                  <div className="text-[11px] font-mono-code text-sky-400 font-bold uppercase">
                    {mode.subtitle}
                  </div>
                  <h3 className="font-arcade text-lg text-white leading-snug">{mode.title}</h3>
                  <p className="text-slate-300 text-xs leading-relaxed">{mode.desc}</p>
                </div>
              </div>

              {/* Bottom Deploy Bar */}
              <div className="px-5 pb-5 pt-2">
                <button
                  type="button"
                  className="cod-btn-primary w-full py-3 text-xs flex items-center justify-center gap-2"
                >
                  <span>{mode.cta}</span>
                  <span>▸</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================================
          3. "HARDWARE ARMORY & GUNSMITH" — NASA TACTICAL LOADOUT INSPECTOR
             (Modeled on Call of Duty's Weapon / Equipment Loadout Showcase)
          ===================================================================== */}
      <section className="cod-clip-panel p-6 md:p-10 border border-sky-500/30 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="cod-tag-stamp inline-block mb-1.5">// NASA ENGINEERING ARMORY</div>
            <h2 className="font-arcade text-2xl md:text-3xl text-white uppercase">
              TACTICAL HARDWARE &amp; SUIT LOADOUTS
            </h2>
          </div>

          {/* Armory Selector Tabs */}
          <div className="flex flex-wrap gap-2">
            {ARMORY_LOADOUTS.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  soundFx.playClick(720);
                  setSelectedArmoryIndex(idx);
                }}
                className={`px-4 py-2 font-mono-code text-xs font-bold border transition-all cursor-pointer ${
                  selectedArmoryIndex === idx
                    ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-lg'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-sky-400'
                }`}
              >
                {item.code}
              </button>
            ))}
          </div>
        </div>

        {/* Active Loadout Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left 6 Cols: High-Res Hardware Visual Frame */}
          <div className="lg:col-span-6 relative overflow-hidden border border-slate-800 bg-slate-950 h-72 md:h-80">
            <img
              src={activeArmory.image}
              alt={activeArmory.name}
              className="w-full h-full object-cover object-center brightness-95"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
            <div className="absolute top-3 left-3 font-mono-code text-[11px] bg-slate-950/90 text-sky-300 px-3 py-1 border border-sky-500/40">
              {activeArmory.category}
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-mono-code text-slate-300 bg-slate-950/85 px-3 py-1.5 border border-slate-800">
              <span>TELEMETRY VERIFIED // NASA-STD-3001</span>
              <span className="text-emerald-400 font-bold">STATUS: FLIGHT READY</span>
            </div>
          </div>

          {/* Right 6 Cols: Military Spec Bars & Action Trigger */}
          <div className="lg:col-span-6 space-y-5">
            <div>
              <div className="text-xs font-mono-code text-amber-400 font-bold">{activeArmory.code}</div>
              <h3 className="font-arcade text-2xl text-white mt-1">{activeArmory.name}</h3>
              <p className="text-slate-300 text-xs md:text-sm mt-2 leading-relaxed">
                {activeArmory.description}
              </p>
            </div>

            <div className="space-y-3">
              {activeArmory.stats.map((st) => (
                <div key={st.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono-code">
                    <span className="text-slate-300 font-bold">{st.label}</span>
                    <span className="text-amber-400 font-bold">{st.value}</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-900 border border-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 via-orange-400 to-sky-400"
                      style={{ width: `${st.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  soundFx.playPowerUp();
                  if (activeArmory.targetSim === 'SHACKLETON') setIsSurvivalModalOpen(true);
                  else if (activeArmory.targetSim === 'ROVER') setIsRoverModalOpen(true);
                  else setIsEDLModalOpen(true);
                }}
                className="cod-btn-primary px-6 py-3.5 text-xs"
              >
                ▶ {activeArmory.actionLabel}
              </button>
              <button
                type="button"
                onClick={() => onNavigate('academy')}
                className="cod-btn-tactical px-5 py-3.5 text-xs"
              >
                🎓 STUDY PHYSICS BLUEPRINT
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. "THE WAR ROOM" — DECLASSIFIED INTEL & GRAPHIC NOVEL DISPATCHES
             (Call of Duty Intel Briefings Grid)
          ===================================================================== */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-3">
          <div>
            <div className="cod-tag-stamp inline-block mb-1.5">// DECLASSIFIED RECON FILES</div>
            <h2 className="font-arcade text-2xl md:text-3xl text-white uppercase">
              WAR ROOM INTEL &amp; GRAPHIC NOVEL DISPATCHES
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenComic(1)}
            className="cod-btn-tactical px-4 py-2.5 text-xs"
          >
            OPEN ARCHIVE READER ▸
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              issue: 1,
              stamp: 'INTEL FILE #01',
              title: 'THE ARTEMIS LAUNCH PAD',
              desc: 'Airlock Delta-P decompression drills and escaping Earth’s 11.2 km/s gravity well.',
              cover: '/comics/covers/cover_issue_1.jpg',
              tagColor: 'bg-red-600 text-white',
            },
            {
              issue: 2,
              stamp: 'INTEL FILE #02',
              title: 'THE OXYGEN FACTORY',
              desc: 'Sabatier catalytic reactors & MOXIE solid-oxide electrolysis on lunar regolith.',
              cover: '/comics/covers/cover_issue_2.jpg',
              tagColor: 'bg-amber-500 text-slate-950',
            },
            {
              issue: 3,
              stamp: 'INTEL FILE #03',
              title: 'THE 354-HOUR DARKNESS',
              desc: 'Kilopower U-235 Stirling fission vs. cryogenic -203°C Shackleton Crater blackout.',
              cover: '/comics/covers/cover_issue_3.jpg',
              tagColor: 'bg-purple-600 text-white',
            },
            {
              issue: 4,
              stamp: 'INTEL FILE #04',
              title: 'RED DUNES OF JEZERO',
              desc: 'Perseverance & Ingenuity hunt ancient microbial biosignatures in Martian river deltas.',
              cover: '/comics/covers/cover_issue_4.jpg',
              tagColor: 'bg-sky-500 text-slate-950',
            },
          ].map((comic) => (
            <div
              key={comic.issue}
              onClick={() => onOpenComic(comic.issue)}
              className="cod-clip-card group overflow-hidden cursor-pointer flex flex-col justify-between"
            >
              <div className="h-60 overflow-hidden relative bg-slate-950">
                <img
                  src={comic.cover}
                  alt={comic.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                <span
                  className={`absolute top-3 left-3 font-arcade text-[11px] px-2.5 py-1 shadow ${comic.tagColor}`}
                >
                  {comic.stamp}
                </span>
                <span className="absolute bottom-3 right-3 bg-slate-950/90 text-amber-300 font-mono-code font-bold text-[10px] px-2 py-0.5 border border-amber-400/40">
                  DECLASSIFIED // READ
                </span>
              </div>
              <div className="p-4 space-y-1.5">
                <h4 className="font-arcade text-base text-white">{comic.title}</h4>
                <p className="text-slate-400 text-xs leading-relaxed">{comic.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================================
          5. TACTICAL EMERGENCY FIELD DISPATCH (DAILY RECON DRILL +50 XP)
          ===================================================================== */}
      <section className="cod-clip-panel p-6 md:p-8 border-2 border-amber-500/50 bg-slate-950/95">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="cod-tag-stamp">⚡ PRIORITY FLASH TRAFFIC // +50 XP BOUNTY</span>
            </div>
            <h3 className="font-arcade text-xl text-white">
              TACTICAL FIELD DRILL: MARTIAN GLOBAL DUST STORM
            </h3>
            <p className="text-slate-200 text-xs md:text-sm">
              ALERT: An opaque Martian dust storm has reduced solar array output by 85% across Jezero Base. Execute the correct engineering protocol immediately:
            </p>
          </div>

          <div className="flex flex-wrap gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleQuizChoice(true)}
              className="cod-btn-primary px-5 py-3.5 text-xs"
            >
              [ A ] ENGAGE KILOPOWER NUCLEAR FISSION CORE
            </button>
            <button
              type="button"
              onClick={() => handleQuizChoice(false)}
              className="cod-btn-tactical px-5 py-3.5 text-xs"
            >
              [ B ] OVERDRIVE ROVER TURBINES IN BLIND DUST
            </button>
          </div>
        </div>

        {quizState === 'CORRECT' && (
          <div className="mt-4 p-3.5 bg-emerald-500/20 text-emerald-300 border-l-4 border-emerald-400 text-xs md:text-sm font-mono-code font-bold flex items-center gap-2">
            <span>✓ DIRECTIVE CONFIRMED:</span>
            <span>
              Kilopower Stirling nuclear fission reactors deliver continuous 24/7 power independent of solar irradiance or dust opacity! (+50 XP CREDITED)
            </span>
          </div>
        )}

        {quizState === 'WRONG' && (
          <div className="mt-4 p-3.5 bg-rose-500/20 text-rose-300 border-l-4 border-rose-400 text-xs md:text-sm font-mono-code font-bold flex items-center gap-2">
            <span>⚠️ TACTICAL FAILURE:</span>
            <span>
              Driving in zero-visibility dust causes regolith wheel-slip and battery depletion. Switch to Kilopower nuclear generation!
            </span>
          </div>
        )}
      </section>

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
