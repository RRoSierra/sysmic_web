/* ==========================================================================
   ssl-explode.js — 3D URDF viewer with scroll-driven exploded view
   Uses: three.js r170 (import map), urdf-loader 0.13.1 (CDN), anime.js 3.2.2 (UMD)
   ========================================================================== */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------------------------------------------------------------------------
// EXPLODE_GROUPS: material-name prefix → { offset, label }
// All meshes whose material name starts with a group's prefix share that offset.
// ---------------------------------------------------------------------------
const EXPLODE_GROUPS = {
  chasis: {
    prefixes: ['base_back', 'base_front', 'base_lateral', 'base_link',
               'base_dado', 'base_motor', 'base_cap'],
    offset: new THREE.Vector3(0, 0, 0),
    label: 'Chasis'
  },
  carroceria: {
    prefixes: ['base_case_body', 'base_case_top', 'base_corona'],
    offset: new THREE.Vector3(0, 3, 0),
    label: 'Carrocería'
  },
  electronica: {
    prefixes: ['board'],
    offset: new THREE.Vector3(0, 1.5, 0),
    label: 'Electrónica'
  },
  bateria: {
    prefixes: ['battery'],
    offset: new THREE.Vector3(-3, 0, 0),
    label: 'Batería'
  },
  dribbler: {
    prefixes: ['dribbler_base', 'dribbler_motor', 'dribbler_tapa'],
    offset: new THREE.Vector3(0, 0, 3),
    label: 'Dribbler'
  },
  kicker: {
    prefixes: ['soportesolenoide'],
    offset: new THREE.Vector3(2, 0, 2),
    label: 'Kicker'
  },
  ruedas: {
    prefixes: ['wheel_base', 'wheel_ring', 'wheel_top', 'wheely',
               'goma', 'part_2', 'part_3', 'part_4', 'part_5', 'part_6',
               'r_acople'],
    offset: new THREE.Vector3(0, -2, 0),
    label: 'Ruedas'
  }
};

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const MODEL_PATH = 'assets/models/robot.urdf';
const MAX_PIXEL_RATIO = 2;
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------------------
// Scene setup
// ---------------------------------------------------------------------------
const canvas = document.getElementById('ssl-canvas');
if (!canvas) { throw new Error('No #ssl-canvas found'); }

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  40,
  canvas.clientWidth / canvas.clientHeight,
  0.1,
  100
);
camera.position.set(8, 6, 10);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 1.5, 0);
controls.autoRotate = false;
controls.enablePan = false;
controls.minDistance = 4;
controls.maxDistance = 25;

// Lights
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
dirLight.position.set(5, 8, 6);
scene.add(dirLight);
const fillLight = new THREE.DirectionalLight(0x88ccff, 0.5);
fillLight.position.set(-4, 3, -5);
scene.add(fillLight);

// Subtle ground grid (faint reference plane)
const gridHelper = new THREE.GridHelper(20, 20, 0x333333, 0x222222);
gridHelper.position.y = -0.01;
scene.add(gridHelper);

// ---------------------------------------------------------------------------
// Load URDF
// ---------------------------------------------------------------------------
let robot = null;
let meshGroupMap = new Map(); // mesh.uuid → groupName
let originalPositions = new Map(); // mesh.uuid → THREE.Vector3
let explodeTimeline = null;
// Offsets in EXPLODE_GROUPS were authored for a robot of radius ≈1.5; rescaled at runtime.
let modelRadius = 1.5;

async function loadURDF() {
  window.THREE = THREE;

  let URDFLoader;
  try {
    const urdfModule = await import('https://cdn.jsdelivr.net/npm/urdf-loader@0.13.1/+esm');
    URDFLoader = urdfModule.default || urdfModule.URDFLoader;
  } catch {
    console.warn('urdf-loader ESM import failed, falling back to UMD');
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/urdf-loader@0.13.1/dist/urdf-loader.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    URDFLoader = window.URDFLoader;
  }

  if (!URDFLoader) throw new Error('URDFLoader not available');

  const loader = new URDFLoader();
  // URDF refs use package://assets/<file>.stl → served from assets/models/
  loader.packages = { assets: 'assets/models/' };
  loader.fetchOptions = { mode: 'cors' };

  return new Promise((resolve, reject) => {
    loader.load(
      MODEL_PATH,
      (robotObj) => resolve(robotObj),
      undefined,
      (err) => reject(err)
    );
  });
}

// ---------------------------------------------------------------------------
// Assign materials from URDF visual names → group assignment
// ---------------------------------------------------------------------------
function assignGroupByMaterial(mesh) {
  if (!mesh.material) return null;

  // Try to get the material name from the URDF userData
  const matName = (mesh.material.name || '').toLowerCase();

  for (const [groupName, group] of Object.entries(EXPLODE_GROUPS)) {
    for (const prefix of group.prefixes) {
      if (matName.startsWith(prefix.toLowerCase()) || matName.includes(prefix.toLowerCase())) {
        return groupName;
      }
    }
  }

  // Fallback: assign to chasis
  return 'chasis';
}

