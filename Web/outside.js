/* The places outdoors, drawn with three.js. The trees, rocks and logs are the same Kenney models as around the house;
 * the sky, the water, the palms, the tent and the chimes are made here. Each place stands in its own group, turned so
 * its own -z runs straight away from the camera: the horizon is at -z, you look at it from +z. Coordinates below are
 * in that group.
 */
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const standard = (color, more) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...more });
function shadowed(mesh) { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }
function inert(object) { object.raycast = () => {}; return object; }
// The same trees and rocks every time, not a new forest each opening.
function seeded(seed) {
  return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// MARK: The sky: a dome with the sun or moon in it, and stars at night

function sky(group, { top, mid, horizon, sun, sunDir, sunSize, glow, stars }) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color(top) }, mid: { value: new THREE.Color(mid) }, horizon: { value: new THREE.Color(horizon) },
      sunColor: { value: new THREE.Color(sun) }, sunDir: { value: sunDir.clone().normalize() },
      sunSize: { value: sunSize }, glow: { value: glow }, stars: { value: stars || 0 }
    },
    vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      varying vec3 vDir;
      uniform vec3 top, mid, horizon, sunColor, sunDir;
      uniform float sunSize, glow, stars;
      void main() {
        vec3 d = normalize(vDir);
        float h = max(d.y, 0.0);
        vec3 c = mix(horizon, mid, smoothstep(0.0, 0.16, h));
        c = mix(c, top, smoothstep(0.1, 0.62, h));
        float a = max(dot(d, sunDir), 0.0);
        c += sunColor * (smoothstep(sunSize, sunSize + 0.0004, a) * 2.0 + glow * pow(a, 90.0) + glow * 0.35 * pow(a, 12.0));
        if (stars > 0.0) {
          vec3 cell = floor(d * 520.0);
          float r = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
          c += vec3(0.85, 0.9, 1.0) * step(0.9965, r) * smoothstep(0.02, 0.2, d.y) * stars * (0.4 + 0.6 * fract(r * 91.7));
        }
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  group.add(inert(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 20), material)));
}

// MARK: Water: the sea and the lake, one plane that draws its own shoreline, foam and path of light

