export const ENTRANCE_PARTS = [
  "A sunrise over restless city streets.",
  "The first chord strikes at midnight.",
  "Opening notes echo in a quiet hallway.",
  "The drumbeat awakens the sleeping crowd.",
  "A gentle guitar strum greets the dawn.",
  "Electric synths pulse in the early fog.",
  "Vocal harmonies rise as the sun climbs.",
  "A thunderous bass drops as lights flicker.",
  "Soft piano chords linger in the air.",
  "A whispered chant begins the journey."
];

export const MIDDLE_PARTS = [
  "Waves of sound cascade through the air.",
  "The chorus rises like a tide.",
  "Melodies intertwine, forming new colors.",
  "Rhythms accelerate, hearts start racing.",
  "Lyrics spin stories of love and loss.",
  "Synthesizers swirl in a neon haze.",
  "Guitars scream against the night sky.",
  "Bass drops shake the floor beneath.",
  "Vocals soar, reaching distant horizons.",
  "Percussion drives the pulse forward."
];

export const LAST_PARTS = [
  "Fade out into quiet whispers.",
  "The final note lingers beyond the night.",
  "Echoes fade, leaving a gentle hush.",
  "A soft resolve brings calm to the storm.",
  "Silence settles, the song rests.",
  "The outro drifts like falling leaves.",
  "Closing chords close the story.",
  "Lights dim as the melody ends.",
  "A lingering chord fades into darkness.",
  "The final breath of music exhales peace."
];

export const getRandomInspirePrompt = (): string => {
  const entrance = ENTRANCE_PARTS[Math.floor(Math.random() * ENTRANCE_PARTS.length)];
  const middle = MIDDLE_PARTS[Math.floor(Math.random() * MIDDLE_PARTS.length)];
  const last = LAST_PARTS[Math.floor(Math.random() * LAST_PARTS.length)];
  return `${entrance} ${middle} ${last}`;
};
