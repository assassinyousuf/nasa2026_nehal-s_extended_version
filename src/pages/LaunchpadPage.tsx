import React, { useState, useEffect } from 'react';
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
  spaceXp?: number;
  completedMissions?: string[];
}

interface HeroCurriculumModule {
  id: 'SHACKLETON' | 'MARS_EDL' | 'ROVER_DRONE' | 'APOLLO_LANDER';
  moduleCode: string;
  ngssStandard: string;
  planetBadge: string;
  title: string;
  highlight: string;
  learningGoal: string;
  coreEquation: string;
  equationMeaning: string;
  bgImage: string;
  useVideo?: boolean;
  primaryCta: string;
  defaultWorld: 'MOON' | 'MARS' | 'EARTH';
}

const HERO_CURRICULUM_MODULES: HeroCurriculumModule[] = [
  {
    id: 'SHACKLETON',
    moduleCode: 'STEM MODULE 01 // LUNAR SOUTH POLE',
    ngssStandard: 'NGSS MS-ESS3-3 · Earth & Space Systems',
    planetBadge: '🌕 MOON · SHACKLETON CRATER (89.9°S)',
    title: 'MASTER CLOSED-LOOP',
    highlight: 'LUNAR LIFE SUPPORT',
    learningGoal:
      'Discover how NASA astronauts survive 354 hours of freezing lunar night (-203°C) by splitting crater water-ice into breathable O₂ and generating 10 kWe of continuous Kilopower nuclear energy.',
    coreEquation: '2H₂O (Ice) + Electrical Energy → 2H₂ + O₂ ↑',
    equationMeaning: 'ISRU Water Electrolysis: 1 liter of lunar ice yields 888 grams of breathable oxygen!',
    bgImage: '/cinematic/lunar_shackleton_base_1789760538021.jpg',
    useVideo: true,
    primaryCta: 'LAUNCH SHACKLETON SCIENCE LAB',
    defaultWorld: 'MOON',
  },
  {
    id: 'MARS_EDL',
    moduleCode: 'STEM MODULE 02 // ATMOSPHERIC PHYSICS',
    ngssStandard: 'NGSS MS-PS2-2 · Forces, Drag & Motion',
    planetBadge: '🔴 MARS · JEZERO CRATER DELTA (18.4°N)',
    title: 'CONQUER THE 7 MINUTES',
    highlight: 'OF MARS ENTRY PHYSICS',
    learningGoal:
      'Why can’t a parachute alone land a rover on Mars? Explore how Mars’ thin CO₂ atmosphere (only 1% of Earth’s density) requires a 1,480°C heat shield, a Mach 1.8 chute, and a rocket-powered Skycrane.',
    coreEquation: 'F_drag = ½ · ρ · v² · C_d · A',
    equationMeaning: 'Aerodynamic Drag: Atmospheric friction converts 90% of hypersonic kinetic energy into heat!',
    bgImage: '/cinematic/mars_jezero.jpg',
    useVideo: false,
    primaryCta: 'LAUNCH MARS EDL FLIGHT LAB',
    defaultWorld: 'MARS',
  },
  {
    id: 'ROVER_DRONE',
    moduleCode: 'STEM MODULE 03 // ASTROBIOLOGY & ROBOTICS',
    ngssStandard: 'NGSS MS-ETS1-2 · Engineering Design',
    planetBadge: '🚁 MARS · ANCIENT LAKEBED RECON',
    title: 'PILOT PERSEVERANCE &',
    highlight: 'INGENUITY HELICOPTER',
    learningGoal:
      'Learn how Ingenuity spins carbon-fiber rotors at 2,537 RPM (5× faster than Earth helicopters) to generate lift in thin Martian air and scout ancient river deltas for microbial biosignatures.',
    coreEquation: 'L = ½ · ρ · (ω · R)² · C_L · A_rotor',
    equationMeaning: 'Rotor Lift Law: Because Mars ρ is tiny, blade tip speed (ω·R) must approach Mach 0.7!',
    bgImage: '/assets/nasa/curiosity-robot-geologist-and-chemist-in-one.jpg',
    useVideo: false,
    primaryCta: 'LAUNCH ROVER + DRONE CO-OP',
    defaultWorld: 'MARS',
  },
  {
    id: 'APOLLO_LANDER',
    moduleCode: 'STEM MODULE 04 // GRAVITY & THRUST',
    ngssStandard: 'NGSS MS-PS2-1 · Newton’s Third Law',
    planetBadge: '🦅 MOON · SEA OF TRANQUILITY',
    title: 'PILOT THE APOLLO 11',
    highlight: 'LUNAR MODULE EAGLE',
    learningGoal:
      'With zero air on the Moon, wings and parachutes do nothing. Master Newton’s 3rd Law by firing rocket exhaust downward to counteract 1.62 m/s² lunar gravity for a soft touchdown.',
    coreEquation: 'a_net = (F_thrust / m) - g_moon',
    equationMeaning: 'Vertical Descent Law: When Thrust > Weight (m · 1.62), your downward speed slows down!',
    bgImage: '/assets/nasa/buzz-aldrin-with-apollo-11-lunar-module.jpg',
    useVideo: false,
    primaryCta: 'LAUNCH APOLLO 11 LANDER',
    defaultWorld: 'MOON',
  },
];

