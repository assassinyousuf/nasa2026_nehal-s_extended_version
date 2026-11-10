import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import type { GameState, ChoiceOption, SolHistoryEntry, DifficultyMode } from './types/game';
import type { DifficultyTier } from './data/difficultyTiers';
import { getMissionScenarioDeck } from './utils/missionScenarioEngine';
import { loadDonkiSolarWeather } from './utils/donkiService';
import type { DonkiDataResult } from './utils/donkiMapper';
import { NASA_MISSIONS, type NasaMission } from './data/nasaMissions';
import { TEACHING_FLASHCARDS, type TeachingFlashcard } from './data/teachingFlashcards';
import { useAppRouter, type AppRoute } from './router/useAppRouter';
import { GlobalNavBar } from './components/GlobalNavBar';
import { authService } from './utils/authService';
import type { User } from './types/auth';
import { spaceMusicEngine } from './utils/spaceMusicEngine';
import { studentActivityService } from './utils/studentActivityService';
import {
  bankShackletonReward,
  loadShackletonProgress,
  recordShackletonAttempt as updateShackletonAttempt,
  saveShackletonProgress,
} from './utils/shackletonProgress';
import type {
  ShackletonAttemptResult,
  ShackletonProgress,
  ShackletonReward,
  ShackletonProgressReadResult,
} from './utils/shackletonProgress';
import {
  computeDailySimulationTurn,
  saveGameStateToStorage,
  loadGameStateFromStorage,
  DEFAULT_LUNAR_OUTPOST,
  DEFAULT_MARS_OUTPOST,
  generateMissionObjectives,
} from './utils/simulationEngine';
import type { OutpostConfiguration } from './types/game';
import { soundFx } from './utils/audioEffects';
import { speechEngine } from './utils/speechEngine';
import { JudgePreviewBadge, JudgePreviewModal } from './components/JudgePreviewMode';
import { WarpBackgroundCanvas } from './components/arcade/WarpBackgroundCanvas';
import { ArcadeNavBar } from './components/arcade/ArcadeNavBar';
import { CadetEnlistModal, type CadetProfile } from './components/arcade/CadetEnlistModal';
import { MissionMentor } from './components/MissionMentor';

// Code-split Dedicated Pages
const LaunchpadPage = lazy(() => import('./pages/LaunchpadPage'));
const AcademyTrailPage = lazy(() => import('./pages/AcademyTrailPage'));
const ArcadeSimulatorsPage = lazy(() => import('./pages/ArcadeSimulatorsPage'));
const AstronautLockerPage = lazy(() => import('./pages/AstronautLockerPage'));
const OrreryHomePage = lazy(() => import('./pages/OrreryHomePage'));
const MissionControlPage = lazy(() => import('./pages/MissionControlPage'));
const AstronautAcademyPage = lazy(() => import('./pages/AstronautAcademyPage'));
const SimulatorsHubPage = lazy(() => import('./pages/SimulatorsHubPage'));
const MissionCampaignPage = lazy(() => import('./pages/MissionCampaignPage'));
const LearningHubPage = lazy(() => import('./pages/LearningHubPage'));
const TeacherHubPage = lazy(() => import('./pages/TeacherHubPage'));

// Code-split Transient Utility Modals
const AuthModal = lazy(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })));
const HowToPlayModal = lazy(() => import('./components/HowToPlayModal').then(m => ({ default: m.HowToPlayModal })));
const FlightCertificateModal = lazy(() => import('./components/FlightCertificateModal').then(m => ({ default: m.FlightCertificateModal })));
const NasaTelemetryPanel = lazy(() => import('./components/NasaTelemetryPanel').then(m => ({ default: m.NasaTelemetryPanel })));
const AboutModal = lazy(() => import('./components/AboutModal').then(m => ({ default: m.AboutModal })));
const AIDisclosureModal = lazy(() => import('./components/AIDisclosureModal').then(m => ({ default: m.AIDisclosureModal })));
const NasaDataModal = lazy(() => import('./components/NasaDataModal').then(m => ({ default: m.NasaDataModal })));
const PlanetaryCommandMap = lazy(() => import('./components/PlanetaryCommandMap').then(m => ({ default: m.PlanetaryCommandMap })));
const AstronautBriefingModal = lazy(() => import('./components/AstronautBriefingModal').then(m => ({ default: m.AstronautBriefingModal })));
const OutpostConstructionModal = lazy(() => import('./components/OutpostConstructionModal').then(m => ({ default: m.OutpostConstructionModal })));
const AstronautCharacterModal = lazy(() => import('./components/AstronautCharacterModal').then(m => ({ default: m.AstronautCharacterModal })));
const LiveMissionActivityModal = lazy(() => import('./components/LiveMissionActivityModal').then(m => ({ default: m.LiveMissionActivityModal })));
const MissionGameModal = lazy(() => import('./components/MissionGameModal').then(m => ({ default: m.MissionGameModal })));
const MultiplayerLobbyModal = lazy(() => import('./components/MultiplayerLobbyModal').then(m => ({ default: m.MultiplayerLobbyModal })));
const AudioTeachingFlashcard = lazy(() => import('./components/AudioTeachingFlashcard').then(m => ({ default: m.AudioTeachingFlashcard })));
const SpaceGamesHubModal = lazy(() => import('./components/SpaceGamesHubModal').then(m => ({ default: m.SpaceGamesHubModal })));

