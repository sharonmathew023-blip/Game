import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

// IMPORTANT: tell Three.js where models + textures live
loader.setPath('./assets/models/');

loader.load(
  'gun.glb',
  (gltf) => {
    const gunModel = gltf.scene;

    // Fix materials + textures
    gunModel.traverse((child) => {
      if (child.isMesh) {
        child.material.needsUpdate = true;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    gunModel.scale.set(0.4, 0.4, 0.4);
    gunModel.position.set(0.5, -0.5, -1);
    gunModel.rotation.set(0, Math.PI, 0);

    camera.add(gunModel);
    gameState.gunMesh = gunModel;
  },
  undefined,
  (error) => console.error('Gun load failed', error)
);
