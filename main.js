import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* ---------- SCENE ---------- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
scene.fog = new THREE.Fog(0x050505, 5, 40);

/* ---------- PLAYER ---------- */
const player = new THREE.Object3D();
scene.add(player);

/* ---------- CAMERA ---------- */
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.rotation.order = 'YXZ';
camera.position.set(0, 1.6, 0);
player.add(camera);

/* ---------- RENDERER ---------- */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

/* ---------- LIGHTING ---------- */
scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.6);
scene.add(hemi);

const muzzleFlash = new THREE.PointLight(0xffaa00, 0, 5);
muzzleFlash.position.set(0.4, -0.3, -0.9);
camera.add(muzzleFlash);

/* ---------- FLOOR ---------- */
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshStandardMaterial({ color: 0x111111 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

/* ---------- MODELS ---------- */
const loader = new GLTFLoader();
let gun;

loader.load(
  'assets/models/gun.glb',
  (gltf) => {
    gun = gltf.scene;
    gun.scale.set(0.25, 0.25, 0.25);
    gun.position.set(0.35, -0.35, -0.8);
    gun.rotation.set(0, Math.PI, 0);
    camera.add(gun);
  },
  undefined,
  () => {
    gun = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x00ffcc })
    );
    gun.position.set(0.35, -0.35, -0.8);
    camera.add(gun);
  }
);

/* ---------- ENEMIES ---------- */
const enemies = [];

function spawnEnemies(count = 6) {
  for (let i = 0; i < count; i++) {
    const e = new THREE.Mesh(
      new THREE.BoxGeometry(1, 2, 1),
      new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    const a = Math.random() * Math.PI * 2;
    e.position.set(Math.cos(a) * 20, 1, Math.sin(a) * 20);
    e.userData.hp = 30;
    scene.add(e);
    enemies.push(e);
  }
}
spawnEnemies();

/* ---------- INPUT ---------- */
const input = { x: 0, y: 0 };

/* MOVE (JOYSTICK) */
const joystick = document.getElementById('joystick-zone');
const knob = document.getElementById('joystick-knob');

joystick.addEventListener('touchmove', (e) => {
  const r = joystick.getBoundingClientRect();
  const dx = e.touches[0].clientX - (r.left + r.width / 2);
  const dy = e.touches[0].clientY - (r.top + r.height / 2);
  const d = Math.min(Math.hypot(dx, dy), 40);
  const a = Math.atan2(dy, dx);

  input.x = Math.cos(a) * d / 40;
  input.y = Math.sin(a) * d / 40;

  knob.style.transform =
    `translate(${Math.cos(a) * d - 20}px, ${Math.sin(a) * d - 20}px)`;
});

joystick.addEventListener('touchend', () => {
  input.x = input.y = 0;
  knob.style.transform = 'translate(-50%, -50%)';
});

/* LOOK */
let px, py;
const touch = document.getElementById('touch-layer');

touch.addEventListener('touchstart', (e) => {
  px = e.touches[0].clientX;
  py = e.touches[0].clientY;
});

touch.addEventListener('touchmove', (e) => {
  const dx = e.touches[0].clientX - px;
  const dy = e.touches[0].clientY - py;

  player.rotation.y -= dx * 0.005;
  camera.rotation.x -= dy * 0.005;
  camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x, -1.4, 1.4);

  px = e.touches[0].clientX;
  py = e.touches[0].clientY;
});

/* ---------- SHOOT ---------- */
const raycaster = new THREE.Raycaster();

document.getElementById('shoot-btn').addEventListener('touchstart', () => {
  muzzleFlash.intensity = 15;
  setTimeout(() => (muzzleFlash.intensity = 0), 50);

  if (gun) gun.position.z -= 0.1;

  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  const hits = raycaster.intersectObjects(enemies);

  if (hits.length) {
    const e = hits[0].object;
    e.userData.hp -= 10;
    if (e.userData.hp <= 0) {
      scene.remove(e);
      enemies.splice(enemies.indexOf(e), 1);
    }
  }

  setTimeout(() => { if (gun) gun.position.z += 0.1; }, 50);
});

/* ---------- LOOP ---------- */
function animate() {
  requestAnimationFrame(animate);

  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(player.quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(player.quaternion);
  forward.y = right.y = 0;

  player.position.addScaledVector(forward, -input.y * 0.12);
  player.position.addScaledVector(right, input.x * 0.12);

  enemies.forEach((e) => {
    const dir = new THREE.Vector3().subVectors(player.position, e.position).normalize();
    e.position.addScaledVector(dir, 0.04);
    e.lookAt(player.position);
  });

  renderer.render(scene, camera);
}
animate();

/* ---------- RESIZE ---------- */
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
