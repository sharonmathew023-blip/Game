/* =====================
   WORLD & LIGHTING
===================== */
// Add a helper grid so the "Black Hall" has depth
const grid = new THREE.GridHelper(200, 40, 0x444444, 0x222222);
scene.add(grid);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

function wall(x, z, r = 0) {
  const w = new THREE.Mesh(
    new THREE.BoxGeometry(200, 20, 2),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
  );
  w.position.set(x, 10, z);
  w.rotation.y = r;
  scene.add(w);
}
wall(0, -100); wall(0, 100);
wall(-100, 0, Math.PI / 2); wall(100, 0, Math.PI / 2);

scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(10, 20, 10);
scene.add(sun);

/* =====================
   ENEMIES (Chase the Camera)
===================== */
const enemies = [];
const enemyGeo = new THREE.BoxGeometry(1, 2, 1);
const enemyMat = new THREE.MeshStandardMaterial({ color: 0x8b0000 });

function spawnEnemy(i) {
  const e = new THREE.Mesh(enemyGeo, enemyMat);
  const angle = (i / 8) * Math.PI * 2;
  e.position.set(Math.cos(angle) * 25, 1, Math.sin(angle) * 25);
  e.userData = { hp: 30, speed: 0.02 + Math.random() * 0.02 }; 
  enemies.push(e);
  scene.add(e);
}
for (let i = 0; i < 8; i++) spawnEnemy(i);

function updateEnemies() {
  enemies.forEach((e, i) => {
    // IMPORTANT: Chase camera.position, not player.position
    const dir = new THREE.Vector3()
      .subVectors(camera.position, e.position);
    dir.y = 0; // Stop them from flying
    dir.normalize();

    e.position.addScaledVector(dir, e.userData.speed);
    e.lookAt(camera.position.x, 1, camera.position.z);

    // Separation (Fixes the "Pond" issue)
    enemies.forEach((o, j) => {
      if (i !== j) {
        const d = e.position.distanceTo(o.position);
        if (d < 1.5) {
          const push = new THREE.Vector3()
            .subVectors(e.position, o.position)
            .normalize()
            .multiplyScalar(0.01);
          e.position.add(push);
        }
      }
    });
  });
}

/* =====================
   GUN (Attached to Camera)
===================== */
const gunGroup = new THREE.Group();
camera.add(gunGroup); // This is the fix! Gun follows your eyes.
scene.add(camera);

// Create a placeholder if the GLB hasn't loaded yet
const gun = new THREE.Mesh(
  new THREE.BoxGeometry(0.2, 0.2, 0.8),
  new THREE.MeshStandardMaterial({ color: 0x222222 })
);
gun.position.set(0.35, -0.35, -0.7); 
gunGroup.add(gun);

// If you have the model loader, it replaces this box
const loader = new GLTFLoader();
loader.load('assets/models/gun.glb', (gltf) => {
    gunGroup.remove(gun); // remove box
    const model = gltf.scene;
    model.position.set(0.35, -0.4, -0.6);
    model.scale.set(0.5, 0.5, 0.5);
    gunGroup.add(model);
});

function updateGunEffect() {
  // Swaying effect while moving
  const t = performance.now() * 0.002;
  const isMoving = Math.abs(input.moveX) > 0 || Math.abs(input.moveY) > 0;
  
  if(isMoving) {
      gunGroup.position.y = Math.sin(t * 4) * 0.02;
      gunGroup.position.x = Math.cos(t * 2) * 0.01;
  }
}

/* =====================
   GAME LOOP
===================== */
function animate() {
  requestAnimationFrame(animate);

  // Movement Logic (Assuming input object from your HTML)
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  forward.y = 0; right.y = 0;
  
  camera.position.addScaledVector(forward, -input.moveY * 0.12);
  camera.position.addScaledVector(right, input.moveX * 0.12);

  updateEnemies();
  updateGunEffect();

  renderer.render(scene, camera);
}
