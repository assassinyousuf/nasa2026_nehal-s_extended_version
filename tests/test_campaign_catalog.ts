import assert from 'node:assert/strict';
import { MISSION_GAME_DATA } from '../src/game/missionGameData';

const historicalMissions = MISSION_GAME_DATA.filter((mission) => /^NASA-M\d{3}$/.test(mission.id));
const trainingScenarios = MISSION_GAME_DATA.filter((mission) => !/^NASA-M\d{3}$/.test(mission.id));
const missionIds = MISSION_GAME_DATA.map((mission) => mission.id);

assert.equal(MISSION_GAME_DATA.length, 81, 'Campaign total includes historical flights and training scenarios');
assert.equal(historicalMissions.length, 76, 'The catalog contains 76 NASA historical missions');
assert.equal(trainingScenarios.length, 5, 'The catalog identifies five separate AstroCamp scenarios');
assert.equal(new Set(missionIds).size, missionIds.length, 'Every campaign entry has a unique ID');
assert.ok(trainingScenarios.every((mission) => !/^NASA-M\d{3}$/.test(mission.id)));
assert.ok(MISSION_GAME_DATA.every((mission) => mission.objective.trim().length > 0));

console.log('Campaign catalog: 76 NASA missions, 5 AstroCamp scenarios, unique IDs and objectives verified.');
