/* =====================
   WORLD
===================== */

// FLOOR
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.9,
    metalness: 0
  })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// WALLS
function wall(x, z, r = 0) {
  const w = new THREE.Mesh(
    new THREE.BoxGeometry(200, 20, 2),
    new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 1
    })
  );
  w.position.set(x, 10, z);
  w.rotation.y = r;
  w.castShadow = true;
  w.receiveShadow = true;
  scene.add(w);
}

wall(0, -100);
wall(0, 100);
wall(-100, 0, Math.PI / 2);
wall(100, 0, Math.PI / 2);

/* =====================
   LIGHTING
===================== */

scene.background = new THREE.Color(0x050505);

scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(10, 20, 10);
sun.castShadow = true;
scene.add(sun);

const fill = new THREE.DirectionalLight(0x88aaff, 0.4);
fill.position.set(-10, 10, -10);
scene.add(fill);

/* =====================
   PLAYER
===================== */

const player = new THREE.Object3D();
player.position.set(0, 0, 0);
scene.add(player);

/* =====================
   ENEMIES
===================== */

const enemies = [];
const enemyGeo = new THREE.BoxGeometry(1, 2, 1);
const enemyMat = new THREE.MeshStandardMaterial({ color: 0x8b0000 });

for (let i = 0; i < 8; i++) {
  const e = new THREE.Mesh(enemyGeo, enemyMat);

  const angle = (i / 8) * Math.PI * 2;
  e.position.set(
    Math.cos(angle) * 25,
    1,
    Math.sin(angle) * 25
  );

  e.userData.hp = 30;
  e.castShadow = true;

  enemies.push(e);
  scene.add(e);
}

function updateEnemies() {
  enemies.forEach((e, i) => {
    const dir = new THREE.Vector3()
      .subVectors(player.position, e.position)
      .normalize();

    e.position.addScaledVector(dir, 0.025);
    e.position.y = 1;
    e.lookAt(player.position);

    // separation
    enemies.forEach((o, j) => {
      if (i !== j) {
        const d = e.position.distanceTo(o.position);
        if (d < 1.2) {
          const push = new THREE.Vector3()
            .subVectors(e.position, o.position)
            .normalize()
            .multiplyScalar(0.02);
          e.position.add(push);
        }
      }
    });
  });
}

/* =====================
   GUN
===================== */

const gunGroup = new THREE.Group();
camera.add(gunGroup);
scene.add(camera);

const gun = new THREE.Mesh(
  new THREE.BoxGeometry(0.3, 0.2, 1),
  new THREE.MeshStandardMaterial({ color: 0x222222 })
);
gun.position.z = -0.8;
gunGroup.add(gun);

function updateGun() {
  const t = performance.now() * 0.002;

  gunGroup.position.x = 0.35 + Math.sin(t) * 0.01;
  gunGroup.position.y = -0.35 + Math.abs(Math.sin(t * 2)) * 0.02;
  gunGroup.position.z = 0;

  gunGroup.rotation.z = Math.sin(t) * 0.02;
}

function fireGun() {
  gun.position.z = -0.7;
  setTimeout(() => gun.position.z = -0.8, 60);
}

/* =====================
   GAME LOOP
===================== */

function animate() {
  requestAnimationFrame(animate);

  updateEnemies();
  updateGun();

  renderer.render(scene, camera);
}

animate();
