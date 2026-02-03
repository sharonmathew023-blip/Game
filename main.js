import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
loader.load(
  'assets/models/gun.glb',  // correct path
  (gltf) => {
    const gunModel = gltf.scene;
    gunModel.scale.set(0.4, 0.4, 0.4); // adjust size
    gunModel.position.set(0.5, -0.5, -1); // adjust placement
    gunModel.rotation.set(0, Math.PI, 0); // rotate if backwards
    camera.add(gunModel);
    gameState.gunMesh = gunModel; // so your shooting code works
  },
  undefined,
  (error) => console.error('Gun load failed', error)
);
