import assert from 'node:assert/strict';
import { triggerHapticFeedback } from '../src/utils/haptics';

let receivedPattern: number | number[] | undefined;
const supported = triggerHapticFeedback([12, 24, 12], (pattern) => {
  receivedPattern = pattern;
  return true;
});

assert.equal(supported, true);
assert.deepEqual(receivedPattern, [12, 24, 12]);
assert.equal(triggerHapticFeedback(10, undefined), false);

console.log('Haptic feedback: supported and unavailable device paths verified.');