export const ARTEMIS_LUNAR_BASE_MISSION: NasaMission =
  NASA_MISSIONS.find((m) => m.id === 'NASA-M049') || NASA_MISSIONS[48];

export const MARS_JEZERO_BASE_MISSION: NasaMission =
  NASA_MISSIONS.find((m) => m.id === 'NASA-M057') || NASA_MISSIONS[56];

const INITIAL_GAME_STATE: GameState = {
  destination: 'MOON',
  difficultyMode: 'CADET',
  currentSol: 1,
  totalSols: 30,
  resources: {
    power: 75,
    water: 80,
    oxygen: 90,
    food: 24,
    radiation: 12,
    science: 10,
    crewHealth: 95
  },
  modules: {
    habitat: { status: 'NOMINAL', lifeSupportLoadKw: 12 },
    powerStation: { status: 'NOMINAL', activeSource: 'SOLAR', currentOutputKw: 25 },
    greenhouse: { status: 'NOMINAL', growthCycleDays: 3, lightEfficiency: 85 },
    stormVault: { status: 'NOMINAL', isSealed: false, regolithShieldCm: 180 }
  },
  outpostConfig: DEFAULT_LUNAR_OUTPOST,
  objectives: generateMissionObjectives('MOON'),
  equipmentCondition: 100,
  netPowerKw: 15,
  activeEvent: getMissionScenarioDeck(ARTEMIS_LUNAR_BASE_MISSION, 'CADET')[0],
  history: [],
  isGameOver: false,
  gameOutcome: 'IN_PROGRESS'
};

