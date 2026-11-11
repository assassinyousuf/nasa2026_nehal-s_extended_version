import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import * as RAPIER from '@dimforge/rapier3d-compat';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = await readFile(new URL('../src/game3d/shackletonTerrain.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});
const dataUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
const terrain = await import(dataUrl);

assert.equal(terrain.SHACKLETON_TERRAIN_ATTRIBUTION.label, 'GAME SIMULATION VALUE');
assert.match(terrain.SHACKLETON_TERRAIN_ATTRIBUTION.limitation, /not sampled from a LOLA DEM/);
assert.ok(Number.isFinite(terrain.getShackletonHeight(5, -12)));
assert.ok(terrain.getShackletonSlopeDegrees(-7, -12) > 19, 'The simulated route must contain a rollover-risk slope.');
assert.ok(
  terrain.getShackletonHeight(-23, -17) < terrain.getShackletonHeight(-17.2, -17),
  'The illustrative impact basin should sit below its raised rim.'
);
assert.equal(terrain.ICE_WAYPOINTS.length, 3);
assert.ok(terrain.ICE_WAYPOINTS.every((point) => point.hydrogenSignalPercent > 0 && point.iceLikelihoodPercent > 0));
assert.equal(terrain.getStormTimerSeconds(), 90);
assert.equal(terrain.getStormTimerSeconds(4), 24);
assert.equal(terrain.getStormTimerSeconds(22), 90);
assert.ok(terrain.getRoverPowerDrainPerSecond(true, true) > terrain.getRoverPowerDrainPerSecond(false, false));

await RAPIER.init();
const world = new RAPIER.World({ x: 0, y: -1.62, z: 0 });
const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 2, 0));
world.createCollider(RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5), body);
world.step();
assert.ok(body.translation().y < 2, 'Rapier WASM should apply lunar gravity.');
world.free();

console.log('Shackleton terrain, timer, energy trade-off, and Rapier WASM tests passed.');