const PLANETARY_PHYSICS_DATA = {
  EARTH: {
    name: 'Earth (KSC Launchpad)',
    icon: '🌍',
    gravity: 9.81,
    atmDensity: '1.225 kg/m³ (100% Thick N₂/O₂)',
    chuteEffectiveness: '100% (Parachutes work great!)',
    color: 'text-sky-300 border-sky-400 bg-sky-500/20',
    lesson:
      'On Earth, strong gravity (9.81 m/s²) pulls heavy spacecraft down fast, but thick air allows parachutes to slow capsules safely.',
  },
  MARS: {
    name: 'Mars (Jezero Crater)',
    icon: '🔴',
    gravity: 3.72,
    atmDensity: '0.020 kg/m³ (1% Thin CO₂)',
    chuteEffectiveness: '18% (Needs Supersonic Chute + Skycrane!)',
    color: 'text-amber-300 border-amber-400 bg-amber-500/20',
    lesson:
      'Mars has 38% of Earth’s gravity, but its air is 99% thinner—so a parachute alone still hits the ground at 320 km/h without Skycrane rockets!',
  },
  MOON: {
    name: 'Moon (Shackleton Rim)',
    icon: '🌕',
    gravity: 1.62,
    atmDensity: '0.000 kg/m³ (Hard Vacuum)',
    chuteEffectiveness: '0% (Parachutes fail in vacuum—100% Rocket Thrust!)',
    color: 'text-indigo-300 border-indigo-400 bg-indigo-500/20',
    lesson:
      'The Moon has 1/6th of Earth’s gravity and ZERO atmosphere. Every landing requires 100% retro-rocket propulsion!',
  },
};

const LIVE_SCIENCE_DISCOVERIES = [
  '🔬 NASA MOXIE Fact: Perseverance generated 122 grams of pure breathable O₂ directly from Mars’ CO₂ atmosphere!',
  '🌕 Artemis Fact: Shackleton Crater rims receive near-continuous sunlight while the crater floor holds billions of tons of water ice at -203°C.',
  '🚁 Ingenuity Fact: To fly in Mars’ 1% atmosphere, Ingenuity’s blades spin at 2,537 RPM—5 times faster than a helicopter on Earth!',
  '⚛️ Kilopower Fact: A Uranium-235 core the size of a paper towel roll can power a lunar habitat for 10+ years without sunlight.',
];

interface StemSystemCutaway {
  id: string;
  badge: string;
  title: string;
  discipline: string;
  formula: string;
  image: string;
  normalExplanation: string;
  whatIfQuestion: string;
  whatIfOutcome: string;
  simTarget: 'SHACKLETON' | 'ROVER' | 'EDL';
  ctaLabel: string;
}

const STEM_SYSTEM_CUTAWAYS: StemSystemCutaway[] = [
  {
    id: 'moxie-isru',
    badge: 'CHEMISTRY LAB // ISRU',
    title: 'WATER-ICE ELECTROLYSIS & MOXIE O₂ GENERATOR',
    discipline: 'Chemical Stoichiometry & Life Support',
    formula: '2H₂O(l) → 2H₂(g) + O₂(g)  |  2CO₂ → 2CO + O₂',
    image: '/models/artemis_hangar_render_full.png',
    normalExplanation:
      'Shipping oxygen from Earth costs over $100,000 per kilogram. By mining polar water ice on the Moon or heating Martian CO₂ to 800°C in a solid-oxide electrolysis cell, astronauts manufacture fresh O₂ and rocket fuel on-site!',
    whatIfQuestion: '🧪 Test Hypothesis: What happens if Ice-Miner power drops below 30% during Lunar Night?',
    whatIfOutcome:
      '⚡ Electrolysis halts! Without fresh H₂O splitting, habitat O₂ drops by 6% per Sol as astronauts exhale CO₂. You must activate the Kilopower nuclear reactor to keep the electrolyzer running!',
    simTarget: 'SHACKLETON',
    ctaLabel: 'PRACTICE IN SHACKLETON LAB',
  },
  {
    id: 'ingenuity-aero',
    badge: 'AERODYNAMICS LAB // ROTORCRAFT',
    title: 'INGENUITY COAXIAL ROTOR & RAMAN LASER',
    discipline: 'Fluid Dynamics & UV Spectroscopy',
    formula: 'Lift = ½ · ρ_mars · v_tip² · C_L · A',
    image: '/assets/nasa/curiosity-robot-geologist-and-chemist-in-one.jpg',
    normalExplanation:
      'Because Martian air density (ρ = 0.020 kg/m³) is 1/100th of Earth’s, Ingenuity uses ultra-light 1.2m carbon-fiber blades spinning in opposite directions at 2,537 RPM while Perseverance uses a UV Raman laser to detect organic carbon bonds.',
    whatIfQuestion: '🧪 Test Hypothesis: What if Ingenuity spins its blades above 2,900 RPM on Mars?',
    whatIfOutcome:
      '⚠️ Supersonic Blade Stall! In cold CO₂, the speed of sound is only 240 m/s. Above 2,800 RPM, the blade tips break the sound barrier, creating shockwaves that destroy lift and drain the battery!',
    simTarget: 'ROVER',
    ctaLabel: 'FLY INGENUITY & ROVER LAB',
  },
  {
    id: 'edl-skycrane',
    badge: 'THERMODYNAMICS LAB // EDL',
    title: 'PICA HEAT SHIELD & SUPERSONIC PARACHUTE',
    discipline: 'Kinetic Energy, Mach Number & Retro-Thrust',
    formula: 'KE = ½ · m · v²  (v_entry = 5,400 m/s)',
    image: '/assets/nasa/jezero-crater-on-mars-sol-31-of.png',
    normalExplanation:
      'Entering Mars at Mach 20.4 carries over 14 billion Joules of kinetic energy. The heat shield absorbs 90% of the energy at 1,480°C, the parachute deploys between Mach 1.4 and 2.1, and the Skycrane winches the rover down.',
    whatIfQuestion: '🧪 Test Hypothesis: What if the parachute deploys too early at Mach 3.2?',
    whatIfOutcome:
      '💥 Canopy Shredding! Dynamic pressure (q = ½·ρ·v²) scales with velocity squared. At Mach 3.2, aerodynamic shock forces exceed 290,000 Newtons and rip the nylon-kevlar canopy apart!',
    simTarget: 'EDL',
    ctaLabel: 'TEST MARS EDL CORRIDOR',
  },
];

interface QuizQuestion {
  id: number;
  standard: string;
  question: string;
  options: { label: string; isCorrect: boolean }[];
  explanation: string;
}

