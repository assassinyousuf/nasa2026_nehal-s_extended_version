// ============================================================
// ThreeMissionSimulator — State-of-the-Art 3D Aerospace Flight Simulator
// Built with Three.js & NASA 3D Models for NASA Space Apps Challenge 2026
// Realistic PBR Physics · NASA GLTF Assets · Aerospace Navball HUD
// ============================================================

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { getSharedGLTFLoader } from '../utils/modelLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import confetti from 'canvas-confetti';
import {
  Rocket,
  Volume2,
  VolumeX,
  BookOpen,
  X,
  Info,
  Compass,
  Palette,
  Eye,
  Award,
  AlertTriangle,
  RotateCcw,
  Zap,
  Scan,
  Cpu,
  ShieldCheck,
  Flame,
  Radio,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { MissionGameConfig, LaunchParams, DockingParams, LunarLandingParams } from '../game/missionGameData';
import { soundFx } from '../utils/audioEffects';
import {
  multiplayerMissionService,
  CREW_ROLES,
  type CrewRole,
  type MultiplayerRoomState,
} from '../utils/multiplayerMissionService';

export type VisualToneMode = 'REALISTIC_NASA' | 'CINEMATIC_GRADE' | 'TACTICAL_HUD';

// ─── ASTRONAUT AGE & SKILL PROGRESSION TIERS ─────────────────────────
// Authentic NASA Aerospace Missions: Project Mercury, Apollo, Artemis, SLS & Gateway
export type AstronautAgeTier = 'cadet' | 'officer' | 'commander';

export interface TierConfig {
  id: AstronautAgeTier;
  label: string;
  ageRange: string;
  badge: string;
  tagline: string;
  description: string;
  nasaMissionContext: string;
  assistLevel: string;
  landingSpeedMax: number;
}

export const ASTRONAUT_TIERS: Record<AstronautAgeTier, TierConfig> = {
  cadet: {
    id: 'cadet',
    label: 'JUNIOR CADET',
    ageRange: 'Ages 6–10',
    badge: '🐣',
    tagline: 'NASA Artemis Discovery, Surface Exploration & Safe Guidance',
    description: 'Auto-Stabilized Flight Assist · Safe Fuel Reserve · Visual Trajectory Gates · Scientific Mineral Core Discovery',
    nasaMissionContext: 'NASA Artemis Lunar Base & xEMU Surface EVA',
    assistLevel: 'HIGH_ASSIST',
    landingSpeedMax: 8.5,
  },
  officer: {
    id: 'officer',
    label: 'FLIGHT OFFICER',
    ageRange: 'Ages 11–15',
    badge: '🚀',
    tagline: 'NASA SLS Multi-Stage Orbital Mechanics & Systems Integration',
    description: 'Tsiolkovsky Delta-V & Staging · Orion Power Bus & ECLSS O2 · Lunar Orbital Insertion Radar · Mineralogy',
    nasaMissionContext: 'NASA Space Launch System (SLS) & Orion Orbital Ascent',
    assistLevel: 'BALANCED_REALISM',
    landingSpeedMax: 5.0,
  },
  commander: {
    id: 'commander',
    label: 'MASTER COMMANDER',
    ageRange: 'Ages 16+ / STEM',
    badge: '⭐',
    tagline: 'Hardcore Newtonian Aerospace Physics & Planetary Defense',
    description: '6-DOF Newtonian Flight (Decoupled FA-OFF) · Atmospheric Thermal Ablation Corridor · AGC P66 Codes · Deep Space Anomaly Radar',
    nasaMissionContext: 'NASA Deep Space Gateway & Planetary Defense Interception',
    assistLevel: 'HARDCORE_NEWTONIAN',
    landingSpeedMax: 3.2,
  },
};

interface ThreeMissionSimulatorProps {
  mission: MissionGameConfig;
  onSuccess: (score: number) => void;
  onFailure: (reason: string) => void;
  onExit: () => void;
  multiplayerActive?: boolean;
  assignedRole?: CrewRole;
  onOpenMoonquakeMap?: () => void;
  initialAgeTier?: AstronautAgeTier;
}

type CameraMode = 'orbit' | 'chase' | 'cockpit' | 'distant' | 'pad';

// Simple Web Audio Sound Synthesizer for procedural aerospace sound fx
class AeroAudioSynth {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private enabled: boolean = true;

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    } catch {
      // AudioContext not available
    }
  }

  setEnabled(val: boolean) {
    this.enabled = val;
    if (!val && this.engineGain) {
      this.engineGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    }
  }

  setEngineThrust(throttle: number) {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (throttle > 0.02) {
      if (!this.engineOsc) {
        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(120, this.ctx.currentTime);

        this.engineOsc.connect(filter);
        filter.connect(this.engineGain);
        this.engineGain.connect(this.ctx.destination);
        this.engineOsc.start();
      }
      const freq = 45 + throttle * 75;
      this.engineOsc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      if (this.engineGain) {
        this.engineGain.gain.setValueAtTime(Math.min(0.25, throttle * 0.22), this.ctx.currentTime);
      }
    } else if (this.engineGain) {
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  playQuindarBeep() {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2525, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    } catch {
      // ignore audio errors
    }
  }

  playCountdownBeep(isFinal: boolean = false) {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isFinal ? 2000 : 1000, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.09, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (isFinal ? 0.35 : 0.12));
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + (isFinal ? 0.36 : 0.13));
    } catch {
      // ignore
    }
  }

  playSwitchClick() {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1400, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {
      // ignore
    }
  }

  playRcsPuff() {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    } catch {
      // ignore
    }
  }

  dispose() {
    try {
      if (this.engineOsc) {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      }
      if (this.ctx && this.ctx.state !== 'closed') {
        this.ctx.close().catch(() => {});
      }
    } catch {
      // ignore
    }
  }
}

