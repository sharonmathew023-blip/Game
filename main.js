import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- Scene Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Lighting (Crucial for GLTF Models) ---
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // Soft white light
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
sunLight.position.set(5, 10, 7);
scene.add(sunLight);

// --- Game State ---
const gameState = {
  gunMesh: null
};

// --- Load the Gun Model ---
const loader = new GLTFLoader();
loader.setPath('./assets/models/');

loader.load(
  'gun.glb',
  (gltf) => {
    const gunModel = gltf.scene;

    // 1. Clean up materials and shadows
    gunModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        // Ensures textures look correct with modern Three.js lighting
        if (child.material) {
          child.material.depthWrite = true;
          child.material.transparent = false;
        }
      }
    });

    // 2. Transform the model
    // Adjust these values! If your gun is invisible, it might be inside the camera.
    gunModel.scale.set(0.2, 0.2, 0.2); 
    gunModel.position.set(0.3, -0.3, -0.7); // Positioned to the bottom-right of screen
    gunModel.rotation.set(0, Math.PI, 0);   // Rotate 180 degrees if it's facing backward

    // 3. Attach to camera for FPS feel
    camera.add(gunModel);
    scene.add(camera); // Important: Camera must be in scene if objects are attached to it
    
    gameState.gunMesh = gunModel;
    console.log("Gun loaded successfully");
  },
  (xhr) => {
    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
  },
  (error) => {
    console.error('Error loading gun.glb:', error);
  }
);

// --- Animation Loop ---
function animate() {
  requestAnimationFrame(animate);

  // Subtle gun sway/bobbing effect if gun exists
  if (gameState.gunMesh) {
    const time = Date.now() * 0.002;
    gameState.gunMesh.position.y = -0.3 + Math.sin(time) * 0.01;
  }

  renderer.render(scene, camera);
}

animate();

// Handle Window Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
            
