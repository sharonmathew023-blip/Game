import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* =====================
   CONFIG
===================== */
const CONFIG = {
  bgColor: 0x020202,
  fogNear: 2,
  fogFar: 45,
  cameraHeight: 1.6,
  moveSpeed: 0.15,
  recoilStrength: 0.1,
  enemyCount: 8
};

/* =====================
   ENGINE
===================== */
const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.bgColor);
scene.fog = new THREE.Fog(CONFIG.bgColor, CONFIG.fogNear, CONFIG.fogFar);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, CONFIG.cameraHeight, 5);
camera.rotation.order = 'YXZ';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(CONFIG.bgColor);
document.body.appendChild(renderer.domElement);

/* =====================
   LIGHTING
===================== */
scene.add(new THREE.AmbientLight(0xffffff, 0.35));

const pointLight = new THREE.PointLight(0xffffff, 8, 20);
pointLight.position.set(0, 2, 0);
camera.add(pointLight);
scene.add(camera);

/* =====================
   WORLD
===================== */
scene.add(new THREE.GridHelper(200, 50, 0x00ffcc, 0x222222));

/* =====================
   GUN
===================== */
const gunGroup = new THREE.Group();
camera.add(gunGroup);

let recoil = 0;

const gunPlaceholder = new THREE.Mesh(
  new THREE.BoxGeometry(0.2, 0.2, 0.8),
  new THREE.MeshStandardMaterial({ color: 0x222222 })
);
gunPlaceholder.position.set(0.35, -0.4, -0.7);
gunGroup.add(gunPlaceholder);

new GLTFLoader().load(
  'assets/models/gun.glb',
  gltf => {
    gunGroup.remove(gunPlaceholder);
    const gun = gltf.scene;
    gun.position.set(0.35, -0.45, -0.6);
    gun.scale.setScalar(0.5);
    gunGroup.add(gun);
  },
  undefined,
  err => console.warn('Gun model failed to load', err)
);

/* =====================
   ENEMIES
===================== */
const enemies = [];
const tempVec = new THREE.Vector3();

function spawnEnemy() {
  const enemy = new THREE.Mesh(
    new THREE.BoxGeometry(1, 2, 1),
    new THREE.MeshStandardMaterial({ color: 0x8b0000 })
  );

  const angle = Math.random() * Math.PI * 2;
  enemy.position.set(Math.cos(angle) * 25, 1, Math.sin(angle) * 25);
  enemy.userData.hp = 30;
  enemy.userData.speed = 0.025 + Math.random() * 0.03;

  scene.add(enemy);
  enemies.push(enemy);
}

for (let i = 0; i < CONFIG.enemyCount; i++) spawnEnemy();

/* =====================
   INPUT
===================== */
const input = { x: 0, y: 0 };

const joystick = document.getElementById('joystick-zone');
const knob = document.getElementById('knob');
const lookLayer = document.getElementById('look-layer');
const shootBtn = document.getElementById('shoot-btn');

if (!joystick || !knob || !lookLayer || !shootBtn) {
  throw new Error('Missing required UI elements');
}

/* =====================
   JOYSTICK
===================== */
function handleMove(touch) {
  const rect = joystick.getBoundingClientRect();
  const dx = touch.clientX - rect.left - rect.width / 2;
  const dy = touch.clientY - rect.top - rect.height / 2;

  const dist = Math.min(Math.hypot(dx, dy), 40);
  const angle = Math.atan2(dy, dx);

  input.x = Math.cos(angle) * (dist / 40);
  input.y = Math.sin(angle) * (dist / 40);

  knob.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
}

joystick.addEventListener('touchstart', e => handleMove(e.touches[0]));
joystick.addEventListener('touchmove', e => handleMove(e.touches[0]));
joystick.addEventListener('touchend', () => {
  input.x = 0;
  input.y = 0;
  knob.style.transform = 'translate(0,0)';
});

/* =====================
   LOOK
===================== */
let prevX = 0;
let prevY = 0;

lookLayer.addEventListener('touchstart', e => {
  prevX = e.touches[0].clientX;
  prevY = e.touches[0].clientY;
});

lookLayer.addEventListener('touchmove', e => {
  const x = e.touches[0].clientX;
  const y = e.touches[0].clientY;

  camera.rotation.y -= (x - prevX) * 0.005;
  camera.rotation.x -= (y - prevY) * 0.005;
  camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x, -1.4, 1.4);

  prevX = x;
  prevY = y;
});

/* =====================
   SHOOTING
===================== */
const raycaster = new THREE.Raycaster();

shootBtn.addEventListener('touchstart', e => {
  e.preventDefault();

  recoil = CONFIG.recoilStrength;

  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  const hits = raycaster.intersectObjects(enemies);

  if (!hits.length) return;

  const target = hits[0].object;
  target.userData.hp -= 10;

  if (target.userData.hp <= 0) {
    scene.remove(target);
    enemies.splice(enemies.indexOf(target), 1);
    spawnEnemy();
  }
});

/* =====================
   LOOP
===================== */
const forward = new THREE.Vector3();
const right = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);

  forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
  right.set(1, 0, 0).applyQuaternion(camera.quaternion);
  forward.y = 0;
  right.y = 0;

  camera.position.addScaledVector(forward, -input.y * CONFIG.moveSpeed);
  camera.position.addScaledVector(right, input.x * CONFIG.moveSpeed);
  camera.position.y = CONFIG.cameraHeight;

  gunGroup.position.z += (recoil - gunGroup.position.z) * 0.2;
  recoil *= 0.8;

  for (const enemy of enemies) {
    tempVec.subVectors(camera.position, enemy.position).normalize();
    enemy.position.addScaledVector(tempVec, enemy.userData.speed);
    enemy.lookAt(camera.position.x, 1, camera.position.z);
  }

  renderer.render(scene, camera);
}

animate();

/* =====================
   RESIZE
===================== */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
