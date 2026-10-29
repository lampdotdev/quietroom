/* The Little House: a cozy 3D room whose things mix the sounds (house.js draws it), around an ambient sound mixer
 * adapted from Moodist by remvze (MIT, https://github.com/remvze/moodist). The room shapes the mix on top of each
 * sound's own volume: the window lets the outside in (louder, and no longer muffled by a low-pass filter), the
 * armchair's place between the window and the fire makes the fire and the clock nearer or further, the fireplace
 * lights and puts out the fire sound, and the clock starts and stops its ticking.
 * Moodist's store (src/stores/sound.ts) and its sound hook (src/hooks/use-sound.ts) are what this follows: a sound
 * is selected or not, each has its own volume and can swell slowly, one Play plays every selected sound, and
 * selecting a sound starts playing. Its fades (250 ms), its swell (a 10 s cycle down to 40%), its shuffle (four
 * sounds at random volumes), its sleep timer (a one-second fade at the end), its presets and its share format (a JSON
 * object of id to volume, here a code to copy and paste) are Moodist's.
 */
(function () {
  'use strict';

  var FADE = 0.25;               // Moodist's DEFAULT_FADE_DURATION, in seconds
  var SWELL_PERIOD = 10;         // OSCILLATION_PERIOD
  var SWELL_LOW = 0.4;           // OSCILLATION_MIN_VOLUME
  var SLEEP_FADE = 1;            // the sleep timer's FADE_OUT duration

  var all = [], byId = {};
  ROOM_CATEGORIES.forEach(function (category) {
    category.sounds.forEach(function (sound) { sound.category = category.id; all.push(sound); byId[sound.id] = sound; });
  });

  // What's saved: each sound's selection, volume, favourite and swell; the overall volume; the presets.
  function fresh() { return { selected: false, volume: 0.5, favorite: false, oscillating: false }; }
  var saved = LampStore.load('sounds', {});
  var state = {};
  all.forEach(function (sound) {
    var s = saved[sound.id] || {};
    state[sound.id] = {
      selected: s.selected === true, volume: typeof s.volume === 'number' ? s.volume : 0.5,
      favorite: s.favorite === true, oscillating: s.oscillating === true
    };
  });
  var master = LampStore.load('master', 1);
  var presets = LampStore.load('presets', []);

  // The room: the window open (0 to 1), where the armchair is between the window (0) and the fire (1), the lamp.
  var savedHouse = LampStore.load('house', null);
  var house = {
    window: savedHouse && typeof savedHouse.window === 'number' ? savedHouse.window : 0,
    chair: savedHouse && typeof savedHouse.chair === 'number' ? savedHouse.chair : 0.45,
    lamp: savedHouse ? savedHouse.lamp !== false : true
  };
  // The first evening in the house: rain, the fire and the clock, unless a mix was already on.
  if (!savedHouse && !all.some(function (s) { return state[s.id].selected; })) {
    state.rain.selected = true; state.rain.volume = 0.6;
    state.campfire.selected = true; state.campfire.volume = 0.75;
    state.clock.selected = true; state.clock.volume = 0.5;
  }
  function saveHouse() { LampStore.save(house, 'house'); }
  if (!savedHouse) { saveHouse(); LampStore.save(state, 'sounds'); }

  // Sounds from outside: louder and clearer with the window open.
  var OUTSIDE = { 'rain': 1, 'thunderstorm': 1, 'thunder': 1, 'river': 1, 'stream': 1, 'waves': 1, 'wind': 1, 'birds': 1,
    'crickets': 1, 'cicadas': 1, 'wind-chimes': 1, 'train': 1 };
  function roomFactor(id) {
    if (OUTSIDE[id]) return 0.38 + 0.62 * house.window;
    if (id === 'campfire') return 0.3 + 0.7 * house.chair;
    if (id === 'clock') return 0.55 + 0.45 * house.chair;
    return 1;
  }
  function roomFilter(id) { return OUTSIDE[id] ? 700 + Math.pow(house.window, 2) * 17000 : 20000; }
  var playing = false;
  var history = null;            // the mix as it was before Clear, for Undo
  function save() { LampStore.save(state, 'sounds'); }
  function savePresets() { LampStore.save(presets, 'presets'); }
  function selectedIds() { return all.filter(function (s) { return state[s.id].selected; }).map(function (s) { return s.id; }); }

  // MARK: Sound

  var context = null, masterGain = null, voices = {}, buffers = {}, loading = {};

  function audio() {
    if (!context) {
      var Context = window.AudioContext || window.webkitAudioContext;
      context = new Context();
      masterGain = context.createGain();
      masterGain.gain.value = master;
      masterGain.connect(context.destination);
    }
    if (context.state !== 'running' && context.resume) context.resume();
    return context;
  }

  // An MP3 starts and ends with the encoder's few milliseconds of silence: loop between the first and last sound in it.
  function loopPoints(buffer) {
    var data = buffer.getChannelData(0), first = 0, last = data.length - 1, quiet = 1e-4;
    while (first < data.length && Math.abs(data[first]) < quiet) first++;
    while (last > first && Math.abs(data[last]) < quiet) last--;
    return { start: first / buffer.sampleRate, end: (last + 1) / buffer.sampleRate };
  }

  function load(sound) {
    if (buffers[sound.id]) return Promise.resolve(buffers[sound.id]);
    if (loading[sound.id]) return loading[sound.id];
    setLoading(sound.id, true);
    loading[sound.id] = new Promise(function (resolve, reject) {
      var request = new XMLHttpRequest();
      request.open('GET', LampAssets.url('sounds/' + sound.file));
      request.responseType = 'arraybuffer';
      request.onload = function () {
        if (request.status && request.status >= 400) { reject(new Error('Couldn’t load ' + sound.label + '.')); return; }
        audio().decodeAudioData(request.response, resolve, function () { reject(new Error('Couldn’t play ' + sound.label + '.')); });
      };
      request.onerror = function () { reject(new Error('Couldn’t load ' + sound.label + '.')); };
      request.send();
    }).then(function (buffer) {
      buffers[sound.id] = buffer;
      setLoading(sound.id, false);
      return buffer;
    }, function (error) {
      delete loading[sound.id];
      setLoading(sound.id, false);
      throw error;
    });
    return loading[sound.id];
  }

  function source(sound, buffer) {
    var ctx = audio();
    if (sound.make) return RoomGenerators.noise(ctx, sound.make);
    if (sound.beat) return RoomGenerators.binaural(ctx, sound.beat.base, sound.beat.beat);
    var node = ctx.createBufferSource(), points = loopPoints(buffer);
    node.buffer = buffer;
    node.loop = true;
    node.loopStart = points.start;
    node.loopEnd = points.end;
    node.startAt = points.start;
    return node;
  }

  function level(id) {
    var s = state[id], room = roomFactor(id);
    if (!s.oscillating) return s.volume * room;
    var phase = (context.currentTime / SWELL_PERIOD) * 2 * Math.PI;
    return s.volume * room * (SWELL_LOW + (1 - SWELL_LOW) * (1 + Math.cos(phase)) / 2);
  }

  // The room changed: every voice eases to its new level and its filter opens or closes.
  function reshape(seconds) {
    if (!context) return;
    for (var id in voices) {
      if (!voices.hasOwnProperty(id)) continue;
      var voice = voices[id];
      if (voice.stopping) continue;
      ramp(voice.gain, level(id), seconds);
      var f = voice.filter.frequency, now = context.currentTime;
      f.cancelScheduledValues(now);
      f.setValueAtTime(f.value, now);
      f.exponentialRampToValueAtTime(roomFilter(id), now + seconds);
    }
  }

  function ramp(gain, to, seconds) {
    var now = context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(to, now + seconds);
  }

  function start(sound) {
    var voice = voices[sound.id];
    if (voice && !voice.stopping) { ramp(voice.gain, level(sound.id), FADE); return; }
    var ready = sound.file ? load(sound) : Promise.resolve(null);
    ready.then(function (buffer) {
      if (!(playing && state[sound.id].selected)) return;
      var current = voices[sound.id];
      if (current && !current.stopping) return;
      if (current) finish(current);
      var ctx = audio(), gain = ctx.createGain(), filter = ctx.createBiquadFilter(), node = source(sound, buffer);
      filter.type = 'lowpass';
      filter.frequency.value = roomFilter(sound.id);
      filter.Q.value = 0.5;
      gain.gain.value = 0;
      filter.connect(gain);
      gain.connect(masterGain);
      node.connect(filter);
      if (node.startAt !== undefined) node.start(0, node.startAt); else node.start();
      voices[sound.id] = { node: node, gain: gain, filter: filter, stopping: false };
      ramp(gain, level(sound.id), FADE);
    }, function (error) {
      notify(error.message);
    });
  }

  function finish(voice) {
    try { voice.node.stop(); } catch (e) {}
    voice.gain.disconnect();
    voice.filter.disconnect();
  }

  function stop(id, seconds) {
    var voice = voices[id];
    if (!voice || voice.stopping) return;
    voice.stopping = true;
    ramp(voice.gain, 0, seconds);
    setTimeout(function () {
      if (voices[id] === voice) { finish(voice); delete voices[id]; }
    }, seconds * 1000 + 50);
  }

  // Every sound playing that should, and none that shouldn't.
  function sync(fadeSeconds) {
    all.forEach(function (sound) {
      if (playing && state[sound.id].selected) start(sound);
      else stop(sound.id, fadeSeconds || FADE);
    });
    render();
  }

  // The swell, as Moodist's hook moves it: every 50 ms, towards where the cycle is.
  setInterval(function () {
    if (!context) return;
    all.forEach(function (sound) {
      var voice = voices[sound.id];
      if (voice && !voice.stopping && state[sound.id].oscillating) {
        voice.gain.gain.setTargetAtTime(level(sound.id), context.currentTime, 0.05);
      }
    });
  }, 50);

  // MARK: What the person does

  function setPlaying(value) {
    if (value && !selectedIds().length) { notify('Pick a sound first.'); return; }
    playing = value;
    // Any way of starting the sound wakes the house, as the Play button and touching the room do.
    if (value) { asleep = false; audio(); }
    sync();
  }

  function toggle(id) {
    var s = state[id];
    if (s.selected) { s.selected = false; s.volume = 0.5; }
    else { s.selected = true; history = null; playing = true; asleep = false; audio(); }
    if (!selectedIds().length) playing = false;
    save();
    sync();
  }

  function setVolume(id, value) {
    state[id].volume = value;
    save();
    var voice = voices[id];
    if (voice && !voice.stopping) ramp(voice.gain, level(id), 0.05);
  }

  function setMaster(value) {
    master = value;
    LampStore.save(master, 'master');
    if (masterGain) ramp(masterGain, value, 0.05);
  }

  function override(mix) {
    all.forEach(function (sound) {
      var s = state[sound.id];
      s.selected = mix.hasOwnProperty(sound.id);
      s.volume = s.selected ? mix[sound.id] : 0.5;
    });
    history = null;
    save();
  }

  function shuffle() {
    var ids = all.map(function (s) { return s.id; }), mix = {};
    for (var n = 0; n < 4; n++) {
      var i = Math.floor(Math.random() * ids.length);
      mix[ids.splice(i, 1)[0]] = 0.2 + Math.random() * 0.8;
    }
    override(mix);
    setPlaying(true);
  }

  function clear() {
    if (!selectedIds().length) return;
    history = { playing: playing, state: JSON.parse(JSON.stringify(state)) };
    all.forEach(function (sound) { state[sound.id].selected = false; state[sound.id].volume = 0.5; });
    playing = false;
    save();
    sync();
    notify('Cleared.', { label: 'Undo', run: undo });
  }

  function undo() {
    if (!history) return;
    state = history.state;
    playing = history.playing;
    if (playing) asleep = false;
    history = null;
    save();
    sync();
  }

  // MARK: The room

  var asleep = false;      // the sleep timer ended: the house is dark until something is touched

  function comeIn() {
    asleep = false;
    if (!playing && selectedIds().length) { playing = true; audio(); sync(); }
    else audio();
    welcomeGone();
  }

  function turnOn(id, volume) {
    var s = state[id];
    if (!s.selected) { s.selected = true; if (volume) s.volume = volume; history = null; }
  }

  var SPOTS = {
    window: function () { return house.window > 0.5 ? 'Close the window' : 'Open the window'; },
    fire: function () { return state.campfire.selected ? 'Let the fire go out' : 'Light the fire'; },
    clock: function () { return state.clock.selected ? 'Stop the clock' : 'Start the clock'; },
    lamp: function () { return house.lamp ? 'Turn off the lamp' : 'Turn on the lamp'; },
    chair: function () { return house.chair < 0.5 ? 'Move closer to the fire' : 'Move back by the window'; }
  };
  var SHORT = { window: 'Window', fire: 'Fire', clock: 'Clock', lamp: 'Lamp', chair: 'Chair' };
  function spotOn(name) {
    if (name === 'window') return house.window > 0.5;
    if (name === 'fire') return state.campfire.selected;
    if (name === 'clock') return state.clock.selected;
    if (name === 'lamp') return house.lamp;
    return true;
  }

  function touch(name, value) {
    comeIn();
    if (name === 'window') {
      house.window = house.window > 0.5 ? 0 : 1;
      // Opening onto a quiet night lets the rain in.
      if (house.window && !selectedIds().some(function (id) { return OUTSIDE[id]; })) turnOn('rain', 0.6);
      notify(house.window ? 'The window is open. The rain comes in.' : 'The window is shut. The rain is softer.');
    } else if (name === 'fire') {
      if (state.campfire.selected) { state.campfire.selected = false; }
      else turnOn('campfire', 0.75);
    } else if (name === 'clock') {
      if (state.clock.selected) state.clock.selected = false;
      else turnOn('clock', 0.5);
    } else if (name === 'lamp') {
      house.lamp = !house.lamp;
    } else if (name === 'chair') {
      house.chair = house.chair < 0.5 ? 1 : 0;
    } else if (name === 'chair-to') {
      house.chair = Math.max(0, Math.min(1, value));
    }
    if (selectedIds().length) playing = true; else playing = false;
    save();
    saveHouse();
    sync();
    reshape(name === 'window' ? 1.4 : 1);
  }

  var hotspots = {};
  function buildHotspots() {
    var layer = $('#hotspots');
    Object.keys(SPOTS).forEach(function (name) {
      var button = el('button', { type: 'button', class: 'spot', 'data-spot': name, onclick: function () { touch(name); } }, [
        el('span', { class: 'dot', 'aria-hidden': 'true' }), el('span', { class: 'spot-label' }),
        el('span', { class: 'spot-short', 'aria-hidden': 'true', text: SHORT[name] })
      ]);
      layer.appendChild(button);
      hotspots[name] = button;
    });
  }
  function renderHotspots() {
    for (var name in hotspots) {
      if (!hotspots.hasOwnProperty(name)) continue;
      var label = SPOTS[name]();
      hotspots[name].querySelector('.spot-label').textContent = label;
      hotspots[name].setAttribute('aria-label', label);
      hotspots[name].classList.toggle('off', !spotOn(name));
    }
  }

  function welcomeGone() {
    var w = $('#welcome');
    if (!w || w.classList.contains('gone')) return;
    var hadFocus = document.activeElement === $('#come-in');
    w.classList.add('gone');
    $('#come-in').disabled = true;
    if (hadFocus) Lamp.focus(hotspots.window || '#play');
  }

  function describe() {
    var count = selectedIds().length;
    if (asleep) return 'The house is asleep. Touch anything to wake it.';
    if (!count) return 'All quiet. Touch the window, the fire or the clock.';
    if (!playing) return 'Quiet for now. Touch anything in the room to begin.';
    var bits = [];
    var outside = selectedIds().some(function (id) { return OUTSIDE[id]; });
    if (outside) bits.push(house.window > 0.5 ? 'Window open' : 'Window shut');
    bits.push(house.chair > 0.66 ? 'sitting by the fire' : house.chair < 0.33 ? 'sitting by the window' : 'sitting in the middle');
    bits.push(state.clock.selected ? 'the clock ticking' : 'the clock still');
    var others = selectedIds().filter(function (id) { return id !== 'rain' && id !== 'campfire' && id !== 'clock'; }).length;
    var text = bits.join(', ');
    text = text.charAt(0).toUpperCase() + text.slice(1);
    return text + (others ? ' · ' + others + ' more ' + (others === 1 ? 'sound' : 'sounds') : '');
  }

  // What the room should show now, read by house.js each frame.
  function sleepDim() {
    if (asleep) return 1;
    if (!sleep.endsAt) return 0;
    var left = (sleep.endsAt - Date.now()) / 1000;
    return left < 120 ? 1 - Math.max(0, left) / 120 : 0;
  }
  var view = { window: 0, chair: 0, lamp: true, fire: false, clock: false, rain: false, dim: 0 };
  window.HouseApp = {
    view: function () {
      view.window = house.window;
      view.chair = house.chair;
      view.lamp = house.lamp;
      view.fire = state.campfire.selected && !asleep;
      view.clock = state.clock.selected && playing;
      view.rain = state.rain.selected || state.thunderstorm.selected || state['rain-on-window'].selected;
      view.dim = sleepDim();
      return view;
    },
    touch: touch
  };

  function currentMix() {
    var mix = {};
    selectedIds().forEach(function (id) { mix[id] = Math.round(state[id].volume * 100) / 100; });
    return mix;
  }

  // MARK: Sleep timer

  var sleep = { endsAt: 0, timer: null };

  function startSleep(seconds) {
    if (!selectedIds().length) { notify('Pick a sound first.'); return; }
    if (!playing) setPlaying(true);
    sleep.endsAt = Date.now() + seconds * 1000;
    clearInterval(sleep.timer);
    sleep.timer = setInterval(tickSleep, 1000);
    tickSleep();
  }

  function cancelSleep() {
    clearInterval(sleep.timer);
    sleep.endsAt = 0;
    renderSleep();
  }

  function tickSleep() {
    if (sleep.endsAt && Date.now() >= sleep.endsAt) {
      cancelSleep();
      playing = false;
      asleep = true;
      sync(SLEEP_FADE);
      notify('Sleep timer ended. Goodnight.');
      return;
    }
    renderSleep();
  }

  function clock(seconds) {
    var h = Math.floor(seconds / 3600), m = Math.floor(seconds % 3600 / 60), s = Math.floor(seconds % 60);
    function two(n) { return (n < 10 ? '0' : '') + n; }
    return (h ? h + ':' + two(m) : m) + ':' + two(s);
  }

  // MARK: Drawing

  var $ = function (selector, root) { return (root || document).querySelector(selector); };
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    for (var key in attrs || {}) {
      if (!attrs.hasOwnProperty(key)) continue;
      var value = attrs[key];
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key.indexOf('on') === 0) node.addEventListener(key.slice(2), value);
      else if (value !== false && value !== null && value !== undefined) node.setAttribute(key, value === true ? '' : value);
    }
    (children || []).forEach(function (child) { if (child) node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child); });
    return node;
  }

  var tiles = {};

  function tile(sound) {
    var volume = el('input', { type: 'range', min: '0', max: '1', step: '0.01', class: 'volume', 'aria-label': sound.label + ' volume',
      oninput: function (e) { setVolume(sound.id, Number(e.target.value)); }, onclick: function (e) { e.stopPropagation(); } });
    var star = el('button', { class: 'mini star', type: 'button', onclick: function (e) {
      e.stopPropagation();
      state[sound.id].favorite = !state[sound.id].favorite;
      save();
      render(true);
    } });
    var swell = el('button', { class: 'mini swell', type: 'button', title: 'Swell slowly', onclick: function (e) {
      e.stopPropagation();
      state[sound.id].oscillating = !state[sound.id].oscillating;
      save();
      var voice = voices[sound.id];
      if (voice && !voice.stopping) ramp(voice.gain, level(sound.id), FADE);
      render();
    } }, ['〜']);
    var node = el('div', { class: 'tile', role: 'button', tabindex: '0', 'data-id': sound.id, 'aria-label': sound.label + ' sound',
      onclick: function () { toggle(sound.id); },
      onkeydown: function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target === node) { e.preventDefault(); toggle(sound.id); } } }, [
      el('div', { class: 'tile-top' }, [el('span', { class: 'icon', 'aria-hidden': 'true', text: sound.icon }), star]),
      el('div', { class: 'label', text: sound.label }),
      sound.hint ? el('div', { class: 'hint', text: sound.hint }) : null,
      el('div', { class: 'controls' }, [volume, swell])
    ]);
    // A favourite has two tiles, one in Favorites and one in its category: both are drawn.
    (tiles[sound.id] = tiles[sound.id] || []).push({ node: node, volume: volume, star: star, swell: swell });
    return node;
  }

  function section(id, title, sounds, note) {
    return el('section', { class: 'category', id: 'category-' + id }, [
      el('h2', { text: title }),
      note ? el('p', { class: 'note', text: note }) : null,
      el('div', { class: 'grid' }, sounds.map(tile))
    ]);
  }

  function build() {
    var list = $('#sounds');
    list.innerHTML = '';
    tiles = {};
    var favorites = all.filter(function (s) { return state[s.id].favorite; });
    if (favorites.length) list.appendChild(section('favorites', 'Favorites', favorites));
    ROOM_CATEGORIES.forEach(function (c) { list.appendChild(section(c.id, c.title, c.sounds, c.note)); });
  }

  var loadingIds = {};
  function setLoading(id, value) { loadingIds[id] = value; render(); }

  function render(rebuild) {
    if (rebuild) build();
    var focusedId = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-id');
    for (var id in tiles) {
      if (!tiles.hasOwnProperty(id)) continue;
      var s = state[id];
      tiles[id].forEach(function (t) {
        t.node.classList.toggle('selected', s.selected);
        t.node.classList.toggle('loading', loadingIds[id] === true);
        t.node.setAttribute('aria-pressed', s.selected ? 'true' : 'false');
        t.volume.value = String(s.volume);
        t.volume.disabled = !s.selected;
        t.star.textContent = s.favorite ? '★' : '☆';
        t.star.setAttribute('aria-label', (s.favorite ? 'Remove ' : 'Add ') + byId[id].label + (s.favorite ? ' from' : ' to') + ' favorites');
        t.swell.setAttribute('aria-pressed', s.oscillating ? 'true' : 'false');
        t.swell.hidden = !s.selected;
      });
    }
    if (focusedId && tiles[focusedId] && document.activeElement === document.body) tiles[focusedId][0].node.focus();
    var count = selectedIds().length;
    var play = $('#play');
    play.textContent = playing ? 'Pause' : 'Play';
    play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    play.classList.toggle('on', playing);
    play.disabled = !count;
    $('#now').textContent = describe();
    $('#clear').disabled = !count;
    document.body.classList.toggle('playing', playing);
    if (playing) welcomeGone();
    renderHotspots();
  }

  function renderSleep() {
    var badge = $('#sleep-left');
    if (sleep.endsAt) {
      badge.hidden = false;
      badge.textContent = 'Sleep in ' + clock(Math.max(0, Math.round((sleep.endsAt - Date.now()) / 1000)));
    } else {
      badge.hidden = true;
    }
    var panel = $('#sleep-running');
    if (panel) {
      panel.hidden = !sleep.endsAt;
      $('#sleep-form').hidden = !!sleep.endsAt;
      $('#sleep-count').textContent = sleep.endsAt ? clock(Math.max(0, Math.round((sleep.endsAt - Date.now()) / 1000))) : '';
    }
  }

  // MARK: Messages

  var noteTimer = null;
  function notify(text, action) {
    var bar = $('#snackbar');
    bar.innerHTML = '';
    bar.appendChild(el('span', { text: text }));
    if (action) bar.appendChild(el('button', { type: 'button', class: 'link', text: action.label, onclick: function () { action.run(); bar.hidden = true; } }));
    bar.hidden = false;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(function () { bar.hidden = true; }, action ? 6000 : 3500);
  }

  // MARK: Panels

  var openPanel = null, returnFocus = null;

  function open(id) {
    close();
    var panel = $('#' + id);
    returnFocus = document.activeElement;
    $('#veil').hidden = false;
    panel.hidden = false;
    openPanel = panel;
    Lamp.scope = panel;
    document.body.classList.add('panel-open');
    if (id === 'presets-panel') renderPresets();
    if (id === 'mix-panel') { $('#mix-code').value = JSON.stringify(currentMix()); $('#mix-import').value = ''; $('#mix-said').textContent = ''; }
    if (id === 'sleep-panel') renderSleep();
    var first = panel.querySelector('input, textarea, button:not(.close)') || panel.querySelector('button');
    if (first) first.focus();
  }

  function close() {
    if (!openPanel) return false;
    openPanel.hidden = true;
    $('#veil').hidden = true;
    openPanel = null;
    Lamp.scope = null;
    document.body.classList.remove('panel-open');
    if (returnFocus && returnFocus.focus) returnFocus.focus();
    return true;
  }

  function renderPresets() {
    var list = $('#preset-list');
    list.innerHTML = '';
    $('#preset-save').disabled = !selectedIds().length;
    if (!presets.length) { list.appendChild(el('p', { class: 'note', text: 'No presets yet. Save the sounds you have on as one.' })); return; }
    presets.forEach(function (preset) {
      var names = Object.keys(preset.sounds).filter(function (id) { return byId[id]; }).map(function (id) { return byId[id].label; });
      list.appendChild(el('div', { class: 'preset' }, [
        el('div', { class: 'preset-text' }, [el('strong', { text: preset.label }), el('span', { class: 'note', text: names.join(', ') })]),
        el('button', { type: 'button', text: 'Play', onclick: function () { override(preset.sounds); setPlaying(true); close(); notify('Playing “' + preset.label + '”.'); } }),
        el('button', { type: 'button', text: 'Rename', onclick: function (e) {
          // Renamed in place: a field where its name was, kept on Return or when it loses focus.
          var row = e.target.parentNode, text = row.querySelector('.preset-text'), done = false;
          var field = el('input', { type: 'text', class: 'rename', value: preset.label, 'aria-label': 'Preset name' });
          function keep() {
            if (done) return;
            done = true;
            if (field.value.trim()) { preset.label = field.value.trim(); savePresets(); }
            renderPresets();
          }
          field.addEventListener('keydown', function (k) { if (k.key === 'Enter') { k.preventDefault(); keep(); } });
          field.addEventListener('blur', keep);
          text.replaceChild(field, text.firstChild);
          field.focus();
          field.select();
        } }),
        el('button', { type: 'button', class: 'danger', text: 'Delete', onclick: function () {
          var index = presets.indexOf(preset);
          presets.splice(index, 1);
          savePresets();
          renderPresets();
          notify('Deleted “' + preset.label + '”.', { label: 'Undo', run: function () { presets.splice(index, 0, preset); savePresets(); } });
        } })
      ]));
    });
  }

  function savePreset(e) {
    e.preventDefault();
    var input = $('#preset-name'), name = input.value.trim();
    if (!name || !selectedIds().length) return;
    presets.unshift({ id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), label: name, sounds: currentMix() });
    savePresets();
    input.value = '';
    renderPresets();
    notify('Saved “' + name + '”.');
  }

  // A mix code is Moodist's share format, a JSON object of sound id to volume: one from Moodist brings in the sounds
  // the room has too.
  function importMix(e) {
    e.preventDefault();
    var text = $('#mix-import').value.trim(), said = $('#mix-said'), parsed;
    try { parsed = JSON.parse(text); } catch (error) {
      // A Moodist link carries the same object in its `share` parameter.
      var match = /[?&]share=([^&#\s]+)/.exec(text);
      try { parsed = match ? JSON.parse(decodeURIComponent(match[1])) : null; } catch (inner) { parsed = null; }
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) { said.textContent = 'That isn’t a mix code.'; return; }
    var mix = {}, missing = 0;
    Object.keys(parsed).forEach(function (id) {
      var volume = Number(parsed[id]);
      if (byId[id] && volume >= 0 && volume <= 1) mix[id] = volume; else missing++;
    });
    if (!Object.keys(mix).length) { said.textContent = 'None of the sounds in that code are in this room.'; return; }
    override(mix);
    setPlaying(true);
    close();
    notify('Mix imported' + (missing ? ', without ' + missing + (missing === 1 ? ' sound' : ' sounds') + ' this room doesn’t have.' : '.'));
  }

  function copyMix() {
    var field = $('#mix-code');
    field.select();
    var done = function () { $('#mix-said').textContent = 'Copied.'; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(field.value).then(done, function () { document.execCommand('copy'); done(); });
    else { document.execCommand('copy'); done(); }
  }

  function buildCredits() {
    var list = $('#credit-list');
    list.innerHTML = '';
    all.forEach(function (sound) {
      var credit = ROOM_CREDITS[sound.id];
      if (!credit) return;
      list.appendChild(el('li', {}, [
        el('strong', { text: sound.label }), ' — ',
        el('a', { href: credit.url, target: '_blank', rel: 'noopener', text: '“' + credit.title + '”' }),
        ' by ' + credit.by + ' (' + credit.license + (credit.from ? ', ' + credit.from : '') + ')'
      ]));
    });
  }

  // MARK: Start

  document.addEventListener('DOMContentLoaded', function () {
    buildHotspots();
    build();
    buildCredits();
    $('#play').addEventListener('click', function () { asleep = false; setPlaying(!playing); });
    $('#come-in').addEventListener('click', function () { comeIn(); render(); });
    $('#shuffle').addEventListener('click', shuffle);
    $('#clear').addEventListener('click', clear);
    $('#master').value = String(master);
    $('#master').addEventListener('input', function (e) { setMaster(Number(e.target.value)); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-open]'), function (button) {
      button.addEventListener('click', function () { open(button.getAttribute('data-open')); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.close'), function (button) { button.addEventListener('click', close); });
    $('#veil').addEventListener('click', close);
    $('#preset-form').addEventListener('submit', savePreset);
    $('#mix-form').addEventListener('submit', importMix);
    $('#mix-copy').addEventListener('click', copyMix);
    $('#sleep-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var seconds = (Number($('#sleep-hours').value) || 0) * 3600 + (Number($('#sleep-minutes').value) || 0) * 60;
      if (seconds > 0) { startSleep(seconds); close(); }
    });
    $('#sleep-cancel').addEventListener('click', function () { cancelSleep(); });
    Lamp.onBack(close);
    Lamp.onKey(function (name) {
      if (name === 'play' || name === 'pause' || name === 'playpause') { setPlaying(name === 'play' ? true : name === 'pause' ? false : !playing); return true; }
      return false;
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { if (close()) e.preventDefault(); return; }
      var typingNow = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if (e.key === ' ' && !typingNow && !openPanel && !(e.target.classList && e.target.classList.contains('tile')) && e.target.tagName !== 'BUTTON') { e.preventDefault(); setPlaying(!playing); }
    });
    // A device that holds sound back until a press: let the first press anywhere wake it.
    document.addEventListener('pointerdown', function () { if (context && context.state !== 'running') context.resume(); });
    render();
    renderSleep();
    // Nothing plays by itself when the room opens: sound starts with a press, as browsers ask.
    Lamp.focus('#come-in');
  });

  // For whoever looks at the room from outside (Lamp's preview): what's selected and whether it's playing.
  window.LittleHouse = {
    state: function () { return { playing: playing, selected: selectedIds(), voices: Object.keys(voices), context: context ? context.state : 'none' }; }
  };
})();
