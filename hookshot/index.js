import * as THREE from 'three';
import {scene, renderer, camera, runtime, world, physics, ui, app, appManager} from 'app';

(async () => {
  const u = './hookshot.glb';
  const fileUrl = app.files[u];
  const res = await fetch(fileUrl);
  const file = await res.blob();
  file.name = u;
  let mesh = await runtime.loadFile(file, {
    optimize: false,
  });
  app.object.add(mesh);
})();

const rayColor = 0x64b5f6;
const makeRayMesh = () => {
  const ray = new THREE.Mesh(
    new THREE.CylinderBufferGeometry(0.002, 0.002, 1, 3, 1)
      .applyMatrix4(new THREE.Matrix4().makeTranslation(0, 1/2, 0))
      .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI/2))),
    new THREE.MeshBasicMaterial({
      color: rayColor,
    })
  );
  ray.frustumCulled = false;
  return ray;
};

const rayMesh = makeRayMesh();
rayMesh.visible = false;
rayMesh.target = new THREE.Vector3();
scene.add(rayMesh);

window.addEventListener('mousedown', e => {
  const currentWeapon = appManager.getGrab('right');
  const grabbed = currentWeapon === app.object;
  if (grabbed && e.button === 0) {
    const transforms = physics.getRigTransforms();
    const {position, quaternion} = transforms[0];
    
    const result = physics.raycast(position, quaternion);
    if (result) { // world geometry raycast
      rayMesh.target.fromArray(result.point);
      rayMesh.visible = true;
      
      physics.setGravity(false);
      physics.velocity.setScalar(0);
    } else {
      rayMesh.visible = false;
      
      physics.setGravity(true);
    }
  }
});
window.addEventListener('mouseup', e => {
  if (e.button === 0 && rayMesh.visible) {
    rayMesh.visible = false;
    
    physics.setGravity(true);

    const transforms = physics.getRigTransforms();
    const {position} = transforms[0];
    const direction = rayMesh.target.clone().sub(position).normalize();
    physics.velocity.copy(direction).multiplyScalar(10);
  }
});

let lastTimestamp = performance.now();
renderer.setAnimationLoop((timestamp, frame) => {
  timestamp = timestamp || performance.now();
  const timeDiff = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
  lastTimestamp = timestamp;

  if (rayMesh.visible) {
    const transforms = physics.getRigTransforms();
    const {position} = transforms[0];

    rayMesh.position.copy(position);
    rayMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), rayMesh.target.clone().sub(position).normalize());
    rayMesh.scale.z = rayMesh.target.distanceTo(position);    
    
    const direction = rayMesh.target.clone().sub(position)
      .normalize()
      .multiplyScalar(10 * timeDiff);

    physics.offset.add(direction);
  }
});