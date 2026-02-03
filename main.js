import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const loader = new GLTFLoader();
loader.load('path/to/gun.glb', function(gltf){
    const model = gltf.scene;
    model.position.set(0.5, -0.5, -1);
    camera.add(model); // Replaces the BoxGeometry
});
