# My Quiet Room

An ambient sound mixer: turn on a few sounds (rain, a stream, a café, brown noise, a binaural beat), set each one's
volume, and let them play while you work, read or fall asleep. A web app: a page in Web/ shown full screen in its own
window on the Mac.

It's based on [Moodist](https://github.com/remvze/moodist) by remvze (MIT), adapted from its code at commit
11c0be2200116a3635880d600fd6953899cc51a3, which credits.json names and Licenses/remvze/moodist/LICENSE keeps.

## What it does

- Sounds in Moodist's categories (Rain, Nature, Places, Things, Noise, Binaural Beats), each a tile: click to turn it
  on (which starts playing), drag its slider for its volume, ★ to add it to Favorites (shown first), 〜 to make it swell
  slowly (a 10 s cycle down to 40%, as Moodist's "oscillate").
- Play/Pause for all of them (Space, or the play/pause keys), an overall volume, Shuffle (four sounds at random
  volumes) and Clear (with Undo).
- Presets: save what's on under a name, play, rename or delete one (with Undo).
- Sleep Timer: hours and minutes, then everything fades out over a second.
- Mix Code: the sounds on and their volumes as a short code (Moodist's share format, a JSON object of sound id to
  volume) to copy and send, and a field to paste someone's code into. A Moodist share link or code imports too: the
  sounds this room has are brought in and the rest are said to be missing.
- Credits: Moodist, and every recording with its author and license.

What's saved (LampStore): each sound's on/off, volume, favourite and swell (`sounds`), the overall volume
(`master`), the presets (`presets`). Nothing plays until it's pressed.

## How it's made

- Web/sounds.js: the sounds and categories, with Moodist's ids where the sound is the same kind, and who made each
  recording (ROOM_CREDITS, as credits.json has it).
- Web/generators.js: white, pink and brown noise, and the binaural beats (Moodist's way: a 100 Hz tone, half the beat
  below in one ear and half above in the other, beats of 2, 5, 10, 20 and 40 Hz). Made as they play, not recorded.
- Web/app.js: the mixer on Web Audio, following Moodist's sound store and hook (fades of 250 ms, the swell, shuffle,
  Clear and Undo, the sleep timer's fade), presets, the mix code, the panels.
- Web/sounds/*.mp3: the recordings, each a seamless loop cut from a longer recording. Where each came from, its license
  and every change made to it are in Licenses/sounds/NOTICE-sounds.md; their license texts are beside it.

## Moodist's recordings aren't here

Moodist's README puts its recordings under the Pixabay Content License or CC0 without saying which file is which, and
Pixabay's terms don't allow passing its files on by themselves. So none of them are used. Every recording here is a CC0 original from Freesound,
with its page credited. An update from Moodist must never bring its sound files in.

## Left out of Moodist, for now

- Its other sounds: most animals (cats, dogs, owls, wolves, whales, crows, frogs, horses, farm animals, bees,
  woodpeckers, seagulls), the other kinds of rain (on a car roof, umbrella, tent, leaves), howling wind, wind in
  trees, waterfall, footsteps in snow, leaves and gravel, droplets, jungle; places (airport, church, temple,
  construction site, underwater, crowded bar, night village, subway station, office, supermarket, carousel,
  laboratory, laundry room, restaurant, library); things (typewriter, paper, singing bowl, ceiling fan, dryer, slide
  projector, boiling water, bubbles, tuning radio, morse code, washing machine, vinyl, windshield wipers); transport
  (inside a train, airplane, submarine, sailboat, rowing boat); urban (highway, road, siren, busy street, crowd,
  traffic, fireworks). Any can be added with a CC0 recording, credited.
- Its lofi music and radio (streams from other sites), isochronic tones, breathing exercise, Pomodoro, Flowmodoro and
  countdown timers, notepad and to-do list, themes, keyboard shortcuts panel and media controls in the system's Now
  Playing.
- Its share links: a link to moodist.app opens Moodist, and this room has no web address of its own, so a mix is a
  code to copy and paste instead.

## Known limits

- Sound stops when the window closes: there's no playing in the background or from the menu bar yet.
- A sleep timer counts while the window is open; closing the window ends it with the sound.