const DYNAMIC_QUIZ_DECK: QuizQuestion[] = [
  {
    id: 1,
    standard: 'NGSS MS-ESS3-3 · Energy Systems',
    question:
      'A Martian global dust storm blocks 85% of sunlight over Jezero Base for 3 weeks. Which power system keeps the crew alive?',
    options: [
      { label: 'A) Kilopower Uranium-235 Stirling Fission Reactor', isCorrect: true },
      { label: 'B) Deploy extra solar panels in the dark dust storm', isCorrect: false },
      { label: 'C) Burn astronauts’ breathing oxygen for heat', isCorrect: false },
    ],
    explanation:
      'Correct! NASA’s Kilopower nuclear fission reactor generates continuous 10 kWe electrical power day and night, completely unaffected by dust storms or the 354-hour lunar night.',
  },
  {
    id: 2,
    standard: 'NGSS MS-PS2-2 · Forces & Motion',
    question:
      'Why can’t the Apollo Lunar Module use a parachute to slow down when landing on the Moon?',
    options: [
      { label: 'A) The Moon’s gravity is too strong for nylon', isCorrect: false },
      { label: 'B) The Moon is a vacuum with zero air molecules to create drag', isCorrect: true },
      { label: 'C) Solar wind blows parachutes upward', isCorrect: false },
    ],
    explanation:
      'Spot on! Aerodynamic drag (F = ½·ρ·v²·Cd·A) requires atmospheric density (ρ). Because ρ = 0 on the Moon, spacecraft must use 100% retro-rocket thrust!',
  },
  {
    id: 3,
    standard: 'NGSS MS-PS1-2 · Chemical Reactions',
    question:
      'When astronauts mine water ice (H₂O) inside Shackleton Crater and apply electricity (electrolysis), what two gases are produced?',
    options: [
      { label: 'A) Hydrogen (H₂) fuel and breathable Oxygen (O₂)', isCorrect: true },
      { label: 'B) Carbon Dioxide (CO₂) and Nitrogen (N₂)', isCorrect: false },
      { label: 'C) Helium and Methane', isCorrect: false },
    ],
    explanation:
      'Exactly right! 2H₂O → 2H₂ + O₂. Water ice provides both breathable oxygen for the crew and liquid hydrogen/oxygen rocket propellant!',
  },
  {
    id: 4,
    standard: 'NGSS MS-ETS1-2 · Aerospace Engineering',
    question:
      'During Mars EDL ("7 Minutes of Terror"), why does the Skycrane lower Perseverance on 7.6-meter cables instead of landing with rockets right on the ground?',
    options: [
      { label: 'A) To prevent rocket exhaust from blasting a crater and blinding sensors with dust', isCorrect: true },
      { label: 'B) Because Mars has water on the surface', isCorrect: false },
      { label: 'C) To save the parachute for a second flight', isCorrect: false },
    ],
    explanation:
      'Correct! Firing descent engines right at the surface kicks up high-velocity rocks and dust clouds that could damage the rover’s cameras and instruments.',
  },
];

