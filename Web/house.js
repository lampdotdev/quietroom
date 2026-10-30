/* The Little House: a miniature room at night, drawn with three.js from CC0 models (Kenney's Furniture and Nature
 * Kits, Quaternius' Fireplace, CreativeTrio's Grandfathers Clock). The room is a cut-away diorama on a little island
 * of grass in the rain. The other places (outside.js) stand beside it, one shown at a time: `moods` here says how each
 * is lit and looked at. app.js owns what's on (HouseApp.view()); this file draws it, moves toward it smoothly, and
 * tells app.js what was touched (HouseApp.touch(name, value)).
 *
 * Room coordinates: the floor is x -2..2, z -2..2, y up. The back wall stands at z = -2 (the fireplace and the clock),
 * the left wall at x = -2 (the sliding window). The camera looks in from the front right, where there are no walls.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildPlaces } from './outside.js';

const canvas = document.getElementById('room');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const NIGHT = new THREE.Color('#0b1016');
const scene = new THREE.Scene();
scene.background = NIGHT;
scene.fog = new THREE.Fog(NIGHT, 11, 22);

// One group for each place. The outdoor ones are turned so their -z runs straight away from the camera.
const stages = {};
PLACE_ORDER.forEach(id => {
  stages[id] = new THREE.Group();
  stages[id].visible = false;
  if (id !== 'room') stages[id].rotation.y = Math.PI / 4;
  scene.add(stages[id]);
});

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.rotateSpeed = 0.5;
controls.minPolarAngle = 0.55;
controls.maxPolarAngle = 1.25;
controls.minAzimuthAngle = 0.05;
controls.maxAzimuthAngle = 1.45;
controls.minDistance = 4.5;
controls.maxDistance = 13;

// MARK: Materials, one per name so every model shares the room's palette

const palette = {
  wood: '#b97a48', woodDark: '#7a4f30', _defaultMat: '#d9bf98', metalDark: '#4b4038', metal: '#b9aa92',
  carpet: '#b5483e', carpetDarker: '#7c3a34', carpetWhite: '#efe2cc', lamp: '#ffe2a6', plant: '#4f8a4c',
  leafsGreen: '#3f7a54', leafsDark: '#2c5a45', leafsFall: '#b86b32', woodBark: '#6e4a33', woodBarkDark: '#4c3426',
  woodInner: '#d9a874', grass: '#2f5a3a', stone: '#8a8378', Marble: '#8c7d6c'
};
const shared = {};
function harmonize(material) {
  const name = material.name || '';
  if (name === 'glass') {
    const glass = material.clone();
    glass.transparent = true; glass.opacity = 0.18; glass.color.set('#b8d4e8'); glass.depthWrite = false;
    glass.metalness = 0; glass.roughness = 0.1;
    return glass;
  }
  if (material.map) { material.metalness = 0.05; material.roughness = 0.75; return material; }
  if (shared[name]) return shared[name];
  const m = new THREE.MeshStandardMaterial({ color: palette[name] || material.color, roughness: 0.9, metalness: 0 });
  m.name = name;
  shared[name] = m;
  return m;
}

const loader = new GLTFLoader();
const cache = {};
function model(name) {
  if (!cache[name]) {
    cache[name] = loader.loadAsync('models/' + name + '.glb').then(gltf => {
      gltf.scene.traverse(o => {
        if (o.isMesh) {
          o.material = Array.isArray(o.material) ? o.material.map(harmonize) : harmonize(o.material);
          o.castShadow = true; o.receiveShadow = true;
        }
      });
      return gltf.scene;
    });
  }
  return cache[name].then(s => s.clone(true));
}

// A model in a group of its own, scaled to a size and standing on the floor with its middle at the group's origin.
function fit(object, { height, width }) {
  const box = new THREE.Box3().setFromObject(object), size = box.getSize(new THREE.Vector3());
  const s = height ? height / size.y : width / Math.max(size.x, size.z);
  object.scale.multiplyScalar(s);
  const fitted = new THREE.Box3().setFromObject(object), center = fitted.getCenter(new THREE.Vector3());
  object.position.x -= center.x; object.position.z -= center.z; object.position.y -= fitted.min.y;
  const group = new THREE.Group();
  group.add(object);
  group.userData.size = fitted.getSize(new THREE.Vector3());
  return group;
}

function place(group, x, y, z, turn) {
  group.position.set(x, y, z);
  group.rotation.y = turn || 0;
  stages.room.add(group);
  return group;
}

function tag(group, spot) {
  group.traverse(o => { o.userData.spot = spot; });
  return group;
}

// MARK: Light

const hemi = new THREE.HemisphereLight('#7f8fbf', '#3a2a1c', 1.3);
scene.add(hemi);
const warmFill = new THREE.PointLight('#ffcf9a', 1.4, 9, 1.2);
warmFill.position.set(0.8, 2.6, 0.8);
scene.add(warmFill);
const moon = new THREE.DirectionalLight('#8fa6d8', 1.1);
moon.position.set(-6, 8, -5);
scene.add(moon);

const lampLight = new THREE.PointLight('#ffb35c', 3.2, 7, 1.6);
lampLight.castShadow = true;
lampLight.shadow.mapSize.set(512, 512);
lampLight.shadow.bias = -0.004;
lampLight.shadow.radius = 4;
scene.add(lampLight);

const fireLight = new THREE.PointLight('#ff7a2e', 0, 6, 1.6);
scene.add(fireLight);

// How each place is lit, and where the camera looks from. `dir` is in the place's own turned coordinates for outdoors.
const moods = {
  room: { fog: ['#0b1016', 3, 15], exposure: 1.25, hemi: ['#7f8fbf', '#3a2a1c', 1.3], fill: 1.4,
    sun: ['#8fa6d8', 1.1, [-6, 8, -5]], look: [-0.3, 0.35, -0.5], dir: [0.62, 0.48, 0.62], back: 1, polar: [0.55, 1.25], background: NIGHT },
  beach: { fog: ['#ffb46b', 16, 42], exposure: 1.0, hemi: ['#ffd6b8', '#c08a6a', 1.7], fill: 0,
    sun: ['#ffb37a', 2.3, [0.6, 2.4, -12]], shadow: true, look: [0, 1.25, -1], dir: [0, 0.14, 1], back: 1.32, polar: [0.9, 1.5] },
  forest: { fog: ['#d8dfae', 9, 34], exposure: 1.05, hemi: ['#f4f0c8', '#51703c', 2.0], fill: 0,
    sun: ['#fff0c8', 2.1, [-4.5, 10, -8]], shadow: true, look: [0, 1.25, -1.2], dir: [0, 0.2, 1], back: 1.28, polar: [0.9, 1.5] },
  lake: { fog: ['#26335c', 14, 44], exposure: 1.15, hemi: ['#7488c8', '#2a3648', 2.4], fill: 0,
    sun: ['#b4c5f4', 1.8, [-3, 6, -9]], shadow: true, look: [0, 1.1, -0.8], dir: [0, 0.15, 1], back: 1.28, polar: [0.9, 1.5] }
};

// MARK: The room

const anchors = {};        // where each touchable thing's chip sits, in the room
const parts = {};          // the moving parts: the window's pane, the lamp's shade
const CHAIR_WINDOW = { x: -1.1, z: 0.5, turn: -Math.PI / 2 };    // facing the window
const CHAIR_FIRE = { x: 0.05, z: -0.62, turn: Math.PI + 0.25 };    // facing the fireplace
// Each place: its group, where its chips sit, the chair's way through it, its fire, and what counts as its floor.
const sets = { room: { group: stages.room, anchors, path: { from: CHAIR_WINDOW, to: CHAIR_FIRE },
  floor: (p, h) => Math.abs(p.y - 0.05) < 0.08 && Math.abs(p.x) < 2 && Math.abs(p.z) < 2 } };
const moteTexture = new THREE.TextureLoader().load('textures/circle_05.png');
let current = 'room';

// An invisible roof at the walls' height: drawn after the room and before the rain, it hides every raindrop seen
// through the open top of the room, so the rain behind the house never streaks across the inside walls and floor.
function buildShelter() {
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(4.1, 4.1),
    new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true, transparent: true, side: THREE.DoubleSide }));
  roof.rotation.x = -Math.PI / 2;
  roof.position.set(-0.03, 1.29, -0.03);
  roof.renderOrder = 1;
  roof.raycast = () => {};
  stages.room.add(roof);
}

async function buildRoom() {
  buildShelter();
  // Floor, four by four.
  for (let i = -2; i < 2; i++) for (let j = -2; j < 2; j++) {
    model('floorFull').then(f => place(f, i, 0, j + 1));
  }
  // The back wall.
  for (let i = -2; i < 2; i++) model('wall').then(w => place(w, i, 0, -2));
  // The left wall, the window in its second section.
  for (const z of [2, 1, 0, -1]) {
    if (z === 1) continue;
    model('wall').then(w => place(w, -2, 0, z, Math.PI / 2));
  }
  const windowWall = await model('wallWindowSlide');
  place(windowWall, -2, 0, 1, Math.PI / 2);
  tag(windowWall, 'window');
  parts.pane = windowWall.getObjectByName('windowBottom');
  parts.paneY = parts.pane ? parts.pane.position.y : 0;
  anchors.window = new THREE.Vector3(-1.95, 1.18, 0.5);

  // Rugs.
  model('rugRound').then(r => { const g = fit(r, { width: 1.6 }); place(g, -0.45, 0.05, -0.2); });

  // The fireplace, against the back wall.
  const fireplace = fit(await model('fireplace'), { width: 1.25 });
  place(fireplace, 0.15, 0.05, -2 + fireplace.userData.size.z / 2 + 0.02);
  tag(fireplace, 'fire');
  parts.fireplace = fireplace;
  const fs = fireplace.userData.size;
  parts.hearth = new THREE.Vector3(0.15, 0.05 + fs.y * 0.27, -2 + fs.z * 0.55);
  anchors.fire = new THREE.Vector3(0.15, fs.y + 0.18, -1.85 + fs.z / 2);

  // Logs in the hearth, and a stack beside it, from the Nature Kit.
  model('log').then(l => { const g = fit(l, { width: 0.42 }); place(g, 0.08, parts.hearth.y, parts.hearth.z, Math.PI / 2 + 0.2); tag(g, 'fire'); });
  model('log').then(l => { const g = fit(l, { width: 0.38 }); place(g, 0.22, parts.hearth.y + 0.04, parts.hearth.z + 0.04, Math.PI / 2 - 0.35); tag(g, 'fire'); });
  model('log_stack').then(l => { const g = fit(l, { width: 0.5 }); place(g, -0.78, 0.05, -1.72, Math.PI / 2); });

  // The grandfather clock in the corner by the fire.
  const clock = fit(await model('grandfather-clock'), { height: 1.2 });
  place(clock, 1.35, 0.05, -2 + clock.userData.size.z / 2 + 0.03);
  tag(clock, 'clock');
  parts.clock = clock;
  anchors.clock = new THREE.Vector3(1.35, 1.36, -1.8);

  // A bookcase and a plant.
  model('bookcaseOpen').then(b => { const g = fit(b, { height: 0.95 }); place(g, -1.55, 0.05, -1.86); });
  model('books').then(b => { const g = fit(b, { width: 0.2 }); place(g, -1.55, 0.98, -1.85); });
  model('pottedPlant').then(p => { const g = fit(p, { height: 0.55 }); place(g, -1.75, 0.05, 1.7); });

  // The side table with its lamp, against the left wall.
  model('sideTable').then(t => { const g = fit(t, { height: 0.38 }); place(g, -1.72, 0.05, -0.55, Math.PI / 2); });
  const lamp = fit(await model('lampRoundTable'), { height: 0.34 });
  place(lamp, -1.72, 0.43, -0.55);
  tag(lamp, 'lamp');
  lamp.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = false;
    if (o.material.name === 'lamp') { o.material = o.material.clone(); parts.shade = o.material; }
  });
  lampLight.position.set(-1.68, 0.68, -0.5);
  anchors.lamp = new THREE.Vector3(-1.72, 0.98, -0.55);

  // The armchair: you. It slides between the window and the fire.
  const chair = fit(await model('loungeChair'), { height: 0.5 });
  const chairGroup = place(chair, CHAIR_WINDOW.x, 0.05, CHAIR_WINDOW.z, CHAIR_WINDOW.turn);
  model('pillow').then(p => { const g = fit(p, { width: 0.2 }); g.position.set(0, 0.2, 0.12); g.rotation.x = -0.4; chairGroup.add(g); tag(chairGroup, 'chair'); });
  tag(chairGroup, 'chair');
  sets.room.chair = chairGroup;
  anchors.chair = new THREE.Vector3();
  sets.room.hearth = parts.hearth;
}

// MARK: Outside: an island of grass, trees and rocks in the night

function buildOutside() {
  const ground = new THREE.Mesh(new THREE.CircleGeometry(9, 48), new THREE.MeshStandardMaterial({ color: '#24402c', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.005;
  ground.receiveShadow = true;
  stages.room.add(ground);
  const trees = [
    ['tree_pineTallA_detailed', -3.9, -3.3, 1.9], ['tree_oak', -4.1, 1.3, 1.6], ['tree_default', -1.2, -4.0, 1.6],
    ['tree_pineTallB_detailed', 1.4, -4.3, 2.0], ['tree_fat', -5.2, -1.2, 1.7], ['tree_detailed', 3.6, -3.6, 1.6],
    ['tree_pineRoundC', -3.4, 3.6, 1.5], ['tree_pineTallA_detailed', -6.0, -4.4, 2.3], ['tree_oak', 0.4, -6.2, 2.1],
    ['tree_default', -6.4, 2.2, 2.0], ['tree_pineTallB_detailed', 4.6, -5.6, 2.2], ['tree_pineRoundC', 3.6, -1.4, 1.3]
  ];
  trees.forEach(([name, x, z, s], i) => model(name).then(t => { t.scale.setScalar(s); place(t, x, 0, z, i * 1.7); }));
  [['plant_bushLarge', -2.6, -0.6, 1.6], ['plant_bush', -2.5, 2.2, 1.6], ['rock_largeA', -3.0, -2.6, 1.2], ['stump_round', 2.6, -2.7, 1.6],
   ['grass_large', -2.4, 0.4, 2], ['grass_large', 0.8, -2.5, 2], ['flower_yellowA', -2.5, 1.4, 2], ['mushroom_redGroup', -2.4, -1.8, 2],
   ['log_large', -3.8, -1.4, 1.4]].forEach(([name, x, z, s], i) => model(name).then(t => { t.scale.setScalar(s); place(t, x, 0, z, i * 2.1); }));
}

const shown = { pane: 0, chair: 0, lamp: 1, fire: 0, clock: 0 };
const tmp = new THREE.Vector3();

// MARK: Framing: the whole room in view at any shape of screen

const SCENERY = 66;        // from the middle of a place out past its sky and water, with a margin

function resize() {
  const w = window.innerWidth, h = window.innerHeight, aspect = w / h;
  renderer.setSize(w, h, false);
  camera.aspect = aspect;
  // A narrow screen needs the camera further back to keep the room's width in view.
  camera.fov = aspect >= 1 ? 34 : 40;
  // Far enough back that the room's width (about 6.4 across) fits the screen's width.
  const halfWidth = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect);
  const mood = moods[current];
  const distance = Math.max(7.4, 3.0 / Math.tan(halfWidth)) * mood.back;
  // Fog is measured from the camera, so a place keeps its look however far back a narrow screen puts it.
  const fogFrom = current === 'room' ? distance : distance - 7.4 * mood.back;
  scene.fog.near = fogFrom + mood.fog[1];
  scene.fog.far = fogFrom + mood.fog[2];
  // The sky and the far water stay in view from as far back as the camera can go.
  const reach = Math.max(13, distance + 3);
  camera.far = reach + SCENERY;
  camera.updateProjectionMatrix();
  const dir = camera.position.clone().sub(controls.target);
  if (dir.lengthSq() < 0.01) dir.copy(sets[current].group.localToWorld(tmp.fromArray(mood.dir))).sub(sets[current].group.position);
  dir.setLength(distance);
  camera.position.copy(controls.target).add(dir);
  controls.maxDistance = reach;
}
window.addEventListener('resize', resize);

// MARK: Going to a place

function show(id) {
  stages[current].visible = false;
  current = id;
  const mood = moods[id], set = sets[id], group = set.group;
  group.visible = true;
  group.updateMatrixWorld(true);
  scene.background = mood.background || null;
  scene.fog.color.set(mood.fog[0]);
  renderer.toneMappingExposure = mood.exposure;
  hemi.color.set(mood.hemi[0]);
  hemi.groundColor.set(mood.hemi[1]);
  warmFill.intensity = mood.fill;
  lampLight.visible = id === 'room';
  moon.color.set(mood.sun[0]);
  moon.position.copy(group.localToWorld(tmp.fromArray(mood.sun[2])));
  moon.castShadow = !!mood.shadow;
  controls.minPolarAngle = mood.polar[0];
  controls.maxPolarAngle = mood.polar[1];
  controls.target.copy(group.localToWorld(tmp.fromArray(mood.look)));
  camera.position.copy(controls.target);
  resize();
  shown.chair = window.HouseApp ? window.HouseApp.view().chair : shown.chair;
  shown.fire = window.HouseApp && window.HouseApp.view().fire ? 1 : 0;
  if (weather) weather.moveTo(hearthOf(set), id !== 'room');
}

function hearthOf(set) {
  return set.hearth ? set.group.localToWorld(set.hearth.clone()) : new THREE.Vector3();
}

const veil = document.getElementById('fade');
let going = null, goTimer = null;
function goTo(id) {
  going = id;
  veil.classList.add('on');
  document.body.classList.add('moving');
  clearTimeout(goTimer);
  goTimer = setTimeout(() => {
    show(id);
    veil.classList.remove('on');
    document.body.classList.remove('moving');
  }, 520);
}

// MARK: Touching things

const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
let down = null;
function hit(event) {
  const r = canvas.getBoundingClientRect();
  pointer.set(((event.clientX - r.left) / r.width) * 2 - 1, -((event.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(stages[current], true);
  for (const h of hits) {
    if (!h.object.visible || (h.object.material && h.object.material.depthWrite === false && h.object.userData.spot !== 'window')) continue;
    return { spot: h.object.userData.spot || null, point: h.point, ground: h.object.userData.ground };
  }
  return null;
}
let lastPointer = null;
canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; lastPointer = down; });
canvas.addEventListener('click', e => {
  // On the way to another place the old one is still on screen: a touch here would land in the new one.
  if (!window.HouseApp || window.HouseApp.view().place !== current) return;
  // A click made by software may come without a place: then it's where the pointer last went down.
  const at = (e.clientX || e.clientY || !lastPointer) ? { clientX: e.clientX, clientY: e.clientY } : { clientX: lastPointer.x, clientY: lastPointer.y };
  const dragged = down && Math.hypot(at.clientX - down.x, at.clientY - down.y) > 6;
  down = null;
  if (dragged) return;
  const h = hit(at);
  if (!h || !window.HouseApp) return;
  if (h.spot) { window.HouseApp.touch(h.spot); return; }
  // The floor: the chair slides to the nearest place on its way.
  const set = sets[current], point = set.group.worldToLocal(h.point.clone());
  if (set.floor(point, h)) window.HouseApp.touch('chair-to', chairPathT(point, set.path));
});
canvas.addEventListener('pointermove', e => {
  if (e.buttons) return;
  const h = hit(e);
  canvas.classList.toggle('pointing', !!(h && h.spot));
});

function chairPathT(p, path) {
  const ax = path.from.x, az = path.from.z, bx = path.to.x - ax, bz = path.to.z - az;
  return Math.max(0, Math.min(1, ((p.x - ax) * bx + (p.z - az) * bz) / (bx * bx + bz * bz)));
}

// MARK: Each frame: move toward what's on

let weather = null, last = performance.now();
const ease = (from, to, rate, dt) => from + (to - from) * (1 - Math.exp(-rate * dt));
function lerpAngle(a, b, t) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * t; }

function placeSpots() {
  const spots = document.querySelectorAll('[data-spot]');
  const w = window.innerWidth, h = window.innerHeight;
  for (let i = 0; i < spots.length; i++) {
    const el = spots[i], a = sets[current].anchors[el.getAttribute('data-spot')];
    if (!a) { el.classList.add('hidden'); continue; }
    sets[current].group.localToWorld(tmp.copy(a)).project(camera);
    const x = (tmp.x + 1) / 2 * w, y = (1 - tmp.y) / 2 * h;
    el.classList.toggle('hidden', tmp.z > 1);
    const half = el.offsetWidth / 2 + 6;
    const cx = Math.max(half, Math.min(w - half, x));
    el.style.transform = 'translate(' + Math.round(cx) + 'px,' + Math.round(y) + 'px) translate(-50%, -100%)';
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000), t = now / 1000;
  last = now;
  const view = window.HouseApp ? window.HouseApp.view() : { place: 'room', window: 0, chair: 0, lamp: true, fire: true, clock: true, rain: true, dim: 0 };
  if (view.place !== going) goTo(view.place);
  const set = sets[current], mood = moods[current];

  shown.pane = ease(shown.pane, view.window, 3, dt);
  shown.chair = ease(shown.chair, view.chair, 2.5, dt);
  shown.lamp = ease(shown.lamp, view.lamp ? 1 - (view.dim || 0) * 0.85 : 0, 5, dt);
  shown.fire = ease(shown.fire, view.fire ? 1 : 0, 1.6, dt);

  if (parts.pane) parts.pane.position.y = parts.paneY + shown.pane * 0.3;
  if (set.chair) {
    const c = shown.chair, { from, to } = set.path;
    set.chair.position.set(from.x + (to.x - from.x) * c, 0.05, from.z + (to.z - from.z) * c);
    set.chair.rotation.y = lerpAngle(from.turn, to.turn, c);
    set.anchors.chair.set(set.chair.position.x, current === 'room' ? 0.72 : 0.6, set.chair.position.z);
  }
  lampLight.intensity = 3.2 * shown.lamp;
  if (parts.shade) parts.shade.emissive.set('#ffb35c').multiplyScalar(0.9 * shown.lamp);

  const flicker = 0.75 + 0.15 * Math.sin(t * 11.3) + 0.1 * Math.sin(t * 23.7 + 1.3) + 0.06 * Math.sin(t * 5.1);
  fireLight.intensity = 4.2 * shown.fire * flicker;
  if (set.hearth) {
    set.group.localToWorld(fireLight.position.copy(set.hearth));
    fireLight.position.y = 0.45;
    if (current === 'room') fireLight.position.z += 0.35;
  }

  // The sleep timer's dusk: outdoors, the whole place darkens with it.
  const dusk = current === 'room' ? 1 : 1 - (view.dim || 0) * 0.7;
  hemi.intensity = mood.hemi[2] * dusk;
  moon.intensity = mood.sun[1] * dusk;
  if (set.update) set.update(t, dt, view, scene.fog);

  if (weather) weather.update(dt, t, { rain: view.rain, fire: shown.fire, window: shown.pane });

  controls.update();
  renderer.render(scene, camera);
  placeSpots();
}

Object.assign(sets, buildPlaces({ model, fit, tag, stages, textures: { mote: moteTexture } }));
going = window.HouseApp ? window.HouseApp.view().place : 'room';
show(going);
buildOutside();
buildRoom().then(() => {
  console.log('The Little House is built.');
  return import('./weather.js').then(m => {
    weather = new m.Weather(scene, { hearth: hearthOf(sets[current]) });
    weather.moveTo(hearthOf(sets[current]), current !== 'room');
  }, e => console.error('weather', e));
}, error => console.error('The room couldn’t be built:', error));
requestAnimationFrame(frame);

window.HouseScene = { ready: true };
