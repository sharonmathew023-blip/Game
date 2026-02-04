import * as THREE from 'three';

/* =====================
   CONFIG
===================== */
const CONFIG = {
  bgColor: 0x020205,
  cameraHeight: 1.6,
  moveSpeed: 7.0, // Units per second
  lookSensitivity: 0.003,
  enemyCount: 6
};

const clock = new THREE.Clock();
const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.bgColor);
scene.fog = new THREE.Fog(CONFIG.bgColor, 1, 20);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, CONFIG.cameraHeight, 5);
camera.rotation.order = 'YXZ';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

/* =====================
   ENVIRONMENT (ABANDONED BUILDING)
===================== */
const wallMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
const floorMat = new THREE.MeshStandardMaterial({ color: 0x080808 });

// Create a floor and a ceiling
const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), wallMat);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = 4;
scene.add(ceiling);

// Add dark pillars to create "rooms"
for (let i = 0; i < 40; i++) {
  const pillar = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 2), wallMat);
  pillar.position.set(
    (Math.random() - 0.5) * 60,
    2,
    (Math.random() - 0.5) * 60
  );
  scene.add(pillar);
}

const light = new THREE.PointLight(0xffffff, 15, 12);
camera.add(light); // Flashlight attached to player
scene.add(camera);

/* =====================
   WEAPON (PULSE RIFLE)
===================== */
const gunGroup = new THREE.Group();
const gunBody = new THREE.Mesh(
  new THREE.BoxGeometry(0.15, 0.2, 0.7),
  new THREE.MeshStandardMaterial({ color: 0x222222 })
);
const barrel = new THREE.Mesh(
  new THREE.CylinderGeometry(0.02, 0.02, 0.4),
  new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x00ffcc })
);
barrel.rotation.x = Math.PI / 2;
barrel.position.z = -0.4;
gunGroup.add(gunBody, barrel);
gunGroup.position.set(0.35, -0.35, -0.5);
camera.add(gunGroup);

/* =====================
   ENEMIES (VOID ORBS)
===================== */
const enemies = [];
function spawnEnemy() {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xff0000, wireframe: true, emissive: 0xff0000 })
  );
  mesh.position.set((Math.random() - 0.5) * 30, 1.2, (Math.random() - 0.5) * 30);
  mesh.userData = { hp: 20, speed: 1.5 + Math.random() * 2 };
  scene.add(mesh);
  enemies.push(mesh);
}
for (let i = 0; i < CONFIG.enemyCount; i++) spawnEnemy();

/* =====================
   INPUT HANDLING
===================== */
const input = { move: { x: 0, y: 0 }, lastLook: null };
const joystick = document.getElementById('joystick-zone');
const knob = document.getElementById('knob');
const shootBtn = document.getElementById('shoot-btn');

joystick.addEventListener('touchmove', e => {
  e.preventDefault();
  const rect = joystick.getBoundingClientRect();
  const touch = e.touches[0];
  const dx = touch.clientX - (rect.left + 55);
  const dy = touch.clientY - (rect.top + 55);
  const dist = Math.min(Math.hypot(dx, dy), 40);
  const angle = Math.atan2(dy, dx);
  input.move.x = Math.cos(angle) * (dist / 40);
  input.move.y = Math.sin(angle) * (dist / 40);
  knob.style.transform = `translate(${input.move.x * 35}px, ${input.move.y * 35}px)`;
});

joystick.addEventListener('touchend', () => {
  input.move = { x: 0, y: 0 };
  knob.style.transform = 'translate(0,0)';
});

window.addEventListener('touchmove', e => {
  // Only look if touch is on the right half of screen
  const touch = Array.from(e.touches).find(t => t.clientX > window.innerWidth / 2);
  if (!touch) { input.lastLook = null; return; }
  
  if (input.lastLook) {
    const dx = touch.clientX - input.lastLook.x;
    const dy = touch.clientY - input.lastLook.y;
    camera.rotation.y -= dx * CONFIG.lookSensitivity;
    camera.rotation.x -= dy * CONFIG.lookSensitivity;
    camera.rotation.x = Math.max(-1.4, Math.min(1.4, camera.rotation.x));
  }
  input.lastLook = { x: touch.clientX, y: touch.clientY };
}, { passive: false });

/* =====================
   SHOOTING
===================== */
const raycaster = new THREE.Raycaster();
let recoilAnim = 0;

shootBtn.addEventListener('touchstart', e => {
  e.preventDefault();
  recoilAnim = 0.15; // Set recoil
  
  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  const hits = raycaster.intersectObjects(enemies);
  
  if (hits.length > 0) {
    const target = hits[0].object;
    target.userData.hp -= 10;
    if (target.userData.hp <= 0) {
      scene.remove(target);
      enemies.splice(enemies.indexOf(target), 1);
      spawnEnemy();
      const killsEl = document.getElementById('kills');
      killsEl.innerText = parseInt(killsEl.innerText) + 1;
    }
  }
});

/* =====================
   GAME LOOP
===================== */
function animate() {
  const delta = clock.getDelta();
  requestAnimationFrame(animate);

  // Movement
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  forward.y = 0; right.y = 0; 
  
  camera.position.addScaledVector(forward.normalize(), -input.move.y * CONFIG.moveSpeed * delta);
  camera.position.addScaledVector(right.normalize(), input.move.x * CONFIG.moveSpeed * delta);

  // Gun Animation (Recoil recovery)
  gunGroup.position.z = THREE.MathUtils.lerp(gunGroup.position.z, -0.5 + recoilAnim, 0.2);
  recoilAnim = THREE.MathUtils.lerp(recoilAnim, 0, 0.1);

  // Enemy AI (Follow player)
  enemies.forEach(enemy => {
    const dir = new THREE.Vector3().subVectors(camera.position, enemy.position);
    dir.y = 0;
    enemy.position.addScaledVector(dir.normalize(), enemy.userData.speed * delta);
    enemy.rotation.y += delta * 2;
  });

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
