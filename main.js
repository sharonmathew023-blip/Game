import * as THREE from 'three';

/* =====================
   CONFIG & UTILS
===================== */
const CONFIG = {
    bgColor: 0x020205,
    cameraHeight: 1.6,
    moveSpeed: 6.0,
    lookSensitivity: 0.004,
    gravity: 9.8,
    playerRadius: 0.5
};

/* =====================
   CLASSES
===================== */
class Weapon {
    constructor(camera, scene) {
        this.camera = camera;
        this.scene = scene;
        this.group = new THREE.Group();
        this.recoilOffset = 0;
        this.baseZ = -0.5;

        // Gun Model (Constructed with primitives for reliability)
        this.body = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.2, 0.7),
            new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 })
        );
        this.barrel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 0.4),
            new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x00ffcc })
        );
        this.barrel.rotation.x = Math.PI / 2;
        this.barrel.position.z = -0.4;
        
        this.group.add(this.body, this.barrel);
        this.group.position.set(0.35, -0.35, this.baseZ);
        this.camera.add(this.group);

        // Muzzle Flash
        this.muzzleFlash = new THREE.PointLight(0x00ffcc, 0, 5);
        this.muzzleFlash.position.set(0, 0, -0.6);
        this.group.add(this.muzzleFlash);
        
        this.raycaster = new THREE.Raycaster();
    }

    fire(enemies, onKill) {
        // Visuals
        this.recoilOffset = 0.2;
        this.muzzleFlash.intensity = 20;
        
        // Raycast
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const hits = this.raycaster.intersectObjects(enemies.map(e => e.mesh));
        
        if (hits.length > 0) {
            const hitMesh = hits[0].object;
            const enemyInfo = enemies.find(e => e.mesh === hitMesh);
            if (enemyInfo) {
                enemyInfo.takeDamage(50, onKill);
            }
        }
    }

    update(delta) {
        this.recoilOffset = THREE.MathUtils.lerp(this.recoilOffset, 0, 15 * delta);
        this.group.position.z = this.baseZ + this.recoilOffset;
        
        if (this.muzzleFlash.intensity > 0) {
            this.muzzleFlash.intensity = THREE.MathUtils.lerp(this.muzzleFlash.intensity, 0, 20 * delta);
        }
    }
}

class Player {
    constructor(camera) {
        this.camera = camera;
        this.hp = 100;
        this.maxHp = 100;
        this.isDead = false;
        
        this.hpElement = document.getElementById('hp');
        this.hitFlash = document.getElementById('hit-flash');
        
        this.velocity = new THREE.Vector3();
    }

    takeDamage(amount) {
        if (this.isDead) return;
        this.hp -= amount;
        this.hpElement.innerText = Math.max(0, this.hp);
        
        // Hit flash effect
        this.hitFlash.style.opacity = '0.5';
        setTimeout(() => { this.hitFlash.style.opacity = '0'; }, 100);

        if (this.hp <= 0) {
            this.isDead = true;
        }
    }

    reset() {
        this.hp = this.maxHp;
        this.hpElement.innerText = this.hp;
        this.isDead = false;
        this.camera.position.set(0, CONFIG.cameraHeight, 5);
        this.camera.rotation.set(0, 0, 0);
    }
}

class Enemy {
    constructor(scene, spawnPosition) {
        this.scene = scene;
        this.hp = 100;
        this.speed = 2.0 + Math.random() * 2.0;
        this.damage = 10;
        this.attackRange = 1.5;
        this.attackCooldown = 0;
        
        const geometry = new THREE.BoxGeometry(0.8, 1.8, 0.8);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x8b0000, 
            roughness: 0.7 
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(spawnPosition);
        this.mesh.position.y = 0.9; 
        
        this.scene.add(this.mesh);
        this.isDead = false;
    }

    takeDamage(amount, onDeath) {
        if (this.isDead) return;
        this.hp -= amount;
        
        // Brief flash white on hit
        this.mesh.material.emissive.setHex(0x550000);
        setTimeout(() => {
            if (this.mesh) this.mesh.material.emissive.setHex(0x000000);
        }, 100);

        if (this.hp <= 0) {
            this.isDead = true;
            this.destroy();
            onDeath(this);
        }
    }