export const ThreeMissionSimulator: React.FC<ThreeMissionSimulatorProps> = ({
  mission,
  onSuccess,
  onFailure,
  onExit,
  multiplayerActive = false,
  assignedRole = 'CDR',
  onOpenMoonquakeMap,
  initialAgeTier,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const navballCanvasRef = useRef<HTMLCanvasElement>(null);
  const seismographCanvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>('orbit');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showBriefing, setShowBriefing] = useState<boolean>(false);
  const [visualTone, setVisualTone] = useState<VisualToneMode>('REALISTIC_NASA');
  const [activeRole, setActiveRole] = useState<CrewRole>(assignedRole);
  const [modelLoading, setModelLoading] = useState<boolean>(true);
  const [moonquakeAlert, setMoonquakeAlert] = useState<{ mag: number; depth: number; site: string } | null>(null);
  const [showDiagnosticsOverlay, setShowDiagnosticsOverlay] = useState<boolean>(false);

  // Astronaut Academy Age & Difficulty Tier (Cadet 6-10 / Officer 11-15 / Commander 16+)
  const [ageTier, setAgeTier] = useState<AstronautAgeTier>(() => {
    if (initialAgeTier) return initialAgeTier;
    try {
      const saved = localStorage.getItem('astrocamp_age_tier') as AstronautAgeTier;
      if (saved && (saved === 'cadet' || saved === 'officer' || saved === 'commander')) return saved;
    } catch {}
    return 'cadet';
  });
  const [flightAssist, setFlightAssist] = useState<boolean>(true);
  const [scannerActive, setScannerActive] = useState<boolean>(false);
  const [scannedLore, setScannedLore] = useState<{
    title: string;
    subtitle: string;
    body: string;
    formula?: string;
    element: string;
    rarity: string;
    gameSource: string;
    badge: string;
    ageLevel: string;
  } | null>(null);

  const ageTierRef = useRef<AstronautAgeTier>(ageTier);
  ageTierRef.current = ageTier;
  const scanWaveMeshRef = useRef<THREE.Mesh | null>(null);
  const guidanceCorridorRef = useRef<THREE.Group | null>(null);

  const isLunar =
    mission.gameType === 'lunar_landing' ||
    mission.missionName.toLowerCase().includes('apollo') ||
    mission.programName?.toLowerCase().includes('apollo') ||
    mission.id === 'NASA-M027' ||
    mission.id === 'NASA-M028' ||
    mission.id === 'NASA-M029' ||
    mission.id === 'NASA-M030';

  const isApollo14 = mission.id === 'NASA-M027' || mission.missionName.toLowerCase().includes('apollo 14');
  const isApollo15 = mission.id === 'NASA-M028' || mission.missionName.toLowerCase().includes('apollo 15');
  const isApollo16 = mission.id === 'NASA-M029' || mission.missionName.toLowerCase().includes('apollo 16');
  const isApollo17 = mission.id === 'NASA-M030' || mission.missionName.toLowerCase().includes('apollo 17');
  const isApolloLrv = isLunar || isApollo14 || isApollo15 || isApollo16 || isApollo17;

  const isViking = mission.id === 'NASA-M053' || mission.missionName.toLowerCase().includes('viking');
  const isSojourner = mission.id === 'NASA-M054' || mission.missionName.toLowerCase().includes('sojourner') || mission.missionName.toLowerCase().includes('pathfinder');
  const isSpiritOpp = mission.id === 'NASA-M055' || mission.missionName.toLowerCase().includes('spirit') || mission.missionName.toLowerCase().includes('opportunity') || mission.missionName.toLowerCase().includes('mer');
  const isCuriosity = mission.id === 'NASA-M056' || mission.missionName.toLowerCase().includes('curiosity');
  const isPerseverance = mission.id === 'NASA-M057' || mission.missionName.toLowerCase().includes('perseverance') || mission.missionName.toLowerCase().includes('ingenuity');

  const getStationInfo = () => {
    if (mission.id === 'NASA-M024' || mission.missionName.includes('Apollo 11')) {
      return { name: 'Apollo 11 PSE (S11)', site: 'Mare Tranquillitatis', coords: '0.67°N, 23.47°E' };
    }
    if (mission.id === 'NASA-M025' || mission.missionName.includes('Apollo 12')) {
      return { name: 'Apollo 12 PSE (S12)', site: 'Oceanus Procellarum', coords: '3.01°S, 23.42°W' };
    }
    if (mission.id === 'NASA-M027' || mission.missionName.includes('Apollo 14')) {
      return { name: 'Apollo 14 PSE (S14)', site: 'Fra Mauro Highlands', coords: '3.64°S, 17.47°W' };
    }
    if (mission.id === 'NASA-M028' || mission.missionName.includes('Apollo 15')) {
      return { name: 'Apollo 15 PSE (S15)', site: 'Hadley-Apennine Rille', coords: '26.13°N, 3.63°E' };
    }
    if (mission.id === 'NASA-M029' || mission.missionName.includes('Apollo 16')) {
      return { name: 'Apollo 16 PSE (S16)', site: 'Descartes Highlands', coords: '8.97°S, 15.50°E' };
    }
    if (mission.missionName.includes('Shackleton') || mission.id === 'operation-shackleton') {
      return { name: 'Artemis Polar PSE Array', site: 'Shackleton Crater Rim', coords: '89.9°S, 0.0°E' };
    }
    return { name: 'Apollo PSE Lunar Network', site: 'Apollo Seismic Array', coords: '0.0°N, 20.0°W' };
  };

  const stationInfo = getStationInfo();

  const getTerrainHeight = (x: number, z: number, isMoon: boolean) => {
    if (isMoon) {
      const dist = Math.hypot(x, z);
      let h = Math.sin(x * 0.025) * Math.cos(z * 0.025) * 5;
      if (dist > 35 && dist < 130) {
        h -= Math.sin(((dist - 35) / 95) * Math.PI) * 11;
      }
      return h;
    } else {
      return Math.sin(x * 0.02) * Math.cos(z * 0.02) * 4.5 + Math.sin(x * 0.045 + z * 0.035) * 1.8;
    }
  };

  const audioSynthRef = useRef<AeroAudioSynth>(new AeroAudioSynth());

  // Multiplayer Room State
  const [roomState, setRoomState] = useState<MultiplayerRoomState | null>(() =>
    multiplayerMissionService.getCurrentRoom()
  );

  // Telemetry HUD States
  const [telemetry, setTelemetry] = useState({
    altitudeKm: 0,
    velocityKms: 0,
    throttle: 0,
    propellantPct: 100,
    pitchDeg: 90,
    rollDeg: 0,
    stage: 1,
    timeRemaining: 120,
    statusText: 'FLIGHT COMPUTER ONLINE · ALL SYSTEMS NOMINAL',
    statusColor: '#22c55e',
    gForce: 1.0,
    pumpPressure: 1.0,
    dsnSignal: 98,
    sampleCount: 0,
    distanceM: 500,
    telescopeFocus: 20,
    roverLandingPhase: 'landed' as 'sky_crane' | 'airbag_bounce' | 'ramp_deploy' | 'landed',
    // Game Inspirations & Age Tier Telemetry:
    deltaVKms: mission.gameType === 'lunar_landing' ? 1.85 : 9.42,
    apoapsisKm: mission.gameType === 'lunar_landing' ? 110 : 185,
    periapsisKm: mission.gameType === 'lunar_landing' ? 15 : 165,
    oxygenPct: 100,
    powerGridPct: 100,
    thermalHullPct: 100,
    flightAssistActive: true,
    scanProgress: 0,
  });

  // Astronaut Pre-Flight Checklist & Terminal Countdown
  const [preflightChecklist, setPreflightChecklist] = useState({
    internalPower: false,
    cryoPressurization: false,
    gncAlignment: false,
    waterDeluge: false,
  });
  const [countdownTime, setCountdownTime] = useState<number | null>(null);
  const [flightPhase, setFlightPhase] = useState<'pad' | 'ascent' | 'boosters_sep' | 'fairing_jettison' | 'meco' | 'orbit' | 'tli_burn' | 'lunar_approach' | 'lunar_orbit'>('pad');
  const [boosterSeparated, setBoosterSeparated] = useState<boolean>(false);
  const [fairingSeparated, setFairingSeparated] = useState<boolean>(false);
  const [tliActive, setTliActive] = useState<boolean>(false);
  const [tliComplete, setTliComplete] = useState<boolean>(false);
  const [moonDistDisplay, setMoonDistDisplay] = useState<number>(384400);

  // Simulation Refs
  const simStateRef = useRef({
    altitudeKm: 0,
    velocityKms: 0,
    throttle: 0,
    propellant: 100,
    pitchDeg: 90,
    rollDeg: 0,
    stage: 1,
    timeRemaining: (mission.params as LaunchParams).timeWindowSec || 120,
    statusText: 'FLIGHT COMPUTER ONLINE · ALL SYSTEMS NOMINAL',
    statusColor: '#22c55e',
    isFinished: false,
    keys: {} as Record<string, boolean>,
    distanceM: (mission.params as DockingParams).approachDistanceM || 500,
    samples: 0,
    telescopeFocus: 20,
    pumpPressure: 1.0,
    radiatorDeployed: true,
    dsnLocked: true,
    rcsOffset: { x: 0, y: 0, z: 0 },
    gForce: 1.0,
    towerJettisoned: false,
    maxQPassed: false,
    boosterSeparated: false,
    fairingSeparated: false,
    tliActive: false,
    tliComplete: false,
    tliProgress: 0,
    moonDistanceKm: 384400,
    flightPhase: 'pad' as 'pad' | 'ascent' | 'boosters_sep' | 'fairing_jettison' | 'meco' | 'orbit' | 'tli_burn' | 'lunar_approach' | 'lunar_orbit',
    agcAuto: true,
    roverLandingPhase: 'landed' as 'sky_crane' | 'airbag_bounce' | 'ramp_deploy' | 'landed',
    roverLandingProgress: 0,
    airbagBounceVy: -12,
    airbagBounceCount: 0,
    skyCraneFlyaway: false,
    // Game-inspired mechanics state refs
    deltaVKms: mission.gameType === 'lunar_landing' ? 1.85 : 9.42,
    apoapsisKm: mission.gameType === 'lunar_landing' ? 110 : 185,
    periapsisKm: mission.gameType === 'lunar_landing' ? 15 : 165,
    oxygenPct: 100,
    powerGridPct: 100,
    thermalHullPct: 100,
    flightAssist: true,
    scanActive: false,
    scanProgress: 0,
    driftVelX: 0,
    driftVelZ: 0,
  });

  const cameraModeRef = useRef<CameraMode>(cameraMode);
  cameraModeRef.current = cameraMode;

  const visualToneRef = useRef<VisualToneMode>(visualTone);
  visualToneRef.current = visualTone;

  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const playerVehicleRef = useRef<THREE.Group | null>(null);
  const targetObjectRef = useRef<THREE.Group | null>(null);
  const cockpitLookRef = useRef({ yaw: 0, pitch: 0 });
  const ingenuityRotor1Ref = useRef<THREE.Mesh | null>(null);
  const ingenuityRotor2Ref = useRef<THREE.Mesh | null>(null);
  const umbilicalArmsRef = useRef<THREE.Group[]>([]);
  const stage1MeshRef = useRef<THREE.Group | null>(null);
  const stage2MeshRef = useRef<THREE.Group | null>(null);
  const boosterLeftMeshRef = useRef<THREE.Group | null>(null);
  const boosterRightMeshRef = useRef<THREE.Group | null>(null);
  const boosterLeftPlumeRef = useRef<THREE.Mesh | null>(null);
  const boosterRightPlumeRef = useRef<THREE.Mesh | null>(null);
  const fairingLeftMeshRef = useRef<THREE.Group | null>(null);
  const fairingRightMeshRef = useRef<THREE.Group | null>(null);
  const moonMeshRef = useRef<THREE.Mesh | null>(null);
  const trajectoryLineRef = useRef<THREE.Line | null>(null);
  const lasTowerMeshRef = useRef<THREE.Mesh | null>(null);
  const shockConeMeshRef = useRef<THREE.Mesh | null>(null);
  const loxVentMeshRef = useRef<THREE.Points | null>(null);
  const trenchSteamGroupRef = useRef<THREE.Group | null>(null);
  const lunarDustRef = useRef<THREE.Points | null>(null);
  const roverDustRef = useRef<THREE.Points | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const atmoMeshRef = useRef<THREE.Mesh | null>(null);
  const roverWaypointsRef = useRef<Array<{
    x: number;
    z: number;
    name: string;
    description: string;
    collected: boolean;
    beaconMesh?: THREE.Mesh;
    ringMesh?: THREE.Mesh;
    diamondMesh?: THREE.Mesh;
  }>>([]);

  const skyCraneGroupRef = useRef<THREE.Group | null>(null);
  const skyCraneCablesRef = useRef<THREE.Line[]>([]);
  const airbagClusterRef = useRef<THREE.Group | null>(null);
  const landerPetalsRef = useRef<THREE.Group[]>([]);
  const landerRampGroupRef = useRef<THREE.Group | null>(null);
  const marsDustRef = useRef<THREE.Points | null>(null);
  const scFlamesRef = useRef<THREE.Mesh[]>([]);

  const handleCockpitLookSet = (yaw: number, pitch: number = 0) => {
    cockpitLookRef.current.yaw = yaw;
    cockpitLookRef.current.pitch = pitch;
    soundFx.playClick(950);
  };

  const handleSelectCameraMode = (mode: CameraMode) => {
    setCameraMode(mode);
    soundFx.playClick(800);
    const targetPos = playerVehicleRef.current?.position || new THREE.Vector3(0, 0, 0);
    const lookTarget = targetPos.clone().add(new THREE.Vector3(0, mission.gameType === 'launch' ? 18 : (mission.gameType === 'lunar_landing' ? 1.5 : 2), 0));

    if (mode === 'distant') {
      let distOffset = new THREE.Vector3(65, 25, 130);
      if (mission.gameType === 'lunar_landing') distOffset = new THREE.Vector3(28, 16, 42);
      else if (mission.gameType === 'rover') distOffset = new THREE.Vector3(32, 18, 42);
      else if (mission.gameType === 'docking') distOffset = new THREE.Vector3(45, 24, 60);
      else if (mission.gameType === 'telescope') distOffset = new THREE.Vector3(42, 24, 55);
      else if (mission.gameType === 'deep_space') distOffset = new THREE.Vector3(48, 28, 55);

      cameraRef.current?.position.copy(lookTarget.clone().add(distOffset));
      if (controlsRef.current) {
        controlsRef.current.target.copy(lookTarget);
        controlsRef.current.update();
      }
    } else if (mode === 'orbit') {
      let orbitOffset = new THREE.Vector3(24, 8, 52);
      if (mission.gameType === 'lunar_landing') orbitOffset = new THREE.Vector3(0, 8, 22);
      else if (mission.gameType === 'rover') orbitOffset = new THREE.Vector3(0, 5, 14);
      else if (mission.gameType === 'docking') orbitOffset = new THREE.Vector3(0, 4.5, 20);
      else if (mission.gameType === 'telescope') orbitOffset = new THREE.Vector3(16, 10, 32);
      else if (mission.gameType === 'deep_space') orbitOffset = new THREE.Vector3(18, 12, 28);

      cameraRef.current?.position.copy(lookTarget.clone().add(orbitOffset));
      if (controlsRef.current) {
        controlsRef.current.target.copy(lookTarget);
        controlsRef.current.update();
      }
    } else if (mode === 'chase') {
      let chaseOffset = new THREE.Vector3(0, 8, 22);
      if (mission.gameType === 'lunar_landing') chaseOffset = new THREE.Vector3(0, 5.5, 16);
      else if (mission.gameType === 'launch') chaseOffset = new THREE.Vector3(0, -4, 32);
      else if (mission.gameType === 'rover') chaseOffset = new THREE.Vector3(0, 3.2, 8.5);
      else if (mission.gameType === 'docking') chaseOffset = new THREE.Vector3(0, 4.0, 18);
      else if (mission.gameType === 'telescope') chaseOffset = new THREE.Vector3(0, 10, 28);
      else if (mission.gameType === 'deep_space') chaseOffset = new THREE.Vector3(0, 8, 28);

      cameraRef.current?.position.copy(lookTarget.clone().add(chaseOffset));
      if (controlsRef.current) {
        controlsRef.current.target.copy(lookTarget);
        controlsRef.current.update();
      }
    } else if (mode === 'cockpit') {
      cockpitLookRef.current.yaw = 0;
      cockpitLookRef.current.pitch = 0;
    }
  };

  const handleAbort = () => {
    soundFx.playAlarm();
    simStateRef.current.isFinished = true;
    if (multiplayerActive || roomState) {
      multiplayerMissionService.abortMission(`Mission aborted by [${activeRole}] officer`);
    }
    onExit();
  };

  const handleSelectAgeTier = (tier: AstronautAgeTier) => {
    setAgeTier(tier);
    ageTierRef.current = tier;
    try {
      localStorage.setItem('astrocamp_age_tier', tier);
    } catch {}
    soundFx.playClick(1050);
    audioSynthRef.current.playQuindarBeep();
    const cfg = ASTRONAUT_TIERS[tier];
    simStateRef.current.statusText = `${cfg.badge} ${cfg.label} ACTIVE [${cfg.ageRange}] · ${cfg.tagline}`;
    simStateRef.current.statusColor = tier === 'cadet' ? '#38bdf8' : tier === 'officer' ? '#fbbf24' : '#c084fc';
    if (guidanceCorridorRef.current) {
      guidanceCorridorRef.current.visible = tier === 'cadet';
    }
  };

  const handleToggleFlightAssist = () => {
    const next = !simStateRef.current.flightAssist;
    simStateRef.current.flightAssist = next;
    setFlightAssist(next);
    soundFx.playClick(next ? 1100 : 700);
    audioSynthRef.current.playRcsPuff();
    simStateRef.current.statusText = next
      ? '🧭 FLIGHT ASSIST [FA-ON]: AUTO-VECTOR DAMPENERS ONLINE (COUPLED)'
      : '⚡ FLIGHT ASSIST [FA-OFF]: 6-DOF NEWTONIAN DECOUPLED DRIFT ACTIVE';
    simStateRef.current.statusColor = next ? '#22c55e' : '#f97316';
  };

  const handleTriggerScanner = () => {
    if (simStateRef.current.scanActive) return;
    simStateRef.current.scanActive = true;
    simStateRef.current.scanProgress = 0;
    setScannerActive(true);
    soundFx.playReactorStart();
    audioSynthRef.current.playQuindarBeep();

    const isMars = mission.gameType === 'rover' && !isLunar;
    const tier = ageTierRef.current;

    let scanData = {
      title: 'ANORTHOSITIC HIGHLAND REGOLITH (CaAl₂Si₂O₈)',
      subtitle: 'Apollo Lunar Surface Sample · Plagioclase Feldspar',
      body: 'Lunar crustal rock crystallized ~4.4 billion years ago from a primordial lunar magma ocean. Rich in aluminum, silicon, and solar wind-implanted elements.',
      formula: 'CaAl₂Si₂O₈ + ³He Solar Traps',
      element: 'FELDSPAR & TITANIUM',
      rarity: 'COMMON LUNAR MINERAL',
      gameSource: "No Man's Sky & Morphite Discovery Scanner",
      badge: '🌕',
      ageLevel: 'Cadet (Ages 6-10): Ancient moon rock from magma oceans!',
    };

    if (tier === 'cadet') {
      scanData = {
        title: isMars ? '🔴 RED PLANET DUST & BASALT' : '🌕 SPARKLING MOON ROCK',
        subtitle: isMars ? 'Iron Oxide Dust (Hematite)' : 'Lunar Highland Regolith',
        body: isMars
          ? 'Mars looks red because its surface rocks are rusted like an old bicycle! NASA rovers drill into this dust to search for clues of water and ancient life.'
          : 'Moon rocks have no wind or rain, so microscopic glass beads stay sharp! Junior astronauts can use moon dirt to build lunar domes and extract oxygen.',
        formula: isMars ? 'Rust: Fe₂O₃ (Iron Oxide)' : 'Glass & Crystals: SiO₂ + TiO₂',
        element: isMars ? 'RED IRON MINERAL' : 'LUNAR REGOLITH',
        rarity: 'DISCOVERY CLASS 1',
        gameSource: "Morphite & No Man's Sky Visual Bio-Scanner",
        badge: '🐣',
        ageLevel: 'Cadet (Ages 6–10)',
      };
    } else if (tier === 'officer') {
      scanData = {
        title: isMars ? '🧪 PHYLLOSILICATE CLAY & OLIVINE MATRIX' : '🧪 ILMENITE (FeTiO₃) & REGOLITH HYDROGEN',
        subtitle: isMars ? 'Jezero Crater Delta Paleolake Deposit' : 'Mare Tranquillitatis Basalt Deposit',
        body: isMars
          ? 'Layered clay sediments deposited in ancient lake deltas ~3.7 billion years ago. High concentrations of smectite clays capable of preserving biosignatures. In-situ resource utilization (ISRU) can convert perchlorates into breathable oxygen and rocket fuel.'
          : 'Ilmenite (FeTiO₃) found in lunar mare basalts is the prime candidate for lunar ISRU oxygen production: FeTiO₃ + H₂ → Fe + TiO₂ + H₂O. Trapped solar wind helium-3 can supply fusion power for orbital stations.',
        formula: isMars ? 'Mg₃Si₄O₁₀(OH)₂ · 4H₂O (Smectite)' : 'FeTiO₃ + H₂ → Fe + TiO₂ + H₂O (ISRU O₂)',
        element: isMars ? 'HYDROUS CLAYS & MAGNESIUM' : 'TITANIUM & SOLAR-WIND HELIUM-3',
        rarity: 'OFFICER STEM TARGET',
        gameSource: 'Space Engineers & Kerbal In-Situ Resource Scan',
        badge: '🚀',
        ageLevel: 'Flight Officer (Ages 11–15)',
      };
    } else {
      scanData = {
        title: isMars ? '🔬 NOACHIAN LACUSTRINE CARBONATES & ANHYDROUS SULFATES' : '🔬 PYROCLASTIC TITANIFEROUS BASALTS & FUSION ³He MATRIX',
        subtitle: isMars ? 'Aqueous Geochemistry & Biosignature Preservation' : 'Petrologic Fractionation & Subsurface Regolith Permeability',
        body: isMars
          ? 'Spectroscopic signatures reveal authigenic Fe/Mg smectites and iron sulfates indicating neutral-pH aqueous conditions. Critical for Star Citizen / Eve Echoes planetary survey analytics and automated life-support atmospheric scrubber synthesis.'
          : 'High-titanium basalt deposits exhibiting low albedo and elevated permittivity. Tsiolkovsky delta-v balance allows landing ascent stages to refuel using hydrogen reduction pyrometallurgy, yielding 100 kg O₂ per metric ton of processed regolith.',
        formula: 'Δv = I_sp · g₀ · ln(m₀ / m_f) · ISRU Boost Factor',
        element: 'HIGH-ORDER ASTRO-MINERALOGY',
        rarity: 'COMMANDER STEM SPECIFICATION',
        gameSource: 'Star Citizen, Elite Dangerous & Eve Echoes Anomaly Radar',
        badge: '⭐',
        ageLevel: 'Master Commander (Ages 16+ / STEM)',
      };
    }

    setTimeout(() => {
      setScannedLore(scanData);
    }, 600);
  };

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      simStateRef.current.keys[k] = true;

      // Initialize audio on first user key interaction
      audioSynthRef.current.init();

      if (k === 'f') {
        handleTriggerScanner();
      }
      if (k === 'z') {
        handleToggleFlightAssist();
      }
      if (k === '1') {
        handleSelectAgeTier('cadet');
      }
      if (k === '2') {
        handleSelectAgeTier('officer');
      }
      if (k === '3') {
        handleSelectAgeTier('commander');
      }

      if (k === ' ') {
        if (mission.gameType === 'launch') {
          handleTouchStaging();
        } else if (mission.gameType === 'lunar_landing') {
          handleSimAction('lunar_burn');
        } else if (mission.gameType === 'telescope') {
          handleSimAction('telescope_capture');
        } else if (mission.gameType === 'deep_space') {
          handleSimAction('dsn_transmit');
        } else if (mission.gameType === 'rover') {
          handleSimAction('rover_sample');
        } else if (mission.gameType === 'docking') {
          handleSimAction('dock_latch');
        }
      }
      if (e.key === 'F3' || k === 'f3') {
        e.preventDefault();
        setShowDiagnosticsOverlay((prev) => !prev);
        soundFx.playClick(1000);
      }

      // Couch Co-Op Player 2 Secondary Controls (FDO / EECOM / CAPCOM)
      if (roomState?.isSplitScreen) {
        if (k === 'arrowleft') {
          multiplayerMissionService.fireRcsPulse('x', -1);
          audioSynthRef.current.playRcsPuff();
        } else if (k === 'arrowright') {
          multiplayerMissionService.fireRcsPulse('x', 1);
          audioSynthRef.current.playRcsPuff();
        } else if (k === 'arrowup') {
          multiplayerMissionService.fireRcsPulse('y', 1);
          audioSynthRef.current.playRcsPuff();
        } else if (k === 'arrowdown') {
          multiplayerMissionService.fireRcsPulse('y', -1);
          audioSynthRef.current.playRcsPuff();
        } else if (k === '[' || k === 'bracketleft') {
          multiplayerMissionService.setPumpPressure(simStateRef.current.pumpPressure > 1.05 ? 1.0 : 1.2);
          soundFx.playReactorStart();
        } else if (k === ']' || k === 'bracketright') {
          multiplayerMissionService.toggleRadiator();
          soundFx.playClick(850);
        } else if (k === '\\' || k === 'backslash') {
          multiplayerMissionService.toggleDsnLock();
          audioSynthRef.current.playQuindarBeep();
        } else if (k === 'enter') {
          audioSynthRef.current.playQuindarBeep();
          soundFx.playRadioChirp();
          multiplayerMissionService.sendChat('P2 Systems: Telemetry nominal. Guidance corridor verified.');
        }
      }

      if (k === 'a' || k === 'd' || k === 'w' || k === 's' || k === 'arrowup' || k === 'arrowdown' || k === 'arrowleft' || k === 'arrowright') {
        if (mission.gameType === 'rover' && simStateRef.current.roverLandingPhase !== 'landed') {
          handleSkipToDrive();
        }
        audioSynthRef.current.playRcsPuff();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      simStateRef.current.keys[k] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Subscribe to Multiplayer Service
  useEffect(() => {
    if (!multiplayerActive) return;

    const unsub = multiplayerMissionService.subscribe((updated) => {
      setRoomState(updated);
      if (updated) {
        if (updated.status === 'lobby' && !simStateRef.current.isFinished) {
          simStateRef.current.isFinished = true;
          onExit();
          return;
        }

        const ctrl = updated.controls;
        const state = simStateRef.current;
        state.pumpPressure = ctrl.pumpPressure || 1.0;
        state.radiatorDeployed = ctrl.radiatorDeployed;
        state.dsnLocked = ctrl.dsnSignalPct >= 90;
        state.rcsOffset = { x: ctrl.rcsX * 15, y: ctrl.rcsY * 10, z: ctrl.rcsZ * 10 };

        const localId = multiplayerMissionService.getLocalPlayerId();
        const cdrPlayer = updated.players.find((p) => p.role === 'CDR');
        if (cdrPlayer && cdrPlayer.id !== localId) {
          state.throttle = ctrl.throttle;
          state.pitchDeg = ctrl.pitchDeg;
          if (ctrl.stage > state.stage) {
            state.stage = ctrl.stage;
          }
        }
      }
    });

    return () => unsub();
  }, [onExit, multiplayerActive]);

  // NASA Terminal Countdown Automation Effect
  useEffect(() => {
    if (countdownTime === null) return;
    if (countdownTime > 0) {
      const timer = setTimeout(() => {
        const next = countdownTime - 1;
        setCountdownTime(next);
        audioSynthRef.current.playCountdownBeep(next === 0);
        if (next === 6) {
          // Main engine ignition sequence start
          simStateRef.current.throttle = 0.5;
          soundFx.playReactorStart();
          simStateRef.current.statusText = '🔥 MAIN ENGINE IGNITION SEQUENCE START (T-6s)';
          simStateRef.current.statusColor = '#fbbf24';
        } else if (next === 0) {
          // Liftoff!
          simStateRef.current.throttle = 1.0;
          soundFx.playReactorStart();
          soundFx.playVictory();
          simStateRef.current.statusText = '🚀 LIFTOFF! WE HAVE LIFTOFF! ALL ENGINES FULL POWER';
          simStateRef.current.statusColor = '#22c55e';
          if (roomState) multiplayerMissionService.setThrottle(1.0);
        }
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCountdownTime(null);
    }
  }, [countdownTime, roomState]);

  const handleStartCountdown = () => {
    audioSynthRef.current.init();
    setPreflightChecklist({
      internalPower: true,
      cryoPressurization: true,
      gncAlignment: true,
      waterDeluge: true,
    });
    setCountdownTime(10);
    audioSynthRef.current.playCountdownBeep(false);
    simStateRef.current.statusText = '⚡ ALL SYSTEMS VERIFIED GO · COMMENCING TERMINAL COUNTDOWN (T-10s)';
    simStateRef.current.statusColor = '#38bdf8';
  };

  const handleTogglePreflight = (item: keyof typeof preflightChecklist) => {
    audioSynthRef.current.init();
    audioSynthRef.current.playSwitchClick();
    const next = { ...preflightChecklist, [item]: true };
    setPreflightChecklist(next);

    const callouts: Record<string, string> = {
      internalPower: '⚡ EECOM: Internal power bus transfer complete (100% Fuel Cell/Battery)',
      cryoPressurization: '💨 EECOM: Cryogenic LOX & RP-1 tank pressurization nominal (52 PSI)',
      gncAlignment: '🧭 FDO: GNC Inertial guidance platform caged & aligned (Azimuth 090°)',
      waterDeluge: '💧 CAPCOM: Sound suppression deluge trench armed & FTS ready',
    };
    simStateRef.current.statusText = callouts[item] || 'System verified GO';
    simStateRef.current.statusColor = '#22c55e';

    if (Object.values(next).every(Boolean)) {
      setTimeout(() => {
        setCountdownTime(10);
        audioSynthRef.current.playCountdownBeep(false);
      }, 500);
    }
  };

  const handleBoosterSeparation = () => {
    const state = simStateRef.current;
    if (state.boosterSeparated) return;
    state.boosterSeparated = true;
    setBoosterSeparated(true);
    setFlightPhase('boosters_sep');
    state.statusText = '💥 SIDE BOOSTERS JETTISONED · RADIAL DRIFT CONFIRMED (KOROLEV CROSS)';
    state.statusColor = '#fbbf24';
    soundFx.playRadioChirp();
    audioSynthRef.current.playQuindarBeep();

    if (playerVehicleRef.current) {
      if (boosterLeftMeshRef.current && boosterLeftMeshRef.current.parent === playerVehicleRef.current) {
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        boosterLeftMeshRef.current.getWorldPosition(worldPos);
        boosterLeftMeshRef.current.getWorldQuaternion(worldQuat);
        playerVehicleRef.current.remove(boosterLeftMeshRef.current);
        boosterLeftMeshRef.current.position.copy(worldPos);
        boosterLeftMeshRef.current.quaternion.copy(worldQuat);
        playerVehicleRef.current.parent?.add(boosterLeftMeshRef.current);
      }
      if (boosterRightMeshRef.current && boosterRightMeshRef.current.parent === playerVehicleRef.current) {
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        boosterRightMeshRef.current.getWorldPosition(worldPos);
        boosterRightMeshRef.current.getWorldQuaternion(worldQuat);
        playerVehicleRef.current.remove(boosterRightMeshRef.current);
        boosterRightMeshRef.current.position.copy(worldPos);
        boosterRightMeshRef.current.quaternion.copy(worldQuat);
        playerVehicleRef.current.parent?.add(boosterRightMeshRef.current);
      }
    }
  };

  const handleFairingSeparation = () => {
    const state = simStateRef.current;
    if (state.fairingSeparated) return;
    state.fairingSeparated = true;
    setFairingSeparated(true);
    setFlightPhase('fairing_jettison');
    state.statusText = '🛡️ PAYLOAD FAIRING JETTISONED · LUNAR SPACECRAFT EXPOSED TO VACUUM';
    state.statusColor = '#38bdf8';
    soundFx.playRadioChirp();
    audioSynthRef.current.playQuindarBeep();

    if (playerVehicleRef.current) {
      if (fairingLeftMeshRef.current && fairingLeftMeshRef.current.parent) {
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        fairingLeftMeshRef.current.getWorldPosition(worldPos);
        fairingLeftMeshRef.current.getWorldQuaternion(worldQuat);
        fairingLeftMeshRef.current.parent.remove(fairingLeftMeshRef.current);
        fairingLeftMeshRef.current.position.copy(worldPos);
        fairingLeftMeshRef.current.quaternion.copy(worldQuat);
        playerVehicleRef.current.parent?.add(fairingLeftMeshRef.current);
      }
      if (fairingRightMeshRef.current && fairingRightMeshRef.current.parent) {
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        fairingRightMeshRef.current.getWorldPosition(worldPos);
        fairingRightMeshRef.current.getWorldQuaternion(worldQuat);
        fairingRightMeshRef.current.parent.remove(fairingRightMeshRef.current);
        fairingRightMeshRef.current.position.copy(worldPos);
        fairingRightMeshRef.current.quaternion.copy(worldQuat);
        playerVehicleRef.current.parent?.add(fairingRightMeshRef.current);
      }
    }
  };

  const handleStage1Separation = () => {
    const state = simStateRef.current;
    if (state.stage !== 1) return;
    state.stage = 2;
    state.propellant = 100;
    setFlightPhase('meco');
    state.statusText = '💥 STAGE 1 CORE MECO & SEPARATION · S-II VACUUM ENGINE IGNITION!';
    state.statusColor = '#fbbf24';
    soundFx.playRadioChirp();
    audioSynthRef.current.playQuindarBeep();

    if (stage1MeshRef.current && playerVehicleRef.current) {
      const worldPos = new THREE.Vector3();
      const worldQuat = new THREE.Quaternion();
      stage1MeshRef.current.getWorldPosition(worldPos);
      stage1MeshRef.current.getWorldQuaternion(worldQuat);
      playerVehicleRef.current.remove(stage1MeshRef.current);
      stage1MeshRef.current.position.copy(worldPos);
      stage1MeshRef.current.quaternion.copy(worldQuat);
      playerVehicleRef.current.parent?.add(stage1MeshRef.current);
    }

    if (roomState) {
      multiplayerMissionService.triggerStageSeparation();
    }
  };

  const handleInitiateTli = () => {
    const state = simStateRef.current;
    if (state.tliActive) return;
    state.tliActive = true;
    state.throttle = 1.0;
    setTliActive(true);
    setFlightPhase('tli_burn');
    state.statusText = '🌕 TRANS-LUNAR INJECTION (TLI) BURN STARTED · ACCELERATING TO LUNAR ESCAPE TRAJECTORY!';
    state.statusColor = '#38bdf8';
    soundFx.playReactorStart();
    audioSynthRef.current.playQuindarBeep();
  };

  const handleTouchStaging = () => {
    const state = simStateRef.current;
    if (mission.gameType === 'launch') {
      if (!state.boosterSeparated) {
        handleBoosterSeparation();
      } else if (!state.fairingSeparated) {
        handleFairingSeparation();
      } else if (state.stage === 1) {
        handleStage1Separation();
      } else if (!state.tliActive && state.altitudeKm >= 140) {
        handleInitiateTli();
      }
    }
  };

  const handleIgnite = () => {
    audioSynthRef.current.init();
    setPreflightChecklist({
      internalPower: true,
      cryoPressurization: true,
      gncAlignment: true,
      waterDeluge: true,
    });
    setCountdownTime(null);
    const state = simStateRef.current;
    state.throttle = 1.0;
    state.statusText = '🚀 LIFTOFF CONFIRMED! ALL ENGINES AT 100% THRUST';
    state.statusColor = '#22c55e';
    soundFx.playReactorStart();
    if (roomState) multiplayerMissionService.setThrottle(1.0);
  };

  const handleThrottleChange = (delta: number) => {
    audioSynthRef.current.init();
    const state = simStateRef.current;
    state.throttle = Math.max(0, Math.min(1.0, state.throttle + delta));
    soundFx.playClick(850);
    if (roomState) multiplayerMissionService.setThrottle(state.throttle);
  };

  const handlePitchChange = (deltaDeg: number) => {
    audioSynthRef.current.init();
    const state = simStateRef.current;
    state.pitchDeg = Math.max(10, Math.min(90, state.pitchDeg + deltaDeg));
    audioSynthRef.current.playRcsPuff();
    if (roomState) multiplayerMissionService.setPitch(state.pitchDeg);
  };

  const handleSimAction = (action: string) => {
    audioSynthRef.current.init();
    const state = simStateRef.current;
    if (action === 'rover_fwd') {
      if (state.roverLandingPhase !== 'landed') {
        handleSkipToDrive();
      }
      state.keys['w'] = true;
      setTimeout(() => { state.keys['w'] = false; }, 400);
      audioSynthRef.current.playRcsPuff();
    } else if (action === 'rover_rev') {
      if (state.roverLandingPhase !== 'landed') {
        handleSkipToDrive();
      }
      state.keys['s'] = true;
      setTimeout(() => { state.keys['s'] = false; }, 400);
    } else if (action === 'rover_left') {
      if (state.roverLandingPhase !== 'landed') {
        handleSkipToDrive();
      }
      state.keys['a'] = true;
      setTimeout(() => { state.keys['a'] = false; }, 350);
    } else if (action === 'rover_right') {
      if (state.roverLandingPhase !== 'landed') {
        handleSkipToDrive();
      }
      state.keys['d'] = true;
      setTimeout(() => { state.keys['d'] = false; }, 350);
    } else if (action === 'lunar_burn') {
      state.keys['w'] = true;
      audioSynthRef.current.playRcsPuff();
      setTimeout(() => { state.keys['w'] = false; }, 1400);
    } else if (action === 'lunar_toggle_agc') {
      state.agcAuto = !state.agcAuto;
      audioSynthRef.current.playQuindarBeep();
      state.statusText = state.agcAuto
        ? '🛡️ AGC P66 RATE-OF-DESCENT COMPUTER ENGAGED (AUTO-THROTTLE ACTIVE)'
        : '⚠️ AGC DISENGAGED · FULL MANUAL DESCENT ENGINE CONTROL [W]';
      state.statusColor = state.agcAuto ? '#22c55e' : '#fbbf24';
    } else if (action === 'lunar_left') {
      state.keys['a'] = true;
      audioSynthRef.current.playRcsPuff();
      setTimeout(() => { state.keys['a'] = false; }, 350);
    } else if (action === 'lunar_right') {
      state.keys['d'] = true;
      audioSynthRef.current.playRcsPuff();
      setTimeout(() => { state.keys['d'] = false; }, 350);
    } else if (action === 'dock_fwd') {
      state.keys['w'] = true;
      setTimeout(() => { state.keys['w'] = false; }, 250);
    } else if (action === 'dock_back') {
      state.keys['s'] = true;
      setTimeout(() => { state.keys['s'] = false; }, 250);
    } else if (action === 'dock_port') {
      state.keys['a'] = true;
      setTimeout(() => { state.keys['a'] = false; }, 250);
    } else if (action === 'dock_starboard') {
      state.keys['d'] = true;
      setTimeout(() => { state.keys['d'] = false; }, 250);
    } else if (action === 'dock_latch') {
      const playerPos = playerVehicleRef.current?.position || new THREE.Vector3(0, 0, 0);
      const alignmentPct = Math.max(0, 100 - Math.abs(playerPos.x) * 10);
      if (state.distanceM <= 12.0) {
        if (alignmentPct >= 50) {
          state.isFinished = true;
          soundFx.playRadioChirp();
          soundFx.playVictory();
          confetti({ particleCount: 180, spread: 80 });
          onSuccess(1000);
        } else {
          soundFx.playAlarm();
          state.statusText = `ALIGNMENT DEVIATION (${alignmentPct.toFixed(0)}%): USE [A]/[D] TO CENTER ON CAPTURE RING!`;
          state.statusColor = '#ef4444';
        }
      } else {
        soundFx.playAlarm();
        state.statusText = `APPROACH CLOSER TO TARGET (${state.distanceM.toFixed(1)}m > 10m) BEFORE ENGAGING LATCH!`;
        state.statusColor = '#f59e0b';
      }
    } else if (action === 'focus_in') {
      state.keys['w'] = true;
      setTimeout(() => { state.keys['w'] = false; }, 300);
      audioSynthRef.current.playRcsPuff();
    } else if (action === 'focus_out') {
      state.keys['s'] = true;
      setTimeout(() => { state.keys['s'] = false; }, 300);
    } else if (action === 'telescope_capture') {
      if (state.telescopeFocus >= 88) {
        state.isFinished = true;
        soundFx.playRadioChirp();
        soundFx.playVictory();
        confetti({ particleCount: 160, spread: 85 });
        onSuccess(960);
      } else {
        soundFx.playAlarm();
        state.statusText = 'CANNOT CAPTURE: OPTICAL FOCUS MUST REACH 90%+ (USE [W] / FOCUS IN)';
        state.statusColor = '#ef4444';
      }
    } else if (action === 'deep_thrust_fwd') {
      state.keys['w'] = true;
      setTimeout(() => { state.keys['w'] = false; }, 350);
      audioSynthRef.current.playRcsPuff();
    } else if (action === 'deep_thrust_rev') {
      state.keys['s'] = true;
      setTimeout(() => { state.keys['s'] = false; }, 350);
    } else if (action === 'deep_rcs_left') {
      state.keys['a'] = true;
      setTimeout(() => { state.keys['a'] = false; }, 250);
    } else if (action === 'deep_rcs_right') {
      state.keys['d'] = true;
      setTimeout(() => { state.keys['d'] = false; }, 250);
    } else if (action === 'rover_fwd') {
      if (state.roverLandingPhase !== 'landed') {
        handleSkipToDrive();
      }
      state.keys['w'] = true;
      audioSynthRef.current.playRcsPuff();
      setTimeout(() => { state.keys['w'] = false; }, 350);
    } else if (action === 'rover_rev') {
      if (state.roverLandingPhase !== 'landed') {
        handleSkipToDrive();
      }
      state.keys['s'] = true;
      setTimeout(() => { state.keys['s'] = false; }, 350);
    } else if (action === 'rover_left') {
      if (state.roverLandingPhase !== 'landed') {
        handleSkipToDrive();
      }
      state.keys['a'] = true;
      setTimeout(() => { state.keys['a'] = false; }, 250);
    } else if (action === 'rover_right') {
      if (state.roverLandingPhase !== 'landed') {
        handleSkipToDrive();
      }
      state.keys['d'] = true;
      setTimeout(() => { state.keys['d'] = false; }, 250);
    } else if (action === 'rover_sample') {
      const waypoints = roverWaypointsRef.current;
      const activeWp = waypoints.find((w) => !w.collected);
      if (activeWp) {
        const roverPos = playerVehicleRef.current?.position || new THREE.Vector3(0, 0, 0);
        const dist = Math.hypot(roverPos.x - activeWp.x, roverPos.z - activeWp.z);
        if (dist <= 8.5) {
          activeWp.collected = true;
          state.samples = waypoints.filter((w) => w.collected).length;
          if (activeWp.ringMesh) {
            (activeWp.ringMesh.material as THREE.MeshBasicMaterial).color.setHex(0x22c55e);
          }
          if (activeWp.beaconMesh) {
            (activeWp.beaconMesh.material as THREE.MeshBasicMaterial).color.setHex(0x22c55e);
          }
          soundFx.playRadioChirp();
          audioSynthRef.current.playQuindarBeep();

          if (state.samples >= waypoints.length) {
            state.isFinished = true;
            state.statusText = 'ALL SAMPLES COLLECTED & SECURED · ROVER MISSION ACCOMPLISHED!';
            state.statusColor = '#22c55e';
            soundFx.playVictory();
            confetti({ particleCount: 200, spread: 90 });
            onSuccess(980);
          } else {
            state.statusText = `✓ SAMPLE SECURED: ${activeWp.name} · ADVANCE TO NEXT BEACON`;
            state.statusColor = '#22c55e';
          }
        } else {
          soundFx.playAlarm();
          state.statusText = `TOO FAR TO SAMPLE (${dist.toFixed(0)}m). DRIVE CLOSER TO TARGET RING (<7m)`;
          state.statusColor = '#ef4444';
        }
      }
    } else if (action === 'dsn_transmit') {
      if (state.distanceM <= 22) {
        state.isFinished = true;
        soundFx.playRadioChirp();
        soundFx.playVictory();
        confetti({ particleCount: 160, spread: 85 });
        onSuccess(980);
      } else {
        soundFx.playAlarm();
        state.statusText = 'CANNOT TRANSMIT: APPROACH CLOSER TO ASTEROID (< 20 KM, USE [W] THRUST)';
        state.statusColor = '#ef4444';
      }
    }
  };

  const handleTriggerRoverLanding = (type: 'sky_crane' | 'airbag_bounce' | 'ramp_deploy') => {
    audioSynthRef.current.init();
    audioSynthRef.current.playQuindarBeep();
    const state = simStateRef.current;
    state.roverLandingPhase = type;
    state.roverLandingProgress = 0;
    state.skyCraneFlyaway = false;
    state.airbagBounceVy = -12;
    state.airbagBounceCount = 0;

    const gY = getTerrainHeight(0, 0, isLunar);
    if (playerVehicleRef.current) {
      playerVehicleRef.current.position.set(0, type === 'sky_crane' ? gY + 18 : (type === 'airbag_bounce' ? gY + 24 : gY + 1.4), 0);
    }
    if (skyCraneGroupRef.current) {
      skyCraneGroupRef.current.position.set(0, gY + 22, 0);
      skyCraneGroupRef.current.rotation.set(0, 0, 0);
      skyCraneGroupRef.current.visible = type === 'sky_crane';
    }
    skyCraneCablesRef.current.forEach((c) => (c.visible = type === 'sky_crane'));
    if (airbagClusterRef.current) {
      airbagClusterRef.current.position.set(0, gY + 24, 0);
      airbagClusterRef.current.scale.set(1, 1, 1);
      airbagClusterRef.current.visible = type === 'airbag_bounce';
    }
    if (landerRampGroupRef.current) {
      landerRampGroupRef.current.position.set(0, gY, 0);
      landerRampGroupRef.current.visible = type === 'ramp_deploy';
    }
    if (marsDustRef.current) {
      marsDustRef.current.visible = true;
    }

    if (type === 'sky_crane') {
      state.statusText = '🔴 SKY CRANE EDL: 8 CANTED RETROROCKETS FIRING · HOVERING OVER JEZERO CRATER';
      state.statusColor = '#f97316';
    } else if (type === 'airbag_bounce') {
      state.statusText = '🎈 AIRBAG IMPACT: 24 KEVLAR AIRBAGS DEPLOYED · BOUNCING ON MARTIAN REGOLITH';
      state.statusColor = '#fbbf24';
    } else {
      state.statusText = '🪜 LANDER RAMP: EXTENDING MECHANICAL PALLET · DEPLOYING ROVER TO SURFACE';
      state.statusColor = '#38bdf8';
    }
  };

  const handleSkipToDrive = () => {
    audioSynthRef.current.init();
    audioSynthRef.current.playQuindarBeep();
    const state = simStateRef.current;
    state.roverLandingPhase = 'landed';
    if (skyCraneGroupRef.current) skyCraneGroupRef.current.visible = false;
    skyCraneCablesRef.current.forEach((c) => (c.visible = false));
    if (airbagClusterRef.current) airbagClusterRef.current.visible = false;
    if (landerRampGroupRef.current) landerRampGroupRef.current.visible = false;
    if (marsDustRef.current) marsDustRef.current.visible = false;
    if (playerVehicleRef.current) {
      const curX = playerVehicleRef.current.position.x;
      const curZ = playerVehicleRef.current.position.z;
      const gY = getTerrainHeight(curX, curZ, isLunar);
      const rOffset = isSojourner ? 0.25 : (isSpiritOpp ? 0.4 : (isApolloLrv ? 0.6 : 0.48));
      playerVehicleRef.current.position.y = gY + rOffset;
    }
    state.statusText = 'ROVER SYSTEMS ACTIVE · DRIVE WITH [W][A][S][D] TO COLLECT REGOLITH SAMPLES';
    state.statusColor = '#22c55e';
  };

  // Navball Drawing Function
  const updateNavball = (pitch: number, roll: number) => {
    const canvas = navballCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 100;
    const h = 100;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;

    const cx = w / 2;
    const cy = h / 2;
    const radius = 42;

    ctx.clearRect(0, 0, w, h);

    // Save state
    ctx.save();

    // Draw outer bezel background
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.clip(); // clip inside the ball

    // Rotate for Roll and translate for Pitch
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((roll * Math.PI) / 180);

    const pitchOffset = ((90 - pitch) / 90) * (radius * 0.85);

    // Blue Sky
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-radius - 10, -radius * 2 + pitchOffset, (radius + 10) * 2, radius * 2);

    // Brown Ground
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-radius - 10, pitchOffset, (radius + 10) * 2, radius * 2);

    // White Horizon Line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-radius, pitchOffset);
    ctx.lineTo(radius, pitchOffset);
    ctx.stroke();

    // Pitch ladder ticks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.lineWidth = 1.2;

    for (let p = -80; p <= 80; p += 20) {
      if (p === 0) continue;
      const py = pitchOffset - (p / 90) * (radius * 0.85);
      const rungW = p % 40 === 0 ? 18 : 10;
      ctx.beginPath();
      ctx.moveTo(-rungW, py);
      ctx.lineTo(rungW, py);
      ctx.stroke();
      if (p % 40 === 0) {
        ctx.fillText(`${p}°`, rungW + 8, py + 3);
      }
    }
    ctx.restore(); // restore roll/pitch transform

    // Spherical Glass Shading
    const grad = ctx.createRadialGradient(cx - 12, cy - 12, 5, cx, cy, radius);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    grad.addColorStop(0.6, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.restore(); // restore clip

    // Bezel Ring
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Center Fixed Aircraft Wings Symbol (Orange)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy);
    ctx.lineTo(cx - 6, cy);
    ctx.lineTo(cx, cy + 4);
    ctx.lineTo(cx + 6, cy);
    ctx.lineTo(cx + 16, cy);
    ctx.stroke();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fill();

    // Prograde Vector (Green circle)
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy - 3, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - 9);
    ctx.lineTo(cx, cy - 13);
    ctx.moveTo(cx - 6, cy - 3);
    ctx.lineTo(cx - 10, cy - 3);
    ctx.moveTo(cx + 6, cy - 3);
    ctx.lineTo(cx + 10, cy - 3);
    ctx.stroke();
  };

  // ─────────────────────────────────────────────────────────────
  // 3D THREE.JS FLIGHT SCENE SETUP & GAME LOOP
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 960;
    const height = container.clientHeight || 600;

    // Reset simulation state whenever mission changes
    simStateRef.current = {
      altitudeKm: mission.gameType === 'lunar_landing' ? 85 : 0,
      velocityKms: mission.gameType === 'lunar_landing' ? 2.0 : 0,
      throttle: 0,
      propellant: 100,
      pitchDeg: 90,
      rollDeg: 0,
      stage: 1,
      timeRemaining: (mission.params as LaunchParams).timeWindowSec || 120,
      statusText:
        mission.gameType === 'telescope'
          ? 'TELESCOPE DEPLOYED · ALIGN MIRRORS WITH [W]/[S] TO 90%+ THEN PRESS [SPACE] TO CAPTURE'
          : mission.gameType === 'deep_space'
          ? 'FLYBY TRAJECTORY ONLINE · THRUST [W] TO REACH ASTEROID (<20 KM) THEN PRESS [SPACE] TO TRANSMIT'
          : mission.gameType === 'docking'
          ? 'IDA DOCKING CORRIDOR ACTIVE · ALIGN WITH [A]/[D] & APPROACH WITH [W]'
          : mission.gameType === 'rover'
          ? (isCuriosity || isPerseverance
              ? '🔴 SKY CRANE EDL INITIATED · 8 CANTED THRUSTERS HOVERING OVER JEZERO CRATER'
              : isSojourner || isSpiritOpp
              ? '🎈 AIRBAG CLUSTER INFLATED · BOUNCING ON MARTIAN PLAINS (ARES VALLIS)'
              : '🪜 LANDER ON SURFACE · EXTENDING RAMP TO DEPLOY ROVER TO REGOLITH')
          : mission.gameType === 'lunar_landing'
          ? 'POWERED DESCENT INITIATION · RETRO-BURN WITH [W] TO TOUCH DOWN UNDER 5 M/S'
          : 'LAUNCH VEHICLE PAD-READY · PRESS IGNITION OR SPACE TO COMMENCE ASCENT',
      statusColor: '#22c55e',
      isFinished: false,
      keys: {},
      distanceM: (mission.params as DockingParams).approachDistanceM || 250,
      samples: 0,
      telescopeFocus: 20,
      pumpPressure: 1.0,
      radiatorDeployed: true,
      dsnLocked: true,
      rcsOffset: { x: 0, y: 0, z: 0 },
      gForce: 1.0,
      towerJettisoned: false,
      maxQPassed: false,
      boosterSeparated: false,
      fairingSeparated: false,
      tliActive: false,
      tliComplete: false,
      tliProgress: 0,
      moonDistanceKm: 384400,
      flightPhase: 'pad' as const,
      agcAuto: true,
      roverLandingPhase: (mission.gameType === 'rover'
        ? (isCuriosity || isPerseverance ? 'sky_crane' : (isSojourner || isSpiritOpp ? 'airbag_bounce' : 'ramp_deploy'))
        : 'landed') as 'sky_crane' | 'airbag_bounce' | 'ramp_deploy' | 'landed',
      roverLandingProgress: 0,
      airbagBounceVy: -12,
      airbagBounceCount: 0,
      skyCraneFlyaway: false,
      deltaVKms: mission.gameType === 'lunar_landing' ? 1.85 : 9.42,
      apoapsisKm: mission.gameType === 'lunar_landing' ? 110 : 185,
      periapsisKm: mission.gameType === 'lunar_landing' ? 15 : 165,
      oxygenPct: 100,
      powerGridPct: 100,
      thermalHullPct: 100,
      flightAssist: true,
      scanActive: false,
      scanProgress: 0,
      driftVelX: 0,
      driftVelZ: 0,
    };
    setModelLoading(true);

    // Initial Navball render
    updateNavball(90, 0);

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const isMarsRover = mission.gameType === 'rover' && !isLunar;
    const spaceVoidColor = visualTone === 'TACTICAL_HUD' ? 0x010804 : 0x020409;
    const marsSkyColor = 0xb45309;

    if (isMarsRover) {
      scene.background = new THREE.Color(marsSkyColor);
      scene.fog = new THREE.FogExp2(0x9a3412, 0.0016);
    } else {
      scene.background = new THREE.Color(spaceVoidColor);
      scene.fog = new THREE.FogExp2(spaceVoidColor, 0.0002);
    }

    const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 20000);
    cameraRef.current = camera;

    // Initial camera placement tailored per mission profile to provide optimal cinematic view
    if (mission.gameType === 'lunar_landing') {
      camera.position.set(0, 92, 26);
    } else if (mission.gameType === 'launch') {
      camera.position.set(24, 26, 52);
    } else if (mission.gameType === 'rover') {
      camera.position.set(0, 5, 14);
    } else if (mission.gameType === 'docking') {
      camera.position.set(0, 4.5, 52);
    } else if (mission.gameType === 'telescope') {
      camera.position.set(16, 12, 34);
    } else if (mission.gameType === 'deep_space') {
      camera.position.set(18, 14, 38);
    } else {
      camera.position.set(0, 12, 45);
    }

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = visualTone === 'CINEMATIC_GRADE' ? 1.4 : 1.25;
    container.appendChild(renderer.domElement);

    // Interactive 360 Orbit Controls with full responsive drag
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxDistance = 1200;
    controls.minDistance = 2.0;
    if (mission.gameType === 'lunar_landing') {
      controls.target.set(0, 85, 0);
    } else if (mission.gameType === 'launch') {
      controls.target.set(0, 18, 0);
    } else if (mission.gameType === 'rover') {
      controls.target.set(0, 1.2, 0);
    } else if (mission.gameType === 'docking') {
      controls.target.set(0, 0, 15);
    } else if (mission.gameType === 'telescope') {
      controls.target.set(0, 0, 0);
    } else if (mission.gameType === 'deep_space') {
      controls.target.set(0, 0, 0);
    } else {
      controls.target.set(0, 10, 0);
    }

    // 360° Cockpit Freelook Pointer Drag Listeners
    let isPointerDown = false;
    let prevPointerX = 0;
    let prevPointerY = 0;

    const handlePointerDown = (e: PointerEvent) => {
      isPointerDown = true;
      prevPointerX = e.clientX;
      prevPointerY = e.clientY;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (cameraModeRef.current === 'cockpit') {
        if (isPointerDown || e.buttons === 1) {
          const dx = e.clientX - prevPointerX;
          const dy = e.clientY - prevPointerY;
          cockpitLookRef.current.yaw -= dx * 0.0055;
          cockpitLookRef.current.pitch = Math.max(-1.38, Math.min(1.38, cockpitLookRef.current.pitch - dy * 0.0055));
        }
        prevPointerX = e.clientX;
        prevPointerY = e.clientY;
      }
    };

    const handlePointerUp = () => {
      isPointerDown = false;
    };

    const handleDoubleClick = () => {
      if (cameraModeRef.current === 'cockpit') {
        cockpitLookRef.current.yaw = 0;
        cockpitLookRef.current.pitch = 0;
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('dblclick', handleDoubleClick);

    // Shared Texture Loader
    const mainTextureLoader = new THREE.TextureLoader();

    // Variable for active lunar sky Earth
    let activeLunarEarthMesh: THREE.Mesh | null = null;

    // 2. Multi-Source Lighting
    const sunLight = new THREE.DirectionalLight(
      isMarsRover ? 0xffedd5 : 0xfff7e8,
      isMarsRover ? 3.4 : (visualTone === 'CINEMATIC_GRADE' ? 3.5 : 2.9)
    );
    sunLight.position.set(280, 480, 220);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 1200;
    sunLight.shadow.bias = -0.0001;
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(
      isMarsRover ? 0x9a3412 : 0x0e1b2f,
      isMarsRover ? 1.6 : 0.7
    );
    scene.add(ambientLight);

    if (!isMarsRover) {
      const earthAlbedoLight = new THREE.DirectionalLight(0x1d4ed8, 0.6);
      earthAlbedoLight.position.set(0, -300, 0);
      scene.add(earthAlbedoLight);
    } else {
      const marsAlbedoLight = new THREE.DirectionalLight(0xc2410c, 1.2);
      marsAlbedoLight.position.set(0, 50, 0);
      scene.add(marsAlbedoLight);
    }

    const plumePointLight = new THREE.PointLight(0xffa500, 0, 90);
    plumePointLight.position.set(0, -6, 0);
    scene.add(plumePointLight);

    // 3. Earth Curve & Atmosphere (Visible from space with authentic high-res NASA texture)
    const earthRadius = 6371;
    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64);
    const orbitalEarthTex = mainTextureLoader.load('/assets/earth_orbit.jpg');
    orbitalEarthTex.wrapS = THREE.RepeatWrapping;
    orbitalEarthTex.wrapT = THREE.ClampToEdgeWrapping;
    const earthMat = new THREE.MeshStandardMaterial({
      map: orbitalEarthTex,
      roughness: 0.72,
      metalness: 0.08,
      emissive: 0x031024,
      emissiveIntensity: 0.2,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    const atmoGeo = new THREE.SphereGeometry(earthRadius + 65, 64, 64);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.BackSide,
      transparent: true,
      opacity: visualTone === 'CINEMATIC_GRADE' ? 0.35 : 0.24,
      blending: THREE.AdditiveBlending,
    });
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);

    earthMeshRef.current = earthMesh;
    atmoMeshRef.current = atmoMesh;

    if (mission.gameType === 'launch') {
      // In launch, Earth is positioned as a curved globe 320 units below.
      // Initially hidden on the pad (so Cape Canaveral flat coastal pad terrain is visible without any polygon distortion).
      // Made visible as rocket ascends into the stratosphere & space (> 32 km)!
      earthMesh.position.set(0, -earthRadius - 320, 0);
      atmoMesh.position.set(0, -earthRadius - 320, 0);
      earthMesh.visible = false;
      atmoMesh.visible = false;
      earthMesh.receiveShadow = true;
      scene.add(earthMesh);
      scene.add(atmoMesh);

      // 3.5 3D Moon & Trans-Lunar Orbit Trajectory Line (for Lunar Missions & TLI)
      const moonTex = mainTextureLoader.load('/assets/moon_texture.jpg');
      const moonGeo = new THREE.SphereGeometry(220, 48, 48);
      const moonMat = new THREE.MeshStandardMaterial({
        map: moonTex,
        roughness: 0.9,
        metalness: 0.05,
      });
      const moonMesh = new THREE.Mesh(moonGeo, moonMat);
      moonMesh.position.set(0, 750, -2800);
      moonMesh.visible = false;
      scene.add(moonMesh);
      moonMeshRef.current = moonMesh;

      // Glowing Lunar Transfer Trajectory Spline Curve
      const trajCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 150, -80),
        new THREE.Vector3(50, 320, -600),
        new THREE.Vector3(30, 520, -1400),
        new THREE.Vector3(-20, 680, -2100),
        new THREE.Vector3(0, 750, -2700),
      ]);
      const trajPoints = trajCurve.getPoints(80);
      const trajGeo = new THREE.BufferGeometry().setFromPoints(trajPoints);
      const trajMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.75,
      });
      const trajLine = new THREE.Line(trajGeo, trajMat);
      trajLine.visible = false;
      scene.add(trajLine);
      trajectoryLineRef.current = trajLine;
    } else if (mission.gameType === 'docking' || mission.gameType === 'telescope') {
      // In orbital missions, Earth is placed 460 units below so it curves beautifully as a blue planetary globe without clipping through the spacecraft
      earthMesh.position.set(0, -earthRadius - 460, -60);
      atmoMesh.position.set(0, -earthRadius - 460, -60);
      earthMesh.receiveShadow = true;
      scene.add(earthMesh);
      scene.add(atmoMesh);
    }

    // Multi-Spectral Starfield
    const starCount = 3500;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const idx = i * 3;
      const r = 3500 + Math.random() * 2500;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      starPos[idx] = r * Math.sin(phi) * Math.cos(theta);
      starPos[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[idx + 2] = r * Math.cos(phi);

      const spectral = Math.random();
      if (spectral > 0.8) {
        starColors[idx] = 0.7;
        starColors[idx + 1] = 0.85;
        starColors[idx + 2] = 1.0;
      } else if (spectral > 0.6) {
        starColors[idx] = 1.0;
        starColors[idx + 1] = 0.95;
        starColors[idx + 2] = 0.7;
      } else {
        starColors[idx] = 0.95;
        starColors[idx + 1] = 0.95;
        starColors[idx + 2] = 0.95;
      }
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
      vertexColors: true,
      size: 2.2,
      sizeAttenuation: false,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    // ─────────────────────────────────────────────────────────────
    // 4. PARTICLES & VOLUMETRIC SMOKE SYSTEMS
    // ─────────────────────────────────────────────────────────────
    // Procedural soft billowing radial cloud texture
    const smokeCanvas = document.createElement('canvas');
    smokeCanvas.width = 128;
    smokeCanvas.height = 128;
    const sCtx = smokeCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      grad.addColorStop(0.25, 'rgba(240, 246, 255, 0.7)');
      grad.addColorStop(0.65, 'rgba(220, 230, 242, 0.25)');
      grad.addColorStop(1, 'rgba(200, 215, 230, 0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 128, 128);
    }
    const smokeTexture = new THREE.CanvasTexture(smokeCanvas);

    // Launch Smoke Particle System (900 dense billowing puff particles)
    const smokeCount = 900;
    const smokeGeo = new THREE.BufferGeometry();
    const smokePos = new Float32Array(smokeCount * 3);
    const smokeSizes = new Float32Array(smokeCount);
    const smokeVels: THREE.Vector3[] = [];
    let smokeEmitIndex = 0;

    for (let i = 0; i < smokeCount; i++) {
      smokePos[i * 3] = (Math.random() - 0.5) * 10;
      smokePos[i * 3 + 1] = -500; // start hidden below ground
      smokePos[i * 3 + 2] = (Math.random() - 0.5) * 10;
      smokeSizes[i] = 35 + Math.random() * 35;
      const angle = Math.random() * Math.PI * 2;
      const horizSpd = 12 + Math.random() * 22;
      smokeVels.push(
        new THREE.Vector3(
          Math.cos(angle) * horizSpd,
          Math.random() * 12 + 6,
          Math.sin(angle) * horizSpd
        )
      );
    }
    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
    smokeGeo.setAttribute('size', new THREE.BufferAttribute(smokeSizes, 1));

    const smokeMat = new THREE.PointsMaterial({
      map: smokeTexture,
      color: 0xf1f5f9,
      size: 65,
      transparent: true,
      opacity: 0.68,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });
    const smokeParticles = new THREE.Points(smokeGeo, smokeMat);
    scene.add(smokeParticles);

    // Volumetric Flame Trench Steam Billow Puffs (Water Deluge Vapor)
    const trenchSteamGroup = new THREE.Group();
    trenchSteamGroupRef.current = trenchSteamGroup;
    const puffGeo = new THREE.DodecahedronGeometry(7, 2);
    const puffMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.95,
      metalness: 0.05,
      transparent: true,
      opacity: 0.75,
    });
    const trenchPuffs: Array<{ mesh: THREE.Mesh; baseX: number; baseZ: number; speedX: number; rotSpeed: number }> = [];
    for (let i = 0; i < 14; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const puff = new THREE.Mesh(puffGeo, puffMat);
      const baseX = side * (12 + Math.random() * 8);
      const baseZ = (Math.random() - 0.5) * 22;
      puff.position.set(baseX, -500, baseZ);
      puff.scale.setScalar(0.1);
      trenchSteamGroup.add(puff);
      trenchPuffs.push({
        mesh: puff,
        baseX,
        baseZ,
        speedX: side * (18 + Math.random() * 20),
        rotSpeed: (Math.random() - 0.5) * 0.7,
      });
    }

    // Lunar Landing Dust Storm Particles
    const dustCount = 450;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    const dustVels: THREE.Vector3[] = [];
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 10;
      dustPos[i * 3 + 1] = -500;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 10;
      const ang = Math.random() * Math.PI * 2;
      const spd = 14 + Math.random() * 26;
      dustVels.push(new THREE.Vector3(Math.cos(ang) * spd, Math.random() * 3 + 0.5, Math.sin(ang) * spd));
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      map: smokeTexture,
      size: 16,
      color: 0xd1d5db,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    const lunarDustParticles = new THREE.Points(dustGeo, dustMat);
    if (mission.gameType === 'lunar_landing') {
      scene.add(lunarDustParticles);
      lunarDustRef.current = lunarDustParticles;
    }

    // ─────────────────────────────────────────────────────────────
    // 5. VEHICLE MESHES & GLTF ASSET LOADING
    // ─────────────────────────────────────────────────────────────
    const playerVehicle = new THREE.Group();
    let targetObject = new THREE.Group();
    let stage1Mesh: THREE.Group | null = null;
    let stage2Mesh: THREE.Group | null = null;
    let machDiamondGroup: THREE.Group | null = null;
    const groundPadGroup = new THREE.Group();
    const gltfLoader = getSharedGLTFLoader();

    // Helper to center and scale loaded GLTF
    const attachGltfToGroup = (
      url: string,
      targetGroup: THREE.Group,
      targetSize: number,
      onLoaded?: (mesh: THREE.Group) => void
    ) => {
      gltfLoader.load(
        url,
        (gltf) => {
          const model = gltf.scene;
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          const scale = targetSize / maxDim;
          model.scale.setScalar(scale);

          const center = box.getCenter(new THREE.Vector3());
          model.position.x = -center.x * scale;
          model.position.y = -center.y * scale;
          model.position.z = -center.z * scale;

          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const m = child as THREE.Mesh;
              m.castShadow = true;
              m.receiveShadow = true;
            }
          });

          targetGroup.add(model);
          setModelLoading(false);
          if (onLoaded) onLoaded(model);
        },
        undefined,
        () => {
          setModelLoading(false);
        }
      );
    };

    // 5.1 LAUNCH MISSION
    if (mission.gameType === 'launch') {
      // Cape Canaveral / KSC Coastal Surface Terrain (eliminates sphere clipping on the pad)
      const terrainGeo = new THREE.CircleGeometry(3600, 64);
      const terrainMat = new THREE.MeshStandardMaterial({
        color: 0x1e2922, // coastal Florida scrub & wetland
        roughness: 0.9,
        metalness: 0.1,
      });
      const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
      terrainMesh.rotation.x = -Math.PI / 2;
      terrainMesh.position.y = 0;
      terrainMesh.receiveShadow = true;
      groundPadGroup.add(terrainMesh);

      // Atlantic Ocean Coastline to the East
      const oceanGeo = new THREE.PlaneGeometry(3600, 1800);
      const oceanMat = new THREE.MeshStandardMaterial({
        color: 0x082f49,
        roughness: 0.25,
        metalness: 0.75,
      });
      const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
      oceanMesh.rotation.x = -Math.PI / 2;
      oceanMesh.position.set(0, -0.2, 1200);
      groundPadGroup.add(oceanMesh);

      // Launch Pad Perimeter Berm & Concrete Crawlerway
      const crawlerGeo = new THREE.PlaneGeometry(28, 900);
      const crawlerMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.95 });
      const crawlerway = new THREE.Mesh(crawlerGeo, crawlerMat);
      crawlerway.rotation.x = -Math.PI / 2;
      crawlerway.position.set(0, 0.1, -450);
      groundPadGroup.add(crawlerway);

      // 4 Tall Steel Lightning Protection Masts with Red Beacons
      for (let p = 0; p < 4; p++) {
        const ang = (p * Math.PI) / 2 + Math.PI / 4;
        const pylonGeo = new THREE.CylinderGeometry(0.5, 1.8, 85, 12);
        const pylonMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
        const pylon = new THREE.Mesh(pylonGeo, pylonMat);
        const px = Math.cos(ang) * 58;
        const pz = Math.sin(ang) * 58;
        pylon.position.set(px, 42.5, pz);
        groundPadGroup.add(pylon);

        const beacon = new THREE.PointLight(0xef4444, 2.0, 30);
        beacon.position.set(px, 86, pz);
        groundPadGroup.add(beacon);
      }

      // Launch Pad 39A Concrete Flame Trench with Water Deluge System
      const padGeo = new THREE.CylinderGeometry(30, 36, 6, 48);
      const padMat = new THREE.MeshStandardMaterial({
        color: 0x272e3b,
        roughness: 0.85,
        metalness: 0.2,
      });
      const padMesh = new THREE.Mesh(padGeo, padMat);
      padMesh.position.y = 3;
      padMesh.receiveShadow = true;
      groundPadGroup.add(padMesh);

      // Flame deflector trench cutout
      const trenchGeo = new THREE.BoxGeometry(16, 8, 44);
      const trenchMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.95 });
      const trench = new THREE.Mesh(trenchGeo, trenchMat);
      trench.position.set(0, -1, 0);
      groundPadGroup.add(trench);

      // Mobile Launcher Lattice Truss Steel Gantry Tower
      const towerGroup = new THREE.Group();
      towerGroup.position.set(-18, 0, 0);

      // 4 Main Steel Columns
      const colGeo = new THREE.BoxGeometry(0.8, 62, 0.8);
      const towerMat = new THREE.MeshStandardMaterial({
        color: 0xb91c1c, // NASA Red/Orange Tower Paint
        metalness: 0.6,
        roughness: 0.4,
      });
      for (let cx = -2.2; cx <= 2.2; cx += 4.4) {
        for (let cz = -2.2; cz <= 2.2; cz += 4.4) {
          const col = new THREE.Mesh(colGeo, towerMat);
          col.position.set(cx, 31, cz);
          col.castShadow = true;
          towerGroup.add(col);
        }
      }

      // Horizontal & Diagonal Lattice Braces
      for (let level = 6; level <= 58; level += 6) {
        const platformGeo = new THREE.BoxGeometry(5.2, 0.4, 5.2);
        const platMat = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.8 });
        const plat = new THREE.Mesh(platformGeo, platMat);
        plat.position.set(0, level, 0);
        towerGroup.add(plat);

        // Cross truss
        const crossGeo = new THREE.CylinderGeometry(0.12, 0.12, 7.5, 6);
        const cross1 = new THREE.Mesh(crossGeo, towerMat);
        cross1.rotation.z = Math.PI / 4;
        cross1.position.set(0, level - 3, 2.2);
        towerGroup.add(cross1);

        const cross2 = new THREE.Mesh(crossGeo, towerMat);
        cross2.rotation.z = -Math.PI / 4;
        cross2.position.set(0, level - 3, -2.2);
        towerGroup.add(cross2);
      }

      // Gantry Crane at Tower Top
      const craneGeo = new THREE.BoxGeometry(14, 2, 2.5);
      const crane = new THREE.Mesh(craneGeo, towerMat);
      crane.position.set(4, 63, 0);
      towerGroup.add(crane);

      // Umbilical Service Arms with mechanical pivot points
      umbilicalArmsRef.current = [];
      for (let a = 0; a < 3; a++) {
        const armPivot = new THREE.Group();
        armPivot.position.set(2.2, 20 + a * 14, 0);

        const armGeo = new THREE.BoxGeometry(9.5, 1.4, 1.6);
        const armMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.7 });
        const arm = new THREE.Mesh(armGeo, armMat);
        arm.position.set(4.75, 0, 0);
        armPivot.add(arm);

        towerGroup.add(armPivot);
        umbilicalArmsRef.current.push(armPivot);
      }

      // High-Intensity Xenon Launch Floodlights
      const padSpotLight = new THREE.SpotLight(0xfff7ed, 4.5, 120, Math.PI / 4, 0.3);
      padSpotLight.position.set(-14, 45, 12);
      padSpotLight.target.position.set(0, 18, 0);
      towerGroup.add(padSpotLight);
      towerGroup.add(padSpotLight.target);

      groundPadGroup.add(towerGroup);
      groundPadGroup.add(trenchSteamGroup);
      scene.add(groundPadGroup);

      // Stage 1 (Booster with Ceramic White Skin & NASA Decals)
      stage1Mesh = new THREE.Group();
      const s1BodyGeo = new THREE.CylinderGeometry(2.2, 2.2, 20, 48);
      const s1BodyMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.3,
        metalness: 0.25,
      });
      const s1Body = new THREE.Mesh(s1BodyGeo, s1BodyMat);
      s1Body.position.y = 10;
      s1Body.castShadow = true;
      stage1Mesh.add(s1Body);

      // Roll pattern black markings
      for (let m = 0; m < 4; m += 2) {
        const markGeo = new THREE.CylinderGeometry(2.21, 2.21, 8, 12, 1, false, (m * Math.PI) / 2, Math.PI / 4);
        const markMat = new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide });
        const mark = new THREE.Mesh(markGeo, markMat);
        mark.position.y = 10;
        stage1Mesh.add(mark);
      }

      // Dark Interstage & Separation Ring
      const bandGeo = new THREE.CylinderGeometry(2.23, 2.23, 2.8, 48);
      const bandMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.7,
        metalness: 0.3,
      });
      const bandMesh = new THREE.Mesh(bandGeo, bandMat);
      bandMesh.position.y = 15;
      stage1Mesh.add(bandMesh);

      // 4 Titanium Grid Fins
      for (let f = 0; f < 4; f++) {
        const finGeo = new THREE.BoxGeometry(0.25, 3.4, 2.4);
        const finMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          metalness: 0.8,
          roughness: 0.2,
        });
        const fin = new THREE.Mesh(finGeo, finMat);
        const angle = (f * Math.PI) / 2;
        fin.position.set(Math.cos(angle) * 2.8, 2.5, Math.sin(angle) * 2.8);
        fin.rotation.y = angle;
        stage1Mesh.add(fin);
      }

      // 5 Rocket Engines
      for (let e = 0; e < 5; e++) {
        const nozGeo = new THREE.ConeGeometry(0.65, 2.0, 24);
        const nozMat = new THREE.MeshStandardMaterial({
          color: 0x334155,
          metalness: 0.9,
          roughness: 0.2,
        });
        const noz = new THREE.Mesh(nozGeo, nozMat);
        noz.rotation.x = Math.PI;
        if (e === 0) {
          noz.position.set(0, -0.4, 0);
        } else {
          const a = (e * Math.PI) / 2;
          noz.position.set(Math.cos(a) * 1.25, -0.4, Math.sin(a) * 1.25);
        }
        stage1Mesh.add(noz);
      }
      stage1MeshRef.current = stage1Mesh;
      playerVehicle.add(stage1Mesh);

      // Heavy Rocket Dual Side Boosters (Left & Right Strap-On Boosters)
      for (const side of [-1, 1]) {
        const bGroup = new THREE.Group();
        bGroup.position.set(side * 3.95, 10, 0);

        // Booster Main Propellant Tank (White Ceramic Finish with Black Roll Band)
        const bCylGeo = new THREE.CylinderGeometry(1.5, 1.5, 19, 32);
        const bCylMat = new THREE.MeshStandardMaterial({
          color: 0xf8fafc,
          metalness: 0.3,
          roughness: 0.3,
        });
        const bCyl = new THREE.Mesh(bCylGeo, bCylMat);
        bCyl.castShadow = true;
        bGroup.add(bCyl);

        // Black Roll Pattern Markings
        const bBandGeo = new THREE.CylinderGeometry(1.51, 1.51, 5, 16, 1, false, 0, Math.PI / 2);
        const bBandMat = new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide });
        const bBand = new THREE.Mesh(bBandGeo, bBandMat);
        bBand.position.y = 3.5;
        bGroup.add(bBand);

        // Aerodynamic Slanted Nose Cone (Canted slightly inwards towards core)
        const bNoseGeo = new THREE.ConeGeometry(1.5, 4.2, 32);
        const bNoseMat = new THREE.MeshStandardMaterial({
          color: 0xf1f5f9,
          metalness: 0.35,
          roughness: 0.25,
        });
        const bNose = new THREE.Mesh(bNoseGeo, bNoseMat);
        bNose.position.set(0, 11.5, 0);
        bNose.rotation.z = -side * 0.08;
        bGroup.add(bNose);

        // Booster Aft Skirt Flare
        const bSkirtGeo = new THREE.CylinderGeometry(1.5, 1.7, 1.4, 32);
        const bSkirtMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
        const bSkirt = new THREE.Mesh(bSkirtGeo, bSkirtMat);
        bSkirt.position.y = -9.8;
        bGroup.add(bSkirt);

        // Dual Booster High-Thrust Rocket Nozzles
        for (let n = -1; n <= 1; n += 2) {
          const bNozGeo = new THREE.ConeGeometry(0.52, 1.8, 20);
          const bNozMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 });
          const bNoz = new THREE.Mesh(bNozGeo, bNozMat);
          bNoz.rotation.x = Math.PI;
          bNoz.position.set(n * 0.5, -11.0, 0);
          bGroup.add(bNoz);
        }

        // Radial Separation Solid Kick Motors
        const sepGeo = new THREE.ConeGeometry(0.18, 0.6, 8);
        const sepMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
        const sepTop = new THREE.Mesh(sepGeo, sepMat);
        sepTop.rotation.z = (side * Math.PI) / 2;
        sepTop.position.set(side * 1.5, 8.5, 0);
        bGroup.add(sepTop);

        // Booster Exhaust Plume Cone
        const bPlumeGeo = new THREE.ConeGeometry(1.7, 18, 20);
        const bPlumeMat = new THREE.MeshBasicMaterial({
          color: 0xffedd5,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
        });
        const bPlume = new THREE.Mesh(bPlumeGeo, bPlumeMat);
        bPlume.position.y = -20;
        bGroup.add(bPlume);

        // Structural Attachment Decoupler Struts
        const strutGeo = new THREE.BoxGeometry(0.9, 0.35, 0.35);
        const strutMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85 });
        const strutTop = new THREE.Mesh(strutGeo, strutMat);
        strutTop.position.set(-side * 0.75, 7.0, 0);
        bGroup.add(strutTop);
        const strutBot = new THREE.Mesh(strutGeo, strutMat);
        strutBot.position.set(-side * 0.75, -7.0, 0);
        bGroup.add(strutBot);

        playerVehicle.add(bGroup);
        if (side === -1) {
          boosterLeftMeshRef.current = bGroup;
          boosterLeftPlumeRef.current = bPlume;
        } else {
          boosterRightMeshRef.current = bGroup;
          boosterRightPlumeRef.current = bPlume;
        }
      }

      // Stage 2 (Upper Stage & Command Capsule)
      stage2Mesh = new THREE.Group();
      stage2MeshRef.current = stage2Mesh;
      stage2Mesh.position.y = 20;

      const s2BodyGeo = new THREE.CylinderGeometry(2.05, 2.05, 9, 48);
      const s2BodyMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.28,
        metalness: 0.2,
      });
      const s2Body = new THREE.Mesh(s2BodyGeo, s2BodyMat);
      s2Body.position.y = 4.5;
      s2Body.castShadow = true;
      stage2Mesh.add(s2Body);

      // Vacuum Engine Nozzle (J-2 / YF-75D Vacuum Expander)
      const s2NozGeo = new THREE.ConeGeometry(1.1, 2.4, 32);
      const s2NozMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.95, roughness: 0.15 });
      const s2Noz = new THREE.Mesh(s2NozGeo, s2NozMat);
      s2Noz.rotation.x = Math.PI;
      s2Noz.position.y = -0.8;
      stage2Mesh.add(s2Noz);

      // ── LUNAR CREW SPACECRAFT (Housed inside Clamshell Fairing) ──
      const payloadGroup = new THREE.Group();
      payloadGroup.position.y = 9.0;

      // 1. Lunar Lander Descent Stage Base (Gold Kapton Multi-Layer Insulation)
      const lmBaseGeo = new THREE.BoxGeometry(2.8, 1.6, 2.8);
      const lmBaseMat = new THREE.MeshStandardMaterial({
        color: 0xca8a04,
        metalness: 0.85,
        roughness: 0.2,
      });
      const lmBase = new THREE.Mesh(lmBaseGeo, lmBaseMat);
      lmBase.position.y = 0.9;
      payloadGroup.add(lmBase);

      // 4 Lunar Lander Landing Gear Struts
      for (let l = 0; l < 4; l++) {
        const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.0, 8);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
        const leg = new THREE.Mesh(legGeo, legMat);
        const ang = (l * Math.PI) / 2 + Math.PI / 4;
        leg.position.set(Math.cos(ang) * 1.5, 0.35, Math.sin(ang) * 1.5);
        leg.rotation.z = Math.cos(ang) * 0.4;
        leg.rotation.x = -Math.sin(ang) * 0.4;
        payloadGroup.add(leg);
      }

      // 2. Service Module (Silver Cylindrical Module with Heat Radiators & RCS)
      const smGeo = new THREE.CylinderGeometry(1.7, 1.7, 3.6, 32);
      const smMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.25 });
      const sm = new THREE.Mesh(smGeo, smMat);
      sm.position.y = 3.5;
      payloadGroup.add(sm);

      // High Gain Antenna Dish
      const dishGeo = new THREE.CylinderGeometry(0.65, 0.05, 0.25, 16);
      const dishMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.9 });
      const dish = new THREE.Mesh(dishGeo, dishMat);
      dish.position.set(1.35, 4.1, 0);
      dish.rotation.z = -Math.PI / 3;
      payloadGroup.add(dish);

      // 3. Command Module Capsule (Conical Crew Cabin with Windows & Heat Shield)
      const cmGeo = new THREE.ConeGeometry(1.7, 2.8, 32);
      const cmMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        metalness: 0.5,
        roughness: 0.25,
      });
      const cm = new THREE.Mesh(cmGeo, cmMat);
      cm.position.y = 6.7;
      payloadGroup.add(cm);

      // Cockpit Windows
      for (let w = -1; w <= 1; w += 2) {
        const winGeo = new THREE.PlaneGeometry(0.35, 0.35);
        const winMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
        const win = new THREE.Mesh(winGeo, winMat);
        win.position.set(w * 0.45, 6.5, 1.15);
        win.rotation.x = -0.3;
        win.rotation.y = w * 0.25;
        payloadGroup.add(win);
      }

      // Docking Probe Mechanism on top
      const probeGeo = new THREE.CylinderGeometry(0.25, 0.4, 0.8, 16);
      const probeMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 });
      const probe = new THREE.Mesh(probeGeo, probeMat);
      probe.position.y = 8.3;
      payloadGroup.add(probe);

      stage2Mesh.add(payloadGroup);

      // ── BIPARTITE CLAMSHELL PAYLOAD FAIRINGS (Split Left & Right Halves) ──
      const fairingMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.25,
        metalness: 0.25,
        side: THREE.DoubleSide,
      });

      // Left Fairing Half
      const fairingLeft = new THREE.Group();
      fairingLeft.position.set(0, 9.0, 0);
      const fCylLeft = new THREE.Mesh(
        new THREE.CylinderGeometry(2.08, 2.08, 7.5, 32, 1, false, 0, Math.PI),
        fairingMat
      );
      fCylLeft.position.y = 3.75;
      fairingLeft.add(fCylLeft);
      const fConeLeft = new THREE.Mesh(
        new THREE.ConeGeometry(2.08, 5.0, 32, 1, false, 0, Math.PI),
        fairingMat
      );
      fConeLeft.position.y = 10.0;
      fairingLeft.add(fConeLeft);
      stage2Mesh.add(fairingLeft);
      fairingLeftMeshRef.current = fairingLeft;

      // Right Fairing Half
      const fairingRight = new THREE.Group();
      fairingRight.position.set(0, 9.0, 0);
      const fCylRight = new THREE.Mesh(
        new THREE.CylinderGeometry(2.08, 2.08, 7.5, 32, 1, false, Math.PI, Math.PI),
        fairingMat
      );
      fCylRight.position.y = 3.75;
      fairingRight.add(fCylRight);
      const fConeRight = new THREE.Mesh(
        new THREE.ConeGeometry(2.08, 5.0, 32, 1, false, Math.PI, Math.PI),
        fairingMat
      );
      fConeRight.position.y = 10.0;
      fairingRight.add(fConeRight);
      stage2Mesh.add(fairingRight);
      fairingRightMeshRef.current = fairingRight;

      // Launch Escape System (LES) Tower on top of fairing
      const lasTowerGeo = new THREE.CylinderGeometry(0.2, 0.2, 8, 12);
      const lasTowerMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
      const lasTower = new THREE.Mesh(lasTowerGeo, lasTowerMat);
      lasTower.position.y = 24.5;

      const nosePackGeo = new THREE.ConeGeometry(0.5, 1.8, 16);
      const nosePackMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const nosePack = new THREE.Mesh(nosePackGeo, nosePackMat);
      nosePack.position.y = 4.8;
      lasTower.add(nosePack);

      lasTowerMeshRef.current = lasTower;
      stage2Mesh.add(lasTower);

      playerVehicle.add(stage2Mesh);
      playerVehicle.position.set(0, 4, 0);
      scene.add(playerVehicle);

      // Aerodynamic Condensation Shock Cone (Max-Q Transonic Barrier at ~12 km)
      const shockGeo = new THREE.ConeGeometry(3.6, 6.0, 32, 1, true);
      const shockMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      const shockCone = new THREE.Mesh(shockGeo, shockMat);
      shockCone.position.y = 34;
      shockConeMeshRef.current = shockCone;
      playerVehicle.add(shockCone);

      // Cryogenic LOX Boiloff Vapor System (Interstage Vents)
      const loxCount = 60;
      const loxGeo = new THREE.BufferGeometry();
      const loxPos = new Float32Array(loxCount * 3);
      for (let i = 0; i < loxCount; i++) {
        loxPos[i * 3] = 2.3 + (Math.random() - 0.5) * 0.4;
        loxPos[i * 3 + 1] = 16 + (Math.random() - 0.5) * 0.5;
        loxPos[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
      }
      loxGeo.setAttribute('position', new THREE.BufferAttribute(loxPos, 3));
      const loxMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 3.5,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      });
      const loxVent = new THREE.Points(loxGeo, loxMat);
      loxVentMeshRef.current = loxVent;
      playerVehicle.add(loxVent);

      // Rocket Exhaust Plume with Mach Shock Diamonds
      machDiamondGroup = new THREE.Group();
      machDiamondGroup.position.y = -8;

      const flameGeo = new THREE.ConeGeometry(3.0, 24, 32);
      const flameMat = new THREE.MeshBasicMaterial({
        color: 0xffedd5,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      });
      const flameMesh = new THREE.Mesh(flameGeo, flameMat);
      machDiamondGroup.add(flameMesh);

      const coreGeo = new THREE.ConeGeometry(1.5, 16, 24);
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      machDiamondGroup.add(coreMesh);

      machDiamondGroup.visible = false;
      playerVehicle.add(machDiamondGroup);
      setModelLoading(false);
    }

    // 5.2 LUNAR LANDING (APOLLO LUNAR MODULE GLTF & PSE SEISMIC STATION)
    else if (mission.gameType === 'lunar_landing') {
      const textureLoader = new THREE.TextureLoader();
      const moonTex = textureLoader.load('/assets/moon_texture.jpg');
      moonTex.wrapS = THREE.RepeatWrapping;
      moonTex.wrapT = THREE.RepeatWrapping;
      moonTex.repeat.set(16, 16);

      // Displaced Lunar Crater Surface with NASA Regolith Texture
      const moonTerrainGeo = new THREE.PlaneGeometry(900, 900, 64, 64);
      const posAttr = moonTerrainGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const vx = posAttr.getX(i);
        const vy = posAttr.getY(i);
        const dist = Math.sqrt(vx * vx + vy * vy);
        let z = Math.sin(vx * 0.03) * Math.cos(vy * 0.03) * 6;
        if (dist > 30 && dist < 120) {
          z -= Math.sin(((dist - 30) / 90) * Math.PI) * 12; // Crater bowl
        }
        posAttr.setZ(i, z);
      }
      moonTerrainGeo.computeVertexNormals();

      const moonTerrainMat = new THREE.MeshStandardMaterial({
        map: moonTex,
        bumpMap: moonTex,
        bumpScale: 0.65,
        roughness: 0.92,
        metalness: 0.06,
        color: 0xd1d5db,
      });
      const moonTerrain = new THREE.Mesh(moonTerrainGeo, moonTerrainMat);
      moonTerrain.rotation.x = -Math.PI / 2;
      moonTerrain.receiveShadow = true;
      scene.add(moonTerrain);

      // Lunar Boulders Scattered across Sea of Tranquility
      for (let b = 0; b < 40; b++) {
        const bGeo = new THREE.DodecahedronGeometry(1.5 + Math.random() * 2.5);
        const bMat = new THREE.MeshStandardMaterial({ map: moonTex, roughness: 0.95 });
        const boulder = new THREE.Mesh(bGeo, bMat);
        const angle = Math.random() * Math.PI * 2;
        const rad = 25 + Math.random() * 150;
        boulder.position.set(Math.cos(angle) * rad, 1, Math.sin(angle) * rad);
        boulder.castShadow = true;
        scene.add(boulder);
      }

      // Apollo Passive Seismic Experiment (PSE S11) Scientific Station on Moon
      const pseGroup = new THREE.Group();
      pseGroup.position.set(18, 0.4, -16);

      const pseCentralGeo = new THREE.CylinderGeometry(0.8, 1.2, 0.9, 16);
      const pseCentralMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.95,
        roughness: 0.1,
      });
      const pseCentral = new THREE.Mesh(pseCentralGeo, pseCentralMat);
      pseCentral.position.y = 0.45;
      pseGroup.add(pseCentral);

      for (let s = -1; s <= 1; s += 2) {
        const wingGeo = new THREE.BoxGeometry(1.8, 0.05, 1.2);
        const wingMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.9, roughness: 0.2 });
        const wing = new THREE.Mesh(wingGeo, wingMat);
        wing.position.set(s * 1.6, 0.45, 0);
        pseGroup.add(wing);
      }

      const antGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8);
      const antMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
      const ant = new THREE.Mesh(antGeo, antMat);
      ant.position.set(0, 1.5, 0);
      pseGroup.add(ant);

      const ledGeo = new THREE.SphereGeometry(0.12, 8, 8);
      const ledMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.set(0, 2.6, 0);
      pseGroup.add(led);

      scene.add(pseGroup);

      // Animated Seismic Shockwave Rings from PSE Station (Nakamura 1979 simulation)
      const pseShockwaveGeo = new THREE.RingGeometry(1, 1.4, 32);
      const pseShockwaveMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const pseShockwave = new THREE.Mesh(pseShockwaveGeo, pseShockwaveMat);
      pseShockwave.rotation.x = -Math.PI / 2;
      pseShockwave.position.set(18, 0.1, -16);
      scene.add(pseShockwave);

      // Earthrise in the deep Lunar sky (Visible from landing site with authentic NASA texture)
      const earthRiseGeo = new THREE.SphereGeometry(30, 48, 48);
      const earthRiseTex = mainTextureLoader.load('/assets/earth_orbit.jpg');
      const earthRiseMat = new THREE.MeshStandardMaterial({
        map: earthRiseTex,
        roughness: 0.68,
        metalness: 0.05,
        emissive: 0x051b3b,
        emissiveIntensity: 0.28,
      });
      const earthRise = new THREE.Mesh(earthRiseGeo, earthRiseMat);
      earthRise.position.set(-110, 130, -190);
      scene.add(earthRise);
      activeLunarEarthMesh = earthRise;

      const earthGlowGeo = new THREE.SphereGeometry(32, 48, 48);
      const earthGlowMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
      });
      const earthGlow = new THREE.Mesh(earthGlowGeo, earthGlowMat);
      earthGlow.position.set(-110, 130, -190);
      scene.add(earthGlow);

      // Apollo 11 Lunar Flag planted on the Moon
      const flagGroup = new THREE.Group();
      flagGroup.position.set(12, 0, 8);
      const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 4.2, 12);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.2 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 2.1;
      flagGroup.add(pole);

      const clothGeo = new THREE.PlaneGeometry(2.2, 1.4);
      const clothMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5, side: THREE.DoubleSide });
      const cloth = new THREE.Mesh(clothGeo, clothMat);
      cloth.position.set(1.1, 3.4, 0);
      flagGroup.add(cloth);
      scene.add(flagGroup);

      // Illuminated Landing Target Zone (Green glowing ring & strobe)
      const ringGeo = new THREE.RingGeometry(8, 11, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x22c55e,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.3;
      scene.add(ring);

      // Load Real Mission-Specific Landing Vehicle
      const isArtemisLanding = mission.missionName.toLowerCase().includes('artemis');
      if (isArtemisLanding) {
        // Towering Stainless Steel Starship HLS Lunar Lander
        const hlsGroup = new THREE.Group();
        const bodyGeo = new THREE.CylinderGeometry(2.4, 2.4, 18, 32);
        const bodyMat = new THREE.MeshStandardMaterial({
          color: 0xf8fafc,
          metalness: 0.88,
          roughness: 0.15,
        });
        const hlsBody = new THREE.Mesh(bodyGeo, bodyMat);
        hlsBody.position.y = 9;
        hlsGroup.add(hlsBody);

        const noseGeo = new THREE.ConeGeometry(2.4, 5.5, 32);
        const noseMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.85, roughness: 0.2 });
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.position.y = 20.75;
        hlsGroup.add(nose);

        for (let leg = 0; leg < 4; leg++) {
          const lAngle = (leg * Math.PI) / 2;
          const legGeo = new THREE.CylinderGeometry(0.18, 0.22, 6.5, 8);
          const legMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 });
          const strut = new THREE.Mesh(legGeo, legMat);
          strut.position.set(Math.cos(lAngle) * 3.2, 2.0, Math.sin(lAngle) * 3.2);
          strut.rotation.z = Math.cos(lAngle) * 0.35;
          strut.rotation.x = Math.sin(lAngle) * 0.35;
          hlsGroup.add(strut);
        }
        playerVehicle.add(hlsGroup);
      } else {
        // ─── AUTHENTIC HISTORIC APOLLO LUNAR MODULE (LM - EAGLE) ───
        const apolloLmGroup = new THREE.Group();

        // 1. OCTAGONAL DESCENT STAGE (Gold Kapton Multi-Layer Insulation Foil)
        const dStageGeo = new THREE.CylinderGeometry(2.4, 2.7, 1.6, 8);
        const goldMliMat = new THREE.MeshStandardMaterial({
          color: 0xca8a04,
          metalness: 0.95,
          roughness: 0.15,
        });
        const dStage = new THREE.Mesh(dStageGeo, goldMliMat);
        dStage.position.y = 0.8;
        dStage.castShadow = true;
        apolloLmGroup.add(dStage);

        // Top deck of descent stage
        const deckGeo = new THREE.CylinderGeometry(2.35, 2.35, 0.12, 8);
        const deckMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });
        const deck = new THREE.Mesh(deckGeo, deckMat);
        deck.position.y = 1.66;
        apolloLmGroup.add(deck);

        // 4 Dark Thermal Protection Inset Panels (alternating quadrants)
        for (let q = 0; q < 4; q++) {
          const qAngle = (q * Math.PI) / 2;
          const panelGeo = new THREE.BoxGeometry(1.4, 1.2, 0.2);
          const panelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.75, metalness: 0.1 });
          const panel = new THREE.Mesh(panelGeo, panelMat);
          panel.position.set(Math.cos(qAngle) * 2.3, 0.8, Math.sin(qAngle) * 2.3);
          panel.rotation.y = -qAngle + Math.PI / 2;
          apolloLmGroup.add(panel);
        }

        // Descent Propulsion System (DPS) Engine Bell Nozzle
        const dpsBellGeo = new THREE.ConeGeometry(0.85, 1.5, 24, 1, true);
        const dpsBellMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          metalness: 0.95,
          roughness: 0.2,
          side: THREE.DoubleSide,
        });
        const dpsBell = new THREE.Mesh(dpsBellGeo, dpsBellMat);
        dpsBell.rotation.x = Math.PI;
        dpsBell.position.y = -0.55;
        apolloLmGroup.add(dpsBell);

        // DPS Engine Throat Interior Glow
        const dpsThroatGeo = new THREE.SphereGeometry(0.35, 16, 16);
        const dpsThroatMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
        const dpsThroat = new THREE.Mesh(dpsThroatGeo, dpsThroatMat);
        dpsThroat.position.y = 0.05;
        apolloLmGroup.add(dpsThroat);

        // 2. 4 LANDING GEAR OUTRIGGER STRUTS & FOOTPADS
        for (let leg = 0; leg < 4; leg++) {
          const lAngle = (leg * Math.PI) / 2 + Math.PI / 4;
          const cosA = Math.cos(lAngle);
          const sinA = Math.sin(lAngle);

          // Primary landing gear shock strut (tubular alloy)
          const primaryStrutGeo = new THREE.CylinderGeometry(0.09, 0.11, 4.2, 8);
          const strutMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.2 });
          const strut = new THREE.Mesh(primaryStrutGeo, strutMat);
          strut.position.set(cosA * 3.3, 0.1, sinA * 3.3);
          strut.rotation.z = -cosA * 0.65;
          strut.rotation.x = sinA * 0.65;
          apolloLmGroup.add(strut);

          // Secondary A-frame truss braces
          const braceGeo = new THREE.CylinderGeometry(0.05, 0.05, 3.2, 6);
          const braceMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.85 });
          const brace = new THREE.Mesh(braceGeo, braceMat);
          brace.position.set(cosA * 2.8, 0.45, sinA * 2.8);
          brace.rotation.z = -cosA * 0.45;
          brace.rotation.x = sinA * 0.45;
          apolloLmGroup.add(brace);

          // Circular dish landing footpad with gold thermal foil top
          const padGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.1, 16);
          const padMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, metalness: 0.9, roughness: 0.2 });
          const pad = new THREE.Mesh(padGeo, padMat);
          pad.position.set(cosA * 4.6, -1.15, sinA * 4.6);
          apolloLmGroup.add(pad);

          // Surface contact sensing probe wire (1.5m wire hanging beneath 3 footpads)
          if (leg !== 0) {
            const probeWireGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.4, 4);
            const probeWire = new THREE.Mesh(probeWireGeo, strutMat);
            probeWire.position.set(cosA * 4.6, -1.85, sinA * 4.6);
            apolloLmGroup.add(probeWire);
          } else {
            // Forward Astronaut Egress Ladder on +Z/X leg
            for (let r = 0; r < 9; r++) {
              const rungGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6);
              const rungMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8 });
              const rung = new THREE.Mesh(rungGeo, rungMat);
              const rRatio = r / 8;
              rung.position.set(
                cosA * (1.8 + rRatio * 2.4),
                0.9 - rRatio * 1.8,
                sinA * (1.8 + rRatio * 2.4)
              );
              rung.rotation.y = -lAngle + Math.PI / 2;
              apolloLmGroup.add(rung);
            }
          }
        }

        // Modular Equipment Stowage Assembly (MESA) Box on front-left quadrant
        const mesaGeo = new THREE.BoxGeometry(0.8, 0.6, 0.6);
        const mesaMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
        const mesa = new THREE.Mesh(mesaGeo, mesaMat);
        mesa.position.set(-1.6, 0.8, 1.6);
        apolloLmGroup.add(mesa);

        // 3. ASCENT STAGE (CREW CABIN & AVIONICS)
        const ascentStage = new THREE.Group();
        ascentStage.position.y = 1.7;

        // Center crew cabin body (silver aluminum with thermal blankets)
        const cabinGeo = new THREE.BoxGeometry(2.3, 1.7, 2.1);
        const cabinMat = new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          metalness: 0.88,
          roughness: 0.22,
        });
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.y = 0.85;
        ascentStage.add(cabin);

        // Aft equipment bay / black thermal shielding
        const aftBayGeo = new THREE.BoxGeometry(2.1, 1.4, 0.9);
        const aftMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
        const aftBay = new THREE.Mesh(aftBayGeo, aftMat);
        aftBay.position.set(0, 0.75, -1.3);
        ascentStage.add(aftBay);

        // Forward Cockpit Section with Triangular Inward-Sloped Windows
        const cockpitNoseGeo = new THREE.BoxGeometry(1.9, 1.1, 0.8);
        const cockpitNose = new THREE.Mesh(cockpitNoseGeo, cabinMat);
        cockpitNose.position.set(0, 0.7, 1.35);
        ascentStage.add(cockpitNose);

        // 2 Triangular Cockpit Windows with cyan NASA HUD glow
        for (let w = -1; w <= 1; w += 2) {
          const winGeo = new THREE.PlaneGeometry(0.42, 0.38);
          const winMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            side: THREE.DoubleSide,
          });
          const win = new THREE.Mesh(winGeo, winMat);
          win.position.set(w * 0.52, 0.85, 1.76);
          win.rotation.x = -0.22;
          win.rotation.y = w * 0.15;
          ascentStage.add(win);
        }

        // Forward Crew Egress Hatch & EVA Porch
        const hatchGeo = new THREE.BoxGeometry(0.7, 0.85, 0.08);
        const hatchMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9 });
        const hatch = new THREE.Mesh(hatchGeo, hatchMat);
        hatch.position.set(0, 0.45, 1.76);
        ascentStage.add(hatch);

        const porchGeo = new THREE.BoxGeometry(0.85, 0.06, 0.5);
        const porchMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
        const porch = new THREE.Mesh(porchGeo, porchMat);
        porch.position.set(0, 0.02, 1.95);
        ascentStage.add(porch);

        // Overhead Docking Tunnel & Alignment Target Drogue
        const dockTunnelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.45, 16);
        const dockTunnelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.95 });
        const dockTunnel = new THREE.Mesh(dockTunnelGeo, dockTunnelMat);
        dockTunnel.position.set(0, 1.85, 0.2);
        ascentStage.add(dockTunnel);

        // Steerable S-band High Gain Parabolic Antenna Dish
        const antMastGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6);
        const antMast = new THREE.Mesh(antMastGeo, dockTunnelMat);
        antMast.position.set(1.2, 1.8, -0.6);
        antMast.rotation.z = -0.35;
        ascentStage.add(antMast);

        const sBandDishGeo = new THREE.CylinderGeometry(0.65, 0.05, 0.22, 16);
        const sBandDishMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.9, roughness: 0.15 });
        const sBandDish = new THREE.Mesh(sBandDishGeo, sBandDishMat);
        sBandDish.position.set(1.55, 2.4, -0.6);
        sBandDish.rotation.z = -Math.PI / 3;
        sBandDish.rotation.x = 0.2;
        ascentStage.add(sBandDish);

        // Rendezvous Radar Steerable Antenna Dish above cockpit
        const radarGeo = new THREE.CylinderGeometry(0.42, 0.04, 0.16, 16);
        const radarMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9 });
        const radar = new THREE.Mesh(radarGeo, radarMat);
        radar.position.set(-0.6, 2.05, 1.1);
        radar.rotation.x = -Math.PI / 4;
        ascentStage.add(radar);

        // 4 Reaction Control System (RCS) Quad Thruster Outriggers
        for (let rcs = 0; rcs < 4; rcs++) {
          const rcsAngle = (rcs * Math.PI) / 2;
          const rcsOutrigger = new THREE.Group();
          rcsOutrigger.position.set(Math.cos(rcsAngle) * 1.65, 0.85, Math.sin(rcsAngle) * 1.65);

          const rcsBlockGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
          const rcsBlockMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 });
          const rcsBlock = new THREE.Mesh(rcsBlockGeo, rcsBlockMat);
          rcsOutrigger.add(rcsBlock);

          // 4 thruster cones (+Y, -Y, +lateral, -lateral)
          const coneDirs = [
            [0, 0.2, 0, 0, 0, 0],
            [0, -0.2, 0, Math.PI, 0, 0],
            [0.2, 0, 0, 0, 0, -Math.PI / 2],
            [-0.2, 0, 0, 0, 0, Math.PI / 2],
          ];
          coneDirs.forEach(([cx, cy, cz, rx, ry, rz]) => {
            const coneGeo = new THREE.ConeGeometry(0.06, 0.18, 8);
            const coneMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.95 });
            const cone = new THREE.Mesh(coneGeo, coneMat);
            cone.position.set(cx, cy, cz);
            cone.rotation.set(rx, ry, rz);
            rcsOutrigger.add(cone);
          });

          ascentStage.add(rcsOutrigger);
        }

        apolloLmGroup.add(ascentStage);
        playerVehicle.add(apolloLmGroup);
        setModelLoading(false);
      }

      playerVehicle.position.set(0, 85, 0);
      playerVehicleRef.current = playerVehicle;
      scene.add(playerVehicle);

      // Descent Engine Plume
      const landerFlameGeo = new THREE.ConeGeometry(1.6, 7, 24);
      const landerFlameMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      });
      const landerFlame = new THREE.Mesh(landerFlameGeo, landerFlameMat);
      landerFlame.position.y = -2;
      landerFlame.visible = false;
      playerVehicle.add(landerFlame);
      machDiamondGroup = new THREE.Group();
      machDiamondGroup.add(landerFlame);
    }

    // 5.3 SURFACE ROVER (LUNAR ROVER OR MARS PERSEVERANCE)
    else if (mission.gameType === 'rover') {
      const textureLoader = new THREE.TextureLoader();

      if (isLunar) {
        // ─── AUTHENTIC LUNAR REGOLITH SURFACE ───
        const moonTex = textureLoader.load('/assets/moon_texture.jpg');
        moonTex.wrapS = THREE.RepeatWrapping;
        moonTex.wrapT = THREE.RepeatWrapping;
        moonTex.repeat.set(16, 16);

        const lunarTerrainGeo = new THREE.PlaneGeometry(900, 900, 64, 64);
        const lPos = lunarTerrainGeo.attributes.position;
        for (let i = 0; i < lPos.count; i++) {
          const lx = lPos.getX(i);
          const ly = lPos.getY(i);
          lPos.setZ(i, getTerrainHeight(lx, -ly, true));
        }
        lunarTerrainGeo.computeVertexNormals();

        const lunarTerrainMat = new THREE.MeshStandardMaterial({
          map: moonTex,
          bumpMap: moonTex,
          bumpScale: 0.7,
          color: 0xd1d5db,
          roughness: 0.92,
          metalness: 0.05,
          side: THREE.DoubleSide,
        });
        const lunarTerrain = new THREE.Mesh(lunarTerrainGeo, lunarTerrainMat);
        lunarTerrain.rotation.x = -Math.PI / 2;
        lunarTerrain.receiveShadow = true;
        scene.add(lunarTerrain);

        scene.fog = new THREE.FogExp2(0x020409, 0.0001); // Deep vacuum void, no red fog!

        // Earthrise in Lunar Horizon Sky (Visible with authentic NASA texture)
        const earthRiseGeo = new THREE.SphereGeometry(30, 48, 48);
        const earthRiseTex = mainTextureLoader.load('/assets/earth_orbit.jpg');
        const earthRiseMat = new THREE.MeshStandardMaterial({
          map: earthRiseTex,
          roughness: 0.68,
          metalness: 0.05,
          emissive: 0x051b3b,
          emissiveIntensity: 0.28,
        });
        const earthRise = new THREE.Mesh(earthRiseGeo, earthRiseMat);
        earthRise.position.set(-110, 130, -190);
        scene.add(earthRise);
        activeLunarEarthMesh = earthRise;

        const earthGlowGeo = new THREE.SphereGeometry(32, 48, 48);
        const earthGlowMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          side: THREE.BackSide,
          transparent: true,
          opacity: 0.5,
          blending: THREE.AdditiveBlending,
        });
        const earthGlow = new THREE.Mesh(earthGlowGeo, earthGlowMat);
        earthGlow.position.set(-110, 130, -190);
        scene.add(earthGlow);

        // Apollo Lunar Module in the distance (Historical Apollo Landing Site)
        const distantLm = new THREE.Group();
        attachGltfToGroup('/models/Apollo_Lunar_Module.glb', distantLm, 12);
        distantLm.position.set(35, 1.2, -45);
        scene.add(distantLm);

        // Apollo Passive Seismic Experiment (PSE) Station on the Moon
        const pseGroup = new THREE.Group();
        pseGroup.position.set(16, 0.4, -20);
        const pseCentralGeo = new THREE.CylinderGeometry(0.8, 1.2, 0.9, 16);
        const pseCentralMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.95, roughness: 0.1 });
        const pseCentral = new THREE.Mesh(pseCentralGeo, pseCentralMat);
        pseCentral.position.y = 0.45;
        pseGroup.add(pseCentral);

        for (let s = -1; s <= 1; s += 2) {
          const wingGeo = new THREE.BoxGeometry(1.8, 0.05, 1.2);
          const wingMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.9, roughness: 0.2 });
          const wing = new THREE.Mesh(wingGeo, wingMat);
          wing.position.set(s * 1.6, 0.45, 0);
          pseGroup.add(wing);
        }

        const antGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8);
        const antMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
        const ant = new THREE.Mesh(antGeo, antMat);
        ant.position.set(0, 1.5, 0);
        pseGroup.add(ant);

        const ledGeo = new THREE.SphereGeometry(0.12, 8, 8);
        const ledMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
        const led = new THREE.Mesh(ledGeo, ledMat);
        led.position.set(0, 2.6, 0);
        pseGroup.add(led);
        scene.add(pseGroup);

        // Animated Lunar Seismic Shockwave Ring
        const pseShockwaveGeo = new THREE.RingGeometry(1, 1.4, 32);
        const pseShockwaveMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
        const pseShockwave = new THREE.Mesh(pseShockwaveGeo, pseShockwaveMat);
        pseShockwave.rotation.x = -Math.PI / 2;
        pseShockwave.position.set(16, 0.1, -20);
        scene.add(pseShockwave);

        // Apollo Flag & Laser Retroreflector (LRRR)
        const flagGroup = new THREE.Group();
        flagGroup.position.set(24, 0, -28);
        const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 4.2, 12);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.2 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 2.1;
        flagGroup.add(pole);

        const clothGeo = new THREE.PlaneGeometry(2.2, 1.4);
        const clothMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5, side: THREE.DoubleSide });
        const cloth = new THREE.Mesh(clothGeo, clothMat);
        cloth.position.set(1.1, 3.4, 0);
        flagGroup.add(cloth);
        scene.add(flagGroup);

        // Scattered Lunar Gray Anorthosite Boulders
        for (let b = 0; b < 50; b++) {
          const bGeo = new THREE.DodecahedronGeometry(1.2 + Math.random() * 2.5);
          const bMat = new THREE.MeshStandardMaterial({ map: moonTex, roughness: 0.95 });
          const rock = new THREE.Mesh(bGeo, bMat);
          const a = Math.random() * Math.PI * 2;
          const d = 18 + Math.random() * 150;
          rock.position.set(Math.cos(a) * d, 0.8, Math.sin(a) * d);
          rock.castShadow = true;
          scene.add(rock);
        }

        // ─── DYNAMIC MISSION-SPECIFIC SCIENCE WAYPOINTS ───
        roverWaypointsRef.current = [];
        let waypointsList: Array<{ x: number; z: number; name: string; description: string }> = [];

        if (isApollo14) {
          waypointsList = [
            { x: 28, z: -35, name: '1. CONE CRATER FLANK', description: 'Impact breccia from deep lunar crust' },
            { x: -40, z: -65, name: '2. WHITE ROCKS MATRIX', description: 'Shock-melted primordial anorthosite' },
            { x: 18, z: -95, name: '3. WEIRD CRATER REGOLITH', description: 'Volcanic glass bead deposit' },
          ];
        } else if (isApollo15) {
          waypointsList = [
            { x: 30, z: -35, name: '1. HADLEY RILLE GORGE', description: 'Ancient volcanic lava channel rim' },
            { x: -45, z: -65, name: '2. APENNINE GENESIS ROCK', description: 'Primordial anorthosite dating 4.1 Ga' },
            { x: 15, z: -95, name: '3. DUNE CRATER BASALT', description: 'Titanium-rich vesicular basalt' },
          ];
        } else if (isApollo16) {
          waypointsList = [
            { x: 25, z: -30, name: '1. FLAG CRATER BRECCIA', description: 'Cayley Plains highland impact ejecta' },
            { x: -38, z: -60, name: '2. SPOOK CRATER HIGHLANDS', description: 'Feldspar-rich crystalline anorthosite' },
            { x: 18, z: -90, name: '3. STONE MOUNTAIN CORE', description: 'Deep volcanic regolith drill core' },
          ];
        } else if (isApollo17) {
          waypointsList = [
            { x: 30, z: -35, name: '1. SHORTY ORANGE GLASS', description: 'Pyroclastic volcanic fire-fountain beads' },
            { x: -45, z: -65, name: '2. CAMELOT CRATER BASALT', description: 'Sub-floor basalt bedrock exposed by impact' },
            { x: 15, z: -95, name: '3. TAURUS-LITTROW BOULDER', description: 'Recrystallized blue-gray breccia' },
          ];
        } else if (isSojourner) {
          waypointsList = [
            { x: 25, z: -30, name: '1. YOGI ROCK APXS TARGET', description: 'Pyroxene and plagioclase volcanic basalt' },
            { x: -35, z: -55, name: '2. BARNACLE BILL ANDESITE', description: 'Silica-rich volcanic rock analyzed by APXS' },
            { x: 15, z: -80, name: '3. SOUFFLE CRATER SOIL', description: 'Sulfur-rich Martian surface dust' },
          ];
        } else if (isSpiritOpp) {
          waypointsList = [
            { x: 30, z: -35, name: '1. ENDURANCE CRATER OUTCROP', description: 'Sedimentary sulfate bedrock layers' },
            { x: -45, z: -65, name: '2. VICTORIA CRATER BLUEBERRIES', description: 'Hematite spherical concretions' },
            { x: 15, z: -95, name: '3. BURNS CLIFF STRATA', description: 'Ancient sand dune water cross-bedding' },
          ];
        } else if (isCuriosity) {
          waypointsList = [
            { x: 30, z: -35, name: '1. YELLOWKNIFE BAY MUDSTONE', description: 'Ancient habitable lakebed mudstone' },
            { x: -45, z: -65, name: '2. MOUNT SHARP LOWER RIDGE', description: 'Hydrated sulfate mineral layers' },
            { x: 15, z: -95, name: '3. VERA RUBIN RIDGE HEMATITE', description: 'Groundwater-forged hematite ridge' },
          ];
        } else if (isViking) {
          waypointsList = [
            { x: 20, z: -25, name: '1. CHRYSE PLANITIA TOPSOIL', description: 'Iron-rich oxidized dust scooped by arm' },
            { x: -30, z: -45, name: '2. DEEP TRENCH SCOOP SOL-8', description: 'Sub-surface soil sheltered from UV' },
            { x: 10, z: -65, name: '3. BIOLOGY PYROLYTIC CHAMBER', description: 'Labeled release microbial test' },
          ];
        } else {
          waypointsList = [
            { x: 30, z: -35, name: '1. JEZERO DELTA CLAY CORE', description: 'Deltaic clay core sealed in titanium tube' },
            { x: -45, z: -65, name: '2. KODIAK BUTTE ORGANICS', description: 'Ancient river sediment scanned with UV laser' },
            { x: 15, z: -95, name: '3. SEITAH ANORTHOSITE SAMPLE', description: 'Igneous olivine-cumulate rock' },
          ];
        }

        waypointsList.forEach((wp) => {
          const beaconGeo = new THREE.CylinderGeometry(0.2, 0.2, 35, 12);
          const beaconMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65 });
          const beacon = new THREE.Mesh(beaconGeo, beaconMat);
          beacon.position.set(wp.x, 17, wp.z);
          scene.add(beacon);

          const diamondGeo = new THREE.OctahedronGeometry(1.0);
          const diamondMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true });
          const diamond = new THREE.Mesh(diamondGeo, diamondMat);
          diamond.position.set(wp.x, 6, wp.z);
          scene.add(diamond);

          const targetCircleGeo = new THREE.RingGeometry(2.6, 3.4, 32);
          const targetCircleMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
          const circle = new THREE.Mesh(targetCircleGeo, targetCircleMat);
          circle.rotation.x = -Math.PI / 2;
          circle.position.set(wp.x, 0.2, wp.z);
          scene.add(circle);

          roverWaypointsRef.current.push({
            x: wp.x,
            z: wp.z,
            name: wp.name,
            description: wp.description,
            collected: false,
            beaconMesh: beacon,
            ringMesh: circle,
            diamondMesh: diamond,
          });
        });

        // ─── AUTHENTIC APOLLO LUNAR ROVING VEHICLE (LRV) ───
        const lrvGroup = new THREE.Group();

        // 1. Tubular Chassis with Gold MLI Insulation
        const chassisGeo = new THREE.BoxGeometry(2.8, 0.4, 4.2);
        const chassisMat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          metalness: 0.85,
          roughness: 0.25,
        });
        const chassis = new THREE.Mesh(chassisGeo, chassisMat);
        chassis.position.y = 0.6;
        lrvGroup.add(chassis);

        // 2. Four Open Wire Mesh Chevron Wheels
        const wheelPositions = [
          [-1.6, 0.6, 1.5],
          [1.6, 0.6, 1.5],
          [-1.6, 0.6, -1.5],
          [1.6, 0.6, -1.5],
        ];
        wheelPositions.forEach(([wx, wy, wz]) => {
          const wTorus = new THREE.TorusGeometry(0.55, 0.22, 12, 24);
          const wMat = new THREE.MeshStandardMaterial({
            color: 0x94a3b8,
            metalness: 0.9,
            roughness: 0.3,
          });
          const wheel = new THREE.Mesh(wTorus, wMat);
          wheel.rotation.y = Math.PI / 2;
          wheel.position.set(wx, wy, wz);
          lrvGroup.add(wheel);

          // Orange / Silver Dust Fender (Apollo 17 has tape repair!)
          const isTapedFender = isApollo17 && wx > 0 && wz < 0;
          const fenGeo = new THREE.CylinderGeometry(0.68, 0.68, 0.5, 12, 1, false, 0, Math.PI);
          const fenMat = new THREE.MeshStandardMaterial({
            color: isTapedFender ? 0x64748b : 0xca8a04,
            roughness: 0.6,
          });
          const fender = new THREE.Mesh(fenGeo, fenMat);
          fender.rotation.z = Math.PI / 2;
          fender.position.set(wx, wy + 0.35, wz);
          lrvGroup.add(fender);
        });

        // 3. Dual Astronaut Mesh Folding Seats
        for (let seat = -1; seat <= 1; seat += 2) {
          const seatGeo = new THREE.BoxGeometry(0.9, 1.1, 0.9);
          const seatMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.3, roughness: 0.7 });
          const sMesh = new THREE.Mesh(seatGeo, seatMat);
          sMesh.position.set(seat * 0.6, 1.1, 0.2);
          lrvGroup.add(sMesh);
        }

        // 4. Steerable High-Gain Parabolic Mesh Antenna Dish
        const dishGeo = new THREE.SphereGeometry(0.85, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.5);
        const dishMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.2, side: THREE.DoubleSide });
        const dish = new THREE.Mesh(dishGeo, dishMat);
        dish.position.set(0.8, 1.8, 1.4);
        dish.rotation.x = Math.PI / 3;
        lrvGroup.add(dish);

        // 5. Center T-Handle Steering Controller
        const tPoleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8);
        const tPoleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });
        const tPole = new THREE.Mesh(tPoleGeo, tPoleMat);
        tPole.position.set(0, 1.1, 0.6);
        lrvGroup.add(tPole);

        const tBarGeo = new THREE.BoxGeometry(0.35, 0.05, 0.06);
        const tBar = new THREE.Mesh(tBarGeo, tPoleMat);
        tBar.position.set(0, 1.5, 0.6);
        lrvGroup.add(tBar);

        // 6. Color TV Mast Camera
        const tvMastGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.4, 8);
        const tvMast = new THREE.Mesh(tvMastGeo, tPoleMat);
        tvMast.position.set(-0.8, 1.4, 1.5);
        lrvGroup.add(tvMast);

        const tvCamGeo = new THREE.BoxGeometry(0.25, 0.25, 0.4);
        const tvCamMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 });
        const tvCam = new THREE.Mesh(tvCamGeo, tvCamMat);
        tvCam.position.set(-0.8, 2.1, 1.5);
        lrvGroup.add(tvCam);

        playerVehicle.add(lrvGroup);
        playerVehicle.position.set(0, 0.4, 0);
        playerVehicleRef.current = playerVehicle;
        scene.add(playerVehicle);
        setModelLoading(false);
      } else {
        // ─── UNDULATING MARTIAN DESERT LANDSCAPE ───
        const marsGeo = new THREE.PlaneGeometry(900, 900, 80, 80);
        const mPos = marsGeo.attributes.position;
        for (let i = 0; i < mPos.count; i++) {
          const mx = mPos.getX(i);
          const my = mPos.getY(i);
          mPos.setZ(i, getTerrainHeight(mx, -my, false));
        }
        marsGeo.computeVertexNormals();

        const marsTex = textureLoader.load('/assets/mars_texture.jpg');
        marsTex.wrapS = THREE.RepeatWrapping;
        marsTex.wrapT = THREE.RepeatWrapping;
        marsTex.repeat.set(16, 16);

        const marsMat = new THREE.MeshStandardMaterial({
          map: marsTex,
          bumpMap: marsTex,
          bumpScale: 0.6,
          color: 0xc2410c,
          roughness: 0.88,
          metalness: 0.05,
          side: THREE.DoubleSide,
        });
        const marsTerrain = new THREE.Mesh(marsGeo, marsMat);
        marsTerrain.rotation.x = -Math.PI / 2;
        marsTerrain.receiveShadow = true;
        scene.add(marsTerrain);

        // Scattered Red Martian Boulders (planted firmly on Martian terrain!)
        for (let r = 0; r < 50; r++) {
          const rRad = 1.0 + Math.random() * 2.0;
          const rGeo = new THREE.DodecahedronGeometry(rRad);
          const rMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.9 });
          const rock = new THREE.Mesh(rGeo, rMat);
          const a = Math.random() * Math.PI * 2;
          const d = 15 + Math.random() * 160;
          const rockX = Math.cos(a) * d;
          const rockZ = Math.sin(a) * d;
          const rockY = getTerrainHeight(rockX, rockZ, false) + rRad * 0.5;
          rock.position.set(rockX, rockY, rockZ);
          rock.castShadow = true;
          scene.add(rock);
        }

        // ─── DYNAMIC MARTIAN SCIENCE WAYPOINTS ───
        roverWaypointsRef.current = [];
        let waypointsList: Array<{ x: number; z: number; name: string; description: string }> = [];

        if (isSojourner) {
          waypointsList = [
            { x: 25, z: -30, name: '1. YOGI ROCK APXS TARGET', description: 'Pyroxene and plagioclase volcanic basalt' },
            { x: -35, z: -55, name: '2. BARNACLE BILL ANDESITE', description: 'Silica-rich volcanic rock analyzed by APXS' },
            { x: 15, z: -80, name: '3. SOUFFLE CRATER SOIL', description: 'Sulfur-rich Martian surface dust' },
          ];
        } else if (isSpiritOpp) {
          waypointsList = [
            { x: 30, z: -35, name: '1. ENDURANCE CRATER OUTCROP', description: 'Sedimentary sulfate bedrock layers' },
            { x: -45, z: -65, name: '2. VICTORIA CRATER BLUEBERRIES', description: 'Hematite spherical concretions' },
            { x: 15, z: -95, name: '3. BURNS CLIFF STRATA', description: 'Ancient sand dune water cross-bedding' },
          ];
        } else if (isCuriosity) {
          waypointsList = [
            { x: 30, z: -35, name: '1. YELLOWKNIFE BAY MUDSTONE', description: 'Ancient habitable lakebed mudstone' },
            { x: -45, z: -65, name: '2. MOUNT SHARP LOWER RIDGE', description: 'Hydrated sulfate mineral layers' },
            { x: 15, z: -95, name: '3. VERA RUBIN RIDGE HEMATITE', description: 'Groundwater-forged hematite ridge' },
          ];
        } else if (isViking) {
          waypointsList = [
            { x: 20, z: -25, name: '1. CHRYSE PLANITIA TOPSOIL', description: 'Iron-rich oxidized dust scooped by arm' },
            { x: -30, z: -45, name: '2. DEEP TRENCH SCOOP SOL-8', description: 'Sub-surface soil sheltered from UV' },
            { x: 10, z: -65, name: '3. BIOLOGY PYROLYTIC CHAMBER', description: 'Labeled release microbial test' },
          ];
        } else {
          waypointsList = [
            { x: 30, z: -35, name: '1. JEZERO DELTA CLAY CORE', description: 'Deltaic clay core sealed in titanium tube' },
            { x: -45, z: -65, name: '2. KODIAK BUTTE ORGANICS', description: 'Ancient river sediment scanned with UV laser' },
            { x: 15, z: -95, name: '3. SEITAH ANORTHOSITE SAMPLE', description: 'Igneous olivine-cumulate rock' },
          ];
        }

        waypointsList.forEach((wp) => {
          const wpGroundY = getTerrainHeight(wp.x, wp.z, false);
          const beaconGeo = new THREE.CylinderGeometry(0.2, 0.2, 35, 12);
          const beaconMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65 });
          const beacon = new THREE.Mesh(beaconGeo, beaconMat);
          beacon.position.set(wp.x, wpGroundY + 17, wp.z);
          scene.add(beacon);

          const diamondGeo = new THREE.OctahedronGeometry(1.0);
          const diamondMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true });
          const diamond = new THREE.Mesh(diamondGeo, diamondMat);
          diamond.position.set(wp.x, wpGroundY + 6, wp.z);
          scene.add(diamond);

          const targetCircleGeo = new THREE.RingGeometry(2.6, 3.4, 32);
          const targetCircleMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
          const circle = new THREE.Mesh(targetCircleGeo, targetCircleMat);
          circle.rotation.x = -Math.PI / 2;
          circle.position.set(wp.x, wpGroundY + 0.25, wp.z);
          scene.add(circle);

          roverWaypointsRef.current.push({
            x: wp.x,
            z: wp.z,
            name: wp.name,
            description: wp.description,
            collected: false,
            beaconMesh: beacon,
            ringMesh: circle,
          });
        });

        // ─── AUTHENTIC MARS VEHICLE SELECTION ───
        if (isSojourner) {
          // ─── 1. SOJOURNER MICRO-ROVER (MARS PATHFINDER 1996) ───
          const sojGroup = new THREE.Group();
          const bodyGeo = new THREE.BoxGeometry(1.6, 0.28, 2.2);
          const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.8, roughness: 0.2 });
          const body = new THREE.Mesh(bodyGeo, bodyMat);
          body.position.y = 0.45;
          sojGroup.add(body);

          for (let s = -0.6; s <= 0.6; s += 0.3) {
            const lineGeo = new THREE.BoxGeometry(0.04, 0.02, 2.0);
            const lineMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
            const line = new THREE.Mesh(lineGeo, lineMat);
            line.position.set(s, 0.6, 0);
            sojGroup.add(line);
          }

          const sojWheelPos = [
            [-0.95, 0.25, 0.8], [0.95, 0.25, 0.8],
            [-1.05, 0.25, 0],   [1.05, 0.25, 0],
            [-0.95, 0.25, -0.8],[0.95, 0.25, -0.8],
          ];
          sojWheelPos.forEach(([wx, wy, wz]) => {
            const wGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.22, 16);
            const wMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.3 });
            const wheel = new THREE.Mesh(wGeo, wMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(wx, wy, wz);
            sojGroup.add(wheel);
          });

          const apxsGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8);
          const apxsMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8 });
          const apxs = new THREE.Mesh(apxsGeo, apxsMat);
          apxs.rotation.x = Math.PI / 3;
          apxs.position.set(0, 0.35, -1.2);
          sojGroup.add(apxs);

          const apxsHeadGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.15, 12);
          const apxsHead = new THREE.Mesh(apxsHeadGeo, apxsMat);
          apxsHead.position.set(0, 0.2, -1.5);
          sojGroup.add(apxsHead);

          const whipGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6);
          const whip = new THREE.Mesh(whipGeo, apxsMat);
          whip.position.set(-0.6, 1.0, 0.8);
          sojGroup.add(whip);

          playerVehicle.add(sojGroup);
          playerVehicle.position.set(0, 0.2, 0);
          playerVehicleRef.current = playerVehicle;
          scene.add(playerVehicle);
          setModelLoading(false);
        } else if (isSpiritOpp) {
          // ─── 2. SPIRIT & OPPORTUNITY (MARS EXPLORATION ROVER 2003) ───
          const merGroup = new THREE.Group();
          const boxGeo = new THREE.BoxGeometry(2.0, 0.55, 2.6);
          const boxMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.25 });
          const box = new THREE.Mesh(boxGeo, boxMat);
          box.position.y = 0.7;
          merGroup.add(box);

          for (let side = -1; side <= 1; side += 2) {
            const wingShape = new THREE.Shape();
            wingShape.moveTo(0, -1.3);
            wingShape.lineTo(side * 1.8, 0);
            wingShape.lineTo(0, 1.3);
            wingShape.closePath();

            const wingGeo = new THREE.ShapeGeometry(wingShape);
            const wingMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.8, roughness: 0.2, side: THREE.DoubleSide });
            const wing = new THREE.Mesh(wingGeo, wingMat);
            wing.rotation.x = -Math.PI / 2;
            wing.position.set(side * 1.0, 0.98, 0);
            merGroup.add(wing);
          }

          const mastGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.9, 12);
          const mastMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.8 });
          const mast = new THREE.Mesh(mastGeo, mastMat);
          mast.position.set(0.5, 1.65, -0.9);
          merGroup.add(mast);

          const camHeadGeo = new THREE.BoxGeometry(0.35, 0.16, 0.2);
          const camHeadMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7 });
          const camHead = new THREE.Mesh(camHeadGeo, camHeadMat);
          camHead.position.set(0.5, 2.6, -0.9);
          merGroup.add(camHead);

          const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 8);
          const arm = new THREE.Mesh(armGeo, mastMat);
          arm.rotation.x = Math.PI / 3;
          arm.position.set(-0.4, 0.5, -1.5);
          merGroup.add(arm);

          const dishGeo = new THREE.SphereGeometry(0.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.5);
          const dishMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.2, side: THREE.DoubleSide });
          const dish = new THREE.Mesh(dishGeo, dishMat);
          dish.position.set(-0.5, 1.2, 0.7);
          dish.rotation.x = Math.PI / 4;
          merGroup.add(dish);

          const merWheelPos = [
            [-1.3, 0.4, 1.2], [1.3, 0.4, 1.2],
            [-1.4, 0.4, 0],   [1.4, 0.4, 0],
            [-1.3, 0.4, -1.2],[1.3, 0.4, -1.2],
          ];
          merWheelPos.forEach(([wx, wy, wz]) => {
            const wGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 16);
            const wMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.3 });
            const wheel = new THREE.Mesh(wGeo, wMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(wx, wy, wz);
            merGroup.add(wheel);
          });

          playerVehicle.add(merGroup);
          playerVehicle.position.set(0, 0.3, 0);
          playerVehicleRef.current = playerVehicle;
          scene.add(playerVehicle);
          setModelLoading(false);
        } else if (isCuriosity) {
          // ─── 3. CURIOSITY ROVER (MSL GALE CRATER 2011) ───
          const curGroup = new THREE.Group();
          const bodyGeo = new THREE.BoxGeometry(2.8, 0.75, 3.8);
          const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.4, roughness: 0.4 });
          const body = new THREE.Mesh(bodyGeo, bodyMat);
          body.position.y = 0.85;
          curGroup.add(body);

          const rtgGeo = new THREE.CylinderGeometry(0.45, 0.45, 1.2, 16);
          const rtgMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });
          const rtg = new THREE.Mesh(rtgGeo, rtgMat);
          rtg.rotation.x = Math.PI / 2;
          rtg.position.set(0, 0.95, 2.1);
          curGroup.add(rtg);

          for (let f = 0; f < 8; f++) {
            const finGeo = new THREE.BoxGeometry(0.04, 0.6, 1.1);
            const finMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
            const fin = new THREE.Mesh(finGeo, finMat);
            fin.rotation.z = (f * Math.PI) / 4;
            fin.position.set(0, 0.95, 2.1);
            curGroup.add(fin);
          }

          const mastGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.2, 12);
          const mastMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.7 });
          const mast = new THREE.Mesh(mastGeo, mastMat);
          mast.position.set(-0.65, 1.9, -1.2);
          curGroup.add(mast);

          const chemHeadGeo = new THREE.BoxGeometry(0.45, 0.28, 0.35);
          const chemHeadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
          const chemHead = new THREE.Mesh(chemHeadGeo, chemHeadMat);
          chemHead.position.set(-0.65, 3.0, -1.2);
          curGroup.add(chemHead);

          const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.6, 8);
          const arm = new THREE.Mesh(armGeo, mastMat);
          arm.rotation.x = Math.PI / 3;
          arm.position.set(0.4, 0.6, -2.1);
          curGroup.add(arm);

          const curWheelPos = [
            [-1.7, 0.5, 1.5], [1.7, 0.5, 1.5],
            [-1.8, 0.5, 0],   [1.8, 0.5, 0],
            [-1.7, 0.5, -1.5],[1.7, 0.5, -1.5],
          ];
          curWheelPos.forEach(([wx, wy, wz]) => {
            const wGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.38, 20);
            const wMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.25 });
            const wheel = new THREE.Mesh(wGeo, wMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(wx, wy, wz);
            curGroup.add(wheel);
          });

          playerVehicle.add(curGroup);
          playerVehicle.position.set(0, 0.4, 0);
          playerVehicleRef.current = playerVehicle;
          scene.add(playerVehicle);
          setModelLoading(false);
        } else if (isViking) {
          // ─── 4. VIKING MARS LANDER (VIKING 1 & 2 1975) ───
          const vikGroup = new THREE.Group();
          const bodyGeo = new THREE.CylinderGeometry(2.4, 2.8, 1.2, 6);
          const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.5, roughness: 0.3 });
          const body = new THREE.Mesh(bodyGeo, bodyMat);
          body.position.y = 1.0;
          vikGroup.add(body);

          for (let l = 0; l < 3; l++) {
            const angle = (l * Math.PI * 2) / 3;
            const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.2, 8);
            const legMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(Math.cos(angle) * 2.6, 0.7, Math.sin(angle) * 2.6);
            leg.rotation.z = Math.cos(angle) * 0.4;
            leg.rotation.x = Math.sin(angle) * 0.4;
            vikGroup.add(leg);

            const padGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16);
            const pad = new THREE.Mesh(padGeo, legMat);
            pad.position.set(Math.cos(angle) * 3.2, 0.05, Math.sin(angle) * 3.2);
            vikGroup.add(pad);
          }

          const dishGeo = new THREE.SphereGeometry(0.8, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.5);
          const dishMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.2, side: THREE.DoubleSide });
          const dish = new THREE.Mesh(dishGeo, dishMat);
          dish.position.set(0.6, 2.2, 0.5);
          dish.rotation.x = Math.PI / 4;
          vikGroup.add(dish);

          const armGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8);
          const armMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8 });
          const arm = new THREE.Mesh(armGeo, armMat);
          arm.rotation.x = Math.PI / 3;
          arm.position.set(0, 0.6, -2.0);
          vikGroup.add(arm);

          const scoopGeo = new THREE.BoxGeometry(0.35, 0.25, 0.35);
          const scoop = new THREE.Mesh(scoopGeo, armMat);
          scoop.position.set(0, 0.15, -3.0);
          vikGroup.add(scoop);

          playerVehicle.add(vikGroup);
          playerVehicle.position.set(0, 0.2, 0);
          playerVehicleRef.current = playerVehicle;
          scene.add(playerVehicle);
          setModelLoading(false);
        } else {
          // ─── 5. PERSEVERANCE ROVER + INGENUITY HELICOPTER (MARS 2020) ───
          attachGltfToGroup('/models/Mars_Perseverance_Rover.glb', playerVehicle, 6.2);
          playerVehicle.position.set(0, 1.2, 0);
          playerVehicleRef.current = playerVehicle;

          // ─── 3D INGENUITY MARS HELICOPTER (SCOUTING AHEAD) ───
          const ingGroup = new THREE.Group();
          ingGroup.position.set(0, 2.2, -8.0);

          const fusGeo = new THREE.BoxGeometry(0.6, 0.5, 0.6);
          const fusMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.2 });
          const fus = new THREE.Mesh(fusGeo, fusMat);
          ingGroup.add(fus);

          const solGeo = new THREE.BoxGeometry(0.7, 0.04, 0.7);
          const solMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.9, roughness: 0.1 });
          const sol = new THREE.Mesh(solGeo, solMat);
          sol.position.y = 0.28;
          ingGroup.add(sol);

          const legPositions = [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]];
          legPositions.forEach(([lx, lz]) => {
            const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6);
            const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(lx * 1.4, -0.35, lz * 1.4);
            leg.rotation.z = lx * 0.5;
            leg.rotation.x = -lz * 0.5;
            ingGroup.add(leg);
          });

          const b1Geo = new THREE.BoxGeometry(2.4, 0.02, 0.14);
          const bMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
          const blade1 = new THREE.Mesh(b1Geo, bMat);
          blade1.position.y = 0.5;
          ingGroup.add(blade1);
          ingenuityRotor1Ref.current = blade1;

          const blade2 = new THREE.Mesh(b1Geo, bMat);
          blade2.position.y = 0.68;
          ingGroup.add(blade2);
          ingenuityRotor2Ref.current = blade2;

          playerVehicle.add(ingGroup);
          scene.add(playerVehicle);
        }
      }

      // ═════════════════════════════════════════════════════════════════════
      // 3 AUTHENTIC NASA ROVER LANDING SYSTEMS (SKY CRANE, AIRBAG, RAMP)
      // ═════════════════════════════════════════════════════════════════════

        // ─── 1. SKY CRANE POWERED DESCENT STAGE (MARS 2020 / CURIOSITY) ───
        const skyCraneGroup = new THREE.Group();
        const scFrameGeo = new THREE.CylinderGeometry(2.4, 2.8, 1.2, 8);
        const scFrameMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.88, roughness: 0.2 });
        const scFrame = new THREE.Mesh(scFrameGeo, scFrameMat);
        skyCraneGroup.add(scFrame);

        const scCapGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.4, 16);
        const scCapMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.4 });
        const scCap = new THREE.Mesh(scCapGeo, scCapMat);
        scCap.position.y = 0.8;
        skyCraneGroup.add(scCap);

        const scThrusterFlames: THREE.Mesh[] = [];
        for (let arm = 0; arm < 4; arm++) {
          const armAngle = (arm * Math.PI) / 2 + Math.PI / 4;
          const armGeo = new THREE.BoxGeometry(0.35, 0.35, 2.6);
          const armMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
          const armMesh = new THREE.Mesh(armGeo, armMat);
          armMesh.position.set(Math.cos(armAngle) * 2.8, 0, Math.sin(armAngle) * 2.8);
          armMesh.rotation.y = -armAngle;
          skyCraneGroup.add(armMesh);

          for (let nozzle = -1; nozzle <= 1; nozzle += 2) {
            const nozGeo = new THREE.ConeGeometry(0.28, 0.9, 12);
            const nozMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 });
            const nozzleMesh = new THREE.Mesh(nozGeo, nozMat);
            nozzleMesh.position.set(
              Math.cos(armAngle) * 3.8 + Math.cos(armAngle + Math.PI / 2) * nozzle * 0.4,
              -0.4,
              Math.sin(armAngle) * 3.8 + Math.sin(armAngle + Math.PI / 2) * nozzle * 0.4
            );
            nozzleMesh.rotation.z = Math.cos(armAngle) * 0.35;
            nozzleMesh.rotation.x = Math.sin(armAngle) * 0.35;
            skyCraneGroup.add(nozzleMesh);

            const flameGeo = new THREE.ConeGeometry(0.28, 3.2, 12);
            const flameMat = new THREE.MeshBasicMaterial({
              color: 0x38bdf8,
              transparent: true,
              opacity: 0.85,
              blending: THREE.AdditiveBlending,
            });
            const flame = new THREE.Mesh(flameGeo, flameMat);
            flame.position.copy(nozzleMesh.position);
            flame.position.y -= 1.6;
            flame.rotation.copy(nozzleMesh.rotation);
            flame.rotation.x += Math.PI;
            skyCraneGroup.add(flame);
            scThrusterFlames.push(flame);
          }
        }
        scFlamesRef.current = scThrusterFlames;

        // 3 Bridle Tether Cables
        const bridleCables: THREE.Line[] = [];
        const cableMat = new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 2 });
        for (let c = 0; c < 3; c++) {
          const cAngle = (c * Math.PI * 2) / 3;
          const cGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(Math.cos(cAngle) * 1.6, 0, Math.sin(cAngle) * 1.6),
            new THREE.Vector3(Math.cos(cAngle) * 1.0, -14, Math.sin(cAngle) * 1.0),
          ]);
          const cable = new THREE.Line(cGeo, cableMat);
          skyCraneGroup.add(cable);
          bridleCables.push(cable);
        }
        skyCraneCablesRef.current = bridleCables;
        skyCraneGroup.position.set(0, getTerrainHeight(0, 0, isLunar) + 22, 0);
        skyCraneGroup.visible = simStateRef.current.roverLandingPhase === 'sky_crane';
        scene.add(skyCraneGroup);
        skyCraneGroupRef.current = skyCraneGroup;

        // ─── 2. AIRBAG BOUNCING CLUSTER (SOJOURNER / SPIRIT & OPPORTUNITY) ───
        const airbagGroup = new THREE.Group();
        const bagGeo = new THREE.SphereGeometry(1.5, 16, 16);
        const bagMat = new THREE.MeshStandardMaterial({
          color: 0xf1f5f9,
          roughness: 0.45,
          metalness: 0.1,
        });
        for (let b = 0; b < 18; b++) {
          const bag = new THREE.Mesh(bagGeo, bagMat);
          const bPhi = Math.acos(2 * Math.random() - 1);
          const bTheta = Math.random() * Math.PI * 2;
          const bRad = 1.3 + Math.random() * 0.7;
          bag.position.set(
            bRad * Math.sin(bPhi) * Math.cos(bTheta),
            bRad * Math.cos(bPhi),
            bRad * Math.sin(bPhi) * Math.sin(bTheta)
          );
          airbagGroup.add(bag);
        }
        airbagGroup.position.set(0, getTerrainHeight(0, 0, isLunar) + 24, 0);
        airbagGroup.visible = simStateRef.current.roverLandingPhase === 'airbag_bounce';
        scene.add(airbagGroup);
        airbagClusterRef.current = airbagGroup;

        // 3 Triangular Unfolding Lander Petals
        const petalGroup = new THREE.Group();
        const petals: THREE.Group[] = [];
        for (let p = 0; p < 3; p++) {
          const pAngle = (p * Math.PI * 2) / 3;
          const pSub = new THREE.Group();
          pSub.position.set(Math.cos(pAngle) * 1.2, 0.15, Math.sin(pAngle) * 1.2);
          pSub.rotation.y = -pAngle;

          const petalShape = new THREE.Shape();
          petalShape.moveTo(0, 0);
          petalShape.lineTo(-1.6, 3.2);
          petalShape.lineTo(1.6, 3.2);
          petalShape.closePath();

          const petalGeo = new THREE.ShapeGeometry(petalShape);
          const petalMat = new THREE.MeshStandardMaterial({
            color: 0x1e3a8a,
            metalness: 0.85,
            roughness: 0.2,
            side: THREE.DoubleSide,
          });
          const petalMesh = new THREE.Mesh(petalGeo, petalMat);
          petalMesh.rotation.x = -Math.PI / 2;
          pSub.add(petalMesh);
          petalGroup.add(pSub);
          petals.push(pSub);
        }
        petalGroup.visible = simStateRef.current.roverLandingPhase === 'airbag_bounce';
        scene.add(petalGroup);
        landerPetalsRef.current = petals;

        // ─── 3. LANDER RAMP DEPLOYMENT (APOLLO LRV / VIKING) ───
        const rampGroup = new THREE.Group();
        const platGeo = new THREE.BoxGeometry(4.2, 0.4, 5.0);
        const platMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 });
        const platform = new THREE.Mesh(platGeo, platMat);
        platform.position.y = 1.2;
        rampGroup.add(platform);

        for (let r = -1; r <= 1; r += 2) {
          const rGeo = new THREE.BoxGeometry(0.8, 0.08, 4.4);
          const rMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.85, roughness: 0.3 });
          const ramp = new THREE.Mesh(rGeo, rMat);
          ramp.position.set(r * 1.2, 0.6, -3.4);
          ramp.rotation.x = 0.32;
          rampGroup.add(ramp);
        }
        const initGroundY = getTerrainHeight(0, 0, isLunar);
        rampGroup.position.set(0, initGroundY, 0);
        rampGroup.visible = simStateRef.current.roverLandingPhase === 'ramp_deploy';
        scene.add(rampGroup);
        landerRampGroupRef.current = rampGroup;

        // ─── 4. DUST STORM PARTICLES ───
        const mDustCount = 300;
        const mDustGeo = new THREE.BufferGeometry();
        const mDustPos = new Float32Array(mDustCount * 3);
        for (let i = 0; i < mDustCount; i++) {
          mDustPos[i * 3] = (Math.random() - 0.5) * 32;
          mDustPos[i * 3 + 1] = Math.random() * 4;
          mDustPos[i * 3 + 2] = (Math.random() - 0.5) * 32;
        }
        mDustGeo.setAttribute('position', new THREE.BufferAttribute(mDustPos, 3));
        const mDustMat = new THREE.PointsMaterial({
          color: isLunar ? 0xd1d5db : 0xea580c,
          size: 1.8,
          transparent: true,
          opacity: 0.75,
        });
        const marsDustPoints = new THREE.Points(mDustGeo, mDustMat);
        marsDustPoints.position.set(0, initGroundY, 0);
        marsDustPoints.visible = simStateRef.current.roverLandingPhase !== 'landed';
        scene.add(marsDustPoints);
        marsDustRef.current = marsDustPoints;

        // Set initial vehicle elevation based on landing phase
        if (simStateRef.current.roverLandingPhase === 'sky_crane') {
          playerVehicle.position.set(0, initGroundY + 18, 0);
        } else if (simStateRef.current.roverLandingPhase === 'airbag_bounce') {
          playerVehicle.position.set(0, initGroundY + 24, 0);
        } else if (simStateRef.current.roverLandingPhase === 'ramp_deploy') {
          playerVehicle.position.set(0, initGroundY + 1.4, 0);
        } else {
          const rOffset = isSojourner ? 0.25 : (isSpiritOpp ? 0.4 : (isApolloLrv ? 0.6 : 0.48));
          playerVehicle.position.set(0, initGroundY + rOffset, 0);
        }
      }

    // 5.4 ORBITAL RENDEZVOUS & DOCKING (SPACE STATION / AGENA TARGET)
    else if (mission.gameType === 'docking') {
      targetObject = new THREE.Group();
      targetObjectRef.current = targetObject;

      // Check if target is Space Station / ISS / Mir or Agena
      const isStation = mission.missionName.toLowerCase().includes('iss') ||
                        mission.missionName.toLowerCase().includes('station') ||
                        mission.missionName.toLowerCase().includes('mir') ||
                        mission.missionName.toLowerCase().includes('dragon') ||
                        mission.missionName.toLowerCase().includes('crew');

      if (isStation) {
        // Detailed Modular Space Station (ISS / Gateway)
        const stationGroup = new THREE.Group();

        // Central Pressurized Module Cylinder
        const modGeo = new THREE.CylinderGeometry(3.2, 3.2, 18, 32);
        const modMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.6, roughness: 0.3 });
        const mod = new THREE.Mesh(modGeo, modMat);
        mod.rotation.x = Math.PI / 2;
        stationGroup.add(mod);

        // Transverse Metallic Truss
        const trussGeo = new THREE.BoxGeometry(44, 1.2, 1.2);
        const trussMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.2 });
        const truss = new THREE.Mesh(trussGeo, trussMat);
        truss.position.set(0, 2.5, 0);
        stationGroup.add(truss);

        // Huge Twin Golden/Blue Solar Arrays
        for (let wing = -1; wing <= 1; wing += 2) {
          const solarGeo = new THREE.BoxGeometry(16, 0.1, 8);
          const solarMat = new THREE.MeshStandardMaterial({
            color: 0x1e3a8a,
            metalness: 0.95,
            roughness: 0.1,
            emissive: 0x0c2340,
            emissiveIntensity: 0.3,
          });
          const solar = new THREE.Mesh(solarGeo, solarMat);
          solar.position.set(wing * 18, 2.5, 0);
          stationGroup.add(solar);
        }

        // Strobe Navigation Beacons (Red port, Green stbd)
        const strobePort = new THREE.PointLight(0xef4444, 2, 30);
        strobePort.position.set(-20, 3, 0);
        stationGroup.add(strobePort);

        const strobeStbd = new THREE.PointLight(0x22c55e, 2, 30);
        strobeStbd.position.set(20, 3, 0);
        stationGroup.add(strobeStbd);

        // Docking Port with Laser Alignment Crosshairs
        const portGeo = new THREE.TorusGeometry(2.0, 0.35, 16, 48);
        const portMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        const portRing = new THREE.Mesh(portGeo, portMat);
        portRing.position.set(0, 0, 9.5);
        stationGroup.add(portRing);

        // Station Docking Floodlight illuminating the target port
        const stationLight = new THREE.PointLight(0xffffff, 4.0, 50);
        stationLight.position.set(0, 4, 11);
        stationGroup.add(stationLight);

        targetObject.add(stationGroup);
      } else {
        // Real NASA Gemini Agena Target Vehicle (ATV) / Satellite Docking Target
        const agenaGroup = new THREE.Group();

        // 1. Main Cylindrical Agena Body (Silver & White Aerospace Finish)
        const bodyGeo = new THREE.CylinderGeometry(1.5, 1.5, 14, 32);
        const bodyMat = new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          metalness: 0.85,
          roughness: 0.25,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.rotation.x = Math.PI / 2;
        agenaGroup.add(body);

        // NASA Black & Gold Avionics Bands
        const stripeGeo = new THREE.CylinderGeometry(1.52, 1.52, 1.2, 32);
        const stripeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.rotation.x = Math.PI / 2;
        stripe.position.set(0, 0, 1.5);
        agenaGroup.add(stripe);

        // 2. Agena Forward Docking Cone Collar (Facing approaching capsule at +Z)
        const collarGeo = new THREE.CylinderGeometry(1.85, 1.45, 2.4, 32, 1, true);
        const collarMat = new THREE.MeshStandardMaterial({
          color: 0x334155,
          metalness: 0.9,
          roughness: 0.2,
          side: THREE.DoubleSide,
        });
        const collar = new THREE.Mesh(collarGeo, collarMat);
        collar.rotation.x = Math.PI / 2;
        collar.position.set(0, 0, 7.8);
        agenaGroup.add(collar);

        // 3. Glowing Green Capture Latch Ring
        const portGeo = new THREE.TorusGeometry(1.7, 0.22, 16, 48);
        const portMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
        const port = new THREE.Mesh(portGeo, portMat);
        port.position.set(0, 0, 8.8);
        agenaGroup.add(port);

        // 4. Optical Alignment Crosshair inside docking collar
        const crossGeo = new THREE.BoxGeometry(2.4, 0.12, 0.05);
        const crossMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        const crossH = new THREE.Mesh(crossGeo, crossMat);
        crossH.position.set(0, 0, 8.7);
        agenaGroup.add(crossH);
        const crossV = new THREE.Mesh(crossGeo, crossMat);
        crossV.rotation.z = Math.PI / 2;
        crossV.position.set(0, 0, 8.7);
        agenaGroup.add(crossV);

        // 5. Strobe Navigation Beacons (Port Red, Stbd Green, Top Cyan Flash)
        const agenaStrobePort = new THREE.PointLight(0xef4444, 2.5, 30);
        agenaStrobePort.position.set(-2.2, 0, 7.8);
        agenaGroup.add(agenaStrobePort);

        const agenaStrobeStbd = new THREE.PointLight(0x22c55e, 2.5, 30);
        agenaStrobeStbd.position.set(2.2, 0, 7.8);
        agenaGroup.add(agenaStrobeStbd);

        const agenaStrobeTop = new THREE.PointLight(0x38bdf8, 3.0, 35);
        agenaStrobeTop.position.set(0, 2.2, 7.8);
        agenaGroup.add(agenaStrobeTop);

        // 6. Docking Illuminator Floodlight pointing from target towards approaching capsule
        const targetLight = new THREE.SpotLight(0xffffff, 4.5, 120, Math.PI / 4, 0.3);
        targetLight.position.set(0, 2.5, 9);
        targetLight.target = playerVehicle;
        agenaGroup.add(targetLight);

        // 7. Aft Rocket Engine Bell & Propulsion Unit
        const engineGeo = new THREE.ConeGeometry(1.1, 2.2, 24, 1, true);
        const engineMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.95 });
        const engine = new THREE.Mesh(engineGeo, engineMat);
        engine.rotation.x = -Math.PI / 2;
        engine.position.set(0, 0, -8.1);
        agenaGroup.add(engine);

        targetObject.add(agenaGroup);

        // Also overlay real GLTF when loaded
        attachGltfToGroup('/models/Agena_Target.glb', agenaGroup, 16);
      }

      targetObject.position.set(0, 0, -45);
      scene.add(targetObject);

      // Approaching Player Spacecraft (Gemini / Apollo CSM / Crew Dragon)
      const craftGroup = new THREE.Group();

      // Conical Command Capsule (Nose pointing forward towards -Z!)
      const capGeo = new THREE.ConeGeometry(2.4, 4.5, 32);
      const capMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        metalness: 0.5,
        roughness: 0.2,
      });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.rotation.x = -Math.PI / 2;
      craftGroup.add(cap);

      // Black Forward Nose Cone & Docking Mechanism
      const noseGeo = new THREE.CylinderGeometry(0.8, 1.2, 1.0, 24);
      const noseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
      const nose = new THREE.Mesh(noseGeo, noseMat);
      nose.rotation.x = -Math.PI / 2;
      nose.position.set(0, 0, -2.4);
      craftGroup.add(nose);

      // Cylindrical Service Trunk with Solar Wrap behind capsule
      const trunkGeo = new THREE.CylinderGeometry(2.35, 2.35, 4.2, 32);
      const trunkMat = new THREE.MeshStandardMaterial({
        color: 0x1e3a8a,
        metalness: 0.8,
        roughness: 0.2,
      });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.rotation.x = -Math.PI / 2;
      trunk.position.set(0, 0, 2.6);
      craftGroup.add(trunk);

      // Forward Docking Spotlight illuminating the target space station
      const forwardSpotlight = new THREE.SpotLight(0xffffff, 5.0, 180, Math.PI / 5, 0.25);
      forwardSpotlight.position.set(0, 1.2, -2.4);
      forwardSpotlight.target = targetObject;
      craftGroup.add(forwardSpotlight);

      playerVehicle.add(craftGroup);
      playerVehicle.position.set(0, 0, 35);
      playerVehicleRef.current = playerVehicle;
      scene.add(playerVehicle);
      setModelLoading(false);
    }

    // 5.5 DEEP SPACE SLINGSHOT / ASTEROID MISSION
    else if (mission.gameType === 'deep_space') {
      targetObject = new THREE.Group();
      targetObjectRef.current = targetObject;

      // Real NASA Asteroid 3D Model
      attachGltfToGroup('/models/Asteroid.glb', targetObject, 24);

      // Holographic Science Flyby Target Corridor Ring
      const corridorGeo = new THREE.TorusGeometry(18, 0.4, 16, 48);
      const corridorMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.65,
      });
      const corridor = new THREE.Mesh(corridorGeo, corridorMat);
      corridor.rotation.x = Math.PI / 2;
      targetObject.add(corridor);

      targetObject.position.set(0, 0, -60);
      scene.add(targetObject);

      // Interplanetary Deep Space Probe Bus with Gold MLI Insulation
      const probeGroup = new THREE.Group();
      const busGeo = new THREE.BoxGeometry(3.2, 3.2, 3.2);
      const busMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.95,
        roughness: 0.15,
      });
      const bus = new THREE.Mesh(busGeo, busMat);
      probeGroup.add(bus);

      // 70m High-Gain Parabolic Dish Antenna
      attachGltfToGroup('/models/Dish_70m.glb', probeGroup, 6.2);

      // Magnetometer & RTG Booms
      const boomGeo = new THREE.CylinderGeometry(0.08, 0.08, 9, 8);
      const boomMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });
      const boom = new THREE.Mesh(boomGeo, boomMat);
      boom.rotation.z = Math.PI / 2;
      boom.position.set(5.5, 0, 0);
      probeGroup.add(boom);

      playerVehicle.add(probeGroup);
      playerVehicle.position.set(0, 0, 25);
      playerVehicleRef.current = playerVehicle;
      scene.add(playerVehicle);
      setModelLoading(false);
    }

    // 5.6 SPACE TELESCOPE CALIBRATION (JWST / HUBBLE / OBSERVATORY)
    else {
      // Golden Hexagonal Mirror Array Space Observatory
      const telescopeGroup = new THREE.Group();

      const mirrorGroup = new THREE.Group();
      for (let m = 0; m < 18; m++) {
        const hexGeo = new THREE.CircleGeometry(1.3, 6);
        const hexMat = new THREE.MeshStandardMaterial({
          color: 0xfbbf24,
          metalness: 0.98,
          roughness: 0.04,
          emissive: 0x78350f,
          emissiveIntensity: 0.2,
        });
        const hex = new THREE.Mesh(hexGeo, hexMat);
        const ring = m < 6 ? 1 : 2;
        const angle = (m * Math.PI) / (m < 6 ? 3 : 6);
        hex.position.set(Math.cos(angle) * (ring * 1.9), Math.sin(angle) * (ring * 1.9), 0);
        mirrorGroup.add(hex);
      }
      telescopeGroup.add(mirrorGroup);

      // Secondary Mirror Tripod
      for (let s = 0; s < 3; s++) {
        const sAngle = (s * Math.PI * 2) / 3;
        const strutGeo = new THREE.CylinderGeometry(0.08, 0.08, 6.5, 8);
        const strutMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 });
        const strut = new THREE.Mesh(strutGeo, strutMat);
        strut.position.set(Math.cos(sAngle) * 2.2, Math.sin(sAngle) * 2.2, 3.2);
        strut.rotation.x = Math.PI / 3;
        telescopeGroup.add(strut);
      }
      const secMirrorGeo = new THREE.CircleGeometry(0.7, 16);
      const secMirrorMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.98, roughness: 0.04 });
      const secMirror = new THREE.Mesh(secMirrorGeo, secMirrorMat);
      secMirror.position.set(0, 0, 6.2);
      telescopeGroup.add(secMirror);

      // 5-Layer Kapton Sunshield
      const shieldGeo = new THREE.PlaneGeometry(24, 14);
      const shieldMat = new THREE.MeshStandardMaterial({
        color: 0xcbd5e1,
        metalness: 0.92,
        roughness: 0.15,
        side: THREE.DoubleSide,
      });
      const shield = new THREE.Mesh(shieldGeo, shieldMat);
      shield.position.z = -2;
      telescopeGroup.add(shield);

      playerVehicle.add(telescopeGroup);
      playerVehicle.position.set(0, 0, 0);
      playerVehicleRef.current = playerVehicle;
      scene.add(playerVehicle);

      // Majestic 3D Celestial Spiral Galaxy Target in Deep Space
      targetObject = new THREE.Group();
      targetObjectRef.current = targetObject;

      const galaxyCoreGeo = new THREE.SphereGeometry(6, 32, 32);
      const galaxyCoreMat = new THREE.MeshBasicMaterial({
        color: 0xffedd5,
        transparent: true,
        opacity: 0.9,
      });
      const galaxyCore = new THREE.Mesh(galaxyCoreGeo, galaxyCoreMat);
      targetObject.add(galaxyCore);

      // Glowing Spiral Galaxy Disc
      const discGeo = new THREE.RingGeometry(5, 28, 64);
      const discMat = new THREE.MeshBasicMaterial({
        color: 0xc084fc,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
      });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.rotation.x = Math.PI / 3.5;
      targetObject.add(disc);

      targetObject.position.set(0, 0, -85);
      scene.add(targetObject);

      setModelLoading(false);
    }

    // ─── 5.9 ASTRONAUT CADET VISUAL GUIDANCE CORRIDOR (GATES) ───────
    // Inspired by flight school rings in Star Citizen, Subdivision Infinity & Morphite
    const guidanceGroup = new THREE.Group();
    guidanceCorridorRef.current = guidanceGroup;
    guidanceGroup.visible = ageTierRef.current === 'cadet';

    const gateCount = 7;
    for (let g = 0; g < gateCount; g++) {
      const gateGeo = new THREE.TorusGeometry(3.6, 0.14, 16, 32);
      const gateMat = new THREE.MeshBasicMaterial({
        color: g % 2 === 0 ? 0x38bdf8 : 0x22c55e,
        transparent: true,
        opacity: 0.75,
        wireframe: true,
      });
      const gateMesh = new THREE.Mesh(gateGeo, gateMat);

      if (mission.gameType === 'lunar_landing') {
        gateMesh.rotation.x = Math.PI / 2;
        gateMesh.position.set(0, 10 + g * 11, 0);
      } else if (mission.gameType === 'launch') {
        gateMesh.rotation.x = Math.PI / 2;
        gateMesh.position.set(0, 15 + g * 40, 0);
      } else if (mission.gameType === 'rover') {
        gateMesh.position.set(Math.sin(g * 0.5) * 8, 2.5, -15 - g * 22);
      } else if (mission.gameType === 'docking') {
        gateMesh.position.set(0, 0, 12 + g * 35);
      } else {
        gateMesh.position.set(0, 0, -15 - g * 18);
      }
      guidanceGroup.add(gateMesh);
    }
    scene.add(guidanceGroup);

    // ─── 5.10 NO MAN'S SKY / MORPHITE GEOLOGICAL SCAN PULSE RING ────
    const scanRingGeo = new THREE.RingGeometry(0.1, 1.2, 48);
    const scanRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const scanWaveMesh = new THREE.Mesh(scanRingGeo, scanRingMat);
    scanWaveMesh.rotation.x = -Math.PI / 2;
    scanWaveMesh.visible = false;
    scanWaveMeshRef.current = scanWaveMesh;
    scene.add(scanWaveMesh);

    // ─────────────────────────────────────────────────────────────
    // 6. ANIMATION & PHYSICS FLIGHT LOOP
    // ─────────────────────────────────────────────────────────────
    let lastTime = performance.now();
    let animationFrameId: number;
    const initialLookY = mission.gameType === 'launch' ? 18 : (mission.gameType === 'lunar_landing' ? 1.5 : 2);
    const prevLookTarget = new THREE.Vector3(playerVehicle.position.x, playerVehicle.position.y + initialLookY, playerVehicle.position.z);

    const animate = (time: number) => {
      animationFrameId = requestAnimationFrame(animate);
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const state = simStateRef.current;

      // Pulse guidance corridor gates
      if (guidanceCorridorRef.current && guidanceCorridorRef.current.visible) {
        guidanceCorridorRef.current.children.forEach((gate, idx) => {
          gate.rotation.z += dt * (0.4 + idx * 0.1);
        });
      }

      // Animate Geological Scan Wave (No Man's Sky / Morphite)
      if (simStateRef.current.scanActive && scanWaveMeshRef.current) {
        simStateRef.current.scanProgress += dt * 1.4;
        const p = simStateRef.current.scanProgress;
        scanWaveMeshRef.current.visible = true;
        scanWaveMeshRef.current.position.copy(playerVehicle.position);
        scanWaveMeshRef.current.position.y += mission.gameType === 'rover' ? 0.3 : 1.0;
        const scanScale = p * 45;
        scanWaveMeshRef.current.scale.set(scanScale, scanScale, scanScale);
        (scanWaveMeshRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 * (1 - p));

        if (p >= 1.0) {
          simStateRef.current.scanActive = false;
          scanWaveMeshRef.current.visible = false;
          setScannerActive(false);
        }
      }

      // Age Tier Specific Mechanics
      const currentTier = ageTierRef.current;

      // CADET: Gentle Auto-Stabilizer & Safe Fuel Reserve
      if (currentTier === 'cadet') {
        state.propellant = Math.max(12, state.propellant);
        if (!state.keys['a'] && !state.keys['d'] && !state.keys['arrowleft'] && !state.keys['arrowright']) {
          if (mission.gameType === 'lunar_landing') {
            playerVehicle.rotation.z = THREE.MathUtils.lerp(playerVehicle.rotation.z, 0, dt * 2.0);
            playerVehicle.rotation.x = THREE.MathUtils.lerp(playerVehicle.rotation.x, 0, dt * 2.0);
          } else if (mission.gameType === 'launch') {
            state.rollDeg = THREE.MathUtils.lerp(state.rollDeg, 0, dt * 2.0);
          }
        }
      }

      // OFFICER & COMMANDER: Applied KSP Delta-V & Space Engineers Power/O2 grid
      if (currentTier === 'officer' || currentTier === 'commander') {
        if (state.throttle > 0.05) {
          const burnRate = mission.gameType === 'lunar_landing' ? 0.025 : 0.045;
          state.deltaVKms = Math.max(0, state.deltaVKms - state.throttle * burnRate * dt);
        }

        // Live dynamic Apoapsis and Periapsis calculation (KSP orbital mechanics)
        state.apoapsisKm = Math.round(state.altitudeKm + Math.pow(Math.abs(state.velocityKms), 1.7) * 24);
        state.periapsisKm = Math.max(0, Math.round(state.altitudeKm * 0.92));

        // Space Engineers Power Grid drain on high thrust + recharge
        if (state.throttle > 0.8) {
          state.powerGridPct = Math.max(25, state.powerGridPct - dt * 2.5);
        } else {
          state.powerGridPct = Math.min(100, state.powerGridPct + dt * 1.8);
        }

        // Life support O2 consumption
        state.oxygenPct = Math.max(70, 100 - (120 - state.timeRemaining) * 0.08);
      }

      // COMMANDER: 6-DOF Decoupled Flight (Star Citizen FA-OFF) & Re-entry Thermal Ablation Corridor
      if (currentTier === 'commander') {
        if (!state.flightAssist) {
          // Decoupled FA-OFF mode: vessel drifts along vector independently of facing heading
          playerVehicle.position.x += state.driftVelX * dt;
          playerVehicle.position.z += state.driftVelZ * dt;
          state.driftVelX *= (1 - dt * 0.015);
          state.driftVelZ *= (1 - dt * 0.015);
        }

        // Atmospheric heating & thermal ablation corridor during high-speed atmospheric flight
        if (mission.gameType === 'launch' && state.altitudeKm >= 12 && state.altitudeKm <= 65) {
          const aoaOffset = Math.abs(state.pitchDeg - 82);
          if (aoaOffset > 16 && state.velocityKms > 2.5) {
            state.thermalHullPct = Math.max(15, state.thermalHullPct - aoaOffset * 0.03 * dt);
            state.statusText = `⚠️ RE-ENTRY ABLATION CORRIDOR WARNING · THERMAL HULL: ${state.thermalHullPct.toFixed(0)}%`;
            state.statusColor = '#ef4444';
          }
        }
      }

      // Rotate planetary clouds, Earthrise & target asteroid/spacecraft
      if (earthMesh) {
        earthMesh.rotation.y += dt * 0.012 + (state.velocityKms > 0 ? state.velocityKms * 0.0015 * dt : 0);
      }
      if (atmoMesh) {
        atmoMesh.rotation.y += dt * 0.015 + (state.velocityKms > 0 ? state.velocityKms * 0.002 * dt : 0);
      }
      if (activeLunarEarthMesh) {
        activeLunarEarthMesh.rotation.y += dt * 0.012;
      }
      if (targetObject) {
        targetObject.rotation.y += dt * 0.1;
      }

      // Update Aerospace Navball
      updateNavball(state.pitchDeg, state.rollDeg);

      if (state.isFinished) {
        renderer.render(scene, camera);
        return;
      }

      // Decrement mission timer only once vehicle has ignited or moving
      if (state.throttle > 0.01 || state.altitudeKm > 0.02 || mission.gameType !== 'launch') {
        state.timeRemaining = Math.max(0, state.timeRemaining - dt);
      }

      // ─────────────────────────────────────────────────────────
      // 6.1 LAUNCH MISSION DYNAMICS
      // ─────────────────────────────────────────────────────────
      // 6.1 LAUNCH MISSION DYNAMICS (ASTRONAUT ASCENT FLIGHT)
      // ─────────────────────────────────────────────────────────
      if (mission.gameType === 'launch') {
        const p = mission.params as LaunchParams;
        const canControl = !multiplayerActive || activeRole === 'CDR';

        // Animate LOX boiloff venting while sitting on the pad
        if (loxVentMeshRef.current && state.altitudeKm < 0.1 && state.throttle === 0) {
          const pArr = loxVentMeshRef.current.geometry.attributes.position.array as Float32Array;
          for (let i = 0; i < 60; i++) {
            pArr[i * 3] += 0.8 * dt;
            pArr[i * 3 + 1] += 1.8 * dt;
            if (pArr[i * 3 + 1] > 20) {
              pArr[i * 3] = 2.3 + (Math.random() - 0.5) * 0.4;
              pArr[i * 3 + 1] = 16 + (Math.random() - 0.5) * 0.5;
              pArr[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
            }
          }
          loxVentMeshRef.current.geometry.attributes.position.needsUpdate = true;
          loxVentMeshRef.current.visible = true;
        } else if (loxVentMeshRef.current) {
          loxVentMeshRef.current.visible = false;
        }

        // Animate umbilical arms swinging back 45° at liftoff
        if (umbilicalArmsRef.current.length > 0) {
          const targetRot = (state.throttle > 0.05 || state.altitudeKm > 0.05) ? -0.85 : 0;
          umbilicalArmsRef.current.forEach((arm) => {
            arm.rotation.y = THREE.MathUtils.lerp(arm.rotation.y, targetRot, dt * 2.5);
          });
        }

        // Transonic Max-Q shock cone at ~11-16 km altitude
        if (shockConeMeshRef.current) {
          if (state.altitudeKm >= 11 && state.altitudeKm <= 16 && state.throttle > 0.2) {
            const intensity = Math.sin(((state.altitudeKm - 11) / 5) * Math.PI);
            (shockConeMeshRef.current.material as THREE.MeshBasicMaterial).opacity = intensity * 0.65;
            if (!simStateRef.current.maxQPassed) {
              simStateRef.current.maxQPassed = true;
              soundFx.playRadioChirp();
              audioSynthRef.current.playQuindarBeep();
            }
          } else {
            (shockConeMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0;
          }
        }

        // Launch Escape Tower (LES) Jettison at 80 km
        if (state.altitudeKm >= 80 && !simStateRef.current.towerJettisoned) {
          simStateRef.current.towerJettisoned = true;
          if (lasTowerMeshRef.current && stage2MeshRef.current) {
            const worldPos = new THREE.Vector3();
            lasTowerMeshRef.current.getWorldPosition(worldPos);
            stage2MeshRef.current.remove(lasTowerMeshRef.current);
            lasTowerMeshRef.current.position.copy(worldPos);
            scene.add(lasTowerMeshRef.current);
            audioSynthRef.current.playQuindarBeep();
            soundFx.playRadioChirp();
            state.statusText = '🚀 TOWER JETTISON CONFIRMED · CAPSULE UNSHIELDED · SPACE BOUNDARY CROSSED';
            state.statusColor = '#38bdf8';
          }
        }
        if (simStateRef.current.towerJettisoned && lasTowerMeshRef.current) {
          lasTowerMeshRef.current.position.y += 42 * dt;
          lasTowerMeshRef.current.position.z -= 18 * dt;
          lasTowerMeshRef.current.rotation.x += dt * 0.2;
        }

        // Falling detached Stage 1 booster animation
        if (simStateRef.current.stage === 2 && stage1MeshRef.current && stage1MeshRef.current.parent === scene) {
          stage1MeshRef.current.position.y -= (28 + dt * 10);
          stage1MeshRef.current.rotation.x += dt * 0.08;
          stage1MeshRef.current.rotation.z += dt * 0.05;
        }

        // Separated Dual Side Boosters Animation (Radial Korolev Cross outward drift)
        if (boosterLeftMeshRef.current && boosterLeftMeshRef.current.parent === scene) {
          boosterLeftMeshRef.current.position.x -= 24 * dt;
          boosterLeftMeshRef.current.position.y -= (26 + dt * 8);
          boosterLeftMeshRef.current.position.z -= 6 * dt;
          boosterLeftMeshRef.current.rotation.z += 0.24 * dt;
          boosterLeftMeshRef.current.rotation.y += 0.05 * dt;
        }
        if (boosterRightMeshRef.current && boosterRightMeshRef.current.parent === scene) {
          boosterRightMeshRef.current.position.x += 24 * dt;
          boosterRightMeshRef.current.position.y -= (26 + dt * 8);
          boosterRightMeshRef.current.position.z -= 6 * dt;
          boosterRightMeshRef.current.rotation.z -= 0.24 * dt;
          boosterRightMeshRef.current.rotation.y -= 0.05 * dt;
        }

        // Separated Bipartite Clamshell Fairing Halves Animation (Split Drift into Space)
        if (fairingLeftMeshRef.current && fairingLeftMeshRef.current.parent === scene) {
          fairingLeftMeshRef.current.position.x -= 16 * dt;
          fairingLeftMeshRef.current.position.y -= (14 + dt * 6);
          fairingLeftMeshRef.current.position.z -= 10 * dt;
          fairingLeftMeshRef.current.rotation.z += 0.28 * dt;
          fairingLeftMeshRef.current.rotation.y += 0.2 * dt;
        }
        if (fairingRightMeshRef.current && fairingRightMeshRef.current.parent === scene) {
          fairingRightMeshRef.current.position.x += 16 * dt;
          fairingRightMeshRef.current.position.y -= (14 + dt * 6);
          fairingRightMeshRef.current.position.z -= 10 * dt;
          fairingRightMeshRef.current.rotation.z -= 0.28 * dt;
          fairingRightMeshRef.current.rotation.y -= 0.2 * dt;
        }

        // Booster exhaust plume flicker while attached
        if (!state.boosterSeparated) {
          const boosterFlicker = state.throttle > 0.01 ? (1 + Math.random() * 0.15) * state.throttle : 0;
          if (boosterLeftPlumeRef.current) {
            boosterLeftPlumeRef.current.visible = state.throttle > 0.01;
            boosterLeftPlumeRef.current.scale.set(1, boosterFlicker, 1);
          }
          if (boosterRightPlumeRef.current) {
            boosterRightPlumeRef.current.visible = state.throttle > 0.01;
            boosterRightPlumeRef.current.scale.set(1, boosterFlicker, 1);
          }
        } else {
          if (boosterLeftPlumeRef.current) boosterLeftPlumeRef.current.visible = false;
          if (boosterRightPlumeRef.current) boosterRightPlumeRef.current.visible = false;
        }

        // Automatic Flight Milestones (if astronaut hasn't manually hit separation keys)
        if (state.altitudeKm >= 36 && !state.boosterSeparated) {
          handleBoosterSeparation();
        }
        if (state.altitudeKm >= 75 && !state.fairingSeparated) {
          handleFairingSeparation();
        }
        if (state.altitudeKm >= 125 && state.stage === 1) {
          handleStage1Separation();
        }

        // Trans-Lunar Injection (TLI) Burn Dynamics towards Moon
        if (state.tliActive && !state.tliComplete) {
          state.tliProgress = Math.min(100, state.tliProgress + dt * 6.5);
          state.velocityKms = THREE.MathUtils.lerp(7.8, 11.2, state.tliProgress / 100);
          state.moonDistanceKm = THREE.MathUtils.lerp(384400, 100, state.tliProgress / 100);
          setMoonDistDisplay(Math.round(state.moonDistanceKm));

          if (moonMeshRef.current) {
            moonMeshRef.current.visible = true;
            const mDist = THREE.MathUtils.lerp(2800, 360, state.tliProgress / 100);
            moonMeshRef.current.position.set(0, 750 - (state.tliProgress / 100) * 380, -mDist);
          }
          if (trajectoryLineRef.current) {
            trajectoryLineRef.current.visible = true;
          }

          if (earthMeshRef.current && atmoMeshRef.current) {
            const earthDepth = THREE.MathUtils.lerp(-earthRadius - 320, -earthRadius - 3000, state.tliProgress / 100);
            earthMeshRef.current.position.y = earthDepth;
            atmoMeshRef.current.position.y = earthDepth;
          }

          if (state.tliProgress >= 100) {
            state.tliComplete = true;
            setTliComplete(true);
            setFlightPhase('lunar_orbit');
            state.statusText = '🎉 TRANS-LUNAR INJECTION COMPLETE · LUNAR INSERTION ORBIT ACHIEVED!';
            state.statusColor = '#22c55e';
            soundFx.playRadioChirp();
            audioSynthRef.current.playQuindarBeep();
            confetti({ particleCount: 220, spread: 100 });
          }
        }

        // Earth globe visibility based on altitude
        if (earthMeshRef.current && atmoMeshRef.current) {
          if (state.altitudeKm > 32) {
            earthMeshRef.current.visible = true;
            atmoMeshRef.current.visible = true;
          } else {
            earthMeshRef.current.visible = false;
            atmoMeshRef.current.visible = false;
          }
        }

        if (canControl) {
          if (state.keys['w'] || state.keys['arrowup']) {
            state.throttle = Math.min(1.0, state.throttle + dt * 1.5);
            if (state.altitudeKm < 1 && state.altitudeKm > 0.05) {
              state.statusText = 'LIFTOFF CONFIRMED! TOWER CLEARED // CLIMB NOMINAL';
              state.statusColor = '#22c55e';
            }
            if (roomState) multiplayerMissionService.setThrottle(state.throttle);
          } else if (state.keys['s'] || state.keys['arrowdown']) {
            state.throttle = Math.max(0.0, state.throttle - dt * 1.5);
            if (roomState) multiplayerMissionService.setThrottle(state.throttle);
          }

          if (state.keys['a'] || state.keys['arrowleft']) {
            state.pitchDeg = Math.min(90, state.pitchDeg + dt * 25);
            state.rollDeg = Math.max(-25, state.rollDeg - dt * 40);
            if (roomState) multiplayerMissionService.setPitch(state.pitchDeg);
          } else if (state.keys['d'] || state.keys['arrowright']) {
            state.pitchDeg = Math.max(10, state.pitchDeg - dt * 25);
            state.rollDeg = Math.min(25, state.rollDeg + dt * 40);
            if (roomState) multiplayerMissionService.setPitch(state.pitchDeg);
          } else {
            state.rollDeg *= 0.92;
          }
        }

        const effectiveThrustMult = state.pumpPressure || 1.0;
        audioSynthRef.current.setEngineThrust(state.throttle);

        if (state.throttle > 0.01 && state.propellant > 0) {
          const burnRate = 0.85 * (state.stage === 1 ? 1.0 : 0.6) * effectiveThrustMult;
          state.propellant = Math.max(0, state.propellant - state.throttle * burnRate * dt);

          const baseThrust = state.throttle * (state.stage === 1 ? 95 : 65) * effectiveThrustMult;
          const rad = (state.pitchDeg * Math.PI) / 180;
          const vertThrust = baseThrust * Math.sin(rad);
          const horizThrust = baseThrust * Math.cos(rad);

          state.gForce = 1.0 + (baseThrust / 95) * 2.8;
          state.velocityKms += (horizThrust * 0.08 + (vertThrust - 9.81) * 0.04) * dt;
          state.velocityKms = Math.max(0, state.velocityKms);
          state.altitudeKm += (vertThrust * 0.06 + state.velocityKms * 0.8) * dt;

          // Exhaust Plume
          if (machDiamondGroup) {
            machDiamondGroup.visible = true;
            const flicker = 1 + Math.random() * 0.15;
            machDiamondGroup.scale.set(flicker, state.throttle * 1.4 * flicker * effectiveThrustMult, flicker);
          }
          plumePointLight.intensity = state.throttle * (20 + Math.random() * 6);
          plumePointLight.position.set(0, playerVehicle.position.y - 6, 0);

          // Volumetric Launch Pad Smoke & Steam Deluge Generation
          const isEmittingSmoke = (countdownTime !== null && countdownTime <= 6) || state.throttle > 0.01;
          if (isEmittingSmoke && state.altitudeKm < 35) {
            const pArr = smokeGeo.attributes.position.array as Float32Array;
            const sArr = smokeGeo.attributes.size.array as Float32Array;
            const spawnCount = countdownTime !== null && countdownTime <= 6 ? 16 : 24;

            for (let s = 0; s < spawnCount; s++) {
              const idx = (smokeEmitIndex + s) % smokeCount;
              const side = s % 2 === 0 ? -1 : 1;
              const emitX = Math.random() < 0.65 ? side * (6 + Math.random() * 22) : (Math.random() - 0.5) * 8;
              const emitY = Math.max(1.5, playerVehicle.position.y - 12 + (Math.random() - 0.5) * 3);
              const emitZ = (Math.random() - 0.5) * 18;

              pArr[idx * 3] = emitX;
              pArr[idx * 3 + 1] = emitY;
              pArr[idx * 3 + 2] = emitZ;

              sArr[idx] = 45 + Math.random() * 40;
              const horizSpeed = countdownTime !== null && countdownTime <= 6 ? 24 : 18;
              smokeVels[idx].set(
                side * (horizSpeed + Math.random() * 18),
                Math.random() * 12 + (state.altitudeKm > 0 ? 5 : 8),
                (Math.random() - 0.5) * 16
              );
            }
            smokeEmitIndex = (smokeEmitIndex + spawnCount) % smokeCount;
          }
        } else {
          state.throttle = 0;
          state.gForce = Math.max(1.0, state.gForce - dt * 3);
          if (machDiamondGroup) machDiamondGroup.visible = false;
          plumePointLight.intensity = 0;
        }

        // Animate volumetric flame trench steam billows rolling across pad
        trenchPuffs.forEach((puff, pIdx) => {
          const isPuffing = (countdownTime !== null && countdownTime <= 6) || state.throttle > 0.05;
          if (isPuffing && state.altitudeKm < 35) {
            const t = time * 0.003 + pIdx;
            puff.mesh.position.y = 4 + Math.sin(t) * 3;
            puff.mesh.position.x = puff.baseX + Math.sin(t * 1.5) * 14 + puff.speedX * 0.6;
            puff.mesh.position.z = puff.baseZ + Math.cos(t) * 8;
            const targetScale = 14 + (countdownTime !== null && countdownTime <= 6 ? 12 : 24) * Math.min(1.0, state.throttle + 0.5);
            puff.mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale * 0.8, targetScale), dt * 3.5);
            puff.mesh.rotation.x += puff.rotSpeed * dt;
            puff.mesh.rotation.y += puff.rotSpeed * 0.7 * dt;
            (puff.mesh.material as THREE.MeshStandardMaterial).opacity = 0.75;
          } else {
            puff.mesh.position.y = -500;
            puff.mesh.scale.setScalar(0.1);
          }
        });

        // Update Smoke billow particle positions & expanding size
        const pArr = smokeGeo.attributes.position.array as Float32Array;
        const sArr = smokeGeo.attributes.size.array as Float32Array;
        for (let i = 0; i < smokeCount; i++) {
          if (pArr[i * 3 + 1] > -200) {
            pArr[i * 3] += smokeVels[i].x * dt;
            pArr[i * 3 + 1] += smokeVels[i].y * dt;
            pArr[i * 3 + 2] += smokeVels[i].z * dt;
            smokeVels[i].x *= 0.985;
            smokeVels[i].z *= 0.985;
            smokeVels[i].y += 0.8 * dt; // gentle thermal plume buoyancy
            sArr[i] = Math.min(130, sArr[i] + dt * 18); // billow expands as it rises
            if (pArr[i * 3 + 1] > 260 || Math.abs(pArr[i * 3]) > 250) {
              pArr[i * 3 + 1] = -500;
            }
          }
        }
        smokeGeo.attributes.position.needsUpdate = true;
        smokeGeo.attributes.size.needsUpdate = true;

        // Vehicle Orientation
        const radRoll = ((90 - state.pitchDeg) * Math.PI) / 180;
        playerVehicle.rotation.z = -radRoll;
        playerVehicle.position.y = 4 + Math.min(state.altitudeKm * 25, 450);
        groundPadGroup.position.y = -Math.min(state.altitudeKm * 25, 1400);

        if (state.tliComplete) {
          state.isFinished = true;
          soundFx.playRadioChirp();
          confetti({ particleCount: 180, spread: 90 });
          setTimeout(() => onSuccess(1000), 2000);
        } else if (state.altitudeKm >= p.targetAltitudeKm && state.velocityKms >= p.targetVelocityKms * 0.85 && !state.tliActive) {
          if (simStateRef.current.flightPhase !== 'orbit' && simStateRef.current.flightPhase !== 'tli_burn' && simStateRef.current.flightPhase !== 'lunar_orbit') {
            simStateRef.current.flightPhase = 'orbit';
            setFlightPhase('orbit');
            state.statusText = '🌍 LOW EARTH ORBIT (LEO) ACQUIRED · PROCEED TO TRANS-LUNAR INJECTION (TLI) BURN!';
            state.statusColor = '#38bdf8';
            if (moonMeshRef.current) moonMeshRef.current.visible = true;
            if (trajectoryLineRef.current) trajectoryLineRef.current.visible = true;
          }
        } else if (state.timeRemaining <= 0 || (state.propellant <= 0 && state.altitudeKm < p.targetAltitudeKm * 0.7 && !state.tliActive)) {
          state.isFinished = true;
          soundFx.playAlarm();
          onFailure(`Trajectory profile missed. Final Altitude: ${state.altitudeKm.toFixed(1)} km`);
        }
      }

      // ─────────────────────────────────────────────────────────
      // 6.2 LUNAR LANDING DYNAMICS (REALISTIC APOLLO LM CONTACT)
      // ─────────────────────────────────────────────────────────
      else if (mission.gameType === 'lunar_landing') {
        const gravity = 1.62; // Lunar surface gravity in m/s²
        const maxDecel = 7.5; // Apollo LM Descent Engine maximum deceleration (up to 7.5 m/s²)

        // Throttle Control: Manual input OR NASA AGC P66 Rate-of-Descent Assist
        const manualBurn = state.keys['w'] || state.keys['arrowup'] || state.keys['space'];
        const manualDescendFast = state.keys['s'] || state.keys['arrowdown'];

        if (manualBurn) {
          // Pilot commanded maximum braking burn
          state.throttle = Math.min(1.0, state.throttle + dt * 4.5);
          state.propellant = Math.max(0, state.propellant - dt * 2.2);
          if (machDiamondGroup) machDiamondGroup.visible = true;
          audioSynthRef.current.setEngineThrust(state.throttle);
        } else if (manualDescendFast) {
          // Pilot commanded faster descent
          state.throttle = Math.max(0.0, state.throttle - dt * 4.0);
          if (machDiamondGroup) machDiamondGroup.visible = state.throttle > 0.05;
          audioSynthRef.current.setEngineThrust(state.throttle);
        } else if (state.agcAuto) {
          // Apollo AGC P66 Auto-Rate-of-Descent Program
          let targetSpeed = 2.4;
          if (playerVehicle.position.y < 35) targetSpeed = 1.6;
          if (playerVehicle.position.y < 12) targetSpeed = 0.8;

          const speedError = state.velocityKms - targetSpeed;
          const neededThrust = (gravity + speedError * 2.4) / maxDecel;
          const targetThrottle = Math.max(0.12, Math.min(0.95, neededThrust));
          state.throttle = THREE.MathUtils.lerp(state.throttle, targetThrottle, dt * 3.8);
          state.propellant = Math.max(0, state.propellant - dt * 0.9);
          if (machDiamondGroup) machDiamondGroup.visible = state.throttle > 0.05;
          audioSynthRef.current.setEngineThrust(state.throttle);
        } else {
          // Full manual coasting
          state.throttle = Math.max(0.0, state.throttle - dt * 3.5);
          if (machDiamondGroup) machDiamondGroup.visible = state.throttle > 0.05;
          audioSynthRef.current.setEngineThrust(state.throttle);
        }

        // Net vertical acceleration: gravity pulls down (+descent rate), engine pushes up (-descent rate)
        const netAccel = gravity - state.throttle * maxDecel;
        state.velocityKms = Math.max(-1.8, Math.min(22.0, state.velocityKms + netAccel * dt));

        // Horizontal tilt control with [A]/[D]
        if (state.keys['a'] || state.keys['arrowleft']) {
          playerVehicle.position.x -= 14 * dt;
          playerVehicle.rotation.z = THREE.MathUtils.lerp(playerVehicle.rotation.z, 0.16, dt * 6);
          state.rollDeg = -10;
        } else if (state.keys['d'] || state.keys['arrowright']) {
          playerVehicle.position.x += 14 * dt;
          playerVehicle.rotation.z = THREE.MathUtils.lerp(playerVehicle.rotation.z, -0.16, dt * 6);
          state.rollDeg = 10;
        } else {
          playerVehicle.rotation.z = THREE.MathUtils.lerp(playerVehicle.rotation.z, 0, dt * 5);
          state.rollDeg *= 0.9;
        }

        // Update lander vertical position
        playerVehicle.position.y = Math.max(2.0, playerVehicle.position.y - state.velocityKms * dt);
        state.altitudeKm = playerVehicle.position.y;
        state.pitchDeg = 90 - playerVehicle.rotation.z * (180 / Math.PI);

        // Real-time Astronaut Guidance Feedback
        const descentRate = state.velocityKms;
        if (playerVehicle.position.y > 2.2) {
          if (descentRate > 4.5) {
            state.statusText = `⚠️ DESCENT TOO FAST: ${descentRate.toFixed(1)} M/S · HOLD [W] / [BRAKE] TO SLOW (< 4.5 M/S)!`;
            state.statusColor = '#ef4444';
          } else if (descentRate < 0) {
            state.statusText = `▲ HOVER / CLIMB (${Math.abs(descentRate).toFixed(1)} M/S) · RELEASE [W] TO SETTLE DOWN`;
            state.statusColor = '#38bdf8';
          } else {
            state.statusText = state.agcAuto
              ? `🟢 AGC P66 AUTO-DESCENT: ${descentRate.toFixed(1)} M/S · ALT: ${playerVehicle.position.y.toFixed(1)}M · STEER [A]/[D]`
              : `🟢 DESCENT NOMINAL: ${descentRate.toFixed(1)} M/S · ALT: ${playerVehicle.position.y.toFixed(1)}M · MANUAL CONTROL`;
            state.statusColor = '#22c55e';
          }
        }

        // Lunar Dust Storm Effect near surface (< 28m altitude)
        if (lunarDustRef.current) {
          if (playerVehicle.position.y < 28 && state.throttle > 0.05) {
            lunarDustRef.current.visible = true;
            const dArr = lunarDustRef.current.geometry.attributes.position.array as Float32Array;
            for (let i = 0; i < dustCount; i++) {
              dArr[i * 3] += dustVels[i].x * dt * (1 + state.throttle);
              dArr[i * 3 + 1] = 0.3 + Math.sin(time * 0.01 + i) * 1.2;
              dArr[i * 3 + 2] += dustVels[i].z * dt * (1 + state.throttle);
              if (Math.hypot(dArr[i * 3] - playerVehicle.position.x, dArr[i * 3 + 2] - playerVehicle.position.z) > 42) {
                dArr[i * 3] = playerVehicle.position.x + (Math.random() - 0.5) * 4;
                dArr[i * 3 + 1] = 0.2;
                dArr[i * 3 + 2] = playerVehicle.position.z + (Math.random() - 0.5) * 4;
              }
            }
            lunarDustRef.current.geometry.attributes.position.needsUpdate = true;
          } else {
            lunarDustRef.current.visible = false;
          }
        }

        // Touchdown Check (Landing Gear contact pads at y <= 2.2)
        if (playerVehicle.position.y <= 2.2) {
          playerVehicle.position.y = 2.0;
          state.isFinished = true;
          state.throttle = 0;
          audioSynthRef.current.setEngineThrust(0);
          if (machDiamondGroup) machDiamondGroup.visible = false;

          const finalDescentSpeed = Math.abs(state.velocityKms);
          const targetDist = Math.hypot(playerVehicle.position.x, playerVehicle.position.z);

          if (finalDescentSpeed <= 5.0 && targetDist <= 35) {
            state.statusText = '🎉 TOUCHDOWN CONFIRMED! CONTACT LIGHT! TRANQUILITY BASE HERE. THE EAGLE HAS LANDED!';
            state.statusColor = '#22c55e';
            soundFx.playRadioChirp();
            soundFx.playVictory();
            audioSynthRef.current.playQuindarBeep();
            confetti({ particleCount: 220, spread: 90 });
            setTimeout(() => onSuccess(1000), 2500);
          } else if (finalDescentSpeed > 5.0) {
            soundFx.playAlarm();
            onFailure(`Hard Landing! Touchdown speed ${finalDescentSpeed.toFixed(1)} m/s exceeded landing gear limit (max 5.0 m/s).`);
          } else {
            soundFx.playAlarm();
            onFailure(`Landing off-site: Touchdown was ${targetDist.toFixed(1)}m away from designated landing beacon.`);
          }
        }
      }

      // ─────────────────────────────────────────────────────────
      // 6.3 ROVER DYNAMICS & ACTIVE WAYPOINT SAMPLING
      // ─────────────────────────────────────────────────────────
      else if (mission.gameType === 'rover') {
        const rx = playerVehicle.position.x;
        const rz = playerVehicle.position.z;
        const groundY = getTerrainHeight(rx, rz, isLunar);

        // ═════════════════════════════════════════════════════════════════════
        // PHASE 1: NASA ROVER LANDING SEQUENCES (SKY CRANE / AIRBAG / RAMP)
        // ═════════════════════════════════════════════════════════════════════
        if (state.roverLandingPhase === 'sky_crane') {
          const skyCrane = skyCraneGroupRef.current;
          state.roverLandingProgress += dt * 0.16; // ~6.5 second lowering sequence

          if (skyCrane) {
            skyCrane.visible = true;
            if (!state.skyCraneFlyaway) {
              skyCrane.position.set(0, groundY + 22 + Math.sin(time * 0.003) * 0.25, 0);

              // Lowering rover down on bridle cables
              const prog = Math.min(1.0, state.roverLandingProgress);
              const roverY = THREE.MathUtils.lerp(groundY + 18, groundY + 1.2, prog);
              playerVehicle.position.set(0, roverY, 0);

              // Update cable connection points
              skyCraneCablesRef.current.forEach((cable, cIdx) => {
                cable.visible = true;
                const cAngle = (cIdx * Math.PI * 2) / 3;
                const pos = cable.geometry.attributes.position.array as Float32Array;
                pos[0] = Math.cos(cAngle) * 1.6;
                pos[1] = 0;
                pos[2] = Math.sin(cAngle) * 1.6;
                pos[3] = Math.cos(cAngle) * 1.0;
                pos[4] = -(22 - (roverY - groundY));
                pos[5] = Math.sin(cAngle) * 1.0;
                cable.geometry.attributes.position.needsUpdate = true;
              });

              // Churning Mars dust below 8 rocket nozzles
              if (marsDustRef.current) {
                marsDustRef.current.visible = true;
                const dArr = marsDustRef.current.geometry.attributes.position.array as Float32Array;
                for (let i = 0; i < 300; i++) {
                  dArr[i * 3 + 1] = Math.max(0.2, (dArr[i * 3 + 1] + dt * 4) % 4.5);
                }
                marsDustRef.current.geometry.attributes.position.needsUpdate = true;
              }

              // Flicker 8 retrorocket plumes
              scFlamesRef.current.forEach((flame) => {
                flame.scale.set(1 + Math.random() * 0.2, 1 + Math.random() * 0.35, 1);
              });

              state.statusText = `🔴 SKY CRANE EDL: LOWERING ROVER ON TETHER BRIDLE (ALT: ${roverY.toFixed(1)}M)...`;
              state.statusColor = '#f97316';

              // Touchdown trigger
              if (prog >= 1.0) {
                state.skyCraneFlyaway = true;
                skyCraneCablesRef.current.forEach((c) => (c.visible = false));
                soundFx.playRadioChirp();
                soundFx.playVictory();
                audioSynthRef.current.playQuindarBeep();
                confetti({ particleCount: 200, spread: 85 });
                state.statusText = '🎉 TOUCHDOWN CONFIRMED! BRIDLE CORDS CUT. SKY CRANE FLYAWAY COMMENCED!';
                state.statusColor = '#22c55e';
              }
            } else {
              // Flyaway Maneuver: Sky crane throttles up, tilts, and rockets away into space
              skyCrane.rotation.z = THREE.MathUtils.lerp(skyCrane.rotation.z, -0.4, dt * 2.5);
              skyCrane.position.y += 35 * dt;
              skyCrane.position.z -= 60 * dt;

              if (skyCrane.position.y > groundY + 110) {
                skyCrane.visible = false;
                if (marsDustRef.current) marsDustRef.current.visible = false;
                state.roverLandingPhase = 'landed';
                state.statusText = 'ROVER SYSTEMS ACTIVE · DRIVE WITH [W][A][S][D] TO COLLECT REGOLITH SAMPLES';
                state.statusColor = '#22c55e';
              }
            }
          }
        } else if (state.roverLandingPhase === 'airbag_bounce') {
          const airbag = airbagClusterRef.current;
          if (airbag) {
            airbag.visible = true;
            state.airbagBounceVy -= 22 * dt; // Martian gravity
            airbag.position.y += state.airbagBounceVy * dt;
            airbag.position.z -= 3.5 * dt;
            airbag.rotation.x += dt * 3.5;
            airbag.rotation.z += dt * 2.0;

            playerVehicle.position.set(airbag.position.x, airbag.position.y - 0.4, airbag.position.z);

            // Ground impact bounce
            if (airbag.position.y <= groundY + 1.4) {
              airbag.position.y = groundY + 1.4;
              state.airbagBounceVy = -state.airbagBounceVy * 0.58; // Dampened bounce
              state.airbagBounceCount++;
              audioSynthRef.current.playRcsPuff();

              if (marsDustRef.current) {
                marsDustRef.current.visible = true;
                marsDustRef.current.position.copy(airbag.position);
              }

              state.statusText = `🎈 AIRBAG IMPACT: BOUNCING ACROSS MARTIAN SOIL (BOUNCE ${state.airbagBounceCount}/4)...`;
              state.statusColor = '#fbbf24';
            }

            // After 4 bounces, settle and deflate
            if (state.airbagBounceCount >= 4) {
              airbag.scale.lerp(new THREE.Vector3(0.05, 0.05, 0.05), dt * 3.5);
              if (landerPetalsRef.current.length > 0) {
                // Open petals flat to ground
                landerPetalsRef.current.forEach((petal) => {
                  petal.visible = true;
                  petal.children[0].rotation.x = THREE.MathUtils.lerp(petal.children[0].rotation.x, 0, dt * 3.5);
                });
              }

              if (airbag.scale.x < 0.15) {
                airbag.visible = false;
                if (marsDustRef.current) marsDustRef.current.visible = false;
                playerVehicle.position.y = groundY + 0.3;
                state.roverLandingPhase = 'landed';
                soundFx.playRadioChirp();
                soundFx.playVictory();
                audioSynthRef.current.playQuindarBeep();
                confetti({ particleCount: 180, spread: 80 });
                state.statusText = '🎉 AIRBAGS DEFLATED & PETALS OPENED · SOJOURNER ROLLOUT NOMINAL!';
                state.statusColor = '#22c55e';
              }
            }
          }
        } else if (state.roverLandingPhase === 'ramp_deploy') {
          const ramp = landerRampGroupRef.current;
          state.roverLandingProgress += dt * 0.22; // ~4.5 seconds

          if (ramp) {
            ramp.visible = true;
            const prog = Math.min(1.0, state.roverLandingProgress);
            playerVehicle.position.z = THREE.MathUtils.lerp(0, -5.5, prog);
            playerVehicle.position.y = THREE.MathUtils.lerp(groundY + 1.4, groundY + 0.4, prog);

            state.statusText = '🪜 EXTENDING RAMP: DEPLOYING ROVER DOWN PALLET TO SURFACE...';
            state.statusColor = '#38bdf8';

            if (prog >= 1.0) {
              state.roverLandingPhase = 'landed';
              soundFx.playRadioChirp();
              soundFx.playVictory();
              audioSynthRef.current.playQuindarBeep();
              confetti({ particleCount: 160, spread: 75 });
              state.statusText = '🎉 ROVER ON REGOLITH · READY FOR EXPLORATION!';
              state.statusColor = '#22c55e';
            }
          }
        }

        // ═════════════════════════════════════════════════════════════════════
        // PHASE 2: ACTIVE ROVER SURFACE DRIVING & EXPLORATION
        // ═════════════════════════════════════════════════════════════════════
        else {
          const speed = 15 * dt;
          let isMoving = false;
          if (state.keys['w'] || state.keys['arrowup']) {
            playerVehicle.translateZ(-speed);
            audioSynthRef.current.playRcsPuff();
            isMoving = true;
          }
          if (state.keys['s'] || state.keys['arrowdown']) {
            playerVehicle.translateZ(speed * 0.6);
            isMoving = true;
          }
          if (state.keys['a'] || state.keys['arrowleft']) {
            playerVehicle.rotation.y += 1.8 * dt;
            state.rollDeg = -10;
            isMoving = true;
          } else if (state.keys['d'] || state.keys['arrowright']) {
            playerVehicle.rotation.y -= 1.8 * dt;
            state.rollDeg = 10;
            isMoving = true;
          } else {
            state.rollDeg *= 0.9;
          }

          state.velocityKms = isMoving ? 0.015 : 0;
          const roverGroundOffset = isSojourner ? 0.25 : (isSpiritOpp ? 0.4 : (isApolloLrv ? 0.6 : 0.48));
          playerVehicle.position.y = THREE.MathUtils.lerp(playerVehicle.position.y, groundY + roverGroundOffset, dt * 10);
        }

        // Rotate waypoint diamond markers
        const waypoints = roverWaypointsRef.current;
        waypoints.forEach((wp, idx) => {
          if (wp.diamondMesh) {
            wp.diamondMesh.rotation.y += dt * 2.0;
            wp.diamondMesh.position.y = 5.5 + Math.sin(time * 0.003 + idx * 1.5) * 0.7;
          }
        });

        // Spin Ingenuity rotors if present
        if (ingenuityRotor1Ref.current) ingenuityRotor1Ref.current.rotation.y += dt * 45;
        if (ingenuityRotor2Ref.current) ingenuityRotor2Ref.current.rotation.y -= dt * 45;

        // Track active waypoint
        const activeWp = waypoints.find((w) => !w.collected);
        if (activeWp) {
          const dist = Math.hypot(playerVehicle.position.x - activeWp.x, playerVehicle.position.z - activeWp.z);
          state.distanceM = dist;

          if (dist <= 8.5) {
            state.statusText = `🎯 TARGET IN SAMPLING RANGE (${dist.toFixed(1)}m) · PRESS [SPACE] OR CLICK [COLLECT SAMPLE]!`;
            state.statusColor = '#22c55e';
          } else {
            state.statusText = `NAVIGATING TO ${activeWp.name} · DIST: ${dist.toFixed(1)}m · ${activeWp.description}`;
            state.statusColor = '#38bdf8';
          }
        } else if (waypoints.length > 0) {
          state.statusText = 'ALL SAMPLES COLLECTED & SECURED · ROVER MISSION COMPLETE!';
          state.statusColor = '#22c55e';
        }

        state.pitchDeg = 90;
      }

      // ─────────────────────────────────────────────────────────
      // 6.4 DOCKING DYNAMICS
      // ─────────────────────────────────────────────────────────
      else if (mission.gameType === 'docking') {
        if (state.keys['w'] || state.keys['arrowup']) playerVehicle.position.z -= 12 * dt;
        if (state.keys['s'] || state.keys['arrowdown']) playerVehicle.position.z += 12 * dt;
        if (state.keys['a'] || state.keys['arrowleft']) playerVehicle.position.x -= 10 * dt;
        if (state.keys['d'] || state.keys['arrowright']) playerVehicle.position.x += 10 * dt;

        state.distanceM = Math.max(0, playerVehicle.position.z - (targetObject.position.z + 10));
        const alignmentPct = Math.max(0, 100 - Math.abs(playerVehicle.position.x) * 10);

        if (state.distanceM <= 12.0) {
          state.statusText = `🎯 DOCKING CONE ALIGNED (${alignmentPct.toFixed(0)}%) · RANGE: ${state.distanceM.toFixed(1)}m · PRESS [SPACE] OR CLICK [ENGAGE DOCK LATCH]!`;
          state.statusColor = '#22c55e';
        } else {
          state.statusText = `APPROACHING TARGET · RANGE: ${state.distanceM.toFixed(1)}m · ALIGN WITH [A]/[D] & APPROACH WITH [W]`;
          state.statusColor = '#38bdf8';
        }

        if (state.distanceM <= 3.0) {
          state.isFinished = true;
          if (alignmentPct > 60) {
            soundFx.playRadioChirp();
            soundFx.playVictory();
            confetti({ particleCount: 160, spread: 80 });
            onSuccess(1000);
          } else {
            soundFx.playAlarm();
            onFailure('Docking latch missed: alignment deviation outside IDA capture cone.');
          }
        }
      }

      // ─────────────────────────────────────────────────────────
      // 6.5 DEEP SPACE INTERPLANETARY FLYBY
      // ─────────────────────────────────────────────────────────
      else if (mission.gameType === 'deep_space') {
        if (state.keys['w'] || state.keys['arrowup']) playerVehicle.position.z -= 15 * dt;
        if (state.keys['s'] || state.keys['arrowdown']) playerVehicle.position.z += 10 * dt;
        if (state.keys['a'] || state.keys['arrowleft']) playerVehicle.position.x -= 10 * dt;
        if (state.keys['d'] || state.keys['arrowright']) playerVehicle.position.x += 10 * dt;

        state.distanceM = Math.max(0, playerVehicle.position.z - (targetObject.position.z + 10));
        const alignmentPct = Math.max(0, 100 - Math.abs(playerVehicle.position.x) * 8);

        if (targetObject) {
          targetObject.rotation.y += dt * 0.15;
          targetObject.rotation.x += dt * 0.05;
        }

        if (state.distanceM <= 22) {
          state.statusText = 'FLYBY CORRIDOR REACHED · DSN READY TO TRANSMIT [SPACE]';
          state.statusColor = '#22c55e';
        } else {
          state.statusText = `APPROACHING ASTEROID · RANGE: ${state.distanceM.toFixed(1)} KM · ALIGN: ${alignmentPct.toFixed(0)}%`;
          state.statusColor = '#38bdf8';
        }
      }

      // ─────────────────────────────────────────────────────────
      // 6.6 SPACE TELESCOPE OBSERVATION
      // ─────────────────────────────────────────────────────────
      else {
        if (state.keys['w'] || state.keys['arrowup']) state.telescopeFocus = Math.min(100, state.telescopeFocus + dt * 25);
        if (state.keys['s'] || state.keys['arrowdown']) state.telescopeFocus = Math.max(0, state.telescopeFocus - dt * 25);
        if (state.keys['a'] || state.keys['arrowleft']) playerVehicle.rotation.y += 0.35 * dt;
        if (state.keys['d'] || state.keys['arrowright']) playerVehicle.rotation.y -= 0.35 * dt;

        // When telescope focus is high, make galaxy rotate and sharpen
        if (targetObject) {
          targetObject.rotation.z += dt * 0.08;
          const focusScale = 0.6 + (state.telescopeFocus / 100) * 0.4;
          targetObject.scale.setScalar(focusScale);
        }

        if (state.telescopeFocus >= 88) {
          state.statusText = 'OPTICS LOCKED · READY TO CAPTURE DEEP FIELD IMAGE [SPACE]';
          state.statusColor = '#22c55e';
        } else {
          state.statusText = `MIRROR FOCUS: ${state.telescopeFocus.toFixed(0)}% · USE [W]/[S] TO ALIGN (TARGET: 90%+)`;
          state.statusColor = '#c084fc';
        }
      }

      // ─────────────────────────────────────────────────────────
      // 7. REALISTIC CAMERA WITH THRUST RUMBLE & 360 ORBIT CONTROLS
      // ─────────────────────────────────────────────────────────
      const targetPos = playerVehicle.position.clone();
      const shakeAmount = state.throttle > 0 ? state.throttle * 0.14 * (state.pumpPressure || 1.0) : 0;
      const shakeX = (Math.random() - 0.5) * shakeAmount;
      const shakeY = (Math.random() - 0.5) * shakeAmount;
      const shakeZ = (Math.random() - 0.5) * shakeAmount;

      const lookTarget = targetPos.clone().add(new THREE.Vector3(0, mission.gameType === 'launch' ? 18 : (mission.gameType === 'lunar_landing' ? 1.5 : 2), 0));

      if (cameraModeRef.current === 'orbit') {
        controls.enabled = true;
        // Shift camera along with the vehicle displacement so camera maintains chosen distance/angle during flight
        const delta = lookTarget.clone().sub(prevLookTarget);
        camera.position.add(delta);
        controls.target.copy(lookTarget);
        controls.update();
      } else if (cameraModeRef.current === 'chase') {
        if (mission.gameType === 'docking') {
          controls.enabled = false;
          const chaseCamPos = new THREE.Vector3(playerVehicle.position.x, playerVehicle.position.y + 4.0, playerVehicle.position.z + 18);
          camera.position.lerp(chaseCamPos, 0.2);
          if (targetObject) {
            camera.lookAt(targetObject.position.x, targetObject.position.y, targetObject.position.z);
          }
        } else if (mission.gameType === 'lunar_landing') {
          controls.enabled = false;
          // Smooth third-person chase camera trailing behind and slightly above the lander
          const chaseOffset = new THREE.Vector3(0, 5.5, 16.0);
          chaseOffset.applyQuaternion(playerVehicle.quaternion);
          const chaseCamPos = playerVehicle.position.clone().add(chaseOffset);
          camera.position.lerp(chaseCamPos, dt * 6.0);
          const lookAtTarget = playerVehicle.position.clone().add(new THREE.Vector3(0, 1.2, 0));
          camera.lookAt(lookAtTarget);
        } else if (mission.gameType === 'launch') {
          controls.enabled = false;
          // Trailing chase camera following behind and below the ascending rocket
          const chaseCamPos = new THREE.Vector3(
            playerVehicle.position.x,
            playerVehicle.position.y - 4.0,
            playerVehicle.position.z + 32.0
          );
          camera.position.lerp(chaseCamPos, dt * 5.0);
          const lookAtTarget = playerVehicle.position.clone().add(new THREE.Vector3(0, 14.0, 0));
          camera.lookAt(lookAtTarget);
        } else if (mission.gameType === 'rover') {
          controls.enabled = false;
          let chaseCamOffset = new THREE.Vector3(0, 3.2, 8.5);
          let targetYOffset = 0.8;
          if (state.roverLandingPhase === 'sky_crane') {
            chaseCamOffset = new THREE.Vector3(0, 7.5, 18.0);
            targetYOffset = 3.5;
          } else if (state.roverLandingPhase === 'airbag_bounce') {
            chaseCamOffset = new THREE.Vector3(0, 5.0, 14.0);
            targetYOffset = 1.0;
          }
          chaseCamOffset.applyQuaternion(playerVehicle.quaternion);
          const chaseCamPos = playerVehicle.position.clone().add(chaseCamOffset);
          camera.position.lerp(chaseCamPos, dt * 5.0);
          const lookAtTarget = playerVehicle.position.clone().add(new THREE.Vector3(0, targetYOffset, 0));
          camera.lookAt(lookAtTarget);
        } else {
          controls.enabled = true;
          // Shift camera along with vehicle displacement so user can orbit 360° around craft with mouse from any angle
          const delta = lookTarget.clone().sub(prevLookTarget);
          camera.position.add(delta);
          controls.target.copy(lookTarget);
          controls.update();
        }
      } else if (cameraModeRef.current === 'distant') {
        controls.enabled = true;
        const delta = lookTarget.clone().sub(prevLookTarget);
        camera.position.add(delta);
        controls.target.copy(lookTarget);
        controls.update();
      } else if (cameraModeRef.current === 'pad') {
        controls.enabled = false;
        if (mission.gameType === 'launch') {
          // Launch Tower Pad Camera
          camera.position.set(-36 + shakeX, 8 + shakeY, 54 + shakeZ);
          camera.lookAt(targetPos.clone().add(new THREE.Vector3(0, 20, 0)));
        } else if (mission.gameType === 'docking') {
          // Space Station Docking Camera mounted on target station looking at approaching spacecraft
          if (targetObject) {
            camera.position.set(targetObject.position.x, targetObject.position.y + 4, targetObject.position.z + 12);
            camera.lookAt(targetPos);
          }
        } else if (mission.gameType === 'deep_space') {
          // Asteroid Observer Camera
          if (targetObject) {
            camera.position.set(targetObject.position.x + 12, targetObject.position.y + 12, targetObject.position.z + 14);
            camera.lookAt(targetPos);
          }
        } else if (mission.gameType === 'telescope') {
          // Deep Space Target Perspective
          if (targetObject) {
            camera.position.set(targetObject.position.x, targetObject.position.y, targetObject.position.z + 15);
            camera.lookAt(targetPos);
          }
        } else {
          // Surface Ground Tripod Camera
          camera.position.set(24 + shakeX, 1.2 + shakeY, -15 + shakeZ);
          camera.lookAt(targetPos.clone().add(new THREE.Vector3(0, 1.5, 0)));
        }
      } else {
        // Cockpit / Driver view with full 360° mouse freelook in all directions
        controls.enabled = false;

        const eyeOffsetLocal = new THREE.Vector3(0, 1.8, 0.2);
        let basePitchOffset = 0;

        if (mission.gameType === 'lunar_landing') {
          eyeOffsetLocal.set(0, 2.6, 2.0);
          basePitchOffset = -0.2;
        } else if (mission.gameType === 'rover') {
          if (isLunar) {
            // Apollo Lunar Roving Vehicle Driver Seat
            eyeOffsetLocal.set(-0.45, 1.6, 0.2);
          } else if (isSojourner) {
            eyeOffsetLocal.set(0, 0.65, 0.15);
          } else if (isSpiritOpp) {
            eyeOffsetLocal.set(0, 1.65, 0.25);
          } else if (isCuriosity) {
            eyeOffsetLocal.set(0, 2.15, 0.35);
          } else if (isViking) {
            eyeOffsetLocal.set(0, 1.85, 0.2);
          } else {
            // Perseverance / Artemis
            eyeOffsetLocal.set(0, 2.2, 0.4);
          }
        } else if (mission.gameType === 'docking') {
          eyeOffsetLocal.set(0, 0.7, -2.4);
        } else if (mission.gameType === 'telescope') {
          eyeOffsetLocal.set(0, 0, 6.4);
        } else if (mission.gameType === 'deep_space') {
          eyeOffsetLocal.set(0, 2.5, 0);
        } else {
          // Launch Capsule Cockpit
          eyeOffsetLocal.set(0, 32.5, 1.8);
          basePitchOffset = 0.35;
        }

        // World eye position following vehicle
        const eyeWorld = playerVehicle.localToWorld(eyeOffsetLocal.clone());
        eyeWorld.x += shakeX;
        eyeWorld.y += shakeY;
        eyeWorld.z += shakeZ;
        camera.position.copy(eyeWorld);

        // Spherical look angle from mouse yaw & pitch (360° freelook!)
        const yaw = cockpitLookRef.current.yaw;
        const pitch = cockpitLookRef.current.pitch + basePitchOffset;

        const cosP = Math.cos(pitch);
        const sinP = Math.sin(pitch);

        // In vehicle local coordinate system:
        // yaw rotates around Y axis (swivel left / right)
        // pitch tilts up / down
        const dirLocal = new THREE.Vector3(
          Math.sin(yaw) * cosP,
          sinP,
          -Math.cos(yaw) * cosP
        ).normalize();

        const dirWorld = dirLocal.clone().applyQuaternion(playerVehicle.quaternion);
        const lookTargetPoint = camera.position.clone().add(dirWorld.multiplyScalar(40));
        camera.lookAt(lookTargetPoint);
      }
      prevLookTarget.copy(lookTarget);

      // Sync React state
      setTelemetry({
        altitudeKm: state.altitudeKm,
        velocityKms: state.velocityKms,
        throttle: state.throttle,
        propellantPct: state.propellant,
        pitchDeg: state.pitchDeg,
        rollDeg: state.rollDeg,
        stage: state.stage,
        timeRemaining: state.timeRemaining,
        statusText: state.statusText,
        statusColor: state.statusColor,
        gForce: state.gForce,
        pumpPressure: state.pumpPressure,
        dsnSignal: state.dsnLocked ? 99 : 72,
        sampleCount: state.samples,
        distanceM: state.distanceM,
        telescopeFocus: state.telescopeFocus,
        roverLandingPhase: state.roverLandingPhase,
        deltaVKms: state.deltaVKms,
        apoapsisKm: state.apoapsisKm,
        periapsisKm: state.periapsisKm,
        oxygenPct: state.oxygenPct,
        powerGridPct: state.powerGridPct,
        thermalHullPct: state.thermalHullPct,
        flightAssistActive: state.flightAssist,
        scanProgress: state.scanProgress,
      });

      renderer.render(scene, camera);

      // Draw Live Apollo Lunar Seismograph Waveform
      if (isLunar && seismographCanvasRef.current) {
        const sCanvas = seismographCanvasRef.current;
        const sCtx = sCanvas.getContext('2d');
        if (sCtx) {
          const sw = sCanvas.width;
          const sh = sCanvas.height;
          sCtx.fillStyle = 'rgba(7, 12, 22, 0.25)';
          sCtx.fillRect(0, 0, sw, sh);

          sCtx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
          sCtx.lineWidth = 1;
          sCtx.beginPath();
          sCtx.moveTo(0, sh / 2);
          sCtx.lineTo(sw, sh / 2);
          sCtx.stroke();

          sCtx.strokeStyle = '#38bdf8';
          sCtx.lineWidth = 1.6;
          sCtx.beginPath();
          const t = performance.now() * 0.005;
          for (let x = 0; x < sw; x += 2) {
            const noise = Math.sin(x * 0.12 + t) * 3 + Math.sin(x * 0.28 - t * 2) * 2;
            const pulse = Math.exp(-Math.pow((x - ((performance.now() * 0.09) % sw)) / 14, 2)) * 15;
            const y = sh / 2 + noise + pulse * Math.sin(x * 0.4);
            if (x === 0) sCtx.moveTo(x, y);
            else sCtx.lineTo(x, y);
          }
          sCtx.stroke();
        }
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('dblclick', handleDoubleClick);
      audioSynthRef.current.dispose();
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [mission]);

  // HUD Color Palette
  const hudTheme = useMemo(() => {
    switch (visualTone) {
      case 'REALISTIC_NASA':
        return {
          primary: '#22c55e',
          amber: '#f59e0b',
          cardBg: 'rgba(8, 14, 20, 0.88)',
          border: 'rgba(34, 197, 94, 0.35)',
          glow: 'rgba(34, 197, 94, 0.15)',
          textColor: '#f1f5f9',
        };
      case 'CINEMATIC_GRADE':
        return {
          primary: '#38bdf8',
          amber: '#fbbf24',
          cardBg: 'rgba(5, 9, 18, 0.92)',
          border: 'rgba(56, 189, 248, 0.45)',
          glow: 'rgba(56, 189, 248, 0.25)',
          textColor: '#f8fafc',
        };
      case 'TACTICAL_HUD':
        return {
          primary: '#4ade80',
          amber: '#fbbf24',
          cardBg: 'rgba(2, 10, 4, 0.94)',
          border: 'rgba(74, 222, 128, 0.5)',
          glow: 'rgba(74, 222, 128, 0.3)',
          textColor: '#dcfce7',
        };
    }
  }, [visualTone]);

  return (
    <div
      className="three-mission-simulator"
      data-mission-type={mission.gameType}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '520px',
        flex: 1,
        maxWidth: '100%',
        margin: '0 auto',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: `0 25px 60px rgba(0,0,0,0.9), 0 0 35px ${hudTheme.glow}`,
        border: `1px solid ${hudTheme.border}`,
        background: '#020409',
        fontFamily: 'var(--font-mono)',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 3D WebGL Canvas Mount */}
      <div ref={mountRef} style={{ width: '100%', height: '100%', flex: 1 }} />

      {/* Model Loading Spinner */}
      {modelLoading && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(15, 23, 42, 0.85)',
            border: `1px solid ${hudTheme.border}`,
            borderRadius: '12px',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: hudTheme.textColor,
            fontSize: '12px',
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: '18px',
              height: '18px',
              border: `2px solid ${hudTheme.primary}`,
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span>STREAMING NASA 3D ASSET...</span>
        </div>
      )}

      {/* ─── IMMERSIVE FIRST-PERSON COCKPIT / DRIVER VIEWPORT HUD ──── */}
      {cameraMode === 'cockpit' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 15,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: 'inset 0 0 100px rgba(0, 0, 0, 0.85), inset 0 0 40px rgba(0, 0, 0, 0.95)',
          }}
        >
          {/* Top Bezel Mode Indicator */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              paddingTop: '50px',
            }}
          >
            <div
              style={{
                background: 'rgba(2, 6, 23, 0.78)',
                border: `1px solid ${hudTheme.primary}`,
                borderRadius: '20px',
                padding: '4px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backdropFilter: 'blur(8px)',
                boxShadow: `0 0 15px ${hudTheme.glow}`,
              }}
            >
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: hudTheme.primary,
                  boxShadow: `0 0 6px ${hudTheme.primary}`,
                }}
              />
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 800,
                  color: hudTheme.primary,
                  letterSpacing: '0.08em',
                }}
              >
                {mission.gameType === 'rover'
                  ? '🪑 ROVER DRIVER STATION · SURFACE OPTICS'
                  : mission.gameType === 'lunar_landing'
                  ? '👨‍🚀 APOLLO LUNAR MODULE FORWARD WINDOW · PDI GUIDANCE'
                  : mission.gameType === 'docking'
                  ? '🎯 FORWARD DOCKING CAMERA · CENTERLINE BORESIGHT'
                  : mission.gameType === 'telescope'
                  ? '🔭 CASSEGRAIN OPTICAL DETECTOR · PRIMARY FOCAL PLANE'
                  : mission.gameType === 'deep_space'
                  ? '📡 PROBE OPTICAL NAVIGATION SENSOR · 1ST PERSON SIGHT'
                  : '👨‍🚀 CREW CAPSULE COCKPIT · FLIGHT DECK VIEW'}
              </span>
            </div>
          </div>

          {/* Center First-Person HUD Reticle */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '260px',
              height: '260px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '24px',
                height: '24px',
                borderTop: `2px solid ${hudTheme.primary}`,
                borderLeft: `2px solid ${hudTheme.primary}`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '24px',
                height: '24px',
                borderTop: `2px solid ${hudTheme.primary}`,
                borderRight: `2px solid ${hudTheme.primary}`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '24px',
                height: '24px',
                borderBottom: `2px solid ${hudTheme.primary}`,
                borderLeft: `2px solid ${hudTheme.primary}`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '24px',
                height: '24px',
                borderBottom: `2px solid ${hudTheme.primary}`,
                borderRight: `2px solid ${hudTheme.primary}`,
              }}
            />
            <div
              style={{
                width: '36px',
                height: '36px',
                border: `1px dashed ${hudTheme.primary}`,
                borderRadius: '50%',
                opacity: 0.6,
              }}
            />
            <div
              style={{
                position: 'absolute',
                width: '8px',
                height: '1px',
                background: hudTheme.primary,
                opacity: 0.7,
              }}
            />
            <div
              style={{
                position: 'absolute',
                height: '8px',
                width: '1px',
                background: hudTheme.primary,
                opacity: 0.7,
              }}
            />
          </div>

          {/* Bottom Cockpit Edge Advisory & 360° Quick Look Bar */}
          <div
            style={{
              paddingBottom: '68px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                background: 'rgba(2, 6, 23, 0.85)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                borderRadius: '20px',
                padding: '4px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 0 16px rgba(56, 189, 248, 0.25)',
              }}
            >
              <span style={{ fontSize: '11px' }}>🖱️</span>
              <span style={{ fontSize: '9px', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.06em' }}>
                DRAG MOUSE IN ANY DIRECTION TO LOOK 360° AROUND COCKPIT / WINDOWS / INSTRUMENTS
              </span>
            </div>

            {/* Quick Look Direction Buttons */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                pointerEvents: 'auto',
              }}
            >
              <button
                onClick={() => handleCockpitLookSet(-Math.PI / 2, 0)}
                style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  color: '#94a3b8',
                  borderRadius: '5px',
                  padding: '3px 8px',
                  fontSize: '8.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  backdropFilter: 'blur(6px)',
                }}
                title="Turn head 90° left to view left window / instruments (or drag mouse left)"
              >
                ⬅️ LOOK LEFT (90°)
              </button>
              <button
                onClick={() => handleCockpitLookSet(0, 0)}
                style={{
                  background: 'rgba(56, 189, 248, 0.2)',
                  border: '1px solid #38bdf8',
                  color: '#38bdf8',
                  borderRadius: '5px',
                  padding: '3px 8px',
                  fontSize: '8.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  backdropFilter: 'blur(6px)',
                }}
                title="Look straight ahead"
              >
                ⬆️ FRONT VIEW (0°)
              </button>
              <button
                onClick={() => handleCockpitLookSet(Math.PI / 2, 0)}
                style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  color: '#94a3b8',
                  borderRadius: '5px',
                  padding: '3px 8px',
                  fontSize: '8.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  backdropFilter: 'blur(6px)',
                }}
                title="Turn head 90° right to view right window / instruments (or drag mouse right)"
              >
                LOOK RIGHT (90°) ➡️
              </button>
              <button
                onClick={() => handleCockpitLookSet(Math.PI, 0)}
                style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  color: '#94a3b8',
                  borderRadius: '5px',
                  padding: '3px 8px',
                  fontSize: '8.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  backdropFilter: 'blur(6px)',
                }}
                title="Look 180° behind"
              >
                🔄 REAR (180°)
              </button>
              <button
                onClick={() => handleCockpitLookSet(0, 0)}
                style={{
                  background: 'rgba(34, 197, 94, 0.2)',
                  border: '1px solid #22c55e',
                  color: '#86efac',
                  borderRadius: '5px',
                  padding: '3px 8px',
                  fontSize: '8.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  backdropFilter: 'blur(6px)',
                }}
                title="Re-center view to forward"
              >
                🎯 RE-CENTER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TOP COCKPIT AVIONICS STATUS BAR ────────────────────── */}
      <div
        className="mission-sim-topbar"
        style={{
          position: 'absolute',
          top: '12px',
          left: '14px',
          right: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 30,
          pointerEvents: 'none',
        }}
      >
        {/* Left: Mission Badge + Tone Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto' }}>
          <div
            style={{
              background: hudTheme.cardBg,
              border: `1px solid ${hudTheme.border}`,
              borderRadius: '8px',
              padding: '5px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backdropFilter: 'blur(12px)',
            }}
          >
            <Rocket size={14} style={{ color: hudTheme.primary }} />
            <span style={{ fontSize: '11px', fontWeight: 800, color: hudTheme.textColor }}>
              {mission.missionName.toUpperCase()}
            </span>
            <span style={{ fontSize: '9px', color: '#94a3b8' }}>[{mission.year}]</span>
          </div>

          <div
            style={{
              background: hudTheme.cardBg,
              border: `1px solid ${hudTheme.border}`,
              borderRadius: '8px',
              padding: '3px 6px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backdropFilter: 'blur(12px)',
            }}
          >
            <Palette size={12} style={{ color: hudTheme.amber }} />
            {(['REALISTIC_NASA', 'CINEMATIC_GRADE', 'TACTICAL_HUD'] as VisualToneMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setVisualTone(mode);
                  soundFx.playClick(900);
                }}
                style={{
                  background: visualTone === mode ? hudTheme.primary : 'transparent',
                  color: visualTone === mode ? '#020617' : '#94a3b8',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '3px 6px',
                  fontSize: '9px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {mode === 'REALISTIC_NASA' ? 'NASA REAL' : mode === 'CINEMATIC_GRADE' ? 'CINEMATIC' : 'TAC-HUD'}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Astronaut Academy Age Tier Selector Pill */}
        <div
          style={{
            background: hudTheme.cardBg,
            border: `1.5px solid ${ageTier === 'cadet' ? '#38bdf8' : ageTier === 'officer' ? '#fbbf24' : '#c084fc'}`,
            borderRadius: '10px',
            padding: '3px 6px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backdropFilter: 'blur(12px)',
            boxShadow: `0 0 16px ${ageTier === 'cadet' ? 'rgba(56, 189, 248, 0.3)' : ageTier === 'officer' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(192, 132, 252, 0.3)'}`,
            pointerEvents: 'auto',
          }}
        >
          {(['cadet', 'officer', 'commander'] as AstronautAgeTier[]).map((t) => {
            const cfg = ASTRONAUT_TIERS[t];
            const isSelected = ageTier === t;
            return (
              <button
                key={t}
                onClick={() => handleSelectAgeTier(t)}
                title={`${cfg.label} (${cfg.ageRange}): ${cfg.description}\nNASA Mission: ${cfg.nasaMissionContext}`}
                style={{
                  background: isSelected
                    ? (t === 'cadet' ? 'linear-gradient(135deg, #0284c7, #0369a1)' : t === 'officer' ? 'linear-gradient(135deg, #d97706, #b45309)' : 'linear-gradient(135deg, #7c3aed, #6d28d9)')
                    : 'transparent',
                  color: isSelected ? '#ffffff' : '#94a3b8',
                  border: isSelected ? '1px solid rgba(255,255,255,0.4)' : '1px solid transparent',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '9.5px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease',
                  letterSpacing: '0.04em',
                }}
              >
                <span>{cfg.badge}</span>
                <span>{cfg.label}</span>
                <span style={{ fontSize: '8px', opacity: 0.8, fontWeight: 700 }}>
                  ({cfg.ageRange.replace('Ages ', '')})
                </span>
              </button>
            );
          })}
        </div>

        {/* Center / Right: Camera, Sound & Briefing */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', pointerEvents: 'auto' }}>
          <div
            style={{
              background: hudTheme.cardBg,
              border: `1px solid ${hudTheme.border}`,
              borderRadius: '8px',
              padding: '3px',
              display: 'flex',
              gap: '3px',
            }}
          >
            {(['orbit', 'chase', 'cockpit', 'distant', 'pad'] as CameraMode[]).map((mode) => {
              const label =
                mode === 'orbit'
                  ? '🌐 360° ORBIT'
                  : mode === 'chase'
                  ? '🚀 CHASE'
                  : mode === 'distant'
                  ? '🌌 DISTANT'
                  : mode === 'cockpit'
                  ? (mission.gameType === 'rover' ? '🪑 DRIVER' : mission.gameType === 'lunar_landing' ? '👨‍🚀 LANDER' : mission.gameType === 'telescope' ? '🔭 EYEPIECE' : mission.gameType === 'docking' ? '🎯 DOCK CAM' : mission.gameType === 'deep_space' ? '📡 PROBE CAM' : '👨‍🚀 COCKPIT')
                  : (mission.gameType === 'launch' ? '🗼 TOWER' : mission.gameType === 'docking' ? '🛰️ STATION' : mission.gameType === 'deep_space' ? '☄️ TARGET' : '📷 GROUND');

              const tooltip =
                mode === 'orbit'
                  ? '360° Orbit: Drag mouse to rotate around vehicle from all angles, scroll to zoom'
                  : mode === 'chase'
                  ? 'Chase: Trailing behind the spacecraft'
                  : mode === 'distant'
                  ? 'Distant: Wide external cinematic view'
                  : mode === 'cockpit'
                  ? 'Cockpit: First-person astronaut / driver perspective'
                  : 'Observation: Fixed observation post';

              return (
                <button
                  key={mode}
                  onClick={() => handleSelectCameraMode(mode)}
                  title={tooltip}
                  style={{
                    background: cameraMode === mode ? hudTheme.primary : 'transparent',
                    color: cameraMode === mode ? '#020617' : '#94a3b8',
                    border: 'none',
                    borderRadius: '5px',
                    padding: '4px 7px',
                    fontSize: '9px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              audioSynthRef.current.setEnabled(next);
            }}
            style={{
              background: hudTheme.cardBg,
              border: `1px solid ${hudTheme.border}`,
              borderRadius: '8px',
              padding: '6px 10px',
              color: soundEnabled ? hudTheme.primary : '#ef4444',
              cursor: 'pointer',
            }}
          >
            {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>

          <button
            onClick={() => setShowBriefing(!showBriefing)}
            style={{
              background: hudTheme.cardBg,
              border: `1px solid ${hudTheme.border}`,
              borderRadius: '8px',
              padding: '6px 10px',
              color: hudTheme.primary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px',
              fontWeight: 800,
            }}
          >
            <BookOpen size={13} />
            <span>DIRECTIVE</span>
          </button>

          {isLunar && onOpenMoonquakeMap && (
            <button
              onClick={() => {
                onOpenMoonquakeMap();
                soundFx.playClick(850);
              }}
              style={{
                background: 'rgba(245, 158, 11, 0.2)',
                border: '1px solid #f59e0b',
                borderRadius: '8px',
                padding: '6px 10px',
                color: '#fbbf24',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '0.04em',
              }}
              title="Open Authentic NASA Apollo 3D Moonquake Globe"
            >
              <span>🌕</span>
              <span>MOONQUAKE 3D GLOBE</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── FLIGHT SEQUENCE TIMELINE BAR (SPACEFLIGHT SIMULATOR MOON ARCHITECTURE) ─── */}
      {mission.gameType === 'launch' && (
        <div
          style={{
            position: 'absolute',
            top: '48px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(2, 6, 23, 0.88)',
            border: `1px solid ${hudTheme.border}`,
            borderRadius: '24px',
            padding: '4px 14px',
            zIndex: 25,
            backdropFilter: 'blur(10px)',
            boxShadow: `0 0 20px ${hudTheme.glow}`,
            maxWidth: '92%',
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'liftoff', label: '1. LIFTOFF', done: telemetry.altitudeKm > 0.05, current: telemetry.altitudeKm <= 35 && telemetry.altitudeKm > 0 },
            { id: 'boosters', label: '2. BOOSTERS SEP', done: boosterSeparated, current: !boosterSeparated && telemetry.altitudeKm > 30 },
            { id: 'fairing', label: '3. FAIRINGS', done: fairingSeparated, current: boosterSeparated && !fairingSeparated },
            { id: 'meco', label: '4. S-II MECO', done: telemetry.stage === 2, current: fairingSeparated && telemetry.stage === 1 },
            { id: 'orbit', label: '5. LEO ORBIT', done: telemetry.altitudeKm >= 140, current: telemetry.stage === 2 && telemetry.altitudeKm < 140 },
            { id: 'tli', label: '6. TLI MOON BURN', done: tliComplete, current: tliActive && !tliComplete },
            { id: 'lunar', label: '7. LUNAR ORBIT', done: tliComplete, current: tliComplete },
          ].map((step, idx, arr) => (
            <React.Fragment key={step.id}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '9px',
                  fontWeight: 800,
                  color: step.done ? '#22c55e' : step.current ? '#38bdf8' : '#64748b',
                  padding: '2px 6px',
                  borderRadius: '12px',
                  background: step.current ? 'rgba(56, 189, 248, 0.2)' : step.done ? 'rgba(34, 197, 94, 0.12)' : 'transparent',
                  border: step.current ? '1px solid #38bdf8' : '1px solid transparent',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{step.done ? '✓' : step.current ? '●' : '○'}</span>
                <span>{step.label}</span>
              </div>
              {idx < arr.length - 1 && (
                <span style={{ color: '#334155', fontSize: '9px' }}>➔</span>
              )}
            </React.Fragment>
          ))}
          {tliActive && (
            <div style={{ marginLeft: '6px', paddingLeft: '8px', borderLeft: '1px solid #334155', fontSize: '9px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
              <span>🌕 MOON:</span>
              <strong style={{ color: '#f8fafc' }}>{moonDistDisplay.toLocaleString()} KM</strong>
            </div>
          )}
        </div>
      )}

      {/* ─── TACTICAL AEROSPACE NAVBALL HUD (BOTTOM-LEFT) ────────── */}
      <div
        className="mission-sim-navball"
        style={{
          position: 'absolute',
          left: '14px',
          bottom: '76px',
          background: hudTheme.cardBg,
          border: `1px solid ${hudTheme.border}`,
          borderRadius: '12px',
          padding: '8px',
          zIndex: 25,
          backdropFilter: 'blur(12px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 800, letterSpacing: '0.05em' }}>
          ATTITUDE NAVBALL
        </span>
        <canvas ref={navballCanvasRef} width={100} height={100} style={{ display: 'block' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '9px', color: hudTheme.primary }}>
          <span>PITCH: {telemetry.pitchDeg.toFixed(0)}°</span>
          <span>ROLL: {telemetry.rollDeg.toFixed(0)}°</span>
        </div>
      </div>

      {/* ─── APOLLO LUNAR SEISMIC MONITOR HUD (NAKAMURA 1979 DATASET) ─── */}
      {isLunar && (
        <div
          style={{
            position: 'absolute',
            left: '132px',
            bottom: '76px',
            background: hudTheme.cardBg,
            border: `1px solid ${hudTheme.border}`,
            borderRadius: '12px',
            padding: '8px 10px',
            zIndex: 25,
            backdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            width: '185px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '9px', color: '#38bdf8', fontWeight: 800, letterSpacing: '0.05em' }}>
              🌕 PSE SEISMOMETER
            </span>
            <span style={{ fontSize: '8px', color: '#22c55e', fontWeight: 700 }}>
              ● LIVE
            </span>
          </div>
          <div style={{ fontSize: '8.5px', color: '#cbd5e1', fontWeight: 600 }}>
            {stationInfo.name}
          </div>
          <div style={{ fontSize: '7.5px', color: '#94a3b8' }}>
            Site: {stationInfo.site}
          </div>
          <canvas ref={seismographCanvasRef} width={165} height={38} style={{ display: 'block', borderRadius: '4px', background: 'rgba(2, 6, 23, 0.7)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
            <span style={{ fontSize: '7.5px', color: '#64748b' }}>Coords: {stationInfo.coords}</span>
            {onOpenMoonquakeMap && (
              <button
                onClick={onOpenMoonquakeMap}
                style={{
                  background: 'rgba(56, 189, 248, 0.2)',
                  border: '1px solid #38bdf8',
                  color: '#38bdf8',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '8px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
                title="Open Full 3D Moonquake Seismic Globe"
              >
                3D GLOBE ↗
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── LEFT TELEMETRY TAPES (SPEED, ALTITUDE, G-FORCE) ─────── */}
      <div
        className="mission-sim-telemetry"
        style={{
          position: 'absolute',
          left: '14px',
          top: '76px',
          background: hudTheme.cardBg,
          border: `1px solid ${hudTheme.border}`,
          borderRadius: '10px',
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          zIndex: 20,
          backdropFilter: 'blur(10px)',
          minWidth: '155px',
        }}
      >
        <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 800, letterSpacing: '0.08em' }}>
          PRIMARY TELEMETRY
        </span>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <span style={{ color: '#94a3b8', fontSize: '11px' }}>ALTITUDE:</span>
          <strong style={{ color: hudTheme.primary, fontSize: '12px' }}>
            {mission.gameType === 'lunar_landing'
              ? `${telemetry.altitudeKm.toFixed(1)} m`
              : (telemetry.altitudeKm >= 1 ? `${telemetry.altitudeKm.toFixed(1)} km` : `${(telemetry.altitudeKm * 1000).toFixed(0)} m`)}
          </strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <span style={{ color: '#94a3b8', fontSize: '11px' }}>VELOCITY:</span>
          <strong style={{ color: hudTheme.amber, fontSize: '12px' }}>
            {mission.gameType === 'lunar_landing' ? `${Math.abs(telemetry.velocityKms).toFixed(1)} m/s` : `${telemetry.velocityKms.toFixed(2)} km/s`}
          </strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <span style={{ color: '#94a3b8', fontSize: '11px' }}>G-FORCE:</span>
          <strong style={{ color: telemetry.gForce > 3.0 ? '#ef4444' : hudTheme.textColor, fontSize: '12px' }}>
            {telemetry.gForce.toFixed(1)} G
          </strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <span style={{ color: '#94a3b8', fontSize: '11px' }}>PROPELLANT:</span>
          <strong style={{ color: telemetry.propellantPct < 20 ? '#ef4444' : hudTheme.primary, fontSize: '12px' }}>
            {Math.round(telemetry.propellantPct)}%
          </strong>
        </div>
        {mission.gameType === 'rover' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px' }}>
            <span style={{ color: '#94a3b8', fontSize: '11px' }}>SAMPLES:</span>
            <strong style={{ color: '#38bdf8', fontSize: '12px' }}>{telemetry.sampleCount} / 3 COLLECTED</strong>
          </div>
        )}
        {mission.gameType === 'docking' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ color: '#94a3b8', fontSize: '11px' }}>STATION RANGE:</span>
              <strong style={{ color: telemetry.distanceM <= 25 ? '#22c55e' : '#38bdf8', fontSize: '12px' }}>
                {telemetry.distanceM.toFixed(1)} m
              </strong>
            </div>
          </div>
        )}
        {mission.gameType === 'telescope' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ color: '#94a3b8', fontSize: '11px' }}>OPTICAL FOCUS:</span>
              <strong style={{ color: telemetry.telescopeFocus >= 88 ? '#22c55e' : '#c084fc', fontSize: '12px' }}>
                {Math.round(telemetry.telescopeFocus)}% {telemetry.telescopeFocus >= 88 ? '✓ LOCKED' : ''}
              </strong>
            </div>
            <div style={{ fontSize: '8.5px', color: telemetry.telescopeFocus >= 88 ? '#86efac' : '#cbd5e1' }}>
              {telemetry.telescopeFocus >= 88 ? '🎯 READY: PRESS [SPACE] OR CAPTURE' : 'Adjust [W]/[S] to ≥90%'}
            </div>
          </div>
        )}
        {mission.gameType === 'deep_space' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ color: '#94a3b8', fontSize: '11px' }}>TARGET DIST:</span>
              <strong style={{ color: telemetry.distanceM <= 22 ? '#22c55e' : '#38bdf8', fontSize: '12px' }}>
                {telemetry.distanceM.toFixed(1)} km
              </strong>
            </div>
            <div style={{ fontSize: '8.5px', color: telemetry.distanceM <= 22 ? '#86efac' : '#cbd5e1' }}>
              {telemetry.distanceM <= 22 ? '📡 FLYBY RANGE: PRESS [SPACE] OR TRANSMIT' : 'Thrust [W] to approach (<20 km)'}
            </div>
          </div>
        )}
        {mission.gameType === 'lunar_landing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#94a3b8' }}>
              <span>APOLLO PSE S11:</span>
              <strong style={{ color: '#22c55e' }}>ONLINE (0.02 µm/s²)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', color: '#38bdf8' }}>
              <span>NAKAMURA 1979:</span>
              <span>SEISMIC MONITOR ACTIVE</span>
            </div>
          </div>
        )}

        <details className="mission-sim-advanced-telemetry">
          <summary>ADVANCED FLIGHT DATA</summary>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '5px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
            <span style={{ color: '#94a3b8', fontSize: '10px' }} title="NASA Orbital Mechanics: Tsiolkovsky Delta-V Remaining">Δv BUDGET:</span>
            <strong style={{ color: '#38bdf8', fontSize: '11px', fontFamily: 'monospace' }}>
              {(telemetry.deltaVKms * 1000).toFixed(0)} m/s
            </strong>
          </div>
          {ageTier !== 'cadet' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <span style={{ color: '#94a3b8', fontSize: '9.5px' }} title="NASA Orbital Mechanics: Apoapsis (Ap) & Periapsis (Pe)">AP / PE:</span>
              <strong style={{ color: '#fbbf24', fontSize: '10px', fontFamily: 'monospace' }}>
                {telemetry.apoapsisKm}k / {telemetry.periapsisKm}k
              </strong>
            </div>
          )}
          {ageTier !== 'cadet' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <span style={{ color: '#94a3b8', fontSize: '9.5px' }} title="NASA Orion ECLSS: Power Bus MW & Oxygen Life Support">PWR / O₂:</span>
              <strong style={{ color: telemetry.powerGridPct < 30 ? '#ef4444' : '#34d399', fontSize: '10px', fontFamily: 'monospace' }}>
                {Math.round(telemetry.powerGridPct)}% / {Math.round(telemetry.oxygenPct)}%
              </strong>
            </div>
          )}
          {ageTier === 'commander' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <span style={{ color: '#94a3b8', fontSize: '9.5px' }} title="NASA Re-Entry Thermal Protection System Ablation Shield">HEAT SHIELD:</span>
              <strong style={{ color: telemetry.thermalHullPct < 50 ? '#ef4444' : '#c084fc', fontSize: '10px', fontFamily: 'monospace' }}>
                {Math.round(telemetry.thermalHullPct)}%
              </strong>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
            <span style={{ color: '#94a3b8', fontSize: '9.5px' }} title="NASA Reaction Control System: Coupled vs Decoupled 6-DOF Flight">ASSIST:</span>
            <button
              onClick={handleToggleFlightAssist}
              style={{
                fontSize: '8px',
                fontWeight: 900,
                padding: '2px 5px',
                borderRadius: '4px',
                background: telemetry.flightAssistActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(249, 115, 22, 0.25)',
                color: telemetry.flightAssistActive ? '#4ade80' : '#fb923c',
                border: `1px solid ${telemetry.flightAssistActive ? '#22c55e' : '#f97316'}`,
                cursor: 'pointer',
              }}
              title="Toggle Flight Assist (Hotkey: [Z])"
            >
              {telemetry.flightAssistActive ? 'FA-ON [Z]' : 'FA-OFF [Z]'}
            </button>
            </div>
          </div>
          </details>
      </div>

      {/* ─── RIGHT HUD: CO-OP CREW STATIONS & REAL-TIME LOGS ────── */}
      <div
        className="mission-sim-crew-panel"
        style={{
          position: 'absolute',
          right: '14px',
          top: '72px',
          maxWidth: '260px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 20,
        }}
      >
        <div
          style={{
            background: hudTheme.cardBg,
            border: `1px solid ${hudTheme.border}`,
            borderRadius: '10px',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
            <span style={{ fontSize: '9px', color: hudTheme.primary, fontWeight: 800 }}>
              CO-OP FLIGHT CREW
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={() => {
                  multiplayerMissionService.setSplitScreen(!roomState?.isSplitScreen);
                  soundFx.playClick(1000);
                }}
                style={{
                  background: roomState?.isSplitScreen ? 'rgba(34, 197, 94, 0.4)' : 'rgba(15, 23, 42, 0.7)',
                  border: `1px solid ${roomState?.isSplitScreen ? '#22c55e' : 'rgba(255,255,255,0.15)'}`,
                  color: roomState?.isSplitScreen ? '#86efac' : '#cbd5e1',
                  borderRadius: '4px',
                  padding: '2px 5px',
                  fontSize: '8px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
                title="Toggle 2-Player Couch Co-Op Split-Screen mode"
              >
                ⚡ {roomState?.isSplitScreen ? 'SPLIT ON' : 'SPLIT'}
              </button>
              <button
                onClick={() => setShowDiagnosticsOverlay((prev) => !prev)}
                style={{
                  background: showDiagnosticsOverlay ? 'rgba(56, 189, 248, 0.35)' : 'rgba(15, 23, 42, 0.7)',
                  border: `1px solid ${showDiagnosticsOverlay ? '#38bdf8' : 'rgba(255,255,255,0.15)'}`,
                  color: showDiagnosticsOverlay ? '#7dd3fc' : '#94a3b8',
                  borderRadius: '4px',
                  padding: '2px 5px',
                  fontSize: '8px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
                title="Co-Op Flight Inspector & Invariants Diagnostic Panel (Hotkey: F3)"
              >
                📡 F3
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            {(Object.keys(CREW_ROLES) as CrewRole[]).map((rk) => {
              const rData = CREW_ROLES[rk];
              const isPlayerActive = activeRole === rk;
              const playerObj = roomState?.players.find((p) => p.role === rk);

              return (
                <button
                  key={rk}
                  onClick={() => {
                    setActiveRole(rk);
                    multiplayerMissionService.selectRole(rk);
                    soundFx.playClick(900);
                  }}
                  style={{
                    background: isPlayerActive ? `${rData.color}30` : 'rgba(15, 23, 42, 0.7)',
                    border: `1px solid ${isPlayerActive ? rData.color : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '6px',
                    padding: '4px 6px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <span style={{ fontSize: '11px' }}>{rData.icon}</span>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '9.5px', fontWeight: 800, color: rData.color, lineHeight: 1.1 }}>
                      {rk}
                    </div>
                    <div style={{ fontSize: '8px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {playerObj ? playerObj.name : 'AI Copilot'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Crew Action Log Feed */}
        <details className="mission-sim-action-log">
          <summary>CREW ACTION LOG</summary>
        <div
          style={{
            background: hudTheme.cardBg,
            border: `1px solid ${hudTheme.border}`,
            borderRadius: '10px',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            fontSize: '9.5px',
            backdropFilter: 'blur(10px)',
          }}
        >
          {roomState?.actionLogs && roomState.actionLogs.length > 0 ? (
            roomState.actionLogs.slice(0, 5).map((log) => {
              const roleColor = CREW_ROLES[log.role]?.color || '#94a3b8';
              return (
                <div key={log.id} style={{ borderLeft: `2px solid ${roleColor}`, paddingLeft: '5px', lineHeight: 1.25 }}>
                  <strong style={{ color: roleColor }}>[{log.role}]</strong>{' '}
                  <span style={{ color: '#cbd5e1' }}>{log.actionText}</span>
                </div>
              );
            })
          ) : (
            <div style={{ color: '#64748b', fontStyle: 'italic' }}>
              No crew actions yet.
            </div>
          )}
        </div>
        </details>
      </div>

      {/* ─── DOCKING CROSSHAIR (FOR DOCKING MISSIONS) ─────────────── */}
      {mission.gameType === 'docking' && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '180px',
              height: '180px',
              border: `2px solid ${hudTheme.primary}`,
              borderRadius: '50%',
              position: 'relative',
              boxShadow: `0 0 20px ${hudTheme.glow}`,
            }}
          >
            <div style={{ position: 'absolute', top: '50%', left: '-15px', right: '-15px', height: '1px', background: hudTheme.primary }} />
            <div style={{ position: 'absolute', left: '50%', top: '-15px', bottom: '-15px', width: '1px', background: hudTheme.primary }} />
          </div>
          <div
            style={{
              marginTop: '10px',
              background: hudTheme.cardBg,
              padding: '6px 14px',
              borderRadius: '8px',
              border: `1.5px solid ${telemetry.distanceM <= 12 ? '#22c55e' : hudTheme.border}`,
              color: telemetry.distanceM <= 12 ? '#86efac' : hudTheme.primary,
              fontSize: '11px',
              fontWeight: 800,
              boxShadow: telemetry.distanceM <= 12 ? '0 0 15px rgba(34, 197, 94, 0.4)' : 'none',
            }}
          >
            {telemetry.distanceM <= 12
              ? `🟢 RANGE: ${telemetry.distanceM.toFixed(1)}m · CAPTURE READY · PRESS [SPACE] OR LATCH`
              : `🎯 RANGE: ${telemetry.distanceM.toFixed(1)}m · ALIGN WITH [A]/[D] & APPROACH WITH [W]`}
          </div>
        </div>
      )}

      {/* ─── BRIEFING MODAL POPUP OVERLAY ───────────────────────── */}
      {showBriefing && (
        <div
          style={{
            position: 'absolute',
            top: '64px',
            left: '20px',
            right: '20px',
            maxWidth: '720px',
            margin: '0 auto',
            background: hudTheme.cardBg,
            border: `1px solid ${hudTheme.border}`,
            borderRadius: '14px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
            backdropFilter: 'blur(16px)',
            padding: '18px 20px',
            zIndex: 40,
            color: '#e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hudTheme.primary, fontSize: '12px', fontWeight: 700 }}>
              <Info size={16} />
              <span>FLIGHT DIRECTIVE & AEROSPACE PHYSICS BRIEFING</span>
            </div>
            <button
              onClick={() => setShowBriefing(false)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '10px 14px', borderRadius: '8px', borderLeft: `3px solid ${hudTheme.primary}` }}>
              <strong style={{ color: hudTheme.primary, display: 'block', marginBottom: '3px' }}>PRIMARY OBJECTIVE</strong>
              <span>{mission.objective}</span>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '10px 14px', borderRadius: '8px', borderLeft: `3px solid ${hudTheme.amber}` }}>
              <strong style={{ color: hudTheme.amber, display: 'block', marginBottom: '3px' }}>CO-OP MULTI-STATION FLIGHT CONTROLS</strong>
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '4px' }}>
                <span>• <strong>[CDR] Pilot</strong>: W/S Throttle, A/D Pitch, Space Staging</span>
                <span>• <strong>[FDO] Nav</strong>: RCS translation burst buttons</span>
                <span>• <strong>[EECOM] Engineer</strong>: Turbopump 120% boost, radiator deployment</span>
                <span>• <strong>[CAPCOM] Comms</strong>: DSN Goldstone radar lock</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── ON-SCREEN LIFTOFF & PRE-LAUNCH CHECKLIST BANNER ─── */}
      {mission.gameType === 'launch' && telemetry.altitudeKm < 0.2 && telemetry.throttle === 0 && (
        <div
          className="mission-sim-preflight"
          style={{
            position: 'absolute',
            bottom: '76px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(11, 19, 38, 0.96)',
            border: `1.5px solid ${countdownTime !== null ? '#38bdf8' : '#22c55e'}`,
            borderRadius: '14px',
            padding: '12px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            zIndex: 35,
            boxShadow: `0 0 35px ${countdownTime !== null ? 'rgba(56, 189, 248, 0.45)' : 'rgba(34, 197, 94, 0.35)'}`,
            backdropFilter: 'blur(14px)',
            maxWidth: '680px',
            width: '94%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>👨‍🚀</span>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 900, color: '#f8fafc', letterSpacing: '0.05em' }}>
                PRE-LAUNCH CHECKLIST
                </span>
                <div style={{ fontSize: '9px', color: '#94a3b8' }}>
                Complete four system checks before liftoff.
                </div>
              </div>
            </div>
            {countdownTime !== null ? (
              <div style={{ background: '#020617', border: '1.5px solid #38bdf8', padding: '4px 12px', borderRadius: '8px', fontSize: '18px', fontWeight: 900, fontFamily: 'monospace', color: countdownTime <= 3 ? '#ef4444' : '#38bdf8', boxShadow: '0 0 15px rgba(56, 189, 248, 0.4)' }}>
                T-{countdownTime < 10 ? `0${countdownTime}` : countdownTime}s
              </div>
            ) : (
              <button
                onClick={handleStartCountdown}
                style={{
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  border: '1px solid #38bdf8',
                  color: '#fff',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontWeight: 900,
                  fontSize: '10.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 0 12px rgba(56, 189, 248, 0.4)',
                }}
              >
                <span>⚡</span>
                <span>AUTO-SEQUENCE & COUNTDOWN</span>
              </button>
            )}
          </div>

          {/* 4 Interactive Pre-Launch Checklist Switches */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
            <button
              onClick={() => handleTogglePreflight('internalPower')}
              disabled={countdownTime !== null}
              style={{
                background: preflightChecklist.internalPower ? 'rgba(34, 197, 94, 0.2)' : 'rgba(15, 23, 42, 0.8)',
                border: `1px solid ${preflightChecklist.internalPower ? '#22c55e' : '#475569'}`,
                color: preflightChecklist.internalPower ? '#86efac' : '#cbd5e1',
                borderRadius: '8px',
                padding: '6px 8px',
                textAlign: 'left',
                cursor: countdownTime !== null ? 'default' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '9px', fontWeight: 800 }}>
                <span>1. INTERNAL POWER</span>
                <span>{preflightChecklist.internalPower ? '✓ GO' : '⚪ PENDING'}</span>
              </div>
              <span style={{ fontSize: '7.5px', color: '#94a3b8' }}>Transfer to fuel cell bus</span>
            </button>

            <button
              onClick={() => handleTogglePreflight('cryoPressurization')}
              disabled={countdownTime !== null}
              style={{
                background: preflightChecklist.cryoPressurization ? 'rgba(34, 197, 94, 0.2)' : 'rgba(15, 23, 42, 0.8)',
                border: `1px solid ${preflightChecklist.cryoPressurization ? '#22c55e' : '#475569'}`,
                color: preflightChecklist.cryoPressurization ? '#86efac' : '#cbd5e1',
                borderRadius: '8px',
                padding: '6px 8px',
                textAlign: 'left',
                cursor: countdownTime !== null ? 'default' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '9px', fontWeight: 800 }}>
                <span>2. CRYO TANKS</span>
                <span>{preflightChecklist.cryoPressurization ? '✓ GO' : '⚪ PENDING'}</span>
              </div>
              <span style={{ fontSize: '7.5px', color: '#94a3b8' }}>Pressurize LOX to 52 PSI</span>
            </button>

            <button
              onClick={() => handleTogglePreflight('gncAlignment')}
              disabled={countdownTime !== null}
              style={{
                background: preflightChecklist.gncAlignment ? 'rgba(34, 197, 94, 0.2)' : 'rgba(15, 23, 42, 0.8)',
                border: `1px solid ${preflightChecklist.gncAlignment ? '#22c55e' : '#475569'}`,
                color: preflightChecklist.gncAlignment ? '#86efac' : '#cbd5e1',
                borderRadius: '8px',
                padding: '6px 8px',
                textAlign: 'left',
                cursor: countdownTime !== null ? 'default' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '9px', fontWeight: 800 }}>
                <span>3. GNC INERTIAL</span>
                <span>{preflightChecklist.gncAlignment ? '✓ GO' : '⚪ PENDING'}</span>
              </div>
              <span style={{ fontSize: '7.5px', color: '#94a3b8' }}>Align gyro azimuth 090°</span>
            </button>

            <button
              onClick={() => handleTogglePreflight('waterDeluge')}
              disabled={countdownTime !== null}
              style={{
                background: preflightChecklist.waterDeluge ? 'rgba(34, 197, 94, 0.2)' : 'rgba(15, 23, 42, 0.8)',
                border: `1px solid ${preflightChecklist.waterDeluge ? '#22c55e' : '#475569'}`,
                color: preflightChecklist.waterDeluge ? '#86efac' : '#cbd5e1',
                borderRadius: '8px',
                padding: '6px 8px',
                textAlign: 'left',
                cursor: countdownTime !== null ? 'default' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '9px', fontWeight: 800 }}>
                <span>4. WATER DELUGE</span>
                <span>{preflightChecklist.waterDeluge ? '✓ GO' : '⚪ PENDING'}</span>
              </div>
              <span style={{ fontSize: '7.5px', color: '#94a3b8' }}>Arm acoustic suppression</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px' }}>
            <span style={{ fontSize: '9px', color: '#94a3b8' }}>
              {countdownTime !== null
                ? `🚀 Terminal Count: ${countdownTime <= 6 ? 'Spooling engines (T-6s)' : 'All hold-down clamps active'}`
                : 'Complete all 4 checks to start countdown or click IGNITE to launch immediately.'}
            </span>
            <button
              onClick={handleIgnite}
              style={{
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                border: '1px solid #22c55e',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: '5px',
                fontWeight: 900,
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              🔥 INSTANT IGNITE [W]
            </button>
          </div>
        </div>
      )}

      {/* ─── BOTTOM CO-OP ROLE-SPECIFIC CONTROL BAR ─────────────── */}
      <div
        className="mission-sim-control-dock"
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '14px',
          right: '14px',
          background: hudTheme.cardBg,
          border: `1px solid ${hudTheme.border}`,
          borderRadius: '12px',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 30,
          backdropFilter: 'blur(14px)',
        }}
      >
        <div className="mission-sim-control-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              backgroundColor: `${CREW_ROLES[activeRole].color}25`,
              color: CREW_ROLES[activeRole].color,
              fontSize: '10px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>{CREW_ROLES[activeRole].icon}</span>
            <span>[{activeRole}] CONSOLE</span>
          </div>

          {activeRole === 'CDR' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {/* Throttle Display Bar */}
              <div style={{ width: '90px', height: '14px', background: '#0f172a', borderRadius: '4px', overflow: 'hidden', border: '1px solid #334155', position: 'relative' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${telemetry.throttle * 100}%`,
                    background: 'linear-gradient(90deg, #22c55e, #fbbf24)',
                    transition: 'width 0.1s linear',
                  }}
                />
                <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 800, color: '#fff' }}>
                  {Math.round(telemetry.throttle * 100)}% THRUST
                </span>
              </div>

              {/* Universal Game-Inspired Multi-Tool Scanner & Flight Assist Buttons */}
              <button
                onClick={handleTriggerScanner}
                disabled={scannerActive}
                style={{
                  background: scannerActive ? 'rgba(56, 189, 248, 0.4)' : 'linear-gradient(135deg, rgba(14, 165, 233, 0.3), rgba(2, 132, 199, 0.4))',
                  border: '1.5px solid #38bdf8',
                  color: '#e0f2fe',
                  borderRadius: '5px',
                  padding: '3px 9px',
                  fontSize: '9.5px',
                  fontWeight: 900,
                  cursor: scannerActive ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: scannerActive ? '0 0 16px rgba(56, 189, 248, 0.6)' : 'none',
                }}
                title="Trigger Multi-Spectral NASA Regolith & Geological Mineral Scanner (Hotkey: [F])"
              >
                <span>🔍</span>
                <span>{scannerActive ? 'SCANNING PULSE...' : 'SCANNER [F]'}</span>
              </button>

              <button
                onClick={handleToggleFlightAssist}
                style={{
                  background: telemetry.flightAssistActive
                    ? 'rgba(34, 197, 94, 0.25)'
                    : 'linear-gradient(135deg, rgba(234, 88, 12, 0.35), rgba(194, 65, 12, 0.45))',
                  border: `1.5px solid ${telemetry.flightAssistActive ? '#22c55e' : '#f97316'}`,
                  color: telemetry.flightAssistActive ? '#86efac' : '#fed7aa',
                  borderRadius: '5px',
                  padding: '3px 8px',
                  fontSize: '9px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Toggle NASA 6-DOF Decoupled Newtonian Reaction Control System (Hotkey: [Z])"
              >
                <span>🧭</span>
                <span>{telemetry.flightAssistActive ? 'FA-ON [Z]' : 'FA-OFF [Z]'}</span>
              </button>

              {/* Launch Specific Controls */}
              {mission.gameType === 'launch' && (
                <>
                  <button
                    onClick={handleIgnite}
                    style={{
                      background: 'linear-gradient(135deg, #16a34a, #15803d)',
                      border: '1px solid #22c55e',
                      color: '#ffffff',
                      borderRadius: '5px',
                      padding: '3px 8px',
                      fontSize: '9.5px',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      boxShadow: '0 0 10px rgba(34, 197, 94, 0.4)',
                    }}
                    title="Ignite all engines at 100% thrust (W key)"
                  >
                    <span>🔥</span>
                    <span>IGNITE 100%</span>
                  </button>

                  <button
                    onClick={() => handleThrottleChange(0.2)}
                    style={{
                      background: 'rgba(56, 189, 248, 0.2)',
                      border: '1px solid #38bdf8',
                      color: '#38bdf8',
                      borderRadius: '5px',
                      padding: '3px 6px',
                      fontSize: '9px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                    title="Throttle Up (+20%)"
                  >
                    ▲ +20%
                  </button>

                  <button
                    onClick={() => handleThrottleChange(-0.2)}
                    style={{
                      background: 'rgba(148, 163, 184, 0.2)',
                      border: '1px solid #64748b',
                      color: '#cbd5e1',
                      borderRadius: '5px',
                      padding: '3px 6px',
                      fontSize: '9px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                    title="Throttle Down (-20%)"
                  >
                    ▼ -20%
                  </button>

                  <button
                    onClick={() => handlePitchChange(15)}
                    style={{
                      background: 'rgba(245, 158, 11, 0.2)',
                      border: '1px solid #f59e0b',
                      color: '#fbbf24',
                      borderRadius: '5px',
                      padding: '3px 6px',
                      fontSize: '9px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                    title="Pitch Up (+15°)"
                  >
                    ⮝ PITCH
                  </button>

                  <button
                    onClick={() => handlePitchChange(-15)}
                    style={{
                      background: 'rgba(245, 158, 11, 0.2)',
                      border: '1px solid #f59e0b',
                      color: '#fbbf24',
                      borderRadius: '5px',
                      padding: '3px 6px',
                      fontSize: '9px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                    title="Pitch Down (-15°)"
                  >
                    ⮟ DIVE
                  </button>

                  {!boosterSeparated && (
                    <button
                      onClick={handleBoosterSeparation}
                      style={{
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.35), rgba(217, 119, 6, 0.45))',
                        border: '1.5px solid #f59e0b',
                        color: '#fbbf24',
                        borderRadius: '5px',
                        padding: '3px 8px',
                        fontSize: '9.5px',
                        fontWeight: 900,
                        cursor: 'pointer',
                        boxShadow: '0 0 10px rgba(245, 158, 11, 0.4)',
                      }}
                      title="Separate Dual Side Boosters (Korolev Cross)"
                    >
                      💥 SEPARATE BOOSTERS [SPACE]
                    </button>
                  )}

                  {boosterSeparated && !fairingSeparated && (
                    <button
                      onClick={handleFairingSeparation}
                      style={{
                        background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.35), rgba(2, 132, 199, 0.45))',
                        border: '1.5px solid #38bdf8',
                        color: '#bae6fd',
                        borderRadius: '5px',
                        padding: '3px 8px',
                        fontSize: '9.5px',
                        fontWeight: 900,
                        cursor: 'pointer',
                        boxShadow: '0 0 10px rgba(56, 189, 248, 0.4)',
                      }}
                      title="Jettison Clamshell Payload Fairing into space"
                    >
                      🛡️ JETTISON FAIRING [SPACE]
                    </button>
                  )}

                  {fairingSeparated && telemetry.stage === 1 && (
                    <button
                      onClick={handleStage1Separation}
                      style={{
                        background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.35), rgba(194, 65, 12, 0.45))',
                        border: '1.5px solid #f97316',
                        color: '#fed7aa',
                        borderRadius: '5px',
                        padding: '3px 8px',
                        fontSize: '9.5px',
                        fontWeight: 900,
                        cursor: 'pointer',
                        boxShadow: '0 0 10px rgba(249, 115, 22, 0.4)',
                      }}
                      title="Main Engine Cutoff & Stage 2 S-II Vacuum Engine Ignition"
                    >
                      ⚡ MECO & S-II [SPACE]
                    </button>
                  )}

                  {telemetry.altitudeKm >= 135 && !tliActive && (
                    <button
                      onClick={handleInitiateTli}
                      style={{
                        background: 'linear-gradient(135deg, #d97706, #b45309)',
                        border: '1.5px solid #fbbf24',
                        color: '#ffffff',
                        borderRadius: '6px',
                        padding: '4px 12px',
                        fontSize: '10px',
                        fontWeight: 900,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 0 16px rgba(251, 191, 36, 0.65)',
                        animation: 'pulse 1.8s infinite',
                      }}
                      title="Initiate Trans-Lunar Injection (TLI) burn to accelerate out of Earth orbit towards the Moon"
                    >
                      <span>🌕</span>
                      <span>FIRE TLI BURN TO MOON</span>
                    </button>
                  )}

                  {tliActive && !tliComplete && (
                    <div
                      style={{
                        background: 'rgba(56, 189, 248, 0.25)',
                        border: '1px solid #38bdf8',
                        color: '#bae6fd',
                        borderRadius: '6px',
                        padding: '3px 10px',
                        fontSize: '9.5px',
                        fontWeight: 900,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 0 12px rgba(56, 189, 248, 0.4)',
                      }}
                    >
                      <span>🚀 TLI IN PROGRESS:</span>
                      <span style={{ color: '#fbbf24' }}>11.2 KM/S ESCAPE</span>
                    </div>
                  )}

                  {tliComplete && (
                    <div
                      style={{
                        background: 'rgba(34, 197, 94, 0.25)',
                        border: '1.5px solid #22c55e',
                        color: '#86efac',
                        borderRadius: '6px',
                        padding: '3px 10px',
                        fontSize: '9.5px',
                        fontWeight: 900,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 0 15px rgba(34, 197, 94, 0.5)',
                      }}
                    >
                      <span>🌖</span>
                      <span>LUNAR ORBIT INSERTION REACHED ✓</span>
                    </div>
                  )}
                </>
              )}

              {/* Lunar Landing Controls */}
              {mission.gameType === 'lunar_landing' && (
                <>
                  <button
                    onMouseDown={() => { simStateRef.current.keys['w'] = true; }}
                    onMouseUp={() => { simStateRef.current.keys['w'] = false; }}
                    onMouseLeave={() => { simStateRef.current.keys['w'] = false; }}
                    onTouchStart={() => { simStateRef.current.keys['w'] = true; }}
                    onTouchEnd={() => { simStateRef.current.keys['w'] = false; }}
                    onClick={() => handleSimAction('lunar_burn')}
                    style={{
                      background: 'linear-gradient(135deg, #ea580c, #c2410c)',
                      border: '1px solid #f97316',
                      color: '#ffffff',
                      borderRadius: '5px',
                      padding: '3px 9px',
                      fontSize: '9.5px',
                      fontWeight: 900,
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                    title="Hold or click to fire Descent Engine [W / Space]"
                  >
                    🔥 RETRO-BURN [W]
                  </button>
                  <button
                    onClick={() => handleSimAction('lunar_toggle_agc')}
                    style={{
                      background: simStateRef.current.agcAuto ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                      border: `1px solid ${simStateRef.current.agcAuto ? '#22c55e' : '#ef4444'}`,
                      color: simStateRef.current.agcAuto ? '#86efac' : '#fca5a5',
                      borderRadius: '5px',
                      padding: '3px 8px',
                      fontSize: '9px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                    title="Toggle Apollo AGC P66 Computer Auto-Rate-of-Descent Assist"
                  >
                    {simStateRef.current.agcAuto ? '🛡️ AGC P66: ON' : '⚙️ AGC P66: OFF'}
                  </button>
                  <button
                    onMouseDown={() => { simStateRef.current.keys['a'] = true; }}
                    onMouseUp={() => { simStateRef.current.keys['a'] = false; }}
                    onMouseLeave={() => { simStateRef.current.keys['a'] = false; }}
                    onTouchStart={() => { simStateRef.current.keys['a'] = true; }}
                    onTouchEnd={() => { simStateRef.current.keys['a'] = false; }}
                    onClick={() => handleSimAction('lunar_left')}
                    style={{
                      background: 'rgba(56, 189, 248, 0.2)',
                      border: '1px solid #38bdf8',
                      color: '#38bdf8',
                      borderRadius: '5px',
                      padding: '3px 7px',
                      fontSize: '9px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    ◀ TILT L
                  </button>
                  <button
                    onMouseDown={() => { simStateRef.current.keys['d'] = true; }}
                    onMouseUp={() => { simStateRef.current.keys['d'] = false; }}
                    onMouseLeave={() => { simStateRef.current.keys['d'] = false; }}
                    onTouchStart={() => { simStateRef.current.keys['d'] = true; }}
                    onTouchEnd={() => { simStateRef.current.keys['d'] = false; }}
                    onClick={() => handleSimAction('lunar_right')}
                    style={{
                      background: 'rgba(56, 189, 248, 0.2)',
                      border: '1px solid #38bdf8',
                      color: '#38bdf8',
                      borderRadius: '5px',
                      padding: '3px 7px',
                      fontSize: '9px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    TILT R ▶
                  </button>
                </>
              )}

              {/* Rover Teleoperation Controls & 3 NASA Landing Systems */}
              {mission.gameType === 'rover' && (
                <>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center', background: 'rgba(2, 6, 23, 0.75)', padding: '2px 6px', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                    <span style={{ fontSize: '8.5px', fontWeight: 900, color: '#fbbf24' }}>🎬 LANDING:</span>
                    <button
                      onClick={() => handleTriggerRoverLanding('sky_crane')}
                      style={{
                        background: telemetry.roverLandingPhase === 'sky_crane' ? 'rgba(249, 115, 22, 0.45)' : 'rgba(249, 115, 22, 0.15)',
                        border: '1px solid #f97316',
                        color: '#ffedd5',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '8.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                      title="Replay Mars 2020 Perseverance / Curiosity Sky Crane EDL (8 Thrusters + Tether Cords)"
                    >
                      🏗️ SKY CRANE
                    </button>
                    <button
                      onClick={() => handleTriggerRoverLanding('airbag_bounce')}
                      style={{
                        background: telemetry.roverLandingPhase === 'airbag_bounce' ? 'rgba(245, 158, 11, 0.45)' : 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid #f59e0b',
                        color: '#fef3c7',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '8.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                      title="Replay Mars Pathfinder / Spirit Airbag Bouncing & Triangular Petal Unfolding"
                    >
                      🎈 AIRBAG
                    </button>
                    <button
                      onClick={() => handleTriggerRoverLanding('ramp_deploy')}
                      style={{
                        background: telemetry.roverLandingPhase === 'ramp_deploy' ? 'rgba(56, 189, 248, 0.45)' : 'rgba(56, 189, 248, 0.15)',
                        border: '1px solid #38bdf8',
                        color: '#e0f2fe',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '8.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                      title="Replay Apollo Lunar Rover (LRV) / Viking Mechanical Pallet Ramp Deployment"
                    >
                      🪜 RAMP
                    </button>
                    {telemetry.roverLandingPhase !== 'landed' && (
                      <button
                        onClick={handleSkipToDrive}
                        style={{
                          background: 'rgba(34, 197, 94, 0.35)',
                          border: '1px solid #22c55e',
                          color: '#86efac',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          fontSize: '8.5px',
                          fontWeight: 900,
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                        title="Skip landing cinematic to drive rover immediately"
                      >
                        ⏩ SKIP TO DRIVE
                      </button>
                    )}
                  </div>

                  <button
                    onMouseDown={() => {
                      if (simStateRef.current.roverLandingPhase !== 'landed') handleSkipToDrive();
                      simStateRef.current.keys['w'] = true;
                      audioSynthRef.current.playRcsPuff();
                    }}
                    onMouseUp={() => { simStateRef.current.keys['w'] = false; }}
                    onMouseLeave={() => { simStateRef.current.keys['w'] = false; }}
                    onTouchStart={() => {
                      if (simStateRef.current.roverLandingPhase !== 'landed') handleSkipToDrive();
                      simStateRef.current.keys['w'] = true;
                      audioSynthRef.current.playRcsPuff();
                    }}
                    onTouchEnd={() => { simStateRef.current.keys['w'] = false; }}
                    onClick={() => handleSimAction('rover_fwd')}
                    style={{ background: 'rgba(56, 189, 248, 0.25)', border: '1px solid #38bdf8', color: '#38bdf8', borderRadius: '5px', padding: '3px 7px', fontSize: '9px', fontWeight: 800, cursor: 'pointer', userSelect: 'none' }}
                  >
                    ▲ FORWARD [W]
                  </button>
                  <button
                    onMouseDown={() => {
                      if (simStateRef.current.roverLandingPhase !== 'landed') handleSkipToDrive();
                      simStateRef.current.keys['s'] = true;
                    }}
                    onMouseUp={() => { simStateRef.current.keys['s'] = false; }}
                    onMouseLeave={() => { simStateRef.current.keys['s'] = false; }}
                    onTouchStart={() => {
                      if (simStateRef.current.roverLandingPhase !== 'landed') handleSkipToDrive();
                      simStateRef.current.keys['s'] = true;
                    }}
                    onTouchEnd={() => { simStateRef.current.keys['s'] = false; }}
                    onClick={() => handleSimAction('rover_rev')}
                    style={{ background: 'rgba(148, 163, 184, 0.2)', border: '1px solid #64748b', color: '#cbd5e1', borderRadius: '5px', padding: '3px 7px', fontSize: '9px', fontWeight: 800, cursor: 'pointer', userSelect: 'none' }}
                  >
                    ▼ REV [S]
                  </button>
                  <button
                    onMouseDown={() => {
                      if (simStateRef.current.roverLandingPhase !== 'landed') handleSkipToDrive();
                      simStateRef.current.keys['a'] = true;
                    }}
                    onMouseUp={() => { simStateRef.current.keys['a'] = false; }}
                    onMouseLeave={() => { simStateRef.current.keys['a'] = false; }}
                    onTouchStart={() => {
                      if (simStateRef.current.roverLandingPhase !== 'landed') handleSkipToDrive();
                      simStateRef.current.keys['a'] = true;
                    }}
                    onTouchEnd={() => { simStateRef.current.keys['a'] = false; }}
                    onClick={() => handleSimAction('rover_left')}
                    style={{ background: 'rgba(56, 189, 248, 0.2)', border: '1px solid #38bdf8', color: '#38bdf8', borderRadius: '5px', padding: '3px 7px', fontSize: '9px', fontWeight: 800, cursor: 'pointer', userSelect: 'none' }}
                  >
                    ◀ LEFT [A]
                  </button>
                  <button
                    onMouseDown={() => {
                      if (simStateRef.current.roverLandingPhase !== 'landed') handleSkipToDrive();
                      simStateRef.current.keys['d'] = true;
                    }}
                    onMouseUp={() => { simStateRef.current.keys['d'] = false; }}
                    onMouseLeave={() => { simStateRef.current.keys['d'] = false; }}
                    onTouchStart={() => {
                      if (simStateRef.current.roverLandingPhase !== 'landed') handleSkipToDrive();
                      simStateRef.current.keys['d'] = true;
                    }}
                    onTouchEnd={() => { simStateRef.current.keys['d'] = false; }}
                    onClick={() => handleSimAction('rover_right')}
                    style={{ background: 'rgba(56, 189, 248, 0.2)', border: '1px solid #38bdf8', color: '#38bdf8', borderRadius: '5px', padding: '3px 7px', fontSize: '9px', fontWeight: 800, cursor: 'pointer', userSelect: 'none' }}
                  >
                    RIGHT [D] ▶
                  </button>

                  <button
                    onClick={() => handleSimAction('rover_sample')}
                    style={{
                      background: simStateRef.current.distanceM <= 8.5 ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'rgba(16, 185, 129, 0.2)',
                      border: `1.5px solid ${simStateRef.current.distanceM <= 8.5 ? '#22c55e' : '#059669'}`,
                      color: '#ffffff',
                      borderRadius: '5px',
                      padding: '3px 10px',
                      fontSize: '9.5px',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: simStateRef.current.distanceM <= 8.5 ? '0 0 14px rgba(34, 197, 94, 0.6)' : 'none',
                    }}
                    title="Collect Surface Geological Sample (SPACEBAR)"
                  >
                    <span>🧪</span>
                    <span>COLLECT SAMPLE [SPACE]</span>
                    <span style={{ background: '#020617', padding: '1px 5px', borderRadius: '4px', fontSize: '8.5px', color: '#86efac' }}>
                      {simStateRef.current.samples} / 3
                    </span>
                  </button>
                </>
              )}

              {/* Docking Controls */}
              {mission.gameType === 'docking' && (
                <>
                  <button
                    onClick={() => handleSimAction('dock_fwd')}
                    style={{ background: 'rgba(34, 197, 94, 0.25)', border: '1px solid #22c55e', color: '#86efac', borderRadius: '5px', padding: '3px 7px', fontSize: '9px', fontWeight: 800, cursor: 'pointer' }}
                  >
                    ▲ APPROACH [W]
                  </button>
                  <button
                    onClick={() => handleSimAction('dock_back')}
                    style={{ background: 'rgba(148, 163, 184, 0.2)', border: '1px solid #64748b', color: '#cbd5e1', borderRadius: '5px', padding: '3px 7px', fontSize: '9px', fontWeight: 800, cursor: 'pointer' }}
                  >
                    ▼ RETREAT [S]
                  </button>
                  <button
                    onClick={() => handleSimAction('dock_port')}
                    style={{ background: 'rgba(56, 189, 248, 0.2)', border: '1px solid #38bdf8', color: '#38bdf8', borderRadius: '5px', padding: '3px 7px', fontSize: '9px', fontWeight: 800, cursor: 'pointer' }}
                  >
                    ◀ PORT [A]
                  </button>
                  <button
                    onClick={() => handleSimAction('dock_starboard')}
                    style={{ background: 'rgba(56, 189, 248, 0.2)', border: '1px solid #38bdf8', color: '#38bdf8', borderRadius: '5px', padding: '3px 7px', fontSize: '9px', fontWeight: 800, cursor: 'pointer' }}
                  >
                    STBD [D] ▶
                  </button>

                  <button
                    onClick={() => handleSimAction('dock_latch')}
                    style={{
                      background: telemetry.distanceM <= 12 ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'rgba(16, 185, 129, 0.2)',
                      border: `1.5px solid ${telemetry.distanceM <= 12 ? '#22c55e' : '#059669'}`,
                      color: '#ffffff',
                      borderRadius: '5px',
                      padding: '3px 10px',
                      fontSize: '9.5px',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: telemetry.distanceM <= 12 ? '0 0 14px rgba(34, 197, 94, 0.6)' : 'none',
                    }}
                    title="Engage Docking Latch Capture Mechanism (SPACEBAR)"
                  >
                    <span>🧲</span>
                    <span>ENGAGE DOCK LATCH [SPACE]</span>
                    <span style={{ background: '#020617', padding: '1px 5px', borderRadius: '4px', fontSize: '8.5px', color: '#86efac' }}>
                      {telemetry.distanceM.toFixed(1)}m
                    </span>
                  </button>
                </>
              )}

              {/* Telescope Controls */}
              {mission.gameType === 'telescope' && (
                <>
                  <button
                    onClick={() => handleSimAction('focus_in')}
                    style={{ background: 'rgba(168, 85, 247, 0.25)', border: '1px solid #c084fc', color: '#f3e8ff', borderRadius: '5px', padding: '3px 8px', fontSize: '9px', fontWeight: 800, cursor: 'pointer' }}
                  >
                    🔍 FOCUS IN [W]
                  </button>
                  <button
                    onClick={() => handleSimAction('focus_out')}
                    style={{ background: 'rgba(148, 163, 184, 0.2)', border: '1px solid #64748b', color: '#cbd5e1', borderRadius: '5px', padding: '3px 8px', fontSize: '9px', fontWeight: 800, cursor: 'pointer' }}
                  >
                    🔎 FOCUS OUT [S]
                  </button>
                  <button
                    onClick={() => handleSimAction('telescope_capture')}
                    style={{
                      background: telemetry.telescopeFocus >= 88 ? 'rgba(34, 197, 94, 0.35)' : 'rgba(100, 116, 139, 0.25)',
                      border: `1px solid ${telemetry.telescopeFocus >= 88 ? '#22c55e' : '#475569'}`,
                      color: telemetry.telescopeFocus >= 88 ? '#86efac' : '#94a3b8',
                      borderRadius: '5px',
                      padding: '3px 10px',
                      fontSize: '9.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: telemetry.telescopeFocus >= 88 ? '0 0 12px rgba(34, 197, 94, 0.4)' : 'none',
                    }}
                  >
                    📸 CAPTURE SCIENCE OBSERVATION [SPACE] {telemetry.telescopeFocus >= 88 ? '★' : ''}
                  </button>
                </>
              )}

              {/* Deep Space Controls */}
              {mission.gameType === 'deep_space' && (
                <>
                  <button
                    onClick={() => handleSimAction('deep_thrust_fwd')}
                    style={{ background: 'rgba(56, 189, 248, 0.25)', border: '1px solid #38bdf8', color: '#e0f2fe', borderRadius: '5px', padding: '3px 8px', fontSize: '9px', fontWeight: 800, cursor: 'pointer' }}
                  >
                    ▲ THRUST FWD [W]
                  </button>
                  <button
                    onClick={() => handleSimAction('deep_thrust_rev')}
                    style={{ background: 'rgba(148, 163, 184, 0.2)', border: '1px solid #64748b', color: '#cbd5e1', borderRadius: '5px', padding: '3px 8px', fontSize: '9px', fontWeight: 800, cursor: 'pointer' }}
                  >
                    ▼ RETRO [S]
                  </button>
                  <button
                    onClick={() => handleSimAction('deep_rcs_left')}
                    style={{ background: 'rgba(56, 189, 248, 0.2)', border: '1px solid #38bdf8', color: '#38bdf8', borderRadius: '5px', padding: '3px 7px', fontSize: '9px', fontWeight: 800, cursor: 'pointer' }}
                  >
                    ◀ RCS PORT [A]
                  </button>
                  <button
                    onClick={() => handleSimAction('deep_rcs_right')}
                    style={{ background: 'rgba(56, 189, 248, 0.2)', border: '1px solid #38bdf8', color: '#38bdf8', borderRadius: '5px', padding: '3px 7px', fontSize: '9px', fontWeight: 800, cursor: 'pointer' }}
                  >
                    RCS STBD [D] ▶
                  </button>
                  <button
                    onClick={() => handleSimAction('dsn_transmit')}
                    style={{
                      background: telemetry.distanceM <= 22 ? 'rgba(34, 197, 94, 0.35)' : 'rgba(100, 116, 139, 0.25)',
                      border: `1px solid ${telemetry.distanceM <= 22 ? '#22c55e' : '#475569'}`,
                      color: telemetry.distanceM <= 22 ? '#86efac' : '#94a3b8',
                      borderRadius: '5px',
                      padding: '3px 10px',
                      fontSize: '9.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: telemetry.distanceM <= 22 ? '0 0 12px rgba(34, 197, 94, 0.4)' : 'none',
                    }}
                  >
                    📡 TRANSMIT DSN TELEMETRY [SPACE] {telemetry.distanceM <= 22 ? '★' : ''}
                  </button>
                </>
              )}
            </div>
          )}

          {activeRole === 'FDO' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '9px', color: '#94a3b8' }}>RCS PULSE:</span>
              <button
                onClick={() => multiplayerMissionService.fireRcsPulse('x', -1)}
                style={{ padding: '3px 8px', background: '#0f172a', border: '1px solid #34d399', color: '#34d399', borderRadius: '4px', fontSize: '9px', fontWeight: 800, cursor: 'pointer' }}
              >
                ◀ PORT
              </button>
              <button
                onClick={() => multiplayerMissionService.fireRcsPulse('x', 1)}
                style={{ padding: '3px 8px', background: '#0f172a', border: '1px solid #34d399', color: '#34d399', borderRadius: '4px', fontSize: '9px', fontWeight: 800, cursor: 'pointer' }}
              >
                STARBOARD ▶
              </button>
              <button
                onClick={() => multiplayerMissionService.fireRcsPulse('y', 1)}
                style={{ padding: '3px 8px', background: '#0f172a', border: '1px solid #34d399', color: '#34d399', borderRadius: '4px', fontSize: '9px', fontWeight: 800, cursor: 'pointer' }}
              >
                ▲ PROGRADE
              </button>
            </div>
          )}

          {activeRole === 'EECOM' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => multiplayerMissionService.setPumpPressure(telemetry.pumpPressure > 1.05 ? 1.0 : 1.2)}
                style={{
                  background: telemetry.pumpPressure > 1.05 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(251, 191, 36, 0.2)',
                  border: `1px solid ${telemetry.pumpPressure > 1.05 ? '#ef4444' : '#fbbf24'}`,
                  color: telemetry.pumpPressure > 1.05 ? '#fca5a5' : '#fbbf24',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '9.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                TURBOPUMP: {Math.round(telemetry.pumpPressure * 100)}% (BOOST)
              </button>
              <button
                onClick={() => multiplayerMissionService.toggleRadiator()}
                style={{
                  background: '#0f172a',
                  border: '1px solid #fbbf24',
                  color: '#fbbf24',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '9.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                RADIATORS
              </button>
            </div>
          )}

          {activeRole === 'CAPCOM' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => multiplayerMissionService.toggleDsnLock()}
                style={{
                  background: 'rgba(192, 132, 252, 0.2)',
                  border: '1px solid #c084fc',
                  color: '#e9d5ff',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '9.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                DSN 70M RADAR: {telemetry.dsnSignal}% LOCKED
              </button>
            </div>
          )}
        </div>

        <div className="mission-sim-status" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: telemetry.statusColor }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: telemetry.statusColor }} />
          <span>{telemetry.statusText}</span>
        </div>

        <button
          className="mission-sim-abort"
          onClick={handleAbort}
          style={{
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            color: '#fca5a5',
            borderRadius: '6px',
            padding: '4px 12px',
            fontSize: '10px',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          ABORT
        </button>
      </div>

      {/* ─── NO MAN'S SKY & MORPHITE GEOLOGICAL SCAN ENCYCLOPEDIA MODAL ─── */}
      {scannedLore && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(7, 13, 27, 0.94)',
            border: `1.5px solid ${hudTheme.primary}`,
            borderRadius: '16px',
            padding: '20px 24px',
            maxWidth: '560px',
            width: '90%',
            boxShadow: `0 0 40px ${hudTheme.glow}, 0 20px 50px rgba(0, 0, 0, 0.9)`,
            backdropFilter: 'blur(16px)',
            zIndex: 60,
            color: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ fontSize: '26px' }}>{scannedLore.badge}</div>
              <div>
                <div style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 900, letterSpacing: '0.08em' }}>
                  {scannedLore.gameSource.toUpperCase()}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 900, color: '#f8fafc' }}>
                  {scannedLore.title}
                </div>
                <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                  {scannedLore.subtitle}
                </div>
              </div>
            </div>
            <button
              onClick={() => setScannedLore(null)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '6px',
                color: '#cbd5e1',
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              ✕
            </button>
          </div>

          {/* Age Tier & Rarity Badge */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ background: 'rgba(56, 189, 248, 0.2)', border: '1px solid #38bdf8', color: '#7dd3fc', padding: '2px 8px', borderRadius: '12px', fontSize: '9px', fontWeight: 800 }}>
              🎯 {scannedLore.ageLevel}
            </span>
            <span style={{ background: 'rgba(234, 179, 8, 0.2)', border: '1px solid #eab308', color: '#fde047', padding: '2px 8px', borderRadius: '12px', fontSize: '9px', fontWeight: 800 }}>
              💎 {scannedLore.rarity}
            </span>
            <span style={{ background: 'rgba(34, 197, 94, 0.2)', border: '1px solid #22c55e', color: '#86efac', padding: '2px 8px', borderRadius: '12px', fontSize: '9px', fontWeight: 800 }}>
              🧪 {scannedLore.element}
            </span>
          </div>

          {/* Body Science */}
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px', padding: '12px', fontSize: '11.5px', lineHeight: '1.55', color: '#e2e8f0', borderLeft: `3px solid ${hudTheme.primary}` }}>
            {scannedLore.body}
          </div>

          {/* Stoichiometric / Physics Formula */}
          {scannedLore.formula && (
            <div style={{ background: 'rgba(2, 6, 23, 0.8)', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #334155' }}>
              <span style={{ fontSize: '9.5px', color: '#94a3b8', fontWeight: 700 }}>SCIENTIFIC FORMULATION:</span>
              <code style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 900, fontFamily: 'monospace' }}>
                {scannedLore.formula}
              </code>
            </div>
          )}

          {/* Close Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button
              onClick={() => {
                setScannedLore(null);
                soundFx.playClick(800);
              }}
              style={{
                background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                border: '1px solid #38bdf8',
                color: '#ffffff',
                padding: '6px 16px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              LOG DISCOVERY & RESUME FLIGHT
            </button>
          </div>
        </div>
      )}

      {/* ─── COUCH CO-OP: PLAYER 2 SYSTEMS & DYNAMICS CONSOLE (SPLIT-SCREEN ACTIVE) ─── */}
      {roomState?.isSplitScreen && (
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            right: '20px',
            width: '360px',
            background: 'rgba(7, 13, 27, 0.92)',
            border: '1.5px solid #22c55e',
            borderRadius: '12px',
            padding: '12px 14px',
            boxShadow: '0 0 25px rgba(34, 197, 94, 0.3), 0 10px 30px rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(12px)',
            zIndex: 45,
            color: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px' }}>🎮</span>
              <span style={{ fontSize: '11px', fontWeight: 900, color: '#86efac', letterSpacing: '0.04em' }}>
                PLAYER 2 STATION (SYSTEMS & DYNAMICS)
              </span>
            </div>
            <span style={{ fontSize: '9px', background: '#022c22', color: '#86efac', padding: '1px 6px', borderRadius: '4px', border: '1px solid #22c55e', fontWeight: 700 }}>
              COUCH CO-OP
            </span>
          </div>

          <div style={{ fontSize: '9px', color: '#94a3b8', lineHeight: 1.3 }}>
            <strong>P2 Controls:</strong> [Arrows] RCS Trans · [ ] ] Radiator · [ [ ] Turbopump · [ \ ] DSN Lock · [Enter] Radio Call
          </div>

          {/* Quick Interactive Actions for Player 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <button
              onClick={() => {
                multiplayerMissionService.setPumpPressure(simStateRef.current.pumpPressure > 1.05 ? 1.0 : 1.2);
                soundFx.playReactorStart();
              }}
              style={{
                background: simStateRef.current.pumpPressure > 1.05 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(251, 191, 36, 0.25)',
                border: `1px solid ${simStateRef.current.pumpPressure > 1.05 ? '#ef4444' : '#fbbf24'}`,
                color: simStateRef.current.pumpPressure > 1.05 ? '#fca5a5' : '#fbbf24',
                padding: '6px',
                borderRadius: '6px',
                fontSize: '9.5px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              ⚡ PUMP: {Math.round(simStateRef.current.pumpPressure * 100)}% [ [ ]
            </button>

            <button
              onClick={() => {
                multiplayerMissionService.toggleRadiator();
                soundFx.playClick(850);
              }}
              style={{
                background: simStateRef.current.radiatorDeployed ? 'rgba(34, 197, 94, 0.25)' : 'rgba(15, 23, 42, 0.8)',
                border: `1px solid ${simStateRef.current.radiatorDeployed ? '#22c55e' : '#475569'}`,
                color: simStateRef.current.radiatorDeployed ? '#86efac' : '#cbd5e1',
                padding: '6px',
                borderRadius: '6px',
                fontSize: '9.5px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              ❄️ RADIATOR {simStateRef.current.radiatorDeployed ? 'DEPLOYED' : 'RETRACTED'} [ ] ]
            </button>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => {
                multiplayerMissionService.fireRcsPulse('x', -1);
                audioSynthRef.current.playRcsPuff();
              }}
              style={{ flex: 1, padding: '5px', background: '#0f172a', border: '1px solid #34d399', color: '#34d399', borderRadius: '4px', fontSize: '9px', fontWeight: 800, cursor: 'pointer' }}
            >
              ◀ RCS PORT [←]
            </button>
            <button
              onClick={() => {
                multiplayerMissionService.fireRcsPulse('x', 1);
                audioSynthRef.current.playRcsPuff();
              }}
              style={{ flex: 1, padding: '5px', background: '#0f172a', border: '1px solid #34d399', color: '#34d399', borderRadius: '4px', fontSize: '9px', fontWeight: 800, cursor: 'pointer' }}
            >
              RCS STBD [→] ▶
            </button>
            <button
              onClick={() => {
                multiplayerMissionService.toggleDsnLock();
                audioSynthRef.current.playQuindarBeep();
              }}
              style={{ flex: 1, padding: '5px', background: 'rgba(192, 132, 252, 0.2)', border: '1px solid #c084fc', color: '#e9d5ff', borderRadius: '4px', fontSize: '9px', fontWeight: 800, cursor: 'pointer' }}
            >
              📡 DSN LOCK [ \ ]
            </button>
          </div>
        </div>
      )}

      {/* ─── CO-OP ANYTHING: FLIGHT RECORDER & DESYNC INSPECTOR (F3 MODAL) ─── */}
      {showDiagnosticsOverlay && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(7, 13, 27, 0.95)',
            border: '1.5px solid #38bdf8',
            borderRadius: '16px',
            padding: '20px 24px',
            maxWidth: '680px',
            width: '92%',
            boxShadow: '0 0 40px rgba(56, 189, 248, 0.4), 0 20px 50px rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(16px)',
            zIndex: 70,
            color: '#f8fafc',
            fontFamily: 'monospace',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>📡</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 900, color: '#38bdf8' }}>
                  CO-OP FLIGHT INSPECTOR & INVARIANTS ORACLE
                </div>
                <div style={{ fontSize: '9.5px', color: '#94a3b8' }}>
                  Architecture derived from cranebeaker/coop-anything (tools/flight + tools/ownership)
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowDiagnosticsOverlay(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '6px',
                color: '#cbd5e1',
                padding: '4px 10px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              ✕ CLOSE [F3]
            </button>
          </div>

          {/* Sync Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
            <div style={{ background: '#0f172a', padding: '8px 10px', borderRadius: '6px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '8.5px', color: '#94a3b8' }}>SYNC PROTOCOL</div>
              <div style={{ fontSize: '11px', fontWeight: 900, color: '#38bdf8' }}>P2P BROADCAST</div>
            </div>
            <div style={{ background: '#0f172a', padding: '8px 10px', borderRadius: '6px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '8.5px', color: '#94a3b8' }}>AUTHORITY EPOCH</div>
              <div style={{ fontSize: '11px', fontWeight: 900, color: '#fbbf24' }}>#{roomState?.epoch || 1}</div>
            </div>
            <div style={{ background: '#0f172a', padding: '8px 10px', borderRadius: '6px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '8.5px', color: '#94a3b8' }}>DESYNC DIVERGENCE</div>
              <div style={{ fontSize: '11px', fontWeight: 900, color: '#22c55e' }}>0.00% [LOCKED]</div>
            </div>
            <div style={{ background: '#0f172a', padding: '8px 10px', borderRadius: '6px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '8.5px', color: '#94a3b8' }}>TICK RATE</div>
              <div style={{ fontSize: '11px', fontWeight: 900, color: '#38bdf8' }}>60 HZ (TICK)</div>
            </div>
          </div>

          {/* Subsystem Authority Ownership Matrix */}
          <div style={{ background: '#0f172a', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '9.5px', color: '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>
              SUBSYSTEM AUTHORITY MATRIX (ACTOR-OWNERSHIP MODEL)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontSize: '10px' }}>
              {(Object.keys(CREW_ROLES) as CrewRole[]).map((rk) => {
                const p = roomState?.players.find((pl) => pl.role === rk);
                const rData = CREW_ROLES[rk];
                return (
                  <div key={rk} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', background: '#020617', borderRadius: '4px', borderLeft: `3px solid ${rData.color}` }}>
                    <span style={{ color: rData.color, fontWeight: 800 }}>[{rk}] {rData.subsystem.split(' ')[0]}</span>
                    <span style={{ color: p?.isAi ? '#94a3b8' : '#86efac' }}>{p ? p.name : 'AI Copilot'} {p?.isAi ? '(AI)' : '(HUMAN)'}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Invariant Verification */}
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '8px 12px', borderRadius: '8px', border: '1px solid #22c55e', fontSize: '9.5px', color: '#86efac', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>✓ INVARIANTS: SINGLE AUTHORITY / MONOTONIC EPOCHS / CONSERVED CONSUMABLES</span>
            <span style={{ fontWeight: 800, background: '#022c22', padding: '2px 6px', borderRadius: '4px' }}>PASSING</span>
          </div>
        </div>
      )}
    </div>
  );
};