// ---------------------------------------------------------------------------
// Build explode map: iterate all meshes, assign groups, store originals
// ---------------------------------------------------------------------------
function buildExplodeMap(root) {
  const meshes = [];
  root.traverse((child) => {
    if (child.isMesh) {
      meshes.push(child);
    }
  });

  meshes.forEach((mesh) => {
    const groupName = assignGroupByMaterial(mesh);
    meshGroupMap.set(mesh.uuid, groupName);
    originalPositions.set(mesh.uuid, mesh.position.clone());
  });

  return meshes;
}

// ---------------------------------------------------------------------------
// Create anime.js timeline for explode (paused, seek by scroll)
// ---------------------------------------------------------------------------
function createExplodeTimeline(meshes) {
  if (typeof anime === 'undefined') {
    console.warn('anime.js not loaded, explode disabled');
    return null;
  }

  const tl = anime.timeline({
    autoplay: false,
    easing: 'easeInOutCubic'
  });

  // For each group, animate from original position to exploded position
  Object.entries(EXPLODE_GROUPS).forEach(([groupName, group]) => {
    const groupMeshes = meshes.filter(
      (m) => meshGroupMap.get(m.uuid) === groupName
    );

    if (groupMeshes.length === 0 || group.offset.length() < 0.01) return;

    groupMeshes.forEach((mesh) => {
      const orig = originalPositions.get(mesh.uuid);
      // Offsets were authored for a model of radius ≈1.5; rescale to the real one
      const scaled = group.offset.clone().multiplyScalar(modelRadius / 1.5);
      // Convert the world-space offset into the mesh's local space
      const parentQuat = new THREE.Quaternion();
      mesh.parent.getWorldQuaternion(parentQuat);
      const target = orig.clone().add(scaled.applyQuaternion(parentQuat.invert()));

      tl.add({
        targets: mesh.position,
        x: target.x,
        y: target.y,
        z: target.z,
        duration: 1000
      }, 0); // all start at 0
    });
  });

  return tl;
}

// ---------------------------------------------------------------------------
// Scroll → progress → timeline.seek
// ---------------------------------------------------------------------------
function setupScrollSync(timeline) {
  const stage = document.querySelector('.ssl-stage');
  if (!stage || !timeline) return;

  const duration = timeline.duration;

  function onScroll() {
    const rect = stage.getBoundingClientRect();
    const stageHeight = stage.offsetHeight - window.innerHeight;
    const scrolled = -rect.top;
    let p = Math.max(0, Math.min(1, scrolled / stageHeight));

    timeline.seek(p * duration);

    // Expose for debugging
    window.__sslProgress = p;
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // initial
}

// ---------------------------------------------------------------------------
// Wheel spin animation (separate from explode)
// ---------------------------------------------------------------------------
function setupWheelSpin(robot) {
  if (REDUCED_MOTION || !robot || !robot.joints) return;

  // Joint names from URDF
  const wheelJoints = [
    'wheellb_continuous',
    'wheelrb_continuous',
    'wheelrf_continuous',
    'wheellf_continuous'
  ];

  let angle = 0;
  function spinWheels() {
    angle += 0.05;
    wheelJoints.forEach((jName) => {
      const joint = robot.joints[jName];
      if (joint && joint.setAngle) {
        joint.setAngle(angle);
      }
    });
    requestAnimationFrame(spinWheels);
  }

  spinWheels();
}

// ---------------------------------------------------------------------------
// Text block IntersectionObserver (fade in/out)
// ---------------------------------------------------------------------------
function setupTextBlocks() {
  const blocks = document.querySelectorAll('.ssl-text-block');
  if (!blocks.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('in-view', entry.isIntersecting);
      });
    },
    { threshold: 0.3 }
  );

  blocks.forEach((b) => observer.observe(b));
}

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------
function onResize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', onResize);

// Frame the camera and grid around whatever the robot's real size is
// (URDF units are meters: the SSL bot is ~0.18 units, the fallback ~2.4).
function fitCameraToRobot(root) {
  root.updateMatrixWorld(true);
  const bbox = new THREE.Box3().setFromObject(root);
  const sphere = bbox.getBoundingSphere(new THREE.Sphere());
  modelRadius = Math.max(sphere.radius, 0.001);
  controls.target.copy(sphere.center);
  const fovRad = THREE.MathUtils.degToRad(camera.fov / 2);
  const dist = (sphere.radius / Math.tan(fovRad)) * 1.35;
  camera.position.set(
    sphere.center.x + dist * 0.55,
    sphere.center.y + dist * 0.45,
    sphere.center.z + dist * 0.85
  );
  camera.near = Math.max(sphere.radius / 100, 0.001);
  camera.far = sphere.radius * 60;
  camera.updateProjectionMatrix();
  gridHelper.scale.setScalar(sphere.radius / 2);
  gridHelper.position.y = bbox.min.y - sphere.radius * 0.01;
  controls.minDistance = sphere.radius * 1.2;
  controls.maxDistance = sphere.radius * 20;
}

