import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* SCENE */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
scene.fog = new THREE.Fog(0x050505, 5, 40);

/* PLAYER + CAMERA */
const player = new THREE.Object3D();
scene.add(player);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
camera.rotation.order = 'YXZ';
camera.position.set(0, 1.6, 0);
player.add(camera);

/* RENDERER */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);

/* LIGHT */
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(5, 10, 5);
scene.add(dir);

const muzzleFlash = new THREE.PointLight(0xffaa00, 0, 5);
muzzleFlash.position.set(0.4, -0.3, -0.9);
camera.add(muzzleFlash);

/* FLOOR */
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshStandardMaterial({ color: 0x111111 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

/* GUN */
const gunGroup = new THREE.Group();
camera.add(gunGroup);

const loader = new GLTFLoader();
let gun;

loader.load('assets/models/gun.glb', g => {
  gun = g.scene;
  gun.scale.set(0.25, 0.25, 0.25);
  gun.position.set(0.35, -0.35, -0.8);
  gun.rotation.set(0, Math.PI, 0);

  gun.traverse(m => {
    if (m.isMesh) {
      m.material.metalness = 0.3;
      m.material.roughness = 0.4;
    }
  });

  gunGroup.add(gun);
});

/* ENEMIES */
const enemies = [];
for (let i = 0; i < 6; i++) {
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

/* INPUT */
const input = { x: 0, y: 0 };

/* JOYSTICK */
const joy = document.getElementById('joystick');
const knob = document.getElementById('knob');
let joyActive = false;

joy.addEventListener('touchstart', () => joyActive = true);
joy.addEventListener('touchmove', e => {
  if (!joyActive) return;

  const r = joy.getBoundingClientRect();
  const dx = e.touches[0].clientX - (r.left + r.width / 2);
  const dy = e.touches[0].clientY - (r.top + r.height / 2);
  const d = Math.min(Math.hypot(dx, dy), 40);
  const a = Math.atan2(dy, dx);

  input.x = Math.cos(a) * d / 40;
  input.y = Math.sin(a) * d / 40;

  knob.style.transform = `translate(${Math.cos(a) * d - 20}px, ${Math.sin(a) * d - 20}px)`;
});

addEventListener('touchend', () => {
  joyActive = false;
  input.x = input.y = 0;
  knob.style.transform = 'translate(-50%, -50%)';
});

/* LOOK */
const touch = document.getElementById('touch');
let px, py;

touch.addEventListener('touchstart', e => {
  touch.style.pointerEvents = 'auto';
  px = e.touches[0].clientX;
  py = e.touches[0].clientY;
});

touch.addEventListener('touchmove', e => {
  const dx = e.touches[0].clientX - px;
  const dy = e.touches[0].clientY - py;

  player.rotation.y -= dx * 0.004;
  camera.rotation.x -= dy * 0.004;
  camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x, -1.4, 1.4);

  px = e.touches[0].clientX;
  py = e.touches[0].clientY;
});

touch.addEventListener('touchend', () => {
  touch.style.pointerEvents = 'none';
});

/* SHOOT */
const ray = new THREE.Raycaster();
document.getElementById('shoot').addEventListener('touchstart', () => {
  muzzleFlash.intensity = 15;
  setTimeout(() => muzzleFlash.intensity = 0, 50);

  gunGroup.position.z -= 0.1;

  ray.setFromCamera({ x: 0, y: 0 }, camera);
  const hit = ray.intersectObjects(enemies);

  if (hit.length) {
    const e = hit[0].object;
    e.userData.hp -= 10;
    if (e.userData.hp <= 0) {
      scene.remove(e);
      enemies.splice(enemies.indexOf(e), 1);
    }
  }

  setTimeout(() => gunGroup.position.z += 0.1, 50);
});

/* LOOP */
function animate() {
  requestAnimationFrame(animate);

  const f = new THREE.Vector3(0, 0, -1).applyQuaternion(player.quaternion);
  const r = new THREE.Vector3(1, 0, 0).applyQuaternion(player.quaternion);
  f.y = r.y = 0;

  player.position.addScaledVector(f, -input.y * 0.12);
  player.position.addScaledVector(r, input.x * 0.12);

  const t = performance.now() * 0.002;
  gunGroup.rotation.z = Math.sin(t) * 0.02;
  gunGroup.position.y = Math.sin(t * 2) * 0.02;

  enemies.forEach(e => {
    const d = new THREE.Vector3().subVectors(player.position, e.position).normalize();
    e.position.addScaledVector(d, 0.04);
    e.position.y = 1;
    e.lookAt(player.position);
  });

  renderer.render(scene, camera);
}
animate();

/* RESIZE */
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
