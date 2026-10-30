/* The places you can go. Each has its own scene (outside.js draws the three outdoors, house.js the room), its own first
 * mix of sounds, and its own things to touch. A spot with `sound` turns that sound on and off; the `chair` spot moves
 * the armchair along its path, and `near` says how that shapes the mix: each sound's level with the chair at the start
 * of the path and at the end of it. The window and the lamp belong to the room (app.js).
 */
var PLACES = {
  room: {
    label: 'Room', icon: '🏠', mix: { rain: 0.6, campfire: 0.75, clock: 0.5 }, seat: 0.45,
    near: { campfire: [0.3, 1], clock: [0.55, 1] },
    welcome: 'Rain outside, a fire, a clock ticking.',
    quiet: 'All quiet. Touch the window, the fire or the clock.',
    mixer: 'The rain, the fire and the clock follow the room: open the window, sit nearer the fire, stop the clock.',
    spots: [
      { id: 'window', short: 'Window' },
      { id: 'fire', sound: 'campfire', volume: 0.75, on: 'Let the fire go out', off: 'Light the fire', short: 'Fire' },
      { id: 'clock', sound: 'clock', volume: 0.5, on: 'Stop the clock', off: 'Start the clock', short: 'Clock' },
      { id: 'lamp', short: 'Lamp' },
      { id: 'chair', on: 'Move back by the window', off: 'Move closer to the fire', short: 'Chair' }
    ]
  },
  beach: {
    label: 'Beach', icon: '🏖️', mix: { waves: 0.8, wind: 0.3, 'wind-chimes': 0.25 }, seat: 0.35,
    near: { waves: [0.45, 1], wind: [1, 0.7] },
    welcome: 'Waves at sunset, a sea breeze, chimes on the post.',
    quiet: 'All quiet. Touch the chair, the fire pit or the chimes.',
    mixer: 'The waves follow your chair: carry it down to the water to hear them close.',
    farText: 'up the beach', nearText: 'down by the water',
    spots: [
      { id: 'chair', on: 'Walk back up the beach', off: 'Walk down to the water', short: 'Water' },
      { id: 'fire', sound: 'campfire', volume: 0.6, on: 'Let the fire go out', off: 'Light a driftwood fire', short: 'Fire', say: 'a fire on the sand' },
      { id: 'chimes', sound: 'wind-chimes', volume: 0.25, on: 'Still the chimes', off: 'Let the chimes ring', short: 'Chimes', say: 'the chimes ringing' }
    ]
  },
  forest: {
    label: 'Forest', icon: '🌲', mix: { birds: 0.7, stream: 0.6, wind: 0.2 }, seat: 0.35,
    near: { stream: [0.35, 1], birds: [1, 0.75] },
    welcome: 'Morning birdsong, a stream, the wind in the trees.',
    quiet: 'All quiet. Touch the chair, the birds or the fire ring.',
    mixer: 'The stream follows your chair: carry it to the bank to hear the water close.',
    farText: 'in the clearing', nearText: 'on the bank of the stream',
    spots: [
      { id: 'chair', on: 'Back to the clearing', off: 'Walk over to the stream', short: 'Stream' },
      { id: 'birds', sound: 'birds', volume: 0.7, on: 'Let the birds settle', off: 'Wake the birds', short: 'Birds', say: 'the birds singing' },
      { id: 'fire', sound: 'campfire', volume: 0.55, on: 'Let the fire go out', off: 'Light a small fire', short: 'Fire', say: 'a small fire going' }
    ]
  },
  lake: {
    label: 'Lake', icon: '🌙', mix: { crickets: 0.7, campfire: 0.6, waves: 0.25 }, seat: 0.2,
    near: { waves: [0.4, 1], campfire: [1, 0.35] },
    welcome: 'Crickets under the stars, a campfire, the lake lapping.',
    quiet: 'All quiet. Touch the chair, the campfire or the crickets.',
    mixer: 'Your chair moves between the campfire and the water: each grows louder as you near it.',
    farText: 'on the shore', nearText: 'at the edge of the lake',
    spots: [
      { id: 'chair', on: 'Back to the campfire', off: 'Walk down to the lake', short: 'Lake' },
      { id: 'fire', sound: 'campfire', volume: 0.6, on: 'Let the fire go out', off: 'Light the campfire', short: 'Fire', say: 'the campfire lit' },
      { id: 'crickets', sound: 'crickets', volume: 0.7, on: 'Hush the crickets', off: 'Let the crickets sing', short: 'Crickets', say: 'the crickets singing' }
    ]
  }
};
var PLACE_ORDER = ['room', 'beach', 'forest', 'lake'];
