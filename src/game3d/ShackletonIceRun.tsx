import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BatteryCharging, Heater, Radio, RotateCcw, X } from 'lucide-react';
import { soundFx } from '../utils/audioEffects';
import { triggerHapticFeedback } from '../utils/haptics';
import {
  getRoverPowerDrainPerSecond,
  getShackletonHeight,
  getShackletonSlopeDegrees,
  getStormTimerSeconds,
  ICE_WAYPOINTS,
  KILOPOWER_CHARGERS,
  SHACKLETON_TERRAIN_ATTRIBUTION,
} from './shackletonTerrain';
import type { ShackletonReward } from '../utils/shackletonProgress';
import './shackleton.css';

type WeatherSource = 'LIVE' | 'ARCHIVED' | 'GAME SIMULATION';
type HeldInput = 'forward' | 'reverse' | 'left' | 'right';

export interface ShackletonRunReward extends ShackletonReward {
  summary: string;
}

export interface ShackletonRunResult {
  success: boolean;
  causeChain: string[];
  iceSamples: number;
  reason: string;
}

export interface ShackletonRunRecordedResult {
  success: boolean;
  iceSamples: number;
  reason: string;
}

interface ShackletonIceRunProps {
  onClose: () => void;
  onFinish?: (reward: ShackletonRunReward) => void;
  onRunRecorded?: (result: ShackletonRunRecordedResult) => void;
  onReviewLesson?: () => void;
  onUse2DFallback?: () => void;
  stormWarningHours?: number;
  stormSource?: WeatherSource;
  stormRecordId?: string;
}

interface Telemetry {
  battery: number;
  roverTemperature: number;
  elapsedSeconds: number;
  stormSeconds: number;
  slopeDegrees: number;
  collectedSamples: number;
  nearbyPrompt: string;
  message: string;
}

interface SceneRuntime {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  world: RAPIER.World;
  rover: RAPIER.RigidBody;
  roverVisual: THREE.Group;
  waypointMeshes: Map<string, THREE.Mesh>;
}

const INITIAL_TELEMETRY: Telemetry = {
  battery: 100,
  roverTemperature: 100,
  elapsedSeconds: 0,
  stormSeconds: 90,
  slopeDegrees: 0,
  collectedSamples: 0,
  nearbyPrompt: 'Drive to a marked sampling point.',
  message: 'Collect three ice readings, then return to the landing pad.',
};

const TERRAIN_GRID_SIZE = 61;
const TERRAIN_HALF_SIZE = 30;
const SAMPLE_RANGE = 3.2;
const CHARGER_RANGE = 4;
const STORM_SIMULATION_NOTE = 'The warning clock is compressed for this short game run.';

let rapierInitialization: Promise<void> | null = null;

function initializeRapier(): Promise<void> {
  rapierInitialization ??= RAPIER.init();
  return rapierInitialization;
}

