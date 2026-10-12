import { validateReplay as ottValidate } from './ottv2/validate.js';
import { validateReplay as gridValidate } from './grid-demo/validate.js';
export const validators = {ottv2: ottValidate, 'grid-demo': gridValidate};
export function validateReplay(replay) {
  const validate = validators[replay?.gameId];
  if (!validate) throw Error(`Unsupported game: ${replay?.gameId}`);
  if ((replay.rendererVersion ?? '1') !== '1') throw Error('Unsupported renderer version.');
  return validate(replay);
}
