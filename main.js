import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const CONFIG = {
  bgColor: 0x020202,
  cameraHeight: 1.6,
  moveSpeed: 8.0, // Units per second
  recoilStrength: 0.15,
  enemyCount: 8,
  lookSensitivity: 0.003
};

/* --- ENGINE --- */
const clock = new THREE.Clock();
const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.bgColor);
scene.fog = new THREE.Fog(CONFIG.bgColor, 2, 45);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, CONFIG.cameraHeight, 5);
camera.rotation.order = 'YXZ';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

/* --- LIGHTING --- */
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const flash = new THREE.PointLight(0x00ffcc, 0, 10);
camera.add(flash);
scene.add(camera);

/* --- WORLD --- */
scene.add(new THREE.GridHelper(200, 50, 0x00ffcc, 0x222222));

/* --- GUN & RECOIL --- */
const gunGroup = new THREE.Group();
camera.add(gunGroup);
let recoilOffset = 0;
let kills = 0;

const gunPlaceholder = new THREE.Mesh(
  new THREE.BoxGeometry(0.15, 0.15, 0.7),
  new THREE.MeshStandardMaterial({ color: 0x333333 })
);
gunPlaceholder.position.set(0.3, -0.3, -0.5);
gunGroup.add(gunPlaceholder);

/* --- ENEMIES --- */
const enemies = [];
const spawnEnemy = () => {
  const geometry = new THREE.BoxGeometry(1, 2, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x550000 });
  const enemy = new THREE.Mesh(geometry, material);
  
  const angle = Math.random() * Math.PI * 2;
  const dist = 20 + Math.random() * 10;
  enemy.position.set(Math.cos(angle) * dist, 1, Math.sin(angle) * dist);
  enemy.userData = { hp: 30, speed: 1.5 + Math.random() * 2 };
  
  scene.add(enemy);
  enemies.push(enemy);
};
for (let i = 0; i < CONFIG.enemyCount; i++) spawnEnemy();

/* --- INPUT HANDLING --- */
const input = { move: { x: 0, y: 0 }, look: { x: 0, y: 0 } };
const joystick = document.getElementById('joystick-zone');
const knob = document.getElementById('knob');
const shootBtn = document.getElementById('shoot-btn');

// Movement
joystick.addEventListener('touchmove', e => {
  e.preventDefault();
  const rect = joystick.getBoundingClientRect();
  const touch = e.touches[0];
  const dx = touch.clientX - (rect.left + rect.width / 2);
  const dy = touch.clientY - (rect.top + rect.height / 2);
  const dist = Math.min(Math.hypot(dx, dy), 40);
  const angle = Math.atan2(dy, dx);
  
  input.move.x = Math.cos(angle) * (dist / 40);
  input.move.y = Math.sin(angle) * (dist / 40);
  knob.style.transform = `translate(${input.move.x * 40}px, ${input.move.y * 40}px)`;
});

joystick.addEventListener('touchend', () => {
  input.move = { x: 0, y: 0 };
  knob.style.transform = 'translate(0,0)';
});

// Smooth Look (Right side of screen)
let lastLook = null;
window.addEventListener('touchmove', e => {
  const touch = Array.from(e.touches).find(t => t.clientX > window.innerWidth / 2);
  if (!touch) { lastLook = null; return; }
  
  if (lastLook) {
    const dx = touch.clientX - lastLook.x;
    const dy = touch.clientY - lastLook.y;
    camera.rotation.y -= dx * CONFIG.lookSensitivity;
    camera.rotation.x -= dy * CONFIG.lookSensitivity;
    camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x, -1.2, 1.2);
  }
  lastLook = { x: touch.clientX, y: touch.clientY };
}, { passive: false });

/* --- SHOOTING --- */
const raycaster = new THREE.Raycaster();
shootBtn.addEventListener('touchstart', e => {
  e.preventDefault();
  
  // Recoil effect
  recoilOffset = CONFIG.recoilStrength;
  flash.intensity = 15; // Muzzle flash
  setTimeout(() => flash.intensity = 0, 50);

  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  const hits = raycaster.intersectObjects(enemies);

  if (hits.length > 0) {
    const target = hits[0].object;
    target.userData.hp -= 15;
    target.material.emissive.setHex(0xff0000); // Hit flash
    setTimeout(() => target.material.emissive.setHex(0x550000), 100);

    if (target.userData.hp <= 0) {
      scene.remove(target);
      enemies.splice(enemies.indexOf(target), 1);
      kills++;
      document.getElementById('kills').innerText = kills;
      spawnEnemy();
    }
  }
});

/* --- GAME LOOP --- */
const moveVec = new THREE.Vector3();
function animate() {
  const delta = clock.getDelta();
  requestAnimationFrame(animate);

  // Movement Logic
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  forward.y = 0; right.y = 0; forward.normalize(); right.normalize();

  moveVec.set(0, 0, 0)
    .addScaledVector(forward, -input.move.y)
    .addScaledVector(right, input.move.x);
  
  camera.position.addScaledVector(moveVec, CONFIG.moveSpeed * delta);

  // Smooth Recoil Animation
  gunGroup.position.z = THREE.MathUtils.lerp(gunGroup.position.z, recoilOffset, 0.3);
  recoilOffset = THREE.MathUtils.lerp(recoilOffset, 0, 0.1);

  // Enemy AI
  for (const enemy of enemies) {
    const dir = new THREE.Vector3().subVectors(camera.position, enemy.position);
    dir.y = 0; 
    enemy.position.addScaledVector(dir.normalize(), enemy.userData.speed * delta);
    enemy.lookAt(camera.position.x, 1, camera.position.z);
  }

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
