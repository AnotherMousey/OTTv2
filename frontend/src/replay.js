import fixture from './games/ottv2/demo.json' with { type: 'json' };
import { validateReplay } from './games/contracts.js';
export { TYPES } from './games/ottv2/validate.js';
export function parseReplay(text) {
  const replay = JSON.parse(text);
  return validateReplay(replay);
}
export const demoReplay = fixture;