export const LaunchpadPage: React.FC<LaunchpadPageProps> = ({
  onNavigate,
  cadetProfile,
  onOpenEnlistModal,
  onAddXp,
  onOpenComic,
  spaceXp = 1250,
  completedMissions = [],
}) => {
  // 1. Dynamic Hero Carousel & Auto-Advance State
  const [heroIndex, setHeroIndex] = useState(0);
  const [isHeroAutoPlay, setIsHeroAutoPlay] = useState(true);

  // 2. Interactive Planetary Physics Mini-Lab State (inside Hero)
  const [selectedWorld, setSelectedWorld] = useState<'EARTH' | 'MARS' | 'MOON'>('MOON');
  const [craftMassKg, setCraftMassKg] = useState<number>(1025); // Perseverance mass default

  // 3. Live Clock & Rotating Discovery Ticker State
  const [utcTimeStr, setUtcTimeStr] = useState<string>(() => new Date().toISOString().slice(11, 19));
  const [discoveryIdx, setDiscoveryIdx] = useState(0);

  // 4. Dynamic Simulator Filter & Difficulty Mode State
  const [simFilter, setSimFilter] = useState<'ALL' | 'PHYSICS' | 'ROBOTICS' | 'SYSTEMS'>('ALL');
  const [simDifficulty, setSimDifficulty] = useState<'CADET' | 'COMMANDER'>('CADET');

  // 5. Interactive STEM Cutaway & "What-If" Toggle State
  const [cutawayIdx, setCutawayIdx] = useState(0);
  const [showWhatIfAnswer, setShowWhatIfAnswer] = useState(false);

  // 6. Dynamic Multi-Question Quiz State
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [quizStreak, setQuizStreak] = useState(0);

  // 7. Embedded Simulator Modals
  const [isSurvivalModalOpen, setIsSurvivalModalOpen] = useState(false);
  const [isEDLModalOpen, setIsEDLModalOpen] = useState(false);
  const [isRoverModalOpen, setIsRoverModalOpen] = useState(false);

  const activeHero = HERO_CURRICULUM_MODULES[heroIndex];
  const worldPhysics = PLANETARY_PHYSICS_DATA[selectedWorld];
  const weightNewtons = Math.round(craftMassKg * worldPhysics.gravity);
  const hoverThrustKn = ((weightNewtons * 1.15) / 1000).toFixed(2);
  const activeCutaway = STEM_SYSTEM_CUTAWAYS[cutawayIdx];
  const currentQuiz = DYNAMIC_QUIZ_DECK[quizIndex];

  // Live UTC Clock & Discovery Ticker
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setUtcTimeStr(new Date().toISOString().slice(11, 19));
    }, 1000);
    const factTimer = setInterval(() => {
      setDiscoveryIdx((prev) => (prev + 1) % LIVE_SCIENCE_DISCOVERIES.length);
    }, 7500);
    return () => {
      clearInterval(clockTimer);
      clearInterval(factTimer);
    };
  }, []);

  // Auto-advance Hero Curriculum Showcase every 9 seconds unless paused
  useEffect(() => {
    if (!isHeroAutoPlay) return;
    const timer = setInterval(() => {
      setHeroIndex((prev) => {
        const next = (prev + 1) % HERO_CURRICULUM_MODULES.length;
        setSelectedWorld(HERO_CURRICULUM_MODULES[next].defaultWorld);
        return next;
      });
    }, 9000);
    return () => clearInterval(timer);
  }, [isHeroAutoPlay]);

  const handleSelectHeroModule = (idx: number) => {
    soundFx.playClick(750);
    setHeroIndex(idx);
    setSelectedWorld(HERO_CURRICULUM_MODULES[idx].defaultWorld);
    setIsHeroAutoPlay(false);
  };

  const handleLaunchHeroModule = (mod: HeroCurriculumModule) => {
    triggerWarpDrive();
    soundFx.playPowerUp();
    if (mod.id === 'SHACKLETON') setIsSurvivalModalOpen(true);
    else if (mod.id === 'MARS_EDL') setIsEDLModalOpen(true);
    else if (mod.id === 'ROVER_DRONE') setIsRoverModalOpen(true);
    else onNavigate('simulators', { sim: 'moon-lander' });
  };

  const handleCapComVoice = () => {
    soundFx.playClick(900);
    speechEngine.speak(
      `Welcome to NASA STEM Mission Control, Cadet ${cadetProfile.callsign || 'Maya'}. Select a planetary gravity model or launch your interactive flight lab to earn Space XP!`,
      'HOUSTON_CAPCOM'
    );
  };

  const handleAnswerQuiz = (optIndex: number, isCorrect: boolean) => {
    if (selectedOptionIdx !== null) return;
    setSelectedOptionIdx(optIndex);
    if (isCorrect) {
      soundFx.playVictory();
      setQuizStreak((s) => s + 1);
      onAddXp(50);
    } else {
      soundFx.playWarningAlarm();
      setQuizStreak(0);
    }
  };

  const handleNextQuizQuestion = () => {
    soundFx.playClick(720);
    setSelectedOptionIdx(null);
    setQuizIndex((prev) => (prev + 1) % DYNAMIC_QUIZ_DECK.length);
  };

  const simulatorCards = [
    {
      id: 'apollo',
      category: 'PHYSICS' as const,
      code: 'LAB 01 // GRAVITY & THRUST',
      ngss: 'NGSS MS-PS2-1',
      title: 'Apollo 11 Lunar Lander',
      equation: 'a = (F_thrust / m) - 1.62 m/s²',
      image: '/assets/nasa/buzz-aldrin-with-apollo-11-lunar-module.jpg',
      xp: simDifficulty === 'CADET' ? 150 : 300,
      accent: 'border-sky-400/50 text-sky-300 bg-sky-500/20',
      desc:
        simDifficulty === 'CADET'
          ? 'Guided Flight: Learn how retro-rockets slow Eagle down in a zero-air vacuum and touch down under 2.5 m/s.'
          : 'Commander Challenge: Strict 60s fuel budget + crosswind drift vector. Touch down under 1.5 m/s on the crater pad!',
      cta: '🚀 LAUNCH APOLLO LAB',
      onLaunch: () => {
        soundFx.playPowerUp();
        onNavigate('simulators');
      },
    },
    {
      id: 'mars-edl',
      category: 'PHYSICS' as const,
      code: 'LAB 02 // AERODYNAMIC DRAG',
      ngss: 'NGSS MS-PS2-2',
      title: 'Mars 7 Minutes of Terror',
      equation: 'F_drag = ½ · ρ · v² · C_d · A',
      image: '/cinematic/mars_jezero.jpg',
      xp: simDifficulty === 'CADET' ? 200 : 350,
      accent: 'border-amber-400/50 text-amber-300 bg-amber-500/20',
      desc:
        simDifficulty === 'CADET'
          ? 'Guided Entry: Keep the 1,480°C heat shield aligned, pop the supersonic chute at Mach 1.8, and winch Skycrane.'
          : 'Commander Challenge: Narrow Mach 1.6–1.9 chute corridor + high thermal shear in Jezero Crater!',
      cta: '🪂 LAUNCH MARS EDL LAB',
      onLaunch: () => {
        soundFx.playPowerUp();
        setIsEDLModalOpen(true);
      },
    },
    {
      id: 'shackleton',
      category: 'SYSTEMS' as const,
      code: 'LAB 03 // CLOSED-LOOP HABITAT',
      ngss: 'NGSS MS-ESS3-3',
      title: 'Shackleton 354-Hr Lunar Night',
      equation: '2H₂O + kWe → 2H₂ + O₂ ↑',
      image: '/cinematic/lunar_shackleton_base_1789760538021.jpg',
      xp: simDifficulty === 'CADET' ? 250 : 400,
      accent: 'border-emerald-400/50 text-emerald-300 bg-emerald-500/20',
      desc:
        simDifficulty === 'CADET'
          ? 'Guided Survival: Balance Kilopower nuclear power, polar ice mining, and radiation shields over 6 lunar sols.'
          : 'Commander Challenge: Severe Solar Particle Event (SPE) + high habitat thermal drain at -203°C!',
      cta: '🌙 LAUNCH SHACKLETON LAB',
      onLaunch: () => {
        soundFx.playReactorStart();
        setIsSurvivalModalOpen(true);
      },
    },
    {
      id: 'rover-drone',
      category: 'ROBOTICS' as const,
      code: 'LAB 04 // AUTONOMOUS RECON',
      ngss: 'NGSS MS-ETS1-2',
      title: 'Perseverance + Ingenuity Co-Op',
      equation: 'ω = 2,537 RPM in 1% CO₂ Air',
      image: '/assets/nasa/curiosity-robot-geologist-and-chemist-in-one.jpg',
      xp: simDifficulty === 'CADET' ? 200 : 350,
      accent: 'border-indigo-400/50 text-indigo-300 bg-indigo-500/20',
      desc:
        simDifficulty === 'CADET'
          ? 'Guided Co-Op: Fly Ingenuity to reveal hidden biosignatures, then drive Perseverance to drill 4 core samples.'
          : 'Commander Challenge: Strict MMRTG & drone battery limits across hazardous Jezero boulder fields!',
      cta: '🚁 LAUNCH ROVER + DRONE',
      onLaunch: () => {
        soundFx.playPowerUp();
        setIsRoverModalOpen(true);
      },
    },
  ];

  const visibleSimulators =
    simFilter === 'ALL' ? simulatorCards : simulatorCards.filter((s) => s.category === simFilter);

  return (
    <div className="space-y-10 pb-16">
      {/* =====================================================================
          0. DYNAMIC NASA STEM OBSERVATORY & LIVE SCIENCE DISCOVERY BAR
          ===================================================================== */}
      <div className="edu-bento-card px-4 md:px-6 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border border-sky-400/40 bg-gradient-to-r from-[#071536]/95 via-[#0a1d48]/95 to-[#071536]/95">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/50 text-sky-300 font-mono-code font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            NASA LIVE TELEMETRY · {utcTimeStr} UTC
          </span>
          <button
            type="button"
            onClick={() => {
              soundFx.playClick(700);
              setDiscoveryIdx((prev) => (prev + 1) % LIVE_SCIENCE_DISCOVERIES.length);
            }}
            className="text-left text-slate-200 hover:text-amber-300 transition-colors font-medium cursor-pointer"
            title="Click for next NASA Science Fact"
          >
            {LIVE_SCIENCE_DISCOVERIES[discoveryIdx]}{' '}
            <span className="text-sky-400 font-mono-code text-[11px] underline ml-1">[Next Fact ↻]</span>
          </button>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-xs font-mono-code">
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-400/40 text-amber-300 font-bold">
            ⚡ {spaceXp.toLocaleString()} XP
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 font-bold">
            🎖️ {Math.max(4, completedMissions.length)} MISSIONS READY
          </span>
        </div>
      </div>

      {/* =====================================================================
          1. REDESIGNED DYNAMIC EDUCATIONAL HERO SECTION
             Combines high-clarity NASA visuals + 4-Module Curriculum Switcher
             + Live Interactive Planetary Gravity & Thrust Sandbox!
          ===================================================================== */}
      <section className="edu-hero-shell overflow-hidden relative">
        {/* Bright, Crisp Color-Graded NASA Key Art / Video Backdrop */}
        <div className="absolute inset-0 z-0">
          {activeHero.useVideo ? (
            <video
              autoPlay
              loop
              muted
              playsInline
              poster={activeHero.bgImage}
              className="w-full h-full object-cover object-center opacity-55 brightness-110 saturate-125 scale-105"
            >
              <source src="/assets/nasa/jack-king-s-apollo-11-launch-commentary.webm" type="video/webm" />
            </video>
          ) : (
            <img
              src={activeHero.bgImage}
              alt={activeHero.title}
              className="w-full h-full object-cover object-center opacity-55 brightness-110 saturate-125 scale-105 transition-all duration-700"
            />
          )}
          {/* Luminous Cosmic Sapphire & Indigo Educational Color Grading */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(95deg, rgba(6, 15, 38, 0.94) 0%, rgba(10, 25, 62, 0.82) 55%, rgba(12, 32, 78, 0.55) 100%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 85% 20%, rgba(56, 189, 248, 0.22) 0%, rgba(99, 102, 241, 0.12) 40%, transparent 70%)',
            }}
          />
        </div>

        {/* Top Curriculum Status & Module Switcher Bar */}
        <div className="relative z-10 px-6 md:px-10 pt-6 pb-4 border-b border-sky-400/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="edu-pill-tag">{activeHero.moduleCode}</span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-mono-code text-xs font-bold">
              ✓ {activeHero.ngssStandard}
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono-code text-xs font-bold">
              {activeHero.planetBadge}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsHeroAutoPlay((p) => !p)}
              className="px-3 py-1 rounded-lg bg-slate-900/80 border border-sky-400/30 text-sky-300 font-mono-code text-[11px] hover:border-sky-400 cursor-pointer"
            >
              {isHeroAutoPlay ? '⏸ PAUSE ROTATION' : '▶ AUTO-ROTATE MODULES'}
            </button>
            <button
              type="button"
              onClick={handleCapComVoice}
              className="px-3 py-1 rounded-lg bg-sky-500/20 border border-sky-400/50 text-white font-mono-code text-[11px] font-bold hover:bg-sky-500/30 cursor-pointer"
            >
              🎙️ AUDIO BRIEFING
            </button>
          </div>
        </div>

        {/* Main Hero Content Grid: Left Lesson & Formula + Right Interactive Gravity Sandbox */}
        <div className="relative z-10 p-6 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left 7 Columns: Dynamic STEM Curriculum Headline, Formula & Launch Buttons */}
          <div className="lg:col-span-7 space-y-5">
            <h1 className="font-arcade text-3xl md:text-5xl lg:text-6xl text-white leading-none tracking-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
              {activeHero.title}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-amber-300 to-emerald-300">
                {activeHero.highlight}
              </span>
            </h1>

            <p className="text-slate-100 text-sm md:text-base leading-relaxed max-w-2xl font-medium">
              {activeHero.learningGoal}
            </p>

            {/* Highlighted NASA Physics / Chemistry Formula Callout Box */}
            <div className="p-4 rounded-2xl bg-[#071330]/90 border-2 border-sky-400/40 max-w-xl shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-arcade text-sky-300 uppercase tracking-wider">
                  📐 CORE NASA SCIENCE FORMULA YOU WILL MASTER:
                </span>
                <span className="text-[11px] font-mono-code text-amber-300 font-bold">
                  INTERACTIVE TELEMETRY
                </span>
              </div>
              <div className="font-mono-code text-lg md:text-xl font-extrabold text-amber-300 tracking-wide">
                {activeHero.coreEquation}
              </div>
              <p className="text-xs text-slate-300 mt-1">{activeHero.equationMeaning}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                type="button"
                onClick={() => handleLaunchHeroModule(activeHero)}
                className="edu-btn-primary px-7 py-4 text-sm md:text-base flex items-center gap-2.5"
              >
                <span>🚀 {activeHero.primaryCta}</span>
                <span>▸</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('academy')}
                className="edu-btn-cyan px-5 py-4 text-xs md:text-sm flex items-center gap-2"
              >
                <span>🎓 4-STEP ACADEMY TRAIL</span>
              </button>

              <button
                type="button"
                onClick={onOpenEnlistModal}
                className="edu-btn-cyan px-4 py-4 text-xs md:text-sm flex items-center gap-2"
              >
                <span>👨‍🚀 {cadetProfile.callsign || 'MAYA-01'}</span>
              </button>
            </div>

            {/* 4-Module Interactive Selector Strip */}
            <div className="pt-4">
              <div className="text-[11px] font-arcade text-sky-300 uppercase tracking-wider mb-2.5">
                ⚡ SWITCH ACTIVE NASA CURRICULUM MODULE ({heroIndex + 1} OF 4):
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {HERO_CURRICULUM_MODULES.map((mod, idx) => (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => handleSelectHeroModule(idx)}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                      heroIndex === idx
                        ? 'bg-sky-500/25 border-sky-300 text-white shadow-[0_0_20px_rgba(56,189,248,0.35)]'
                        : 'bg-[#081533]/80 border-slate-700/80 text-slate-300 hover:border-sky-400/50'
                    }`}
                  >
                    <div className="text-[10px] font-mono-code font-bold text-amber-300">
                      0{idx + 1} · {mod.id.replace('_', ' ')}
                    </div>
                    <div className="font-arcade text-xs text-white mt-0.5 truncate">{mod.highlight}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right 5 Columns: LIVE INTERACTIVE PLANETARY GRAVITY & THRUST SANDBOX */}
          <div className="lg:col-span-5">
            <div className="edu-bento-card p-6 border-2 border-sky-400/50 bg-[#07122c]/95 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-arcade text-amber-400 uppercase tracking-wider">
                    🧪 LIVE INTERACTIVE PHYSICS SANDBOX
                  </span>
                  <h3 className="font-arcade text-base md:text-lg text-white">
                    PLANETARY GRAVITY &amp; THRUST CALCULATOR
                  </h3>
                </div>
                <span className="text-2xl">{worldPhysics.icon}</span>
              </div>

              {/* Step 1: Select Planet */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-sky-300 mb-1.5">
                  1. Compare Gravity &amp; Atmosphere Across Worlds:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['EARTH', 'MARS', 'MOON'] as const).map((worldKey) => {
                    const w = PLANETARY_PHYSICS_DATA[worldKey];
                    return (
                      <button
                        key={worldKey}
                        type="button"
                        onClick={() => {
                          soundFx.playClick(760);
                          setSelectedWorld(worldKey);
                        }}
                        className={`py-2 px-2 rounded-xl font-arcade text-xs border transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                          selectedWorld === worldKey
                            ? 'bg-sky-500 text-slate-950 border-white font-bold shadow-lg'
                            : 'bg-slate-900/90 text-slate-200 border-slate-700 hover:border-sky-400'
                        }`}
                      >
                        <span>
                          {w.icon} {worldKey}
                        </span>
                        <span className="text-[10px] font-mono-code opacity-90">{w.gravity} m/s²</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Interactive Spacecraft Mass Slider */}
              <div className="bg-slate-950/90 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-300">2. Spacecraft Mass (m):</span>
                  <span className="font-mono-code font-bold text-amber-300">
                    {craftMassKg.toLocaleString()} kg{' '}
                    {craftMassKg === 1025 ? '(Perseverance)' : craftMassKg > 3000 ? '(Apollo LM)' : '(Lander)'}
                  </span>
                </div>
                <input
                  type="range"
                  min={400}
                  max={4500}
                  step={25}
                  value={craftMassKg}
                  onChange={(e) => setCraftMassKg(Number(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono-code text-slate-400">
                  <span>400 kg (Mini Probe)</span>
                  <span>1,025 kg (Rover)</span>
                  <span>4,500 kg (Crewed Lander)</span>
                </div>
              </div>

              {/* Dynamic Real-Time Physics Outputs */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-400/30">
                  <div className="text-[10px] font-mono-code text-sky-300 uppercase">
                    WEIGHT (W = m × g)
                  </div>
                  <div className="font-arcade text-lg text-white mt-0.5">
                    {weightNewtons.toLocaleString()} N
                  </div>
                  <div className="text-[10px] text-slate-300">
                    Gravity pull on {selectedWorld}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/30">
                  <div className="text-[10px] font-mono-code text-amber-300 uppercase">
                    MIN HOVER THRUST
                  </div>
                  <div className="font-arcade text-lg text-amber-300 mt-0.5">{hoverThrustKn} kN</div>
                  <div className="text-[10px] text-slate-300">Rocket force to slow descent</div>
                </div>
              </div>

              {/* Educational Takeaway for Selected World */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-xs space-y-1">
                <div className="font-mono-code font-bold text-emerald-300">
                  🪂 Atmosphere: {worldPhysics.atmDensity}
                </div>
                <p className="text-slate-200 leading-relaxed">{worldPhysics.lesson}</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundFx.playPowerUp();
                  onAddXp(25);
                  if (selectedWorld === 'MARS') setIsEDLModalOpen(true);
                  else onNavigate('simulators');
                }}
                className="edu-btn-primary w-full py-3 text-xs flex items-center justify-center gap-2"
              >
                <span>🧪 TEST {selectedWorld} LANDING IN SIMULATOR (+25 XP)</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. DYNAMIC FILTERABLE NASA SIMULATOR LABS (WITH DIFFICULTY TOGGLE)
          ===================================================================== */}
      <section className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-sky-400/20 pb-4">
          <div>
            <span className="edu-pill-tag">🕹️ LEARN BY PLAYING · 4 INTERACTIVE SIMULATORS</span>
            <h2 className="font-arcade text-2xl md:text-4xl text-white mt-2">
              HANDS-ON NASA SCIENCE &amp; FLIGHT LABS
            </h2>
            <p className="text-slate-300 text-xs md:text-sm mt-1">
              Filter by STEM subject or switch between Cadet (Grades 5–6) and Commander (Grades 7–8) physics parameters.
            </p>
          </div>

          {/* Dynamic Subject Filter + Difficulty Mode Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { key: 'ALL', label: 'ALL LABS (4)' },
                { key: 'PHYSICS', label: '⚡ FORCES & MOTION' },
                { key: 'ROBOTICS', label: '🚁 ROBOTICS & BIO' },
                { key: 'SYSTEMS', label: '🌙 HABITAT SYSTEMS' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  soundFx.playClick(700);
                  setSimFilter(tab.key);
                }}
                className={`px-3.5 py-2 rounded-xl font-arcade text-xs border transition-all cursor-pointer ${
                  simFilter === tab.key
                    ? 'bg-sky-500 text-slate-950 border-sky-300 font-bold shadow-lg'
                    : 'bg-[#091738] text-slate-200 border-sky-500/30 hover:border-sky-400'
                }`}
              >
                {tab.label}
              </button>
            ))}

            {/* Cadet vs Commander Difficulty Toggle */}
            <div className="flex items-center bg-[#061026] p-1 rounded-xl border border-amber-400/40 ml-1">
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick(650);
                  setSimDifficulty('CADET');
                }}
                className={`px-2.5 py-1 rounded-lg font-mono-code text-[11px] font-bold cursor-pointer ${
                  simDifficulty === 'CADET' ? 'bg-amber-400 text-slate-950' : 'text-slate-300'
                }`}
              >
                CADET (GR 5-6)
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick(850);
                  setSimDifficulty('COMMANDER');
                }}
                className={`px-2.5 py-1 rounded-lg font-mono-code text-[11px] font-bold cursor-pointer ${
                  simDifficulty === 'COMMANDER' ? 'bg-amber-400 text-slate-950' : 'text-slate-300'
                }`}
              >
                COMMANDER (GR 7-8)
              </button>
            </div>
          </div>
        </div>

        {/* Simulator Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {visibleSimulators.map((sim) => (
            <div
              key={sim.id}
              onClick={sim.onLaunch}
              className="edu-bento-card group overflow-hidden flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="h-48 overflow-hidden relative bg-slate-950">
                  <img
                    src={sim.image}
                    alt={sim.title}
                    className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500 brightness-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#08132e] via-transparent to-black/30" />
                  <span className="absolute top-3 left-3 font-mono-code text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#061026]/90 text-sky-300 border border-sky-400/40">
                    {sim.ngss}
                  </span>
                  <span
                    className={`absolute bottom-3 right-3 font-mono-code text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${sim.accent}`}
                  >
                    ⚡ +{sim.xp} XP
                  </span>
                </div>

                <div className="p-5 space-y-2.5">
                  <div className="text-[10px] font-mono-code text-amber-300 font-bold uppercase">
                    {sim.code}
                  </div>
                  <h3 className="font-arcade text-lg text-white leading-snug">{sim.title}</h3>
                  <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-sky-500/25 font-mono-code text-xs text-sky-300 font-bold">
                    📐 {sim.equation}
                  </div>
                  <p className="text-slate-200 text-xs leading-relaxed">{sim.desc}</p>
                </div>
              </div>

              <div className="px-5 pb-5 pt-2">
                <button type="button" className="edu-btn-primary w-full py-3 text-xs">
                  {sim.cta} ▸
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================================
          3. INTERACTIVE NASA STEM SYSTEM CUTAWAY & "WHAT-IF" HYPOTHESIS LAB
          ===================================================================== */}
      <section className="edu-hero-shell p-6 md:p-10 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-sky-400/20 pb-4">
          <div>
            <span className="edu-pill-tag">🔬 INTERACTIVE ENGINEERING CUTAWAY</span>
            <h2 className="font-arcade text-2xl md:text-3xl text-white mt-2">
              HOW NASA SPACECRAFT ACTUALLY WORK (TEST YOUR HYPOTHESIS)
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {STEM_SYSTEM_CUTAWAYS.map((sys, idx) => (
              <button
                key={sys.id}
                type="button"
                onClick={() => {
                  soundFx.playClick(740);
                  setCutawayIdx(idx);
                  setShowWhatIfAnswer(false);
                }}
                className={`px-4 py-2 rounded-xl font-arcade text-xs border transition-all cursor-pointer ${
                  cutawayIdx === idx
                    ? 'bg-amber-400 text-slate-950 border-amber-200 font-bold shadow-lg'
                    : 'bg-[#09183a] text-slate-200 border-sky-400/30 hover:border-sky-400'
                }`}
              >
                {sys.badge}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left 5 Cols: Bright Hardware Visual */}
          <div className="lg:col-span-5 rounded-2xl overflow-hidden border-2 border-sky-400/40 bg-slate-950 h-72 md:h-80 relative">
            <img
              src={activeCutaway.image}
              alt={activeCutaway.title}
              className="w-full h-full object-cover object-center brightness-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#061026] via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-[#061026]/90 border border-sky-400/40 font-mono-code text-xs text-amber-300 font-bold">
              Formula: {activeCutaway.formula}
            </div>
          </div>

          {/* Right 7 Cols: Science Explanation + Interactive "What-If" Hypothesis Tester */}
          <div className="lg:col-span-7 space-y-4">
            <div className="text-xs font-mono-code text-sky-300 font-bold uppercase">
              {activeCutaway.discipline}
            </div>
            <h3 className="font-arcade text-2xl text-white">{activeCutaway.title}</h3>
            <p className="text-slate-200 text-sm leading-relaxed">{activeCutaway.normalExplanation}</p>

            {/* Interactive "What If?" Hypothesis Box */}
            <div className="p-4 rounded-2xl bg-[#071536] border-2 border-amber-400/40 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-arcade text-xs md:text-sm text-amber-300">
                  {activeCutaway.whatIfQuestion}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playTelemetryChirp();
                    setShowWhatIfAnswer((p) => !p);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-arcade text-xs font-bold cursor-pointer"
                >
                  {showWhatIfAnswer ? 'HIDE SIMULATION RESULT' : '⚡ SIMULATE OUTCOME'}
                </button>
              </div>

              {showWhatIfAnswer && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-xs md:text-sm text-emerald-200 font-medium leading-relaxed">
                  {activeCutaway.whatIfOutcome}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  soundFx.playPowerUp();
                  if (activeCutaway.simTarget === 'SHACKLETON') setIsSurvivalModalOpen(true);
                  else if (activeCutaway.simTarget === 'ROVER') setIsRoverModalOpen(true);
                  else setIsEDLModalOpen(true);
                }}
                className="edu-btn-primary px-6 py-3.5 text-xs"
              >
                🚀 {activeCutaway.ctaLabel} ▸
              </button>
              <button
                type="button"
                onClick={() => onNavigate('academy')}
                className="edu-btn-cyan px-5 py-3.5 text-xs"
              >
                🎓 OPEN FULL 4-STEP ACADEMY
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. INTERACTIVE GRAPHIC NOVEL STORY COMICS (ISSUES 1–4)
          ===================================================================== */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-sky-400/20 pb-3">
          <div>
            <span className="edu-pill-tag">📚 VISUAL STEM STORYTELLING</span>
            <h2 className="font-arcade text-2xl md:text-3xl text-white mt-2">
              INTERACTIVE NASA GRAPHIC NOVEL EPISODES
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenComic(1)}
            className="edu-btn-cyan px-4 py-2.5 text-xs"
          >
            OPEN COMIC READER ▸
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              issue: 1,
              badge: 'EPISODE #01 · GRAVITY',
              title: 'The Artemis Launch Pad',
              desc: 'Learn escape velocity (11.2 km/s) and airlock pressure physics with Cadet Maya.',
              cover: '/comics/covers/cover_issue_1.jpg',
              color: 'bg-sky-500 text-slate-950',
            },
            {
              issue: 2,
              badge: 'EPISODE #02 · CHEMISTRY',
              title: 'The Oxygen Factory',
              desc: 'Split lunar water ice and run Sabatier catalytic reactors to keep the crew breathing.',
              cover: '/comics/covers/cover_issue_2.jpg',
              color: 'bg-amber-400 text-slate-950',
            },
            {
              issue: 3,
              badge: 'EPISODE #03 · ENERGY',
              title: 'The 354-Hour Darkness',
              desc: 'Survive freezing -203°C lunar night using Kilopower nuclear Stirling generators.',
              cover: '/comics/covers/cover_issue_3.jpg',
              color: 'bg-indigo-500 text-white',
            },
            {
              issue: 4,
              badge: 'EPISODE #04 · MARS BIO',
              title: 'Red Dunes of Jezero',
              desc: 'Pilot Perseverance and Ingenuity to drill ancient Martian river delta core samples.',
              cover: '/comics/covers/cover_issue_4.jpg',
              color: 'bg-emerald-400 text-slate-950',
            },
          ].map((comic) => (
            <div
              key={comic.issue}
              onClick={() => onOpenComic(comic.issue)}
              className="edu-bento-card group overflow-hidden cursor-pointer flex flex-col justify-between"
            >
              <div className="h-56 overflow-hidden relative bg-slate-950">
                <img
                  src={comic.cover}
                  alt={comic.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#08132e] via-transparent to-transparent" />
                <span
                  className={`absolute top-3 left-3 font-arcade text-[10px] px-2.5 py-1 rounded-lg font-bold shadow ${comic.color}`}
                >
                  {comic.badge}
                </span>
              </div>
              <div className="p-4 space-y-1.5">
                <h4 className="font-arcade text-base text-white">{comic.title}</h4>
                <p className="text-slate-300 text-xs leading-relaxed">{comic.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================================
          5. DYNAMIC 4-QUESTION NASA STEM CHALLENGE DECK (WITH STREAK COUNTER)
          ===================================================================== */}
      <section className="edu-hero-shell p-6 md:p-8 border-2 border-amber-400/50">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-arcade text-xs font-bold">
              🧠 LIVE STEM QUIZ CHALLENGE ({quizIndex + 1} / {DYNAMIC_QUIZ_DECK.length})
            </span>
            <span className="text-xs font-mono-code text-sky-300 font-bold">
              {currentQuiz.standard}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono-code text-xs font-bold">
              🔥 STREAK: {quizStreak} IN A ROW (+50 XP / QUESTION)
            </span>
            <button
              type="button"
              onClick={handleNextQuizQuestion}
              className="edu-btn-cyan px-3.5 py-1.5 text-xs"
            >
              NEXT QUESTION ▸
            </button>
          </div>
        </div>

        <h3 className="font-arcade text-lg md:text-2xl text-white mb-4">{currentQuiz.question}</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {currentQuiz.options.map((opt, idx) => {
            const isSelected = selectedOptionIdx === idx;
            let btnStyle = 'bg-[#09183a] border-sky-400/30 text-slate-100 hover:border-sky-300';
            if (selectedOptionIdx !== null) {
              if (opt.isCorrect) {
                btnStyle = 'bg-emerald-500/25 border-emerald-400 text-emerald-200 font-bold';
              } else if (isSelected) {
                btnStyle = 'bg-rose-500/25 border-rose-400 text-rose-200';
              }
            }
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => handleAnswerQuiz(idx, opt.isCorrect)}
                className={`p-4 rounded-xl border-2 text-left text-xs md:text-sm font-semibold transition-all cursor-pointer ${btnStyle}`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {selectedOptionIdx !== null && (
          <div className="mt-4 p-4 rounded-xl bg-sky-500/15 border border-sky-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs md:text-sm text-slate-100 leading-relaxed">
              <strong className="text-amber-300">🔬 NASA Science Explanation: </strong>
              {currentQuiz.explanation}
            </p>
            <button
              type="button"
              onClick={handleNextQuizQuestion}
              className="edu-btn-primary px-5 py-2.5 text-xs shrink-0"
            >
              NEXT CHALLENGE ▸
            </button>
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