function createTerrainMesh(): { mesh: THREE.Mesh; vertices: Float32Array; indices: Uint32Array } {
  const vertices = new Float32Array(TERRAIN_GRID_SIZE * TERRAIN_GRID_SIZE * 3);
  const indices = new Uint32Array((TERRAIN_GRID_SIZE - 1) * (TERRAIN_GRID_SIZE - 1) * 6);
  let vertexIndex = 0;
  let triangleIndex = 0;

  for (let row = 0; row < TERRAIN_GRID_SIZE; row += 1) {
    for (let column = 0; column < TERRAIN_GRID_SIZE; column += 1) {
      const x = -TERRAIN_HALF_SIZE + (column / (TERRAIN_GRID_SIZE - 1)) * TERRAIN_HALF_SIZE * 2;
      const z = -TERRAIN_HALF_SIZE + (row / (TERRAIN_GRID_SIZE - 1)) * TERRAIN_HALF_SIZE * 2;
      vertices[vertexIndex++] = x;
      vertices[vertexIndex++] = getShackletonHeight(x, z);
      vertices[vertexIndex++] = z;
    }
  }

  for (let row = 0; row < TERRAIN_GRID_SIZE - 1; row += 1) {
    for (let column = 0; column < TERRAIN_GRID_SIZE - 1; column += 1) {
      const a = row * TERRAIN_GRID_SIZE + column;
      const b = a + 1;
      const c = a + TERRAIN_GRID_SIZE;
      const d = c + 1;
      indices[triangleIndex++] = a;
      indices[triangleIndex++] = c;
      indices[triangleIndex++] = b;
      indices[triangleIndex++] = b;
      indices[triangleIndex++] = c;
      indices[triangleIndex++] = d;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  const regolith = document.createElement('canvas');
  regolith.width = 512;
  regolith.height = 512;
  const context = regolith.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Could not create the lunar regolith material.');
  const image = context.createImageData(regolith.width, regolith.height);
  let seed = 0x51ac;
  for (let index = 0; index < image.data.length; index += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const x = (index / 4) % regolith.width;
    const y = Math.floor(index / 4 / regolith.width);
    const broadVariation = Math.sin(x * 0.037) * 5 + Math.cos(y * 0.029) * 4;
    const grain = ((seed >>> 24) / 255 - 0.5) * 38;
    const shade = Math.max(0, Math.min(255, 133 + broadVariation + grain));
    image.data[index] = shade;
    image.data[index + 1] = shade;
    image.data[index + 2] = shade;
    image.data[index + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  const regolithTexture = new THREE.CanvasTexture(regolith);
  regolithTexture.wrapS = THREE.RepeatWrapping;
  regolithTexture.wrapT = THREE.RepeatWrapping;
  regolithTexture.repeat.set(10, 10);
  regolithTexture.colorSpace = THREE.SRGBColorSpace;
  const regolithBump = regolithTexture.clone();
  regolithBump.colorSpace = THREE.NoColorSpace;
  const material = new THREE.MeshStandardMaterial({
  color: '#aaaaa5',
  map: regolithTexture,
  bumpMap: regolithBump,
    bumpScale: 0.065,
    roughness: 1,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return { mesh, vertices, indices };
}

function createRoverVisual(): THREE.Group {
  const rover = new THREE.Group();
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.55, 2.4),
    new THREE.MeshStandardMaterial({ color: '#aeb6bd', roughness: 0.68, metalness: 0.42 })
  );
  chassis.position.y = 0.25;
  chassis.castShadow = true;
  rover.add(chassis);

  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(1.34, 0.12, 1.55),
    new THREE.MeshStandardMaterial({ color: '#344453', roughness: 0.72, metalness: 0.28 })
  );
  deck.position.set(0, 0.59, 0.04);
  deck.castShadow = true;
  rover.add(deck);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.55, 0.8),
    new THREE.MeshStandardMaterial({
      color: '#274c62',
      roughness: 0.24,
      metalness: 0.42,
      emissive: '#102533',
    })
  );
  cabin.position.set(0, 0.78, -0.15);
  cabin.castShadow = true;
  rover.add(cabin);

  const wheelMaterial = new THREE.MeshStandardMaterial({ color: '#292b2d', roughness: 0.95, metalness: 0.12 });
  const hubMaterial = new THREE.MeshStandardMaterial({ color: '#9da5a9', roughness: 0.55, metalness: 0.52 });
  for (const x of [-0.95, 0.95]) {
    const rocker = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.12, 2.05),
      new THREE.MeshStandardMaterial({ color: '#7c878d', roughness: 0.72, metalness: 0.38 })
    );
    rocker.position.set(x, 0.06, 0);
    rocker.castShadow = true;
    rover.add(rocker);
    for (const z of [-0.95, 0, 0.95]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.22, 16), wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, -0.03, z);
      wheel.castShadow = true;
      rover.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.235, 12), hubMaterial);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(x * 1.03, -0.03, z);
      rover.add(hub);
    }
  }

  const mastMaterial = new THREE.MeshStandardMaterial({ color: '#bdc6c8', roughness: 0.55, metalness: 0.5 });
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.05, 0.85, 10),
    mastMaterial
  );
  mast.position.set(0, 1.15, -0.72);
  mast.castShadow = true;
  rover.add(mast);
  const sensor = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.22, 0.32),
    new THREE.MeshStandardMaterial({ color: '#465b66', roughness: 0.42, metalness: 0.46 })
  );
  sensor.position.set(0, 1.58, -0.72);
  sensor.castShadow = true;
  rover.add(sensor);
  const lens = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 12, 8),
    new THREE.MeshStandardMaterial({ color: '#77a9b5', roughness: 0.18, metalness: 0.28 })
  );
  lens.position.set(0, 1.58, -0.9);
  rover.add(lens);
  return rover;
}

function createMarker(
  scene: THREE.Scene,
  position: { x: number; z: number },
  color: string,
  height = 0.3
): THREE.Mesh {
  const beaconHeight = Math.max(height, 0.85);
  const marker = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.14, beaconHeight, 12),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.08,
      roughness: 0.55,
      metalness: 0.28,
    })
  );
  marker.position.set(position.x, getShackletonHeight(position.x, position.z) + beaconHeight / 2 + 0.1, position.z);
  marker.castShadow = true;
  scene.add(marker);
  return marker;
}

