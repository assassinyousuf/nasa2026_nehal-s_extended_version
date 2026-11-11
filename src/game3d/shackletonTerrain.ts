export const SHACKLETON_TERRAIN_ATTRIBUTION = {
  label: 'GAME SIMULATION VALUE',
  source: 'NASA LRO Lunar Orbiter Laser Altimeter (LOLA) polar elevation models',
  url: 'https://pds-geosciences.wustl.edu/missions/lro/lola.htm',
  limitation: 'This procedural route is illustrative and is not sampled from a LOLA DEM.',
} as const;

export interface IceWaypoint {
  id: string;
  name: string;
  x: number;
  z: number;
  hydrogenSignalPercent: number;
  iceLikelihoodPercent: number;
}

export const ICE_WAYPOINTS: readonly IceWaypoint[] = [
  {
    id: 'shadow-edge',
    name: 'Shadow edge',
    x: -9,
    z: 8,
    hydrogenSignalPercent: 58,
    iceLikelihoodPercent: 64,
  },
  {
    id: 'cold-trap',
    name: 'Cold-trap sample',
    x: 8,
    z: -5,
    hydrogenSignalPercent: 76,
    iceLikelihoodPercent: 83,
  },
  {
    id: 'ridge-sample',
    name: 'Ridge sample',
    x: 15,
    z: 13,
    hydrogenSignalPercent: 41,
    iceLikelihoodPercent: 47,
  },
];

export const KILOPOWER_CHARGERS = [
  { id: 'charger-a', x: -17, z: -9 },
  { id: 'charger-b', x: 18, z: -18 },
] as const;

const PROCEDURAL_CRATERS = [
  { x: -23, z: -17, radius: 5.8, depth: 1.9 },
  { x: 22, z: 1, radius: 7.2, depth: 2.4 },
  { x: -22, z: 19, radius: 5.1, depth: 1.6 },
] as const;

export function getShackletonHeight(x: number, z: number): number {
  const radius = Math.hypot(x + 2, z - 1);
  const rim = 2.8 * Math.exp(-((radius - 16) ** 2) / 8);
  const rollingGround = 1.6 * Math.sin(x * 0.16) * Math.cos(z * 0.13);
  const lowBench = -1.2 * Math.exp(-((x - 3) ** 2 + (z + 5) ** 2) / 70);
  const impactBasins = PROCEDURAL_CRATERS.reduce((height, crater) => {
    const distance = Math.hypot(x - crater.x, z - crater.z);
    const bowl = -crater.depth * Math.exp(-2 * (distance / crater.radius) ** 4);
    const raisedRim = 0.48 * Math.exp(-(((distance - crater.radius) / 0.8) ** 2));
    return height + bowl + raisedRim;
  }, 0);
  return rim + rollingGround + lowBench + impactBasins;
}

export function getShackletonSlopeDegrees(x: number, z: number): number {
  const sampleDistance = 0.5;
  const slopeX = (getShackletonHeight(x + sampleDistance, z) - getShackletonHeight(x - sampleDistance, z)) / (2 * sampleDistance);
  const slopeZ = (getShackletonHeight(x, z + sampleDistance) - getShackletonHeight(x, z - sampleDistance)) / (2 * sampleDistance);
  return Math.atan(Math.hypot(slopeX, slopeZ)) * (180 / Math.PI);
}

export function getStormTimerSeconds(warningHours?: number): number {
  if (warningHours === undefined || !Number.isFinite(warningHours) || warningHours <= 0) return 90;
  return Math.min(90, Math.max(20, warningHours * 6));
}

export function getRoverPowerDrainPerSecond(isDriving: boolean, heaterOn: boolean): number {
  return (isDriving ? 0.18 : 0.08) + (heaterOn ? 0.16 : 0);
}