const PageFallback: React.FC = () => (
  <div style={{
    minHeight: 'calc(100vh - 52px)',
    background: 'var(--color-space-950, #050814)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#38bdf8',
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: '13px',
    letterSpacing: '0.1em',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#38bdf8', animation: 'pulse 1.2s infinite' }} />
      <span>INITIALIZING AEROSPACE TELEMETRY...</span>
    </div>
  </div>
);

export const App: React.FC = () => {
  const { route, params, navigate } = useAppRouter();

  // Persistent Game Simulation State
  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = loadGameStateFromStorage();
    return saved || INITIAL_GAME_STATE;
  });
  const [donkiData, setDonkiData] = useState<DonkiDataResult>({ source: 'UNAVAILABLE' });
  const [savedGameInfo, setSavedGameInfo] = useState<GameState | null>(loadGameStateFromStorage);
  const [currentMission, setCurrentMission] = useState<NasaMission>(() => {
    const saved = loadGameStateFromStorage();
    if (saved?.destination === 'MARS') return MARS_JEZERO_BASE_MISSION;
    return ARTEMIS_LUNAR_BASE_MISSION;
  });
  const [shackletonProgressState, setShackletonProgressState] = useState<ShackletonProgressReadResult>(loadShackletonProgress);
  const shackletonProgressStateRef = useRef(shackletonProgressState);
  const [lastConsequence, setLastConsequence] = useState<{
    narrative: string;
    insight: string;
    choiceTitle: string;
    choiceOption?: ChoiceOption;
  } | null>(null);

  // Viewport Settings
  const [is3DView, setIs3DView] = useState(true);
  const [isTheaterMode, setIsTheaterMode] = useState(true);
  const [isShieldActive, setIsShieldActive] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // User Authentication & Progression
  const [currentUser, setCurrentUser] = useState<User | null>(() => authService.getCurrentUser());
  const [collectedFlashcards, setCollectedFlashcards] = useState<TeachingFlashcard[]>([TEACHING_FLASHCARDS[0]]);
  const [activeFlashcard, setActiveFlashcard] = useState<TeachingFlashcard | null>(null);
  const [completedMissions, setCompletedMissions] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('astro_camp_completed_missions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Judge Mode
  const [isJudgeMode, setIsJudgeMode] = useState(() => {
    try { return localStorage.getItem('astro_camp_judge_mode') === 'true'; } catch { return false; }
  });

  // Cadet Arcade Profile & XP State
  const [cadetProfile, setCadetProfile] = useState<CadetProfile>(() => {
    try {
      const saved = localStorage.getItem('astro_cadet_profile');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      callsign: 'MAYA-01',
      avatar: '/cinematic/maya.jpg',
      characterName: 'Maya',
      rank: 'ASCAN Grade 1 Pilot'
    };
  });

  const [spaceXp, setSpaceXp] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('astro_space_xp');
      if (saved) return parseInt(saved, 10);
    } catch {}
    return 1250;
  });

  const [isEnlistModalOpen, setIsEnlistModalOpen] = useState(false);

  const handleSaveCadetProfile = (profile: CadetProfile) => {
    setCadetProfile(profile);
    try {
      localStorage.setItem('astro_cadet_profile', JSON.stringify(profile));
    } catch {}
  };

  const handleAddSpaceXp = (amount: number) => {
    setSpaceXp((prev) => {
      const next = prev + amount;
      try {
        localStorage.setItem('astro_space_xp', String(next));
      } catch {}
      return next;
    });
  };

  // Transient Modal Dialogs State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);
  const [isJudgeModalOpen, setIsJudgeModalOpen] = useState(false);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isNasaDataOpen, setIsNasaDataOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false);
  const [isLiveActivityModalOpen, setIsLiveActivityModalOpen] = useState(false);
  const [isPlanetaryMapOpen, setIsPlanetaryMapOpen] = useState(false);
  const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);
  const [selectedBriefingMission, setSelectedBriefingMission] = useState<NasaMission | null>(null);
  const [isConstructionModalOpen, setIsConstructionModalOpen] = useState(false);
  const [isFlashcardOpen, setIsFlashcardOpen] = useState(false);
  const [isSpaceGamesHubOpen, setIsSpaceGamesHubOpen] = useState(false);
  const [shackletonStorageError, setShackletonStorageError] = useState<string | null>(
    () => shackletonProgressState.error
  );

  // Active Mini-Game / Multiplayer Lobby State
  const [activeMissionGameId, setActiveMissionGameId] = useState<string | null>(null);
  const [isMultiplayerLobbyOpen, setIsMultiplayerLobbyOpen] = useState(false);
  const [isCoopActive, setIsCoopActive] = useState(false);

  const persistShackletonProgress = useCallback((progress: ShackletonProgress) => {
    let error: string | null = null;
    try {
      saveShackletonProgress(progress);
    } catch (storageError) {
      const detail = storageError instanceof Error ? storageError.message : 'Unknown browser storage error.';
      error = `Shackleton progress could not be saved: ${detail}`;
      console.error(error, storageError);
    }

    const nextState = { progress, error };
    shackletonProgressStateRef.current = nextState;
    setShackletonProgressState(nextState);
    setShackletonStorageError(error);
  }, []);

  const handleRecordShackletonAttempt = useCallback((result: ShackletonAttemptResult) => {
    const next = updateShackletonAttempt(shackletonProgressStateRef.current.progress, result);
    persistShackletonProgress(next);
    studentActivityService.logActivity({
      studentUsername: currentUser?.username || cadetProfile.callsign,
      studentFullName: currentUser?.username || cadetProfile.characterName,
      studentAvatar: cadetProfile.avatar,
      characterName: cadetProfile.characterName,
      actionType: 'MISSION_ATTEMPTED',
      missionTitle: 'Shackleton Ice Run',
      destination: 'MOON',
      scoreXp: 0,
      coinsEarned: 0,
      outcomeStatus: result.success ? 'SUCCESS' : 'LEARNING',
      notes: `${result.success ? 'Returned to the landing pad.' : result.reason} ${result.iceSamples} simulated ice readings collected.`,
    });
  }, [cadetProfile, currentUser, persistShackletonProgress]);

  const handleCompleteShackleton = useCallback((reward: ShackletonReward) => {
    const next = bankShackletonReward(shackletonProgressStateRef.current.progress, reward);
    persistShackletonProgress(next);
    handleAddSpaceXp(150 + reward.iceSamples * 25);
    studentActivityService.logActivity({
      studentUsername: currentUser?.username || cadetProfile.callsign,
      studentFullName: currentUser?.username || cadetProfile.characterName,
      studentAvatar: cadetProfile.avatar,
      characterName: cadetProfile.characterName,
      actionType: 'MISSION_COMPLETED',
      missionTitle: `Shackleton Ice Run (${reward.iceSamples} samples returned)`,
      destination: 'MOON',
      scoreXp: 150 + reward.iceSamples * 25,
      coinsEarned: reward.waterUnits + reward.fuelUnits,
      outcomeStatus: 'SUCCESS',
      notes: 'Ice readings and water/fuel stock rewards are GAME SIMULATION VALUES. Debrief links to the Artemis lunar-ice lesson.',
    });
  }, [cadetProfile, currentUser, handleAddSpaceXp, persistShackletonProgress]);

  const handleReviewShackletonLesson = useCallback(() => {
    setCurrentMission(ARTEMIS_LUNAR_BASE_MISSION);
    setIsSpaceGamesHubOpen(false);
    navigate('learning', { tab: 'NOTEBOOK' });
  }, [navigate]);
  const [coopRole, setCoopRole] = useState<import('./utils/multiplayerMissionService').CrewRole>('CDR');

  // Auto-save Game State
  useEffect(() => {
    if (!gameState.isGameOver) {
      saveGameStateToStorage(gameState);
      setSavedGameInfo(gameState);
    }
  }, [gameState]);

  useEffect(() => {
    let isCurrent = true;
    loadDonkiSolarWeather()
      .then((result) => {
        if (!isCurrent) return;
        setDonkiData(result);
        setGameState((previous) => {
          if (previous.destination !== 'MOON' || previous.activeEvent?.id !== 'sol-12-solar-flare') {
            return previous;
          }
          const solarEvent = getMissionScenarioDeck(
            currentMission,
            previous.difficultyMode as DifficultyTier,
            result
          ).find((event) => event.id === 'sol-12-solar-flare');
          return solarEvent ? { ...previous, activeEvent: solarEvent } : previous;
        });
      })
      .catch((error: unknown) => {
        if (!isCurrent) return;
        setDonkiData({
          source: 'UNAVAILABLE',
          error: error instanceof Error ? error.message : 'Unexpected NASA DONKI service error.',
        });
      });
    return () => {
      isCurrent = false;
    };
  }, [currentMission]);

  // Route change: dismiss all transient overlay modals so the user lands cleanly on the chosen page
  useEffect(() => {
    setActiveMissionGameId(null);
    setIsMultiplayerLobbyOpen(false);
    setIsBriefingModalOpen(false);
    setIsConstructionModalOpen(false);
    setIsFlashcardOpen(false);
    setIsAuthModalOpen(false);
    setIsSettingsOpen(false);
    setIsHowToPlayOpen(false);
    setIsCertificateOpen(false);
    setIsJudgeModalOpen(false);
    setIsTelemetryOpen(false);
    setIsAboutOpen(false);
    setIsNasaDataOpen(false);
    setIsAIModalOpen(false);
    setIsCharacterModalOpen(false);
    setIsLiveActivityModalOpen(false);
    setIsPlanetaryMapOpen(false);
  }, [route]);

  // Auto-open the crew lobby for same-device demo or private network invites.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('room') || params.get('crewRoom') || params.get('coop') === 'true' || window.location.hash.includes('coop')) {
        setIsMultiplayerLobbyOpen(true);
      }
    }
  }, []);

  const triggerScreenShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 460);
  };

  // Event Audio Triggers
  useEffect(() => {
    if (!gameState.activeEvent) return;
    if (gameState.activeEvent.urgency === 'CRITICAL') {
      soundFx.playAlarm();
      triggerScreenShake();
    } else if (gameState.activeEvent.id === 'sol-20-meteoroid-strike') {
      soundFx.playImpact();
      triggerScreenShake();
    } else if (gameState.activeEvent.id === 'sol-24-ice-core-breakthrough') {
      soundFx.playTelemetryChirp();
    }
  }, [gameState.activeEvent?.id]);

  const handleSelectDifficulty = (mode: DifficultyMode) => {
    const newDeck = getMissionScenarioDeck(currentMission, mode as DifficultyTier, donkiData);
    const currentSol = gameState.activeEvent ? gameState.activeEvent.sol : gameState.currentSol;
    const matchedEvent = newDeck.find((e) => e.sol === currentSol) || newDeck[0];
    setGameState((prev) => ({
      ...prev,
      difficultyMode: mode,
      activeEvent: prev.isGameOver ? prev.activeEvent : matchedEvent
    }));
  };

  const handleSelectChoice = (choice: ChoiceOption) => {
    if (gameState.isGameOver || !gameState.activeEvent) return;

    const updatedResources = {
      power: Math.min(100, Math.max(0, gameState.resources.power + (choice.resourceDelta.power || 0))),
      water: Math.min(100, Math.max(0, gameState.resources.water + (choice.resourceDelta.water || 0))),
      oxygen: Math.min(100, Math.max(0, gameState.resources.oxygen + (choice.resourceDelta.oxygen || 0))),
      food: Math.max(0, gameState.resources.food + (choice.resourceDelta.food || 0)),
      radiation: Math.max(0, gameState.resources.radiation + (choice.resourceDelta.radiation || 0)),
      science: gameState.resources.science + (choice.resourceDelta.science || 0),
      crewHealth: Math.min(100, Math.max(0, gameState.resources.crewHealth + (choice.resourceDelta.crewHealth || 0)))
    };

    const turnResult = computeDailySimulationTurn(gameState);
    const historyEntry: SolHistoryEntry = {
      sol: gameState.currentSol,
      eventTitle: gameState.activeEvent.title,
      chosenOption: choice,
      resourcesSnapshot: updatedResources,
      chainReactionNote: choice.educationalInsight
    };

    const newHistory = [...gameState.history, historyEntry];

    let isGameOver = false;
    let outcome: 'IN_PROGRESS' | 'VICTORY' | 'CRITICAL_FAILURE' = 'IN_PROGRESS';

    if (updatedResources.oxygen <= 0 || updatedResources.power <= 0 || updatedResources.water <= 0 || updatedResources.radiation >= 100 || updatedResources.crewHealth <= 0) {
      isGameOver = true;
      outcome = 'CRITICAL_FAILURE';
    }

    if (choice.id === 'opt-magnetic-shield') {
      soundFx.playShieldHum();
      setIsShieldActive(true);
    } else if (choice.id === 'opt-spin-up-kilopower' || choice.id === 'opt-kilopower') {
      soundFx.playReactorStart();
    } else if (choice.id.includes('ice') || choice.id.includes('science')) {
      soundFx.playTelemetryChirp();
    } else {
      soundFx.playClick(680);
    }

    const currentDeck = getMissionScenarioDeck(currentMission, gameState.difficultyMode as DifficultyTier, donkiData);
    const nextEventIndex = currentDeck.findIndex((e) => e.id === gameState.activeEvent?.id) + 1;
    const nextEvent = currentDeck[nextEventIndex] || null;

    if (!isGameOver && !nextEvent) {
      isGameOver = true;
      outcome = 'VICTORY';
    }

    setLastConsequence({
      narrative: choice.consequenceNarrative,
      insight: choice.educationalInsight,
      choiceTitle: choice.title
    });

    setGameState((prev) => ({
      ...prev,
      resources: updatedResources,
      currentSol: nextEvent ? nextEvent.sol : prev.totalSols,
      activeEvent: nextEvent,
      history: newHistory,
      objectives: turnResult.updatedObjectives,
      netPowerKw: turnResult.telemetry.netPowerKw,
      isGameOver,
      gameOutcome: outcome,
    }));
  };

  const handleRestart = () => {
    setGameState(INITIAL_GAME_STATE);
    saveGameStateToStorage(INITIAL_GAME_STATE);
    setLastConsequence(null);
    soundFx.playReactorStart();
  };

  const handleSwitchOutpostDestination = (dest: 'MOON' | 'MARS') => {
    const targetMission = dest === 'MARS' ? MARS_JEZERO_BASE_MISSION : ARTEMIS_LUNAR_BASE_MISSION;
    setCurrentMission(targetMission);
    const missionDeck = getMissionScenarioDeck(targetMission, gameState.difficultyMode as DifficultyTier, donkiData);
    const initialObjectives = generateMissionObjectives(dest);
    const config = dest === 'MARS' ? DEFAULT_MARS_OUTPOST : DEFAULT_LUNAR_OUTPOST;

    const nextState: GameState = {
      destination: dest,
      difficultyMode: gameState.difficultyMode,
      currentSol: 1,
      totalSols: dest === 'MARS' ? 40 : 30,
      resources: {
        power: 75,
        water: 80,
        oxygen: 90,
        food: dest === 'MARS' ? 32 : 24,
        radiation: dest === 'MARS' ? 8 : 12,
        science: 10,
        crewHealth: 95
      },
      modules: {
        habitat: { status: 'NOMINAL', lifeSupportLoadKw: 12 },
        powerStation: { status: 'NOMINAL', activeSource: 'SOLAR', currentOutputKw: 25 },
        greenhouse: { status: 'NOMINAL', growthCycleDays: 3, lightEfficiency: 85 },
        stormVault: { status: 'NOMINAL', isSealed: false, regolithShieldCm: 180 }
      },
      outpostConfig: config,
      objectives: initialObjectives,
      equipmentCondition: 100,
      netPowerKw: 15,
      activeEvent: missionDeck[0],
      history: [],
      isGameOver: false,
      gameOutcome: 'IN_PROGRESS'
    };

    setGameState(nextState);
    saveGameStateToStorage(nextState);
    setLastConsequence(null);
    soundFx.playReactorStart();
  };

  const handleLaunchMissionGame = (missionId: string) => {
    setActiveMissionGameId(missionId);
    soundFx.playClick(900);
  };

  const handleCompleteMission = (missionId: string, score: number) => {
    setCompletedMissions((prev) => {
      if (prev.includes(missionId)) return prev;
      const next = [...prev, missionId];
      try { localStorage.setItem('astro_camp_completed_missions', JSON.stringify(next)); } catch {}
      return next;
    });

    if (currentUser) {
      const updatedUser = authService.recordMissionComplete(currentUser.id, missionId, 200);
      if (updatedUser) setCurrentUser(updatedUser);
    }
    soundFx.playTelemetryChirp();
  };

  const handleConfirmConstruction = (config: OutpostConfiguration) => {
    setIsConstructionModalOpen(false);
    const missionDeck = getMissionScenarioDeck(currentMission, gameState.difficultyMode as DifficultyTier, donkiData);
    const initialObjectives = generateMissionObjectives(currentMission.destination === 'MARS' ? 'MARS' : 'MOON');

    const startingResources = {
      power: config.energyStorage === 'KILOPOWER_REACTOR' ? 90 : 75,
      water: config.waterRecycling === 'THERMO_ELECTRIC_MEMBRANE' ? 95 : 80,
      oxygen: 90,
      food: config.greenhouse === 'FULL_CROP_BIOME' ? 35 : 24,
      radiation: config.radiationShielding === 'SINTERED_REGOLITH_VAULT' ? 5 : 12,
      science: 10,
      crewHealth: 95
    };

    const nextState: GameState = {
      ...INITIAL_GAME_STATE,
      destination: (currentMission.destination === 'MARS' ? 'MARS' : 'MOON') as 'MOON' | 'MARS',
      difficultyMode: gameState.difficultyMode,
      currentSol: 1,
      totalSols: currentMission.destination === 'MARS' ? 40 : 30,
      resources: startingResources,
      outpostConfig: config,
      objectives: initialObjectives,
      activeEvent: missionDeck[0],
      history: [],
      isGameOver: false,
      gameOutcome: 'IN_PROGRESS',
    };

    setGameState(nextState);
    saveGameStateToStorage(nextState);
    navigate('simulators');
    soundFx.playReactorStart();
  };

  const handleCompleteRoverEVA = (earnedScience: number, earnedXp: number, summary: string) => {
    setGameState((prev) => {
      const nextResources = {
        ...prev.resources,
        science: prev.resources.science + earnedScience,
      };
      const roverOption: ChoiceOption = {
        id: `rover-eva-sol-${prev.currentSol}`,
        title: 'Surface Rover EVA Exploration Run',
        description: summary,
        tradeOffText: `Harvested volatile ice and rock samples (+${earnedScience} Science, +${earnedXp} XP)`,
        resourceDelta: { science: earnedScience },
        consequenceNarrative: `Rover successfully traversed ${currentMission.destinationName}, drilling core samples and returning telemetry to base.`,
        educationalInsight: `Planetary rovers serve as mobile field laboratories, extending the scientific reach of human outposts into cryogenic permanently shadowed regions.`
      };
      const historyEntry: SolHistoryEntry = {
        sol: prev.currentSol,
        eventTitle: `Sol ${prev.currentSol}: Surface Rover Exploration Sortie`,
        chosenOption: roverOption,
        resourcesSnapshot: nextResources,
        chainReactionNote: roverOption.educationalInsight,
      };
      const nextState: GameState = {
        ...prev,
        resources: nextResources,
        history: [...prev.history, historyEntry],
      };
      saveGameStateToStorage(nextState);
      return nextState;
    });
    soundFx.playTelemetryChirp();
  };

  const handleActivateJudgeMode = () => {
    setIsJudgeMode(true);
    try { localStorage.setItem('astro_camp_judge_mode', 'true'); } catch {}
    const allMissionIds = NASA_MISSIONS.map(m => m.id);
    setCompletedMissions(allMissionIds);
    try { localStorage.setItem('astro_camp_completed_missions', JSON.stringify(allMissionIds)); } catch {}
  };

  const handleDeactivateJudgeMode = () => {
    setIsJudgeMode(false);
    try { localStorage.removeItem('astro_camp_judge_mode'); } catch {}
  };

  const renderActivePage = () => {
    switch (route) {
      case 'home':
        return (
          <LaunchpadPage
            onNavigate={navigate}
            cadetProfile={cadetProfile}
            onOpenEnlistModal={() => setIsEnlistModalOpen(true)}
            onAddXp={handleAddSpaceXp}
            onStartBaseMission={() => setIsConstructionModalOpen(true)}
            onOpenComic={(issueId) => navigate('learning', { tab: 'COMIC', issue: issueId ? String(issueId) : '1' })}
          />
        );

      case 'academy':
        return (
          <AcademyTrailPage
            onNavigate={navigate}
            onAddXp={handleAddSpaceXp}
            onOpenFullCurriculum={() => setIsAboutOpen(true)}
          />
        );

      case 'simulators':
      case 'mission':
        return (
          <ArcadeSimulatorsPage
            onNavigate={navigate}
            onAddXp={handleAddSpaceXp}
            onLaunchMarsEDL={() => handleLaunchMissionGame('NASA-M057')}
            onLaunchRover={() => handleLaunchMissionGame('NASA-M057')}
            onLaunchBlackHole={() => setIsPlanetaryMapOpen(true)}
            onLaunchOrrery={() => setIsPlanetaryMapOpen(true)}
            onLaunchCampaign={() => navigate('campaign')}
          />
        );

      case 'locker':
        return (
          <AstronautLockerPage
            onNavigate={navigate}
            cadetProfile={cadetProfile}
            onOpenEnlistModal={() => setIsEnlistModalOpen(true)}
            spaceXp={spaceXp}
            onOpenCertificateModal={() => setIsCertificateOpen(true)}
          />
        );

      case 'campaign':
        return (
          <MissionCampaignPage
            completedMissions={completedMissions}
            onLaunchMission={handleLaunchMissionGame}
            onLaunchShackleton={() => setIsSpaceGamesHubOpen(true)}
            shackletonProgress={shackletonProgressState.progress}
            onNavigate={navigate}
          />
        );

      case 'learning':
        return (
          <LearningHubPage
            initialTab={(params.tab as any) || 'NOTEBOOK'}
            initialIssueId={params.issue}
            activeEvent={gameState.activeEvent}
            collectedFlashcards={collectedFlashcards}
            activeMissionId={currentMission.id}
            onLaunchMission={handleLaunchMissionGame}
            completedMissions={completedMissions}
            onOpenComicReader={(issueId) => navigate('learning', { tab: 'COMIC', issue: issueId || '' })}
            onNavigate={navigate}
          />
        );

      case 'teacher':
        return (
          <TeacherHubPage
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onNavigate={navigate}
          />
        );

      default:
        return (
          <LaunchpadPage
            onNavigate={navigate}
            cadetProfile={cadetProfile}
            onOpenEnlistModal={() => setIsEnlistModalOpen(true)}
            onAddXp={handleAddSpaceXp}
            onStartBaseMission={() => setIsConstructionModalOpen(true)}
            onOpenComic={(issueId) => navigate('learning', { tab: 'COMIC', issue: issueId ? String(issueId) : '1' })}
          />
        );
    }
  };

  return (
    <div className="app-root-shell relative" style={{ minHeight: '100vh', background: '#040711', color: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      
      {/* Interactive 3D Warp-Speed Starfield Canvas in Background */}
      <WarpBackgroundCanvas />

      {/* High-Octane Arcade Flight Deck Topbar */}
      <ArcadeNavBar
        currentRoute={route}
        onNavigate={navigate}
        cadetProfile={cadetProfile}
        onOpenEnlistModal={() => setIsEnlistModalOpen(true)}
        spaceXp={spaceXp}
        onOpenJudgePreview={() => setIsJudgeModalOpen(true)}
        onOpenTeacherHub={() => navigate('teacher')}
      />

      {/* Main Page Area Mounted via URL Router */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 w-full space-y-8 relative z-10" style={{ flex: 1 }}>
        <Suspense fallback={<PageFallback />}>
          {renderActivePage()}
        </Suspense>
      </main>

      {/* Cadet Enlistment Profile Modal */}
      <CadetEnlistModal
        isOpen={isEnlistModalOpen}
        onClose={() => setIsEnlistModalOpen(false)}
        currentProfile={cadetProfile}
        onSaveProfile={handleSaveCadetProfile}
      />

      {/* Global Transient Utility Dialogs */}
      <Suspense fallback={null}>
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          currentUser={currentUser}
          onAuthChange={setCurrentUser}
          onOpenTeacherDossier={() => navigate('teacher')}
          onOpenCharacterLocker={() => {
            setIsAuthModalOpen(false);
            setIsCharacterModalOpen(true);
          }}
          onOpenLiveActivity={() => {
            setIsAuthModalOpen(false);
            setIsLiveActivityModalOpen(true);
          }}
        />

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          is3DView={is3DView}
          onToggle3DView={setIs3DView}
          onResetAllData={() => {
            setGameState(INITIAL_GAME_STATE);
            setSavedGameInfo(null);
          }}
        />

        <HowToPlayModal
          isOpen={isHowToPlayOpen}
          onClose={() => setIsHowToPlayOpen(false)}
        />

        <FlightCertificateModal
          isOpen={isCertificateOpen}
          onClose={() => setIsCertificateOpen(false)}
          cadetName={currentUser?.username || 'Junior Astronaut'}
          completedMissions={completedMissions}
          currentMissionName={currentMission.name}
          earnedBadges={shackletonProgressState.progress.iceFinderBadgeEarned ? ['Shackleton Ice Finder'] : []}
        />

        <JudgePreviewBadge isActive={isJudgeMode} onActivate={handleActivateJudgeMode} />
        <JudgePreviewModal
          isOpen={isJudgeModalOpen}
          onClose={() => setIsJudgeModalOpen(false)}
          onActivate={handleActivateJudgeMode}
          isJudgeMode={isJudgeMode}
          onDeactivate={handleDeactivateJudgeMode}
        />

        <NasaTelemetryPanel
          isOpen={isTelemetryOpen}
          onClose={() => setIsTelemetryOpen(false)}
        />

        <AboutModal
          isOpen={isAboutOpen}
          onClose={() => setIsAboutOpen(false)}
        />

        <AIDisclosureModal
          isOpen={isAIModalOpen}
          onClose={() => setIsAIModalOpen(false)}
        />

        <NasaDataModal
          isOpen={isNasaDataOpen}
          onClose={() => setIsNasaDataOpen(false)}
        />

        <AstronautCharacterModal
          isOpen={isCharacterModalOpen}
          onClose={() => setIsCharacterModalOpen(false)}
          currentUser={currentUser}
          onUserUpdate={setCurrentUser}
        />

        <LiveMissionActivityModal
          isOpen={isLiveActivityModalOpen}
          onClose={() => setIsLiveActivityModalOpen(false)}
          currentUsername={currentUser?.username}
        />

        {isSpaceGamesHubOpen && (
          <SpaceGamesHubModal
            isOpen
            onClose={() => setIsSpaceGamesHubOpen(false)}
            shackletonProgress={shackletonProgressState.progress}
            donkiData={donkiData}
            onCompleteShackleton={handleCompleteShackleton}
            onRecordShackletonAttempt={handleRecordShackletonAttempt}
            onReviewShackletonLesson={handleReviewShackletonLesson}
            onCompleteRoverMission={handleCompleteRoverEVA}
          />
        )}

        <OutpostConstructionModal
          isOpen={isConstructionModalOpen}
          destination={currentMission.destination === 'MARS' ? 'MARS' : 'MOON'}
          initialConfig={gameState.outpostConfig}
          onConfirm={handleConfirmConstruction}
          onCancel={() => setIsConstructionModalOpen(false)}
        />

        <PlanetaryCommandMap
          isOpen={isPlanetaryMapOpen}
          onClose={() => setIsPlanetaryMapOpen(false)}
          onSelectMission={(m) => {
            setSelectedBriefingMission(m);
            setIsBriefingModalOpen(true);
            setIsPlanetaryMapOpen(false);
          }}
          activeMissionId={currentMission.id}
        />

        {selectedBriefingMission && (
          <AstronautBriefingModal
            isOpen={isBriefingModalOpen}
            onClose={() => setIsBriefingModalOpen(false)}
            mission={selectedBriefingMission}
            onLaunchMission={(m) => {
              setIsBriefingModalOpen(false);
              if (m.id === 'NASA-M049' || (m.destination === 'MOON' && m.era === 'ARTEMIS_ERA')) {
                handleSwitchOutpostDestination('MOON');
                navigate('simulators', { sim: 'moonbase' });
              } else if (m.id === 'NASA-M057' || m.id === 'NASA-M075' || (m.destination === 'MARS' && m.era === 'MARS_FLEET')) {
                handleSwitchOutpostDestination('MARS');
                navigate('simulators', { sim: 'mars-edl' });
              } else {
                handleLaunchMissionGame(m.id);
              }
            }}
          />
        )}

        <MultiplayerLobbyModal
          isOpen={isMultiplayerLobbyOpen}
          onClose={() => setIsMultiplayerLobbyOpen(false)}
          onLaunchMission={(missionId, role) => {
            setIsMultiplayerLobbyOpen(false);
            setIsCoopActive(true);
            setCoopRole(role);
            setActiveMissionGameId(missionId);
          }}
        />

        {activeMissionGameId && (
          <MissionGameModal
            missionId={activeMissionGameId}
            onClose={() => {
              setActiveMissionGameId(null);
              setIsCoopActive(false);
            }}
            onCompleteMission={handleCompleteMission}
            onSelectNextMission={(nextId) => setActiveMissionGameId(nextId)}
            completedMissions={completedMissions}
            isCoopMode={isCoopActive}
            coopRole={coopRole}
            onOpenMoonquakeMap={() => navigate('simulators', { sim: 'moonquake' })}
            onOpenLobby={() => {
              setActiveMissionGameId(null);
              setIsMultiplayerLobbyOpen(true);
            }}
            onExitToLobby={() => {
              setActiveMissionGameId(null);
              setIsCoopActive(false);
              setIsMultiplayerLobbyOpen(true);
            }}
          />
        )}

        {isFlashcardOpen && activeFlashcard && (
          <AudioTeachingFlashcard
            card={activeFlashcard}
            isOpen={isFlashcardOpen}
            onClose={() => setIsFlashcardOpen(false)}
            tier={gameState.difficultyMode as DifficultyTier}
            onSaveToNotebook={(card: TeachingFlashcard) => {
              if (!collectedFlashcards.some(c => c.id === card.id)) {
                setCollectedFlashcards(prev => [...prev, card]);
              }
            }}
          />
        )}
      </Suspense>

      {shackletonStorageError && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            right: 16,
            bottom: 16,
            zIndex: 100000,
            maxWidth: 'min(420px, calc(100vw - 32px))',
            padding: '12px 16px',
            border: '1px solid #f59e0b',
            borderRadius: 8,
            background: '#1c1917',
            color: '#fde68a',
            fontSize: 13,
          }}
        >
          {shackletonStorageError}
        </div>
      )}

      <MissionMentor gameState={gameState} />

      {/* Global Aerospace Footer */}
      <footer className="main-footer" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', padding: '12px 20px', background: '#03050c' }}>
        <div>
          <span>Jr_AstroCamp: Beyond Earth / <strong>NASA International Space Apps Challenge 2026</strong></span>
        </div>
        <div className="footer-credits">
          <span>By <strong>Team Mysterio</strong> / "Train. Build. Survive. Explore."</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