function createStarField(scene: THREE.Scene): void {
  const positions = new Float32Array(540 * 3);
  let seed = 0x1a2b3c;
  for (let index = 0; index < positions.length; index += 3) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    positions[index] = ((seed >>> 0) / 0xffffffff - 0.5) * 220;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    positions[index + 1] = 16 + ((seed >>> 0) / 0xffffffff) * 90;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    positions[index + 2] = ((seed >>> 0) / 0xffffffff - 0.5) * 220;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: '#bdc9d6', size: 0.22, sizeAttenuation: true, transparent: true, opacity: 0.7 })
  );
  scene.add(stars);
}

function createSurfaceRocks(scene: THREE.Scene): void {
  const geometry = new THREE.IcosahedronGeometry(0.24, 0);
  const material = new THREE.MeshStandardMaterial({ color: '#85837f', roughness: 1, flatShading: true });
  const rocks = new THREE.InstancedMesh(geometry, material, 84);
  rocks.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const protectedFeatures = [...ICE_WAYPOINTS, ...KILOPOWER_CHARGERS, { x: 0, z: 22 }];
  let seed = 0x10a7;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  let placed = 0;
  while (placed < rocks.count) {
    const x = (next() - 0.5) * TERRAIN_HALF_SIZE * 1.8;
    const z = (next() - 0.5) * TERRAIN_HALF_SIZE * 1.8;
    const nearFeature = protectedFeatures.some((feature) => Math.hypot(feature.x - x, feature.z - z) < 3.2);
    if (nearFeature) continue;

    const scale = 0.45 + next() * 1.2;
    dummy.position.set(x, getShackletonHeight(x, z) + scale * 0.12, z);
    dummy.rotation.set(next() * 0.7, next() * Math.PI, next() * 0.7);
    dummy.scale.set(scale, scale * (0.45 + next() * 0.35), scale * (0.7 + next() * 0.55));
    dummy.updateMatrix();
    rocks.setMatrixAt(placed, dummy.matrix);
    placed += 1;
  }
  rocks.instanceMatrix.needsUpdate = true;
  scene.add(rocks);
}

function formatClock(seconds: number): string {
  const value = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
}

function getHeldInputs(keys: Set<string>, touch: Set<HeldInput>, gamepad: Gamepad | null) {
  let throttle = 0;
  let steering = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp') || touch.has('forward')) throttle += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown') || touch.has('reverse')) throttle -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight') || touch.has('right')) steering += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft') || touch.has('left')) steering -= 1;
  if (gamepad) {
    if (Math.abs(gamepad.axes[1] ?? 0) > 0.18) throttle = -(gamepad.axes[1] ?? 0);
    if (Math.abs(gamepad.axes[0] ?? 0) > 0.18) steering = gamepad.axes[0] ?? 0;
  }
  return { throttle: Math.max(-1, Math.min(1, throttle)), steering: Math.max(-1, Math.min(1, steering)) };
}

