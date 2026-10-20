import {defaults,palette,hats,eyes,mouths,cheeks,accessories} from './Avatar.jsx';

export const characterStorageKey = id => 'ott-character-v1-' + id;
const fields = {
  hatColor: palette.map(([, value]) => value), bodyColor: palette.map(([, value]) => value),
  hat: hats.map(([value]) => value), eyes: eyes.map(([value]) => value),
  mouth: mouths.map(([value]) => value), cheeks: cheeks.map(([value]) => value),
  accessory: accessories.map(([value]) => value),
};

export function cleanAppearance(value, fallback = defaults) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return Object.fromEntries(Object.entries(fields).map(([key, allowed]) =>
    [key, allowed.includes(input[key]) ? input[key] : fallback[key]]));
}

// Stable across ranking order, pagination, themes, browsers and sessions.
// Fallback artwork is an identity aid, not a claim about another user's choices.
export function defaultAppearance(id) {
  if (!id) return {...defaults};
  let seed = 2166136261;
  for (const char of String(id)) {seed ^= char.charCodeAt(0); seed = Math.imul(seed, 16777619);}
  const pick = list => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return list[(seed >>> 0) % list.length];
  };
  return Object.fromEntries(Object.entries(fields).map(([key, allowed]) => [key, pick(allowed)]));
}

export function participantAppearance(participant) {
  const fallback = defaultAppearance(participant?.id);
  if (!participant?.id) return fallback;
  if (participant.appearance) return cleanAppearance(participant.appearance, fallback);
  try {
    const saved = JSON.parse(localStorage.getItem(characterStorageKey(participant.id)) || 'null');
    return saved ? cleanAppearance(saved, fallback) : fallback;
  } catch {return fallback;}
}
