/* What moves in the Little House: rain falling outside the walls and flames in the hearth, both drawn with Kenney's
 * Particle Pack (CC0): its trace streaks for raindrops, its flames and sparks for the fire. Everything is made once;
 * each frame only moves the drops and embers and swaps the flames' pictures.
 */
import * as THREE from 'three';

const textures = new THREE.TextureLoader();
function tex(name) {
  const t = textures.load('textures/' + name + '.png');
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const DROPS = 1600, EMBERS = 28;

export class Weather {
  constructor(scene, { hearth }) {
    this.scene = scene;
    this.hearth = hearth;
    this.rainShown = 0;

    // Rain: drops fall in the night around the back and left of the house, never inside it.
    const positions = new Float32Array(DROPS * 3);
    this.speeds = new Float32Array(DROPS);
    for (let i = 0; i < DROPS; i++) { this.respawn(positions, i, Math.random() * 7); this.speeds[i] = 6 + Math.random() * 3; }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rainMaterial = new THREE.PointsMaterial({
      map: tex('trace_01'), size: 0.75, sizeAttenuation: true, color: '#c8d8f0', transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: true
    });
    this.rain = new THREE.Points(geometry, this.rainMaterial);
    this.rain.frustumCulled = false;
    this.rain.renderOrder = 2;
    this.rain.raycast = () => {};
    scene.add(this.rain);

    // The fire: a few flames that flicker through the pack's flame pictures, a glow, and embers rising.
    this.flameTextures = ['flame_01', 'flame_02', 'flame_03', 'flame_04', 'flame_05'].map(tex);
    this.flames = [];
    const spots = [[-0.14, 0.0, 0.42], [0.05, 0.02, 0.5], [0.22, 0.0, 0.42], [0.04, 0.05, 0.36], [-0.05, 0.06, 0.3]];
    spots.forEach(([dx, dz, h], i) => {
      const m = new THREE.SpriteMaterial({ map: this.flameTextures[i % 5], color: new THREE.Color(i >= 3 ? '#ffd890' : '#ff7420').multiplyScalar(i >= 3 ? 2.2 : 1.8),
        transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false });
      const s = new THREE.Sprite(m);
      s.renderOrder = 5;
      s.center.set(0.5, 0.1);
      s.position.set(hearth.x + dx, hearth.y + 0.02, hearth.z + 0.1 + dz);
      s.userData = { h, w: h * 0.9, phase: Math.random() * 10, frame: i, spot: 'fire' };
      s.raycast = () => {};
      scene.add(s);
      this.flames.push(s);
    });
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex('light_01'), color: '#ff8a3a', transparent: true,
      opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.glow.position.set(hearth.x, hearth.y + 0.22, hearth.z + 0.32);
    this.glow.scale.set(1.2, 1.0, 1);
    this.glow.raycast = () => {};
    scene.add(this.glow);

    const ember = new Float32Array(EMBERS * 3);
    this.emberLife = new Float32Array(EMBERS);
    for (let i = 0; i < EMBERS; i++) { this.emberLife[i] = Math.random(); this.placeEmber(ember, i); }
    const eg = new THREE.BufferGeometry();
    eg.setAttribute('position', new THREE.BufferAttribute(ember, 3));
    this.emberMaterial = new THREE.PointsMaterial({ map: tex('circle_05'), size: 0.035, color: '#ffb060', transparent: true,
      opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    this.embers = new THREE.Points(eg, this.emberMaterial);
    this.embers.frustumCulled = false;
    this.embers.raycast = () => {};
    scene.add(this.embers);
    this.flameClock = 0;
  }

  respawn(p, i, y) {
    let x, z;
    // Never over the room (x and z above -2), with a margin so no streak reaches over a wall.
    do { x = -8 + Math.random() * 13; z = -8 + Math.random() * 13; } while (x > -2.35 && z > -2.35);
    p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z;
  }

  placeEmber(p, i) {
    const h = this.hearth;
    p[i * 3] = h.x + (Math.random() - 0.5) * 0.3;
    p[i * 3 + 1] = h.y + 0.05 + this.emberLife[i] * 0.55;
    p[i * 3 + 2] = h.z + 0.12 + (Math.random() - 0.5) * 0.12;
  }

  update(dt, t, { rain, fire }) {
    // Rain fades in and out with the rain sounds.
    this.rainShown += ((rain ? 1 : 0) - this.rainShown) * (1 - Math.exp(-1.2 * dt));
    this.rainMaterial.opacity = 0.95 * this.rainShown;
    this.rain.visible = this.rainShown > 0.01;
    if (this.rain.visible) {
      const p = this.rain.geometry.attributes.position.array;
      for (let i = 0; i < DROPS; i++) {
        // Straight down, so no drop drifts in over the walls.
        p[i * 3 + 1] -= this.speeds[i] * dt;
        if (p[i * 3 + 1] < 0) this.respawn(p, i, 6 + Math.random());
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }

    // The fire breathes and flickers; its pictures change a dozen times a second.
    this.flameClock += dt;
    const swap = this.flameClock > 0.085;
    if (swap) this.flameClock = 0;
    this.flames.forEach((s, i) => {
      const u = s.userData, f = 0.8 + 0.2 * Math.sin(t * 9 + u.phase) + 0.1 * Math.sin(t * 17 + u.phase * 2);
      s.scale.set(u.w * (0.9 + 0.1 * Math.sin(t * 13 + i)), u.h * f * (0.4 + 0.6 * fire), 1);
      s.material.opacity = fire;
      if (swap) { u.frame = (u.frame + 1 + (Math.random() < 0.3 ? 1 : 0)) % 5; s.material.map = this.flameTextures[u.frame]; }
      s.visible = fire > 0.02;
    });
    this.glow.material.opacity = fire * (0.28 + 0.07 * Math.sin(t * 7.3));
    this.glow.visible = fire > 0.02;

    this.emberMaterial.opacity = fire;
    this.embers.visible = fire > 0.05;
    if (this.embers.visible) {
      const p = this.embers.geometry.attributes.position.array;
      for (let i = 0; i < EMBERS; i++) {
        this.emberLife[i] += dt * (0.5 + (i % 5) * 0.12);
        if (this.emberLife[i] > 1) { this.emberLife[i] = 0; this.placeEmber(p, i); }
        p[i * 3 + 1] += dt * 0.35;
        p[i * 3] += Math.sin(t * 3 + i) * dt * 0.05;
      }
      this.embers.geometry.attributes.position.needsUpdate = true;
    }
  }
}
