export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const INDIAN_NOTES = [
  { latin: 'Sa', hindi: 'सा', shortHindi: 'सा' },
  { latin: 'Komal Re', hindi: 'कोमल रे', shortHindi: 'रे' },
  { latin: 'Re', hindi: 'रे', shortHindi: 'रे' },
  { latin: 'Komal Ga', hindi: 'कोमल ग', shortHindi: 'ग' },
  { latin: 'Ga', hindi: 'ग', shortHindi: 'ग' },
  { latin: 'Ma', hindi: 'म', shortHindi: 'म' },
  { latin: 'Tivra Ma', hindi: 'तीव्र म', shortHindi: 'म' },
  { latin: 'Pa', hindi: 'प', shortHindi: 'प' },
  { latin: 'Komal Dha', hindi: 'कोमल ध', shortHindi: 'ध' },
  { latin: 'Dha', hindi: 'ध', shortHindi: 'ध' },
  { latin: 'Komal Ni', hindi: 'कोमल नि', shortHindi: 'नि' },
  { latin: 'Ni', hindi: 'नि', shortHindi: 'नि' }
];

export const SCALE_PRESETS = {
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  yaman: [0, 2, 4, 6, 7, 9, 11],
  pentatonic: [0, 2, 4, 7, 9]
};

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function midiToFrequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function frequencyToMidi(frequency) {
  return 69 + 12 * Math.log2(frequency / 440);
}

export function formatFrequency(frequency) {
  return `${frequency.toFixed(2)} Hz`;
}

export function getNoteDataFromFrequency(frequency) {
  const midi = frequencyToMidi(frequency);
  const roundedMidi = Math.round(midi);
  const noteIndex = ((roundedMidi % 12) + 12) % 12;
  const octave = Math.floor(roundedMidi / 12) - 1;
  const cents = Math.round((midi - roundedMidi) * 100);

  return {
    frequency,
    midi,
    roundedMidi,
    cents,
    noteIndex,
    noteName: `${NOTE_NAMES[noteIndex]}${octave}`,
    western: NOTE_NAMES[noteIndex],
    octave,
    indian: INDIAN_NOTES[noteIndex]
  };
}

export function buildBaseNoteOptions(selectElement, preferredIndex = 0) {
  if (!selectElement) return;
  selectElement.innerHTML = NOTE_NAMES.map((note, index) => {
    const indian = INDIAN_NOTES[index];
    return `<option value="${index}" ${index === preferredIndex ? 'selected' : ''}>${note} / ${indian.latin}</option>`;
  }).join('');
}

export function snapMidiToScale(midi, scaleName, rootPitchClass) {
  const intervals = SCALE_PRESETS[scaleName] || SCALE_PRESETS.chromatic;
  if (intervals.length === 12) return midi;

  let bestMidi = midi;
  let bestDistance = Number.POSITIVE_INFINITY;
  const rounded = Math.round(midi);

  for (let offset = -2; offset <= 2; offset += 1) {
    const octaveBase = (Math.floor((rounded - rootPitchClass) / 12) + offset) * 12 + rootPitchClass;
    for (const interval of intervals) {
      const candidate = octaveBase + interval;
      const distance = Math.abs(candidate - midi);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMidi = candidate;
      }
    }
  }

  return bestMidi;
}