    update(delta, playerPosition, player) {
        if (this.isDead) return;

        const distance = this.mesh.position.distanceTo(playerPosition);

        // Move towards player
        if (distance > this.attackRange) {
            const dir = new THREE.Vector3().subVectors(playerPosition, this.mesh.position);
            dir.y = 0; 
            dir.normalize();
            this.mesh.position.addScaledVector(dir, this.speed * delta);
            this.mesh.lookAt(playerPosition.x, this.mesh.position.y, playerPosition.z);
        } else {
            // Attack player
            if (this.attackCooldown <= 0) {
                player.takeDamage(this.damage);
                this.attackCooldown = 1.0; 
            }
        }

        if (this.attackCooldown > 0) {
            this.attackCooldown -= delta;
        }
    }

    destroy() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}

class GameManager {
    constructor() {
        this.clock = new THREE.Clock();
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(CONFIG.bgColor);
        this.scene.fog = new THREE.Fog(CONFIG.bgColor, 1, 25);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.rotation.order = 'YXZ';
        
        this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        document.body.appendChild(this.renderer.domElement);

        this.player = new Player(this.camera);
        this.weapon = new Weapon(this.camera, this.scene);
        this.scene.add(this.camera);

        this.enemies = [];
        this.colliders = []; // Bounding boxes for pillars

        // Game State
        this.wave = 1;
        this.kills = 0;
        this.isRunning = true;

        // Inputs
        this.input = { x: 0, y: 0 };
        this.touchState = { joystickId: null, lookId: null, lastLook: null };
        
        // DOM
        this.joystickZone = document.getElementById('joystick-zone');
        this.knob = document.getElementById('knob');
        this.shootBtn = document.getElementById('shoot-btn');
        this.gameOverScreen = document.getElementById('game-over');

        this.initEnvironment();
        this.setupControls();
        this.startWave();

        // Bind animate
        this.animate = this.animate.bind(this);
        this.renderer.setAnimationLoop(this.animate);

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    initEnvironment() {
        // Lights
        const ambient = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambient);
        
        const flashlight = new THREE.PointLight(0xffffff, 10, 20);
        this.camera.add(flashlight);

        // Materials
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 });
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.9 });

        // Floor
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), floorMat);
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);

        // Ceiling
        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), wallMat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = 4;
        this.scene.add(ceiling);

        // Pillars
        const pillarGeo = new THREE.BoxGeometry(2, 4, 2);
        for (let i = 0; i < 30; i++) {
            const pillar = new THREE.Mesh(pillarGeo, wallMat);
            const px = (Math.random() - 0.5) * 60;
            const pz = (Math.random() - 0.5) * 60;
            
            // Keep center clear
            if (Math.abs(px) < 5 && Math.abs(pz) < 5) continue;

            pillar.position.set(px, 2, pz);
            this.scene.add(pillar);

            // Setup AABB collider
            const box = new THREE.Box3().setFromObject(pillar);
            this.colliders.push(box);
        }
    }

    setupControls() {
        // Prevent default touch behaviors
        document.body.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

        window.addEventListener('touchstart', (e) => {
            if (!this.isRunning) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                
                if (touch.target === this.joystickZone || touch.target === this.knob) {
                    this.touchState.joystickId = touch.identifier;
                    this.handleJoystick(touch);
                } else if (touch.target === this.shootBtn) {
                    this.weapon.fire(this.enemies, this.onEnemyKill.bind(this));
                } else {
                    // Look control area
                    this.touchState.lookId = touch.identifier;
                    this.touchState.lastLook = { x: touch.clientX, y: touch.clientY };
                }
            }
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (!this.isRunning) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                
                if (touch.identifier === this.touchState.joystickId) {
                    this.handleJoystick(touch);
                } else if (touch.identifier === this.touchState.lookId && this.touchState.lastLook) {
                    const dx = touch.clientX - this.touchState.lastLook.x;
                    const dy = touch.clientY - this.touchState.lastLook.y;
                    
                    this.camera.rotation.y -= dx * CONFIG.lookSensitivity;
                    this.camera.rotation.x -= dy * CONFIG.lookSensitivity;
                    this.camera.rotation.x = Math.max(-Math.PI/2.2, Math.min(Math.PI/2.2, this.camera.rotation.x));
                    
                    this.touchState.lastLook = { x: touch.clientX, y: touch.clientY };
                }
            }
        }, { passive: false });

        window.addEventListener('touchend', (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === this.touchState.joystickId) {
                    this.touchState.joystickId = null;
                    this.input = { x: 0, y: 0 };
                    this.knob.style.transform = 'translate(-50%, -50%)';
                } else if (touch.identifier === this.touchState.lookId) {
                    this.touchState.lookId = null;
                    this.touchState.lastLook = null;
                }
            }
        });

        document.getElementById('restart-btn').addEventListener('click', () => this.restartGame());
    }

    handleJoystick(touch) {
        const rect = this.joystickZone.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const dx = touch.clientX - centerX;
        const dy = touch.clientY - centerY;
        
        const maxDist = rect.width / 2;
        const dist = Math.min(Math.hypot(dx, dy), maxDist);
        const angle = Math.atan2(dy, dx);
        
        this.input.x = Math.cos(angle) * (dist / maxDist);
        this.input.y = Math.sin(angle) * (dist / maxDist);
        
        const knobX = Math.cos(angle) * dist;
        const knobY = Math.sin(angle) * dist;
        this.knob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
    }

    startWave() {
        document.getElementById('wave').innerText = this.wave;
        const count = 3 + (this.wave * 2);
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 15 + Math.random() * 10;
            const pos = new THREE.Vector3(
                this.camera.position.x + Math.cos(angle) * distance,
                0,
                this.camera.position.z + Math.sin(angle) * distance
            );
            this.enemies.push(new Enemy(this.scene, pos));
        }
    }

    onEnemyKill(enemy) {
        this.enemies = this.enemies.filter(e => e !== enemy);
        this.kills++;
        document.getElementById('kills').innerText = this.kills;

        if (this.enemies.length === 0) {
            this.wave++;
            setTimeout(() => this.startWave(), 2000);
        }
    }

    handleMovement(delta) {
        if (this.input.x === 0 && this.input.y === 0) return;

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        forward.y = 0; right.y = 0;
        forward.normalize(); right.normalize();

        const moveDir = new THREE.Vector3()
            .addScaledVector(forward, -this.input.y)
            .addScaledVector(right, this.input.x)
            .normalize();

        const velocity = moveDir.multiplyScalar(CONFIG.moveSpeed * delta);
        const nextPos = this.camera.position.clone().add(velocity);

        // Simple sliding collision
        let canMoveX = true;
        let canMoveZ = true;

        const playerBoxX = new THREE.Box3(
            new THREE.Vector3(nextPos.x - CONFIG.playerRadius, 0, this.camera.position.z - CONFIG.playerRadius),
            new THREE.Vector3(nextPos.x + CONFIG.playerRadius, 2, this.camera.position.z + CONFIG.playerRadius)
        );
        const playerBoxZ = new THREE.Box3(
            new THREE.Vector3(this.camera.position.x - CONFIG.playerRadius, 0, nextPos.z - CONFIG.playerRadius),
            new THREE.Vector3(this.camera.position.x + CONFIG.playerRadius, 2, nextPos.z + CONFIG.playerRadius)
        );

        for (const box of this.colliders) {
            if (box.intersectsBox(playerBoxX)) canMoveX = false;
            if (box.intersectsBox(playerBoxZ)) canMoveZ = false;
        }

        if (canMoveX) this.camera.position.x = nextPos.x;
        if (canMoveZ) this.camera.position.z = nextPos.z;
    }

    endGame() {
        this.isRunning = false;
        document.getElementById('final-kills').innerText = this.kills;
        document.getElementById('final-wave').innerText = this.wave;
        this.gameOverScreen.style.display = 'flex';
    }

    restartGame() {
        this.enemies.forEach(e => e.destroy());
        this.enemies = [];
        this.kills = 0;
        this.wave = 1;
        document.getElementById('kills').innerText = '0';
        document.getElementById('wave').innerText = '1';
        
        this.player.reset();
        this.gameOverScreen.style.display = 'none';
        this.isRunning = true;
        this.startWave();
    }

    animate() {
        const delta = Math.min(this.clock.getDelta(), 0.1);

        if (this.isRunning) {
            this.handleMovement(delta);
            this.weapon.update(delta);
            
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                this.enemies[i].update(delta, this.camera.position, this.player);
            }

            if (this.player.isDead) {
                this.endGame();
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Boot
const game = new GameManager();
           
