/* The room's sounds, in Moodist's categories and with its ids where the sound is the same kind (so a Moodist mix
 * imports what it can). Recordings are files in sounds/; noises and binaural beats are made as they play
 * (generators.js). Where each recording comes from is in credits.json and Licenses/sounds/NOTICE-sounds.md.
 */
var ROOM_CATEGORIES = [
  { id: 'rain', title: 'Rain', sounds: [
    { id: 'rain', label: 'Rain', hint: 'Louder with the window open', icon: '🌧️', file: 'rain.mp3' },
    { id: 'rain-on-window', label: 'Rain on Window', icon: '🪟', file: 'rain-on-window.mp3' },
    { id: 'thunderstorm', label: 'Thunderstorm', icon: '⛈️', file: 'thunderstorm.mp3' },
    { id: 'thunder', label: 'Thunder', icon: '⚡️', file: 'thunder.mp3' }
  ] },
  { id: 'nature', title: 'Nature', sounds: [
    { id: 'river', label: 'River', icon: '🏞️', file: 'river.mp3' },
    { id: 'stream', label: 'Forest Stream', icon: '💧', file: 'stream.mp3' },
    { id: 'waves', label: 'Lake Waves', icon: '🌊', file: 'waves.mp3' },
    { id: 'wind', label: 'Wind', icon: '🌬️', file: 'wind.mp3' },
    { id: 'birds', label: 'Birds', icon: '🐦', file: 'birds.mp3' },
    { id: 'crickets', label: 'Crickets', icon: '🌙', file: 'crickets.mp3' },
    { id: 'cicadas', label: 'Cicadas', icon: '🦗', file: 'cicadas.mp3' },
    { id: 'campfire', label: 'Fire', hint: 'Louder nearer the fire', icon: '🔥', file: 'campfire.mp3' }
  ] },
  { id: 'places', title: 'Places', sounds: [
    { id: 'cafe', label: 'Café', icon: '☕️', file: 'cafe.mp3' },
    { id: 'train', label: 'Train', icon: '🚆', file: 'train.mp3' }
  ] },
  { id: 'things', title: 'Things', sounds: [
    { id: 'fan', label: 'Fan', icon: '🌀', file: 'fan.mp3' },
    { id: 'clock', label: 'Grandfather Clock', hint: 'Touch the clock to stop it', icon: '🕰️', file: 'clock.mp3' },
    { id: 'keyboard', label: 'Keyboard', icon: '⌨️', file: 'keyboard.mp3' },
    { id: 'wind-chimes', label: 'Wind Chimes', icon: '🎐', file: 'wind-chimes.mp3' }
  ] },
  { id: 'noise', title: 'Noise', sounds: [
    { id: 'white-noise', label: 'White Noise', icon: '◻️', make: 'white' },
    { id: 'pink-noise', label: 'Pink Noise', icon: '🌸', make: 'pink' },
    { id: 'brown-noise', label: 'Brown Noise', icon: '🟫', make: 'brown' }
  ] },
  { id: 'binaural', title: 'Binaural Beats', note: 'Wear headphones: each ear hears its own tone.', sounds: [
    { id: 'binaural-delta', label: 'Delta', hint: 'Deep sleep · 2 Hz', icon: 'δ', beat: { base: 100, beat: 2 } },
    { id: 'binaural-theta', label: 'Theta', hint: 'Meditation · 5 Hz', icon: 'θ', beat: { base: 100, beat: 5 } },
    { id: 'binaural-alpha', label: 'Alpha', hint: 'Relaxation · 10 Hz', icon: 'α', beat: { base: 100, beat: 10 } },
    { id: 'binaural-beta', label: 'Beta', hint: 'Focus · 20 Hz', icon: 'β', beat: { base: 100, beat: 20 } },
    { id: 'binaural-gamma', label: 'Gamma', hint: 'Cognition · 40 Hz', icon: 'γ', beat: { base: 100, beat: 40 } }
  ] }
];

/* Who made each recording, as credits.json has it, for the credits the room shows. */
var ROOM_CREDITS = {
  'rain': { title: "Rain light 2 (rural)", by: "jmbphilmes", license: 'CC0', from: 'Freesound', url: "https://freesound.org/people/jmbphilmes/sounds/200273/" },
  'rain-on-window': { title: "January rain on a window.aif", by: "mmorgaine", license: 'CC0', from: 'Freesound', url: "https://freesound.org/people/mmorgaine/sounds/333510/" },
  'thunderstorm': { title: "thunderstorm_5_28_06.wav", by: "Ionizing", license: 'CC0', from: 'Freesound', url: "https://freesound.org/people/Ionizing/sounds/19283/" },
  'thunder': { title: "Thunderstorm", by: "regosss", license: 'CC0', from: 'Freesound', url: "https://freesound.org/people/regosss/sounds/238295/" },
  'river': { title: "Stream River Water Up Close", by: "jackthemurray", license: 'CC0', from: 'Freesound', url: "https://freesound.org/people/jackthemurray/sounds/433589/" },
  'stream': { title: "Gentle Stream Natural Stream Sound", by: "BurghRecords", license: 'CC0', from: 'Freesound', url: "https://freesound.org/people/BurghRecords/sounds/446019/" },
  'waves': { title: "Seawash (calm)", by: "craiggroshek", license: 'CC0', from: 'Freesound', url: "https://freesound.org/people/craiggroshek/sounds/176617/" },
  'wind': { title: "Autumn wind and dry leaves.wav", by: "Stek59", license: 'CC0', from: 'Freesound', url: "https://freesound.org/people/Stek59/sounds/457318/" },
  'birds': { title: "Birds In Spring (Scotland)", by: "BurghRecords", license: 'CC0', from: 'Freesound', url: "https://freesound.org/people/BurghRecords/sounds/463903/" },
  'crickets': { title: "Night Crickets Back Porch.aiff", by: "hdfreema", license: 'CC0', from: 'Freesound', url: "https://freesound.org/people/hdfreema/sounds/333221/" },
  'cicadas': { title: "Cicadas", by: "dethrok", license: 'CC0', from: 'Freesound', url: "https://freesound.org/people/dethrok/sounds/272169/" },
  'campfire': { title: "1103campfire1.wav", by: "moxobna", license: 'CC0', from: 'Freesound', url: "https://freesound.org/people/moxobna/sounds/62487/" },
  'cafe': { title: "People talking at cafe ambience", by: "priesjensen", license: 'CC0', from: 'Freesound', url: "https://freesound.org/people/priesjensen/sounds/482990/" },
  'train': { title: "Riding Train interior recording", by: "gecop", license: 'CC0', from: 'Freesound', url: "https://freesound.org/people/gecop/sounds/525058/" },
  'fan': { title: "Electric Fan 01", by: "unfa", license: 'CC0', from: 'Freesound', url: "https://freesound.org/people/unfa/sounds/170870/" },
  'clock': { title: "small clock in room", by: "Yuval", license: 'CC0', from: 'Freesound', url: "https://freesound.org/people/Yuval/sounds/211192/" },
  'keyboard': { title: "typing", by: "Rodzuz", license: 'CC0', from: 'Freesound', url: "https://freesound.org/people/Rodzuz/sounds/393902/" },
  'wind-chimes': { title: "Wind chimes 1", by: "giddster", license: 'CC0', from: 'Freesound', url: "https://freesound.org/people/giddster/sounds/437337/" }
};