export const ShackletonIceRun: React.FC<ShackletonIceRunProps> = ({
  onClose,
  onFinish,
  onRunRecorded,
  onReviewLesson,
  onUse2DFallback,
  stormWarningHours,
  stormSource = 'GAME SIMULATION',
  stormRecordId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef(new Set<string>());
  const touchRef = useRef(new Set<HeldInput>());
  const pendingActionRef = useRef(false);
  const pendingHeaterToggleRef = useRef(false);
  const startedRef = useRef(false);
  const gameOverRef = useRef(false);
  const heaterOnRef = useRef(true);
  const gamepadActionDownRef = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [isHeaterOn, setIsHeaterOn] = useState(true);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [result, setResult] = useState<ShackletonRunResult | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry>({
    ...INITIAL_TELEMETRY,
    stormSeconds: getStormTimerSeconds(stormWarningHours),
  });
  const [rewardSubmitted, setRewardSubmitted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let animationFrame = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let world: RAPIER.World | null = null;
    let scene: THREE.Scene | null = null;
    let runtime: SceneRuntime | null = null;
    let resizeHandler: (() => void) | null = null;
    const keys = keysRef.current;
    const touch = touchRef.current;
    const heldKeys = new Set([
      'KeyW', 'KeyA', 'KeyS', 'KeyD',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    ]);
    const runDuration = getStormTimerSeconds(stormWarningHours);
    let battery = 100;
    let temperature = 100;
    let elapsed = 0;
    let rolloverSeconds = 0;
    let wasSlopeRisk = false;
    let lastHudUpdate = 0;
    let perfStart = performance.now();
    let perfFrames = 0;
    let collected = new Set<string>();
    let hudMessage = 'Collect three ice readings, then return to the landing pad.';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const finishRun = (success: boolean, reason: string) => {
      if (gameOverRef.current) return;
      gameOverRef.current = true;
      startedRef.current = false;
      const causeChain = success
        ? [
            `${collected.size} hydrogen/ice readings collected; all are game-simulation readings.`,
            `Returned to the landing pad with ${Math.round(battery)}% simulated battery remaining.`,
            'The rover avoided the compressed storm timer and brought its samples home.',
          ]
        : [
            reason,
            `${collected.size} of ${ICE_WAYPOINTS.length} readings collected before the run ended.`,
            'Next attempt: use the slope display, manage the heater, and choose a charging stop.',
          ];
      const runResult = { success, causeChain, iceSamples: collected.size, reason };
      triggerHapticFeedback(success ? [18, 30, 18] : [45, 35, 75]);
      setResult(runResult);
      onRunRecorded?.({ success, iceSamples: collected.size, reason });
    };

    const handleAction = () => {
      if (!runtime) return;
      const position = runtime.rover.translation();
      const nearbyCharger = KILOPOWER_CHARGERS.find(
        (charger) => Math.hypot(position.x - charger.x, position.z - charger.z) < CHARGER_RANGE
      );
      if (nearbyCharger) {
        battery = Math.min(100, battery + 25);
        elapsed += 15;
        triggerHapticFeedback([14, 28, 14]);
        hudMessage = 'Charged +25% battery. Charging used 15 seconds of the storm warning.';
        return;
      }

      const waypoint = ICE_WAYPOINTS.find(
        (point) => !collected.has(point.id) && Math.hypot(position.x - point.x, position.z - point.z) < SAMPLE_RANGE
      );
      if (waypoint) {
        collected = new Set(collected).add(waypoint.id);
        triggerHapticFeedback([12, 24, 12, 24, 32]);
        hudMessage = `${waypoint.name}: hydrogen signal ${waypoint.hydrogenSignalPercent}%, ice likelihood ${waypoint.iceLikelihoodPercent}% (GAME SIMULATION VALUES).`;
        return;
      }

      triggerHapticFeedback(8);
      hudMessage = 'Move closer to a yellow sampling marker or blue Kilopower pad.';
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (heldKeys.has(event.code)) {
        event.preventDefault();
        keys.add(event.code);
      } else if (event.code === 'Space' || event.code === 'KeyE') {
        event.preventDefault();
        if (!event.repeat) pendingActionRef.current = true;
      } else if (event.code === 'KeyH') {
        event.preventDefault();
        if (!event.repeat) pendingHeaterToggleRef.current = true;
      }
    };
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const initialize = async () => {
      await initializeRapier();
      if (disposed) return;

      const gl = canvas.getContext('webgl2', { antialias: true, powerPreference: 'low-power' });
      if (!gl) throw new Error('WebGL2 is unavailable on this device.');

      renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
      renderer.setSize(canvas.clientWidth || 800, canvas.clientHeight || 500, false);
      renderer.setClearColor('#070a11', 1);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;

      scene = new THREE.Scene();
      scene.background = new THREE.Color('#070a11');
      scene.fog = new THREE.Fog('#070a11', 42, 105);
      const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 140);
      camera.position.set(0, 7, 32);
      scene.add(new THREE.HemisphereLight('#c6d3e2', '#18191b', 0.58));
      const sunlight = new THREE.DirectionalLight('#fff0d7', 2.45);
      sunlight.position.set(-20, 32, -12);
      sunlight.castShadow = true;
      sunlight.shadow.mapSize.set(1024, 1024);
      sunlight.shadow.camera.left = -48;
      sunlight.shadow.camera.right = 48;
      sunlight.shadow.camera.top = 48;
      sunlight.shadow.camera.bottom = -48;
      sunlight.shadow.camera.near = 1;
      sunlight.shadow.camera.far = 90;
      sunlight.shadow.bias = -0.0002;
      sunlight.shadow.normalBias = 0.025;
      scene.add(sunlight);
      createStarField(scene);

      const terrain = createTerrainMesh();
      scene.add(terrain.mesh);
      createSurfaceRocks(scene);
      world = new RAPIER.World({ x: 0, y: -1.62, z: 0 });
      world.timestep = 1 / 60;
      const groundBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
      const groundCollider = RAPIER.ColliderDesc.trimesh(terrain.vertices, terrain.indices).setFriction(1.1);
      world.createCollider(groundCollider, groundBody);

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(3.2, 3.8, 0.4, 10),
        new THREE.MeshStandardMaterial({ color: '#777c80', roughness: 0.9, metalness: 0.12 })
      );
      base.position.set(0, getShackletonHeight(0, 22) + 0.18, 22);
      base.castShadow = true;
      base.receiveShadow = true;
      scene.add(base);
      const baseLight = new THREE.PointLight('#e5cf9f', 4, 8, 2);
      baseLight.position.set(0, getShackletonHeight(0, 22) + 2.2, 22);
      scene.add(baseLight);

      for (const charger of KILOPOWER_CHARGERS) {
        createMarker(scene, charger, '#38bdf8', 0.3);
      }
      const waypointMeshes = new Map<string, THREE.Mesh>();
      for (const waypoint of ICE_WAYPOINTS) {
        waypointMeshes.set(waypoint.id, createMarker(scene, waypoint, '#f4c95d', 0.48));
      }

      const spawnY = getShackletonHeight(0, 22) + 0.95;
      const roverBody = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(0, spawnY, 22)
          .setLinearDamping(1.4)
          .setAngularDamping(1.8)
          .setCcdEnabled(true)
      );
      const roverCollider = RAPIER.ColliderDesc.roundCuboid(0.82, 0.32, 1.18, 0.12)
        .setFriction(1.3)
        .setRestitution(0.02)
        .setMass(24);
      world.createCollider(roverCollider, roverBody);
      const roverVisual = createRoverVisual();
      scene.add(roverVisual);
      runtime = { renderer, scene, camera, world, rover: roverBody, roverVisual, waypointMeshes };

      const handleResize = () => {
        if (!renderer || !canvas.parentElement) return;
        const width = Math.max(1, canvas.parentElement.clientWidth);
        const height = Math.max(1, canvas.parentElement.clientHeight);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      resizeHandler = handleResize;
      window.addEventListener('resize', handleResize);
      handleResize();

      let previousFrameTime = performance.now();
      const animate = (frameTime: number) => {
        if (disposed || !runtime || !renderer || !world || !scene) return;
        const delta = Math.min((frameTime - previousFrameTime) / 1000, 0.05);
        previousFrameTime = frameTime;
        animationFrame = window.requestAnimationFrame(animate);

        if (startedRef.current && !gameOverRef.current) {
          elapsed += delta;
          const gamepads = navigator.getGamepads?.();
          const gamepad = gamepads ? Array.from(gamepads).find((candidate) => candidate !== null) ?? null : null;
          const input = getHeldInputs(keys, touch, gamepad);
          const bodyPosition = roverBody.translation();
          const slopeDegrees = getShackletonSlopeDegrees(bodyPosition.x, bodyPosition.z);
          const currentTemperature = temperature;
          const throttle = currentTemperature < 22 ? input.throttle * 0.45 : input.throttle;
          const q = roverBody.rotation();
          const orientation = new THREE.Quaternion(q.x, q.y, q.z, q.w);
          const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(orientation);
          const driveScale = battery < 18 ? 0.45 : 1;
          roverBody.addForce({
            x: forward.x * throttle * 70 * driveScale,
            y: 0,
            z: forward.z * throttle * 70 * driveScale,
          }, true);
          roverBody.setAngvel({ x: 0, y: input.steering * 0.8, z: 0 }, true);

          const slopeRisk = slopeDegrees > 19 && Math.abs(throttle) > 0.1;
          if (slopeRisk && !wasSlopeRisk) triggerHapticFeedback([32, 24, 32]);
          wasSlopeRisk = slopeRisk;
          if (slopeRisk) {
            const dx = getShackletonHeight(bodyPosition.x + 0.5, bodyPosition.z) - getShackletonHeight(bodyPosition.x - 0.5, bodyPosition.z);
            const dz = getShackletonHeight(bodyPosition.x, bodyPosition.z + 0.5) - getShackletonHeight(bodyPosition.x, bodyPosition.z - 0.5);
            roverBody.applyTorqueImpulse({ x: Math.sign(dz) * 0.035, y: 0, z: -Math.sign(dx) * 0.035 }, true);
          }

          const driving = Math.abs(throttle) > 0.05;
          battery = Math.max(0, battery - getRoverPowerDrainPerSecond(driving, heaterOnRef.current) * delta);
          temperature = Math.max(
            0,
            Math.min(100, temperature + (heaterOnRef.current ? 0.18 : -0.34) * delta)
          );
          if (pendingHeaterToggleRef.current) {
            heaterOnRef.current = !heaterOnRef.current;
            triggerHapticFeedback(18);
            setIsHeaterOn(heaterOnRef.current);
            pendingHeaterToggleRef.current = false;
            hudMessage = heaterOnRef.current
              ? 'Heater on: battery drains faster; the rover stays warm.'
              : 'Heater off: saves battery, but the rover will cool down.';
          }

          const gamepadActionDown = Boolean(gamepad?.buttons[0]?.pressed);
          if (gamepadActionDown && !gamepadActionDownRef.current) pendingActionRef.current = true;
          gamepadActionDownRef.current = gamepadActionDown;
          if (pendingActionRef.current) {
            pendingActionRef.current = false;
            handleAction();
          }

          world.step();
          const position = roverBody.translation();
          const rotation = roverBody.rotation();
          const upVector = new THREE.Vector3(0, 1, 0).applyQuaternion(
            new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w)
          );
          rolloverSeconds = upVector.y < 0.22 ? rolloverSeconds + delta : 0;
          if (rolloverSeconds > 2.5) finishRun(false, 'The rover rolled on a steep slope and could not be recovered.');
          else if (battery <= 0) finishRun(false, 'Battery depleted before the rover returned to the landing pad.');
          else if (temperature <= 8) finishRun(false, 'The rover became too cold after the heater was left off.');
          else if (elapsed >= runDuration) finishRun(false, 'The simulated solar-storm timer reached zero before the samples were returned.');
          else if (Math.abs(position.x) > TERRAIN_HALF_SIZE - 2 || Math.abs(position.z) > TERRAIN_HALF_SIZE - 2) {
            finishRun(false, 'The rover left the marked route and lost contact with the outpost.');
          }
          const baseDistance = Math.hypot(position.x, position.z - 22);
          if (
            !gameOverRef.current &&
            collected.size === ICE_WAYPOINTS.length &&
            baseDistance < 4
          ) {
            finishRun(true, 'All three readings were returned safely to the landing pad.');
          }

          if (elapsed - lastHudUpdate > 0.22) {
            lastHudUpdate = elapsed;
            const nearestWaypoint = ICE_WAYPOINTS.find(
              (waypoint) => !collected.has(waypoint.id) && Math.hypot(position.x - waypoint.x, position.z - waypoint.z) < SAMPLE_RANGE
            );
            const nearestCharger = KILOPOWER_CHARGERS.find(
              (charger) => Math.hypot(position.x - charger.x, position.z - charger.z) < CHARGER_RANGE
            );
            const nearestPrompt = nearestCharger
              ? 'Press E / SCAN to charge +25%; costs 15 storm-clock seconds.'
              : nearestWaypoint
                ? `Press E / SCAN to read ${nearestWaypoint.name}.`
                : 'Drive to a yellow sampling marker or blue Kilopower pad.';
            setTelemetry({
              battery,
              roverTemperature: temperature,
              elapsedSeconds: elapsed,
              stormSeconds: Math.max(0, runDuration - elapsed),
              slopeDegrees,
              collectedSamples: collected.size,
              nearbyPrompt: nearestPrompt,
              message: hudMessage,
            });
          }
        } else {
          world.step();
        }

        if (runtime) {
          const bodyPosition = roverBody.translation();
          const q = roverBody.rotation();
          const orientation = new THREE.Quaternion(q.x, q.y, q.z, q.w);
          roverVisual.position.set(bodyPosition.x, bodyPosition.y, bodyPosition.z);
          roverVisual.quaternion.copy(orientation);
          for (const [id, marker] of waypointMeshes) {
            marker.visible = !collected.has(id);
            marker.rotation.y += reducedMotion ? 0 : delta * 0.6;
          }
          const target = new THREE.Vector3(bodyPosition.x, bodyPosition.y + 1.2, bodyPosition.z);
          const desiredCamera = new THREE.Vector3(0, 4.1, 8).applyQuaternion(orientation).add(target);
          if (reducedMotion) camera.position.copy(desiredCamera);
          else camera.position.lerp(desiredCamera, Math.min(1, delta * 3.5));
          camera.lookAt(target);
          renderer.render(scene, camera);
        }

        perfFrames += 1;
        if (performance.now() - perfStart > 2400) {
          const fps = (perfFrames * 1000) / (performance.now() - perfStart);
          const targetRatio = fps < 38 ? 1 : Math.min(window.devicePixelRatio || 1, 1.65);
          if (renderer && renderer.getPixelRatio() !== targetRatio) renderer.setPixelRatio(targetRatio);
          perfStart = performance.now();
          perfFrames = 0;
        }
      };
      animate(performance.now());
    };

    void initialize().catch((error: unknown) => {
      if (disposed) return;
      const message = error instanceof Error ? error.message : 'Unknown 3D initialization error.';
      setEngineError(`3D rover could not start: ${message}`);
    });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (resizeHandler) window.removeEventListener('resize', resizeHandler);
      if (world) world.free();
      if (scene) {
        scene.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            if (material instanceof THREE.MeshStandardMaterial) {
              material.map?.dispose();
              material.bumpMap?.dispose();
            }
            material.dispose();
          });
        });
      }
      renderer?.dispose();
      renderer?.forceContextLoss();
    };
  }, [attempt, onRunRecorded, stormWarningHours]);

  useEffect(() => {
    startedRef.current = isStarted;
  }, [isStarted]);

  useEffect(() => {
    gameOverRef.current = result !== null;
  }, [result]);

  const setTouchInput = (input: HeldInput, pressed: boolean) => {
    if (pressed) {
      if (!touchRef.current.has(input)) {
        touchRef.current.add(input);
        triggerHapticFeedback(8);
      }
    } else {
      touchRef.current.delete(input);
    }
  };

  const restart = () => {
    startedRef.current = false;
    gameOverRef.current = false;
    heaterOnRef.current = true;
    pendingActionRef.current = false;
    setIsHeaterOn(true);
    setIsStarted(false);
    setEngineError(null);
    setResult(null);
    setTelemetry({ ...INITIAL_TELEMETRY, stormSeconds: getStormTimerSeconds(stormWarningHours) });
    setRewardSubmitted(false);
    keysRef.current.clear();
    touchRef.current.clear();
    setAttempt((value) => value + 1);
  };

  const submitReward = () => {
    if (!result?.success || rewardSubmitted) return;
    const reward: ShackletonRunReward = {
      iceSamples: result.iceSamples,
      waterUnits: result.iceSamples * 5,
      fuelUnits: result.iceSamples * 2,
      summary: 'Returned Shackleton ice samples; water and fuel rewards are simulated game stocks.',
    };
    onFinish?.(reward);
    setRewardSubmitted(true);
    onClose();
  };

  const startRun = () => {
    soundFx.playClick(760);
    triggerHapticFeedback(16);
    setResult(null);
    gameOverRef.current = false;
    startedRef.current = true;
    setIsStarted(true);
  };

  const renderTouchButton = (input: HeldInput, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      className="shackleton-touch-button"
      aria-label={label}
      onPointerDown={(event) => {
        event.preventDefault();
        setTouchInput(input, true);
      }}
      onPointerUp={() => setTouchInput(input, false)}
      onPointerLeave={() => setTouchInput(input, false)}
      onPointerCancel={() => setTouchInput(input, false)}
    >
      {icon}
    </button>
  );

  return (
    <div className="shackleton-game-root" role="dialog" aria-modal="true" aria-labelledby="shackleton-game-title">
      <header className="shackleton-header">
        <div>
          <div className="shackleton-eyebrow">LUNAR ROVER TRAINING · GAME SIMULATION</div>
          <h1 id="shackleton-game-title">Shackleton Ice Run</h1>
        </div>
        <button type="button" className="shackleton-icon-button" onClick={onClose} aria-label="Close rover run">
          <X size={20} />
        </button>
      </header>

      <section className="shackleton-hud" aria-label="Rover status">
        <div>
          <span>BATTERY · POWER BUS</span>
          <strong>{Math.round(telemetry.battery)}% <small>SIM</small></strong>
          <span className="shackleton-meter-track"><span style={{ width: `${telemetry.battery}%` }} /></span>
        </div>
        <div>
          <span>THERMAL CONTROL</span>
          <strong>{Math.round(telemetry.roverTemperature)}% <small>SIM</small></strong>
          <span className="shackleton-meter-track"><span style={{ width: `${telemetry.roverTemperature}%` }} /></span>
        </div>
        <div>
          <span>STORM COUNTDOWN</span>
          <strong>{formatClock(telemetry.stormSeconds)} <small>SIM</small></strong>
          <span className="shackleton-meter-track"><span style={{ width: `${(telemetry.stormSeconds / getStormTimerSeconds(stormWarningHours)) * 100}%` }} /></span>
        </div>
        <div>
          <span>LOCAL TERRAIN SLOPE</span>
          <strong>{Math.round(telemetry.slopeDegrees)}° <small>SIM</small></strong>
          <span className="shackleton-meter-track"><span className="shackleton-meter-track__slope" style={{ width: `${Math.min(100, (telemetry.slopeDegrees / 30) * 100)}%` }} /></span>
        </div>
        <div>
          <span>SURVEY SITES</span>
          <strong>{telemetry.collectedSamples}/{ICE_WAYPOINTS.length} <small>SIM</small></strong>
          <span className="shackleton-meter-track"><span style={{ width: `${(telemetry.collectedSamples / ICE_WAYPOINTS.length) * 100}%` }} /></span>
        </div>
      </section>

      <div className="shackleton-data-note">
        <Radio size={14} aria-hidden="true" />
        <span>
          Terrain: <strong>{SHACKLETON_TERRAIN_ATTRIBUTION.label}</strong> · {SHACKLETON_TERRAIN_ATTRIBUTION.limitation}
          <a href={SHACKLETON_TERRAIN_ATTRIBUTION.url} target="_blank" rel="noreferrer"> NASA LOLA source</a>
        </span>
        <span className="shackleton-weather-source">
          Storm source: {stormSource}{stormRecordId ? ` · ${stormRecordId}` : ''}
        </span>
      </div>

      <main className="shackleton-play-area">
        <div className="shackleton-canvas-frame">
          <canvas ref={canvasRef} aria-label="Third-person 3D lunar rover simulation" />
          {engineError && (
            <div className="shackleton-overlay" role="alert">
              <h2>3D mode unavailable</h2>
              <p>{engineError}</p>
              <div className="shackleton-action-row">
                {onUse2DFallback && <button type="button" onClick={onUse2DFallback}>Open 2D rover</button>}
                <button type="button" onClick={onClose}>Close</button>
              </div>
            </div>
          )}
          {!engineError && !isStarted && !result && (
            <div className="shackleton-overlay">
              <h2>Find the ice. Bring the readings home.</h2>
              <p>
                Scan three marked sites, manage battery and heat, and return before the
                {` ${formatClock(getStormTimerSeconds(stormWarningHours))} `}storm timer.
              </p>
              <p><strong>{STORM_SIMULATION_NOTE}</strong> Terrain and sensor readings are labeled game simulations.</p>
              <button type="button" className="shackleton-primary-button" onClick={startRun}>Start rover run</button>
            </div>
          )}
          {result && (
            <div className="shackleton-overlay" role="status">
              <h2>{result.success ? 'Samples returned!' : 'Mission Autopsy'}</h2>
              <p>{result.reason}</p>
              <ol>{result.causeChain.map((cause) => <li key={cause}>{cause}</li>)}</ol>
              {result.success ? (
                <div className="shackleton-action-row">
                  <button type="button" className="shackleton-primary-button" onClick={submitReward}>
                    Bank samples & return
                  </button>
                  <button type="button" onClick={restart}><RotateCcw size={16} /> Retry</button>
                </div>
              ) : (
                <div className="shackleton-action-row">
                  <button type="button" className="shackleton-primary-button" onClick={restart}>
                    <RotateCcw size={16} /> Try again
                  </button>
                  <button type="button" onClick={onClose}>Return to outpost</button>
                </div>
              )}
              {onReviewLesson && (
                <button
                  type="button"
                  className="shackleton-lesson-link"
                  onClick={onReviewLesson}
                >
                  Review the Artemis lunar-ice lesson
                </button>
              )}
            </div>
          )}
        </div>

        <aside className="shackleton-side-panel">
          <h2>Mission choices</h2>
          <p>{telemetry.message}</p>
          <div className="shackleton-tradeoff">
            <strong>Heater trade-off</strong>
            <span>On: uses more battery to keep the rover warm. Off: saves power, but cold slows driving.</span>
            <button type="button" onClick={() => { pendingHeaterToggleRef.current = true; }}>
              <Heater size={16} /> Heater {isHeaterOn ? 'ON' : 'OFF'} (H)
            </button>
          </div>
          <div className="shackleton-tradeoff">
            <strong>Kilopower charging</strong>
            <span>Blue pads add 25% battery but use 15 seconds of the storm clock.</span>
            <button
              type="button"
              onClick={() => { pendingActionRef.current = true; }}
              disabled={!isStarted || Boolean(result)}
            >
              <BatteryCharging size={16} /> Scan / Charge (E)
            </button>
          </div>
          <div className="shackleton-data-label">
            <strong>GAME SIMULATION VALUE</strong>
            <span>Hydrogen signal and ice likelihood are invented practice readings, not instrument or NASA measurements.</span>
          </div>
          {stormSource !== 'GAME SIMULATION' && stormWarningHours && (
            <div className="shackleton-data-label">
              <strong>{stormSource} DONKI RECORD</strong>
              <span>{stormRecordId ?? 'NASA DONKI'} · The real-data warning is compressed into a game timer.</span>
            </div>
          )}
          <p className="shackleton-small-note">No direct LOLA DEM samples are included in this route. {STORM_SIMULATION_NOTE}</p>
        </aside>
      </main>

      <footer className="shackleton-controls">
        <div className="shackleton-drive-controls" aria-label="Touch rover controls">
          {renderTouchButton('left', 'Steer left', <ArrowLeft size={20} />)}
          {renderTouchButton('forward', 'Drive forward', <ArrowUp size={20} />)}
          {renderTouchButton('reverse', 'Drive backward', <ArrowDown size={20} />)}
          {renderTouchButton('right', 'Steer right', <ArrowRight size={20} />)}
        </div>
        <p>
          Keyboard: WASD / arrows · E: scan / charge · H: heater · Gamepad: left stick + A
          {' · '}Touch haptics on supported devices
        </p>
      </footer>
    </div>
  );
};