// ---------------------------------------------------------------------------
// Fallback geometry (when URDF fails)
// ---------------------------------------------------------------------------
function createFallbackRobot() {
  console.warn('FALLBACK: Using simplified geometric robot (URDF failed to load)');
  window.__robotLoaded = false;

  const group = new THREE.Group();

  // Chassis box
  const chassisGeo = new THREE.BoxGeometry(2.4, 0.6, 2.0);
  const chassisMat = new THREE.MeshPhongMaterial({ color: 0x333333, shininess: 30 });
  const chassis = new THREE.Mesh(chassisGeo, chassisMat);
  chassis.position.y = 0.6;
  group.add(chassis);

  // Top cover
  const coverGeo = new THREE.BoxGeometry(2.2, 0.15, 1.8);
  const coverMat = new THREE.MeshPhongMaterial({ color: 0x222222, shininess: 50 });
  const cover = new THREE.Mesh(coverGeo, coverMat);
  cover.position.y = 1.0;
  group.add(cover);

  // 4 wheels (cylinders)
  const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 16);
  const wheelMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
  const wheelPositions = [
    [-1.0, 0.28, 0.9],
    [1.0, 0.28, 0.9],
    [-1.0, 0.28, -0.9],
    [1.0, 0.28, -0.9]
  ];
  wheelPositions.forEach(([x, y, z]) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(x, y, z);
    w.rotation.z = Math.PI / 2;
    group.add(w);
  });

  // Dribbler (front cylinder)
  const dribblerGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 12);
  const dribblerMat = new THREE.MeshPhongMaterial({ color: 0xcc4444 });
  const dribbler = new THREE.Mesh(dribblerGeo, dribblerMat);
  dribbler.position.set(0, 0.4, 1.1);
  dribbler.rotation.z = Math.PI / 2;
  group.add(dribbler);

  // Kicker (box)
  const kickerGeo = new THREE.BoxGeometry(0.3, 0.2, 0.15);
  const kickerMat = new THREE.MeshPhongMaterial({ color: 0x4488cc });
  const kicker = new THREE.Mesh(kickerGeo, kickerMat);
  kicker.position.set(0, 0.4, 1.05);
  group.add(kicker);

  scene.add(group);

  // Build explode map for fallback too
  buildExplodeMap(group);
  const meshes = [];
  group.traverse((c) => { if (c.isMesh) meshes.push(c); });

  // Manual group assignment for fallback
  meshGroupMap.clear();
  originalPositions.clear();

  chassis.userData._group = 'chasis';
  cover.userData._group = 'carroceria';
  dribbler.userData._group = 'dribbler';
  kicker.userData._group = 'kicker';

  meshes.forEach((m) => {
    const g = m.userData._group || 'chasis';
    meshGroupMap.set(m.uuid, g);
    originalPositions.set(m.uuid, m.position.clone());
  });

  explodeTimeline = createExplodeTimeline(meshes);
  setupScrollSync(explodeTimeline);

  // Mark loaded
  const stage = document.querySelector('.ssl-stage');
  if (stage) stage.classList.add('loaded');
}

// ---------------------------------------------------------------------------
// Main init
// ---------------------------------------------------------------------------
// urdf-loader resolves before the STL meshes are attached, so the bounding box
// is empty at first; wait until it stops growing (~12 stable frames), then frame.
let fitAttempts = 0;
let lastFitRadius = -1;
let stableFrames = 0;
function setupWhenMeshesReady(root) {
  root.updateMatrixWorld(true);
  const bbox = new THREE.Box3().setFromObject(root);
  let ready = false;
  if (!bbox.isEmpty() && Number.isFinite(bbox.min.x)) {
    const r = bbox.getBoundingSphere(new THREE.Sphere()).radius;
    stableFrames = Math.abs(r - lastFitRadius) < r * 0.001 ? stableFrames + 1 : 0;
    lastFitRadius = r;
    ready = stableFrames >= 12;
  }
  if (ready) {
    fitCameraToRobot(root);
    const meshes = buildExplodeMap(root);
    explodeTimeline = createExplodeTimeline(meshes);
    setupScrollSync(explodeTimeline);
    return;
  }
  if (fitAttempts < 300) {
    fitAttempts += 1;
    requestAnimationFrame(() => setupWhenMeshesReady(root));
  }
}

async function init() {
  try {
    robot = await loadURDF();
    // URDF exports use ROS convention (Z-up); three.js is Y-up, so stand the
    // robot upright: -90° about X maps model +Z onto world +Y.
    robot.rotation.x = -Math.PI / 2;
    scene.add(robot);
    window.__robotLoaded = true;

    setupWhenMeshesReady(robot);

    // Wheel spin
    setupWheelSpin(robot);

    // Mark loaded
    const stage = document.querySelector('.ssl-stage');
    if (stage) stage.classList.add('loaded');

    console.log('SSL: URDF parsed, waiting for meshes to frame scene');
  } catch (err) {
    console.error('URDF load failed:', err);
    createFallbackRobot();
  }

  setupTextBlocks();
  animate();
}

init();
