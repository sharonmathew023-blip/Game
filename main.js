import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* ---------------- SCENE ---------------- */
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 1.6, 5);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

/* ---------------- LIGHT ---------------- */
scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 5);
dirLight.castShadow = true;
scene.add(dirLight);

/* ---------------- GAME STATE ---------------- */
const gameState = {
  gun: null,
  zombie: null
};

/* ---------------- LOADER ---------------- */
const loader = new GLTFLoader();

/* ---------------- LOAD GUN ---------------- */
loader.load('./assets/models/gun.glb', (gltf) => {
  const gun = gltf.scene;

  gun.traverse((m) => {
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });

  gun.scale.set(0.25, 0.25, 0.25);
  gun.position.set(0.35, -0.35, -0.8);
  gun.rotation.set(0, Math.PI, 0);

  camera.add(gun);
  gameState.gun = gun;
});

/* ---------------- LOAD ZOMBIE ---------------- */
loader.load('./assets/models/zombie.glb', (gltf) => {
  const zombie = gltf.scene;

  zombie.traverse((m) => {
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });

  zombie.position.set(0, 0, -10);
  zombie.scale.set(1, 1, 1);
  scene.add(zombie);

  gameState.zombie = zombie;
});

/* ---------------- SHOOTING ---------------- */
const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);

window.addEventListener('click', () => {
  if (!gameState.zombie) return;

  raycaster.setFromCamera(center, camera);
  const hit = raycaster.intersectObject(gameState.zombie, true);

  if (hit.length > 0) {
    console.log('Zombie hit');
    gameState.zombie.position.z -= 1.5;
  }
});

/* ---------------- ANIMATE ---------------- */
function animate() {
  requestAnimationFrame(animate);

  if (gameState.gun) {
    const t = Date.now() * 0.002;
    gameState.gun.position.y = -0.35 + Math.sin(t) * 0.01;
  }

  renderer.render(scene, camera);
}

animate();

/* ---------------- RESIZE ---------------- */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
