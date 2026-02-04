import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- ENGINE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020202);
scene.fog = new THREE.Fog(0x020202, 1, 40);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.rotation.order = 'YXZ'; 

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- LIGHTING ---
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const light = new THREE.PointLight(0xffffff, 15);
camera.add(light);
scene.add(camera);

// --- WORLD ---
const grid = new THREE.GridHelper(200, 50, 0x00ffcc, 0x222222);
scene.add(grid);

// --- GUN (Attached to Camera) ---
const gunGroup = new THREE.Group();
camera.add(gunGroup);

// Gun Placeholder
const gunBox = new THREE.Mesh(
  new THREE.BoxGeometry(0.2, 0.2, 0.8),
  new THREE.MeshStandardMaterial({ color: 0x222222 })
);
gunBox.position.set(0.35, -0.4, -0.7);
gunGroup.add(gunBox);

const loader = new GLTFLoader();
loader.load('assets/models/gun.glb', (gltf) => {
    gunGroup.remove(gunBox);
    const model = gltf.scene;
    model.position.set(0.35, -0.45, -0.6);
    model.scale.set(0.5, 0.5, 0.5);
    gunGroup.add(model);
});

// --- ENEMIES ---
const enemies = [];
const spawnEnemy = () => {
    const e = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshStandardMaterial({color: 0x8b0000}));
    const angle = Math.random() * Math.PI * 2;
    e.position.set(Math.cos(angle)*25, 1, Math.sin(angle)*25);
    e.userData = { hp: 30, speed: 0.03 + Math.random() * 0.03 };
    scene.add(e);
    enemies.push(e);
};
for(let i=0; i<8; i++) spawnEnemy();

// --- CONTROLS LOGIC ---
const input = { moveX: 0, moveY: 0 };
const joystick = document.getElementById('joystick');
const knob = document.getElementById('knob');

// Joystick Move
const handleMove = (t) => {
    const rect = joystick.getBoundingClientRect();
    const x = t.clientX - rect.left - 50;
    const y = t.clientY - rect.top - 50;
    const dist = Math.min(Math.sqrt(x*x+y*y), 40);
    const angle = Math.atan2(y,x);
    input.moveX = (Math.cos(angle)*dist)/40;
    input.moveY = (Math.sin(angle)*dist)/40;
    knob.style.transform = `translate(calc(-50% + ${Math.cos(angle)*dist}px), calc(-50% + ${Math.sin(angle)*dist}px))`;
};

joystick.addEventListener('touchstart', e => handleMove(e.touches[0]));
joystick.addEventListener('touchmove', e => handleMove(e.touches[0]));
joystick.addEventListener('touchend', () => { 
    input.moveX = 0; input.moveY = 0; 
    knob.style.transform = 'translate(-50%, -50%)'; 
});

// Camera Look
let px, py;
document.getElementById('touch').addEventListener('touchstart', e => {
    px = e.touches[0].clientX; py = e.touches[0].clientY;
});
document.getElementById('touch').addEventListener('touchmove', e => {
    camera.rotation.y -= (e.touches[0].clientX - px) * 0.006;
    camera.rotation.x -= (e.touches[0].clientY - py) * 0.006;
    camera.rotation.x = Math.max(-1.5, Math.min(1.5, camera.rotation.x));
    px = e.touches[0].clientX; py = e.touches[0].clientY;
});

// Shooting
document.getElementById('shoot').addEventListener('touchstart', (e) => {
    e.preventDefault();
    gunGroup.position.z += 0.1; // Recoil
    setTimeout(() => gunGroup.position.z -= 0.1, 50);

    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0,0), camera);
    const hits = ray.intersectObjects(enemies);
    if(hits.length > 0) {
        const hit = hits[0].object;
        hit.userData.hp -= 10;
        if(hit.userData.hp <= 0) {
            scene.remove(hit);
            enemies.splice(enemies.indexOf(hit), 1);
            spawnEnemy();
        }
    }
});

// --- MAIN LOOP ---
function animate() {
    requestAnimationFrame(animate);
    
    // Movement
    const forward = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
    forward.y = 0; right.y = 0;
    camera.position.addScaledVector(forward, -input.moveY * 0.15);
    camera.position.addScaledVector(right, input.moveX * 0.15);

    // Enemy AI
    enemies.forEach(e => {
        const dir = new THREE.Vector3().subVectors(camera.position, e.position).normalize();
        e.position.x += dir.x * e.userData.speed;
        e.position.z += dir.z * e.userData.speed;
        e.lookAt(camera.position.x, 1, camera.position.z);
    });

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