function water(group, { shore, swing, foam, wet, shallow, deep, horizon, glint, glintX, glintLean }) {
  const uniforms = {
    t: { value: 0 }, shore: { value: shore }, swing: { value: swing }, foam: { value: foam }, wet: { value: wet },
    shallow: { value: new THREE.Color(shallow) }, deep: { value: new THREE.Color(deep) }, horizon: { value: new THREE.Color(horizon) },
    glint: { value: new THREE.Color(glint) }, glintX: { value: glintX }, glintLean: { value: glintLean }
  };
  const material = new THREE.ShaderMaterial({
    transparent: true, fog: false, uniforms,
    vertexShader: `varying vec3 vP; void main() { vP = vec3(position.x, position.z, 0.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      varying vec3 vP;
      uniform float t, shore, swing, foam, wet, glintX, glintLean;
      uniform vec3 shallow, deep, horizon, glint;
      void main() {
        float x = vP.x, z = vP.y;
        float edge = shore + swing * (0.6 * sin(t * 0.32) + 0.3 * sin(x * 0.37 + t * 0.21) + 0.14 * sin(x * 1.13 - t * 0.47));
        float d = edge - z;
        if (d < -wet) discard;
        if (d < 0.0) { gl_FragColor = vec4(0.16, 0.1, 0.07, 0.32 * (1.0 + d / wet)); return; }
        vec3 c = mix(shallow, deep, smoothstep(0.0, 8.0, d));
        float roll = sin(d * 2.4 - t * 0.9 + sin(x * 0.5) * 0.7);
        c += (foam * 0.35 + 0.05) * deep * smoothstep(0.75, 1.0, roll) * (1.0 - smoothstep(4.0, 16.0, d));
        float width = 0.7 + d * 0.11;
        float band = exp(-pow((x - glintX - glintLean * d) / width, 2.0));
        float shimmer = 0.5 + 0.5 * sin(x * 7.0 + t * 1.7 + sin(z * 2.3 + t) * 2.0) * sin(z * 5.0 - t * 1.3);
        c += glint * band * pow(shimmer, 3.0) * 1.6;
        float rim = smoothstep(0.26, 0.0, d + 0.07 * sin(x * 5.0 + t * 0.8) + 0.05 * sin(x * 13.0 - t));
        float lace = smoothstep(0.5, 0.95, 0.5 + 0.5 * sin(x * 3.1 + z * 4.0 + t * 0.6)) * (1.0 - smoothstep(0.2, 1.3, d));
        c = mix(c, vec3(1.0, 0.97, 0.92), foam * max(rim, lace * 0.5));
        c = mix(c, horizon, smoothstep(9.0, 44.0, d));
        gl_FragColor = vec4(c, smoothstep(0.0, 0.05, d));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const geometry = new THREE.PlaneGeometry(130, 58);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 0.03, shore - 26 + 2);
  const plane = new THREE.Mesh(geometry, material);
  group.add(inert(plane));
  return uniforms;
}

// MARK: Things made here

function frond(length, width, material) {
  const n = 7, positions = [], index = [];
  for (let s = 0; s <= n; s++) {
    const u = s / n, x = length * u, y = 0.32 * length * Math.sin(u * 1.5) - 0.8 * length * u * u;
    const w = width * Math.sin(Math.PI * Math.min(u * 1.1 + 0.06, 1));
    positions.push(x, y - 0.04 * w, w, x, y + 0.05, 0, x, y - 0.04 * w, -w);
    if (s < n) for (let k = 0; k < 2; k++) { const a = s * 3 + k, b = a + 1, c = a + 3, e = a + 4; index.push(a, b, c, b, e, c); }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return shadowed(new THREE.Mesh(geometry, material));
}

const palmLeaf = standard('#3f7f4d', { side: THREE.DoubleSide, flatShading: true }), palmLeafPale = standard('#5a9a55', { side: THREE.DoubleSide, flatShading: true });
const palmBark = standard('#8a6a4a', { flatShading: true }), coconut = standard('#4c3426');
function palm(height, lean) {
  const g = new THREE.Group();
  const curve = new THREE.QuadraticBezierCurve3(V(0, 0, 0), V(lean * 0.15, height * 0.62, 0), V(lean, height, 0));
  g.add(shadowed(new THREE.Mesh(new THREE.TubeGeometry(curve, 9, height * 0.024, 6, false), palmBark)));
  const crown = curve.getPoint(1), fronds = 9;
  for (let i = 0; i < fronds; i++) {
    const f = frond(height * (0.42 + (i % 3) * 0.05), height * 0.055, i % 2 ? palmLeaf : palmLeafPale);
    f.position.copy(crown);
    f.rotation.y = (i / fronds) * Math.PI * 2 + 0.3;
    g.add(f);
  }
  for (let i = 0; i < 3; i++) {
    const nut = shadowed(new THREE.Mesh(new THREE.IcosahedronGeometry(height * 0.022, 1), coconut));
    nut.position.set(crown.x + Math.cos(i * 2.1) * height * 0.03, crown.y - height * 0.025, Math.sin(i * 2.1) * height * 0.03);
    g.add(nut);
  }
  return g;
}

function dunes(color, { size, seed, height, clear, shore }) {
  const geometry = new THREE.PlaneGeometry(size, size, 90, 90);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = -p.getY(i);
    const away = Math.max(0, Math.hypot(x / clear.x, (z - clear.z) / clear.depth) - 1);
    const roll = 0.5 + 0.5 * Math.sin(x * 0.31 + seed) * Math.cos(z * 0.27 + seed * 2) + 0.2 * Math.sin(x * 0.73 + z * 0.51);
    // Toward the water the land stays flat and goes under; everywhere else it rolls away from the clearing.
    const land = shore === undefined ? 1 : THREE.MathUtils.smoothstep(z, shore, shore + 5);
    const under = shore === undefined ? 0 : 1 - THREE.MathUtils.smoothstep(z, shore - 3, shore - 1);
    p.setZ(i, land * Math.min(1, away * 0.6) * roll * height - under * 0.6);
  }
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, standard(color, { roughness: 1 }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  mesh.userData.ground = true;
  return mesh;
}

function stoneRing(group, at, spot) {
  const stone = standard('#7d766b', { flatShading: true }), random = seeded(7), n = 9;
  for (let i = 0; i < n; i++) {
    const s = shadowed(new THREE.Mesh(new THREE.IcosahedronGeometry(0.07 + random() * 0.035, 0), stone));
    s.position.set(at.x + Math.cos((i / n) * 6.283) * 0.3, 0.05, at.z + Math.sin((i / n) * 6.283) * 0.3);
    s.rotation.set(random() * 3, random() * 3, 0);
    s.userData.spot = spot;
    group.add(s);
  }
}

function motes(group, texture, { count, box, color, size, seed }) {
  const random = seeded(seed), home = new Float32Array(count * 3), positions = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i += 3) {
    home[i] = box.x[0] + random() * (box.x[1] - box.x[0]);
    home[i + 1] = box.y[0] + random() * (box.y[1] - box.y[0]);
    home[i + 2] = box.z[0] + random() * (box.z[1] - box.z[0]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ map: texture, color, size, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const points = inert(new THREE.Points(geometry, material));
  points.frustumCulled = false;
  group.add(points);
  return t => {
    for (let i = 0; i < count; i++) {
      const j = i * 3, f = t * 0.25 + i * 1.7;
      positions[j] = home[j] + Math.sin(f) * 0.35;
      positions[j + 1] = home[j + 1] + Math.sin(f * 0.7 + i) * 0.22;
      positions[j + 2] = home[j + 2] + Math.cos(f * 0.8) * 0.35;
    }
    material.opacity = 0.65 + 0.3 * Math.sin(t * 0.9);
    geometry.attributes.position.needsUpdate = true;
  };
}

function chimes(group, x, z) {
  const post = standard('#7a5a3e'), metal = standard('#e2d8c4', { metalness: 0.6, roughness: 0.35 });
  const stand = new THREE.Group();
  stand.add(shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 1.45, 6), post)));
  stand.children[0].position.y = 0.72;
  const arm = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.5, 6), post));
  arm.rotation.z = Math.PI / 2;
  arm.position.set(0.22, 1.36, 0);
  stand.add(arm);
  const hanging = new THREE.Group();
  hanging.position.set(0.38, 1.34, 0);
  const disc = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.018, 12), post));
  disc.position.y = -0.1;
  hanging.add(disc);
  const tubes = [];
  for (let i = 0; i < 6; i++) {
    const length = 0.22 + i * 0.03;
    const pivot = new THREE.Group();
    pivot.position.set(Math.cos(i * 1.047) * 0.075, -0.11, Math.sin(i * 1.047) * 0.075);
    const tube = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, length, 6), metal));
    tube.position.y = -0.06 - length / 2;
    pivot.add(tube);
    hanging.add(pivot);
    tubes.push(pivot);
  }
  stand.add(hanging);
  stand.position.set(x, 0, z);
  stand.traverse(o => { o.userData.spot = 'chimes'; });
  group.add(stand);
  let swing = 0;
  return (t, dt, on) => {
    swing += ((on ? 1 : 0.12) - swing) * (1 - Math.exp(-2 * dt));
    tubes.forEach((pivot, i) => {
      pivot.rotation.z = Math.sin(t * 2.1 + i * 1.3) * 0.13 * swing;
      pivot.rotation.x = Math.cos(t * 1.7 + i * 2.1) * 0.1 * swing;
    });
    hanging.rotation.z = Math.sin(t * 0.9) * 0.05 * swing;
  };
}

function tent(group, x, z, turn) {
  const g = new THREE.Group();
  const cloth = shadowed(new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.15, 4, 1), standard('#c7713f', { flatShading: true })));
  cloth.position.y = 0.575;
  cloth.rotation.y = Math.PI / 4;
  cloth.scale.set(1.1, 1, 1.4);
  g.add(cloth);
  const shape = new THREE.Shape();
  shape.moveTo(-0.28, 0); shape.lineTo(0, 0.75); shape.lineTo(0.28, 0); shape.closePath();
  const door = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: '#2a1a10', emissive: '#ffb060', emissiveIntensity: 0.28 }));
  door.position.set(0, 0.01, 0.91);
  door.rotation.x = -0.38;
  g.add(door);
  g.position.set(x, 0, z);
  g.rotation.y = turn;
  group.add(g);
}

function mountains(group, list, color) {
  const material = standard(color, { flatShading: true, fog: true });
  list.forEach(([x, z, r, h]) => {
    const m = inert(new THREE.Mesh(new THREE.ConeGeometry(r, h, 7, 1), material));
    m.position.set(x, h / 2 - 0.2, z);
    m.rotation.y = x;
    group.add(m);
  });
}

function bank(z0) {
  // The middle of the stream at a place along the valley.
  return x => z0 + Math.sin(x * 0.2 + 0.9) * 1.1 + x * 0.3;
}

// MARK: Each place

export function buildPlaces({ model, fit, tag, stages, textures }) {
  const sets = {};
  const put = (group, name, x, y, z, s, turn, spot) => model(name).then(o => {
    if (s) o.scale.setScalar(s);
    o.position.set(x, y, z);
    o.rotation.y = turn || 0;
    if (spot) tag(o, spot);
    group.add(o);
    return o;
  });
  const fallen = (group, x, z, width, turn) => model('log').then(l => {
    const g = fit(l, { width });
    g.position.set(x, 0, z);
    g.rotation.y = turn;
    group.add(g);
  });
  async function seat(set, group) {
    const chair = fit(await model('loungeChair'), { height: 0.5 });
    group.add(chair);
    model('pillow').then(p => { const g = fit(p, { width: 0.2 }); g.position.set(0, 0.2, 0.12); g.rotation.x = -0.4; chair.add(g); tag(chair, 'chair'); });
    tag(chair, 'chair');
    set.chair = chair;
  }
  const flames = (group, at) => {
    stoneRing(group, at, 'fire');
    model('log').then(l => { const g = fit(l, { width: 0.42 }); g.position.set(at.x - 0.02, 0.05, at.z); g.rotation.y = 0.5; tag(g, 'fire'); group.add(g); });
    model('log').then(l => { const g = fit(l, { width: 0.4 }); g.position.set(at.x + 0.02, 0.09, at.z + 0.02); g.rotation.y = 2.1; tag(g, 'fire'); group.add(g); });
  };

  // The beach at sunset: the sun straight ahead over the water.
  {
    const group = stages.beach, set = sets.beach = {
      group, anchors: { fire: V(2.25, 0.58, 0.75), chimes: V(-2.1, 1.72, -0.05), chair: V() },
      path: { from: { x: -0.2, z: 2.6, turn: Math.PI + 0.1 }, to: { x: 0.2, z: -1.3, turn: Math.PI - 0.1 } },
      hearth: V(2.25, 0.08, 0.75), floor: (p, h) => h.ground && Math.abs(p.x) < 7 && Math.abs(p.z) < 7
    };
    const sunDir = V(0.03, 0.075, -1);
    sky(group, { top: '#35407f', mid: '#d9708a', horizon: '#ffb46b', sun: '#ffd9a0', sunDir, sunSize: 0.9994, glow: 0.42 });
    const uniforms = water(group, { shore: -3.1, swing: 0.7, foam: 1, wet: 1.15, shallow: '#4fa59f', deep: '#1f5170', horizon: '#ffb46b', glint: '#ffc47a', glintX: 0.45, glintLean: 0.03 });
    group.add(dunes('#e6bd8a', { size: 90, seed: 1.3, height: 2.6, clear: { x: 8, z: 2, depth: 8 }, shore: -4.3 }));
    [[-4.5, -1.5, 3.7, 0.7], [-5.7, 0.3, 4.4, 1.0], [-3.6, 1.2, 2.7, 0.45], [4.7, -1.8, 3.9, -0.8], [6.4, -0.6, 4.6, -1.0]].forEach(([x, z, h, lean]) => {
      const p = palm(h, lean);
      p.position.set(x, 0, z);
      group.add(p);
    });
    [['rock_largeA', 5.2, -3.8, 2.4, 0.4], ['rock_largeA', 6.9, -4.6, 3.2, 2.1], ['rock_largeA', 3.8, -4.4, 1.3, 1.4], ['rock_largeA', -7.5, -3.5, 2.8, 3.1]]
      .forEach(([name, x, z, s, turn]) => put(group, name, x, -0.1, z, s, turn));
    fallen(group, -1.5, 1.3, 1.5, 0.7);
    put(group, 'stump_round', 3.3, 0, 0.1, 1.1, 0.4);
    flames(group, set.hearth);
    seat(set, group);
    const sway = chimes(group, -2.35, -0.05);
    set.update = (t, dt, view) => { uniforms.t.value = t; sway(t, dt, view.chimes); };
  }

  // The forest in the morning: a clearing, a stream across it, the sun through the trees.
  {
    const group = stages.forest, line = bank(-3.4), random = seeded(41), set = sets.forest = {
      group, anchors: { fire: V(2.3, 0.58, 0.7), birds: V(-3.0, 3.1, -1.9), chair: V() },
      path: { from: { x: -0.4, z: 1.9, turn: Math.PI + 0.15 }, to: { x: -0.5, z: -1.75, turn: Math.PI - 0.05 } },
      hearth: V(2.3, 0.08, 0.7), floor: (p, h) => h.ground && Math.abs(p.x) < 7 && Math.abs(p.z) < 7
    };
    const stream = [];
    for (let x = -30; x <= 30; x += 1.5) stream.push(V(x, 0.035, line(x)));
    const curve = new THREE.CatmullRomCurve3(stream), n = 160, positions = [], uvs = [], index = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, p = curve.getPoint(u), tangent = curve.getTangent(u), side = V(-tangent.z, 0, tangent.x), w = 0.72 + 0.14 * Math.sin(u * 40);
      positions.push(p.x + side.x * w, p.y, p.z + side.z * w, p.x - side.x * w, p.y, p.z - side.z * w);
      uvs.push(u * 60, 0, u * 60, 1);
      if (i < n) { const a = i * 2; index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(index);
    const uniforms = { t: { value: 0 }, fogColor: { value: new THREE.Color('#d8dfae') } };
    group.add(inert(new THREE.Mesh(geometry, new THREE.ShaderMaterial({
      uniforms, fog: false, side: THREE.DoubleSide,
      vertexShader: `varying vec2 vUv; varying float vFar; void main() { vUv = uv; vec4 v = modelViewMatrix * vec4(position, 1.0); vFar = smoothstep(9.0, 34.0, length(v.xyz)); gl_Position = projectionMatrix * v; }`,
      fragmentShader: `
        varying vec2 vUv; varying float vFar; uniform float t; uniform vec3 fogColor;
        void main() {
          float across = abs(vUv.y - 0.5) * 2.0;
          vec3 c = mix(vec3(0.26, 0.56, 0.6), vec3(0.14, 0.34, 0.3), across);
          float flow = sin(vUv.x * 14.0 - t * 2.4 + sin(vUv.y * 9.0 + vUv.x) * 2.2) * sin(vUv.x * 5.0 - t * 1.3 + vUv.y * 5.0);
          c += vec3(0.75, 0.82, 0.72) * smoothstep(0.55, 0.95, flow) * (1.0 - across * 0.6);
          c += vec3(0.4, 0.42, 0.34) * smoothstep(0.86, 1.0, across);
          gl_FragColor = vec4(mix(c, fogColor, vFar), 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    }))));
    sky(group, { top: '#a9cfe0', mid: '#e4e6bc', horizon: '#ecebb8', sun: '#fff0c0', sunDir: V(-0.35, 0.42, -1), sunSize: 0.9992, glow: 0.7 });
    group.add(dunes('#5a8a45', { size: 90, seed: 3.1, height: 1.6, clear: { x: 9, z: 0, depth: 7 } }));
    const kinds = ['tree_pineTallA_detailed', 'tree_pineTallB_detailed', 'tree_oak', 'tree_default', 'tree_detailed', 'tree_pineRoundC', 'tree_fat'];
    let planted = 0;
    while (planted < 52) {
      const x = -24 + random() * 48, z = -26 + random() * 30, kind = kinds[Math.floor(random() * kinds.length)], s = 3 + random() * 2.4;
      if (Math.abs(z - line(x)) < 2.4 || (Math.abs(x) < 5.6 && z > -9.5) || z > 3.8 && Math.abs(x) < 9) continue;
      put(group, kind, x, 0, z, s, random() * 6.28);
      planted++;
    }
    [['tree_pineTallA_detailed', -6.8, 2.2, 3.5], ['tree_oak', 7.4, 1.4, 3.4], ['tree_pineTallB_detailed', 6.6, -1.6, 3.8], ['tree_detailed', -5.7, -0.5, 3.0]].forEach(([n2, x, z, s], i) => put(group, n2, x, 0, z, s, i * 1.9));
    put(group, 'tree_oak', -3.0, 0, -5.2, 3.2, 1.2, 'birds');
    [['rock_largeA', -2.4, line(-2.4) + 0.62, 0.8, 0.3], ['rock_largeA', 0.7, line(0.7) - 0.7, 1, 1.7], ['rock_largeA', 3.9, line(3.9) + 0.7, 1.3, 0.9], ['rock_largeA', -5, line(-5) - 0.6, 1.2, 2.6]]
      .forEach(([name, x, z, s, turn]) => put(group, name, x, -0.04, z, s, turn));
    [['mushroom_redGroup', 3.6, 1.7, 2.2], ['mushroom_redGroup', -2.7, 1.2, 1.7], ['flower_yellowA', -2.1, -0.4, 2.2], ['flower_yellowA', 1.2, 0.2, 1.8], ['flower_yellowA', -3.3, 0.4, 2],
     ['grass_large', -3.2, -1, 2.4], ['grass_large', 3.7, -0.3, 2.4], ['grass_large', 1.5, 2.3, 2], ['grass_large', -1.6, 1.6, 1.9], ['plant_bushLarge', -4.4, 1.4, 2.2], ['plant_bushLarge', 4.8, -1.5, 2.4], ['plant_bush', 4.4, 1.2, 2.2],
     ['stump_round', -4, -1.2, 2.1]].forEach(([name, x, z, s], i) => put(group, name, x, 0, z, s, i * 2.3));
    fallen(group, 3.9, 0.2, 1.7, 1.1);
    flames(group, set.hearth);
    seat(set, group);
    const drift = motes(group, textures.mote, { count: 70, box: { x: [-6, 6], y: [0.3, 4], z: [-7, 3] }, color: '#fff0b8', size: 0.07, seed: 5 });
    set.update = t => { uniforms.t.value = t; drift(t); };
  }

  // The lake at night: stars, a low moon over the water, a tent and a campfire on the shore.
  {
    const group = stages.lake, set = sets.lake = {
      group, anchors: { fire: V(1.1, 0.58, 0.9), crickets: V(-3.9, 0.62, 1.1), chair: V() },
      path: { from: { x: 0.15, z: 1.9, turn: Math.PI / 2 + 0.75 }, to: { x: -0.6, z: -1.35, turn: Math.PI + 0.1 } },
      hearth: V(1.1, 0.08, 0.9), floor: (p, h) => h.ground && Math.abs(p.x) < 7 && Math.abs(p.z) < 7
    };
    sky(group, { top: '#070b1f', mid: '#10183a', horizon: '#26335c', sun: '#e8ecff', sunDir: V(-0.1, 0.17, -1), sunSize: 0.99965, glow: 0.14, stars: 1 });
    const uniforms = water(group, { shore: -2.6, swing: 0.12, foam: 0.25, wet: 0.5, shallow: '#1d3a54', deep: '#0d1a33', horizon: '#26335c', glint: '#8fa3d8', glintX: -1.25, glintLean: -0.1 });
    mountains(group, [[-24, -41, 13, 4.2], [-9, -44, 15, 5.6], [5, -42, 12, 3.6], [17, -43, 14, 5], [31, -39, 13, 4.4], [-37, -36, 12, 4.8]], '#1a2748');
    group.add(dunes('#3a5f42', { size: 90, seed: 2.2, height: 1.3, clear: { x: 8, z: 1.5, depth: 6 }, shore: -3.8 }));
    [['tree_pineTallA_detailed', -6.2, 0.2, 4.2], ['tree_pineTallB_detailed', -7.6, 2.4, 4.8], ['tree_pineRoundC', -5.0, 2.8, 3.2], ['tree_pineTallB_detailed', 6.4, -0.6, 4.4], ['tree_pineTallA_detailed', 7.8, 1.6, 5],
     ['tree_pineRoundC', 5.2, 2.4, 3], ['tree_pineTallA_detailed', 9.8, -2, 4.6], ['tree_pineTallB_detailed', -9.6, -1.4, 4.2]].forEach(([name, x, z, s], i) => put(group, name, x, 0, z, s, i * 1.3));
    [['rock_largeA', -4.1, -2.7, 1.6, 0.3], ['rock_largeA', 3.9, -2.8, 1.9, 1.9], ['rock_largeA', 2.6, -2.5, 0.9, 2.8], ['grass_large', -4.4, 0.8, 2.4], ['grass_large', -3.6, 1.2, 2.2], ['grass_large', -2.4, -1.5, 2], ['grass_large', 2.4, -1.4, 2],
     ['stump_round', 0.2, 0.5, 1.2]].forEach(([name, x, z, s, turn], i) => put(group, name, x, 0, z, s, turn || i, name === 'grass_large' && x < -3 ? 'crickets' : undefined));
    tent(group, 3.5, -0.2, -0.45);
    fallen(group, 2.1, 1.75, 1.2, 0.5);
    flames(group, set.hearth);
    seat(set, group);
    const drift = motes(group, textures.mote, { count: 36, box: { x: [-7, 7], y: [0.25, 2.2], z: [-2, 3] }, color: '#d6ff9a', size: 0.09, seed: 9 });
    set.update = t => { uniforms.t.value = t; drift(t); };
  }
  return sets;
}
