# The Little House

A cozy miniature 3D room on a rainy night, and the sounds are mixed by touching things in it: open the sliding window
to let more rain in, move the armchair nearer the fire, light or put out the fire, stop or start the grandfather
clock, turn the lamp on and off. Around the room: Play/Pause, an overall volume, the full Mixer (every sound, as
before), the Sleep Timer, Presets, Mix Code and Credits. Top right, four places to go: the Room, the Beach, the Forest
and the Lake, each with its own scene, its own sounds and its own things to touch. A web app: a page in Web/ shown full screen in its own window
on the Mac. Based on [Moodist](https://github.com/remvze/moodist) by remvze (MIT), adapted from its code at commit
11c0be2200116a3635880d600fd6953899cc51a3 (credits.json, Licenses/remvze/moodist/LICENSE).

## The room and the sound

- The room shapes the mix on top of each sound's own volume (app.js, `roomFactor` and `roomFilter`): sounds from
  outside (rain, storm, wind, birds, crickets, river…) play at 38% and muffled by a low-pass filter (700 Hz) with the
  window shut, and full and clear with it open. The fire plays at 30% with the armchair by the window, 100% by the
  fire; the clock 55% to 100%.
- Touching the fireplace turns the Fire sound on or off; the clock, the Grandfather Clock sound. Opening the window
  onto a silent night turns the Rain on. Clicking the floor slides the armchair to the nearest point on its way
  between the window and the fire; its chip moves it all the way one way or the other.
- Each touchable thing has a chip over it (a real button, so the remote's arrows and OK reach it, and a phone shows a
  short name). Clicks on the 3D things themselves do the same. The camera can be dragged round a little and zoomed.
- The rain falls outside only while a rain sound is on; flames show while the fire is lit. The sleep timer dims the
  lamp over its last two minutes; when it ends the house is "asleep" (fire out, lamp down) until touched.
- Nothing plays until the first press ("Come in", or touching anything).

What's saved (LampStore): `sounds` (each sound's on/off, volume, favorite, swell, for the place you're in), `master`,
`presets`, and `house` ({ window: 0..1, chair: 0..1, lamp: bool, place, seats: the chair in each place outdoors, mixes:
the mix left in each other place }). The first visit, with nothing on, turns on rain, fire and clock.

## The places

- Web/places.js says what each place is: its first mix, the things to touch and what they say, and how the chair's
  place shapes the mix (`near`). The armchair comes along: at the beach, the forest and the lake it moves between a
  spot on land and the water, and the waves or the stream grow nearer as it goes.
- Beach: sunset, waves, wind, wind chimes on a post (they sway while they ring), a fire pit to light. Forest: morning,
  birds, a stream, the wind, a ring of stones to light. Lake: night and stars, crickets, a campfire, low waves, a tent.
- Going to a place crossfades the sounds over 1.2 s behind a half-second dark. The mix you leave stays with that place
  and comes back when you do; the first visit plays the place's own mix.
- The mixer has every sound everywhere, and presets and mix codes apply to the place you're in. Rain falls in any
  place while a rain sound is on. The window and the lamp belong to the room; the sleep timer dims the outdoors too.

## How it's made

- Web/house.js (a module): three.js scene, the models, lights (a warm lamp point light with a shadow, a flickering
  fire light, a dim blue moon and sky), the camera framing for any screen shape (further back when narrow), clicks
  and the chips' positions. Reads `HouseApp.view()` from app.js every frame and eases toward it; calls
  `HouseApp.touch(name, value)`.
- Web/outside.js (a module): the three outdoor places, each a group turned so its -z runs away from the camera. The sky,
  the water (one shader that draws its shoreline, foam and path of light), the palms, tent and chimes are made in code;
  trees, rocks and logs are the Nature Kit's. `moods` in house.js says how each place is lit and looked at.
- Web/weather.js: the rain (1,600 points with the Particle Pack's trace streak, kept outside the walls) and the fire
  (flame sprites cycling the pack's flame pictures, a glow and rising embers).
- Web/app.js: the mixer on Web Audio (each voice: source → low-pass filter → gain → master), the room's state, chips,
  sleep timer, presets, mix code, panels. Web/sounds.js and Web/generators.js as before.
- Web/three/: a copy of Lamp's three.js (r187dev, MIT) with GLTFLoader and OrbitControls. Web/models/*.glb and
  Web/textures/*.png: the CC0 models and particles, each credited in credits.json with its license file.

Look: a night of rain, deep blue-black sky (#0b1016) and fog; inside, warm lamplight amber (#f4b860) on honey wood
and cream plaster. Every model's materials are recolored by name to one palette in house.js (`palette`), so the
Kenney, Quaternius and CreativeTrio pieces read as one place. Glass chips over the room, a serif title (Iowan Old
Style).

## Moodist's recordings aren't here

None of Moodist's recordings are used (Pixabay's terms). Every recording is a CC0 original from Freesound, credited in
Licenses/sounds/NOTICE-sounds.md. An update from Moodist must never bring its sound files in.

## Left out, for now

- Sounds of their own for the new places (gulls, say): they play from the same CC0 recordings as the rest.
- Moodist's other sounds, lofi music and radio, other timers, notepad, themes, media controls in Now Playing.
- The clock has no moving pendulum or hands (the model is one piece).
- Sound stops when the window closes; the sleep timer counts only while it's open.
