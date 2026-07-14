import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene variables
export let scene, camera, renderer, controls;
export let activeCamera, persCamera, orthoCamera;
export let gridHelper, ambientLight, dirLight;
export const sceneObjects = [];
export let selectedObject = null;

// Viewport options state
let shadingMode = 'solid';
let xrayActive = false;
let gridActive = true;

// Animation playback state
let isPlaying = false;
let currentFrame = 1;
let startFrame = 1;
let endFrame = 250;
let animationFrameId = null;

// active transform operator state (G, R, S keyboard grabs)
export let activeTransformMode = null; // 'translate', 'rotate', 'scale'
export let transformAxis = null; // 'x', 'y', 'z', or null (all plane)
let initialMousePos = { x: 0, y: 0 };
let initialObjectState = { position: null, rotation: null, scale: null };

// F9 Adjust Last Operation state
let lastOperationData = null;

// Initialize 3D Engine
function init() {
  const container = document.getElementById('viewport-container');
  const canvas = document.getElementById('three-canvas');
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x212121); // Blender gray floor

  // Cameras
  persCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  persCamera.position.set(6, 6, 9);

  orthoCamera = new THREE.OrthographicCamera(
    width / -120, width / 120,
    height / 120, height / -120,
    0.1, 1000
  );
  orthoCamera.position.set(6, 6, 9);

  activeCamera = persCamera;

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Orbit Controls
  controls = new OrbitControls(activeCamera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 0, 0);

  // Floor Grid
  gridHelper = new THREE.GridHelper(20, 20, 0x555555, 0x333333);
  scene.add(gridHelper);

  // Lights
  ambientLight = new THREE.AmbientLight(0xffffff, 0.20);
  scene.add(ambientLight);

  dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
  dirLight.position.set(6, 12, 6);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  scene.add(dirLight);

  // Load Startup Scene (Camera, Light, Cube)
  loadStartupScene();

  // Resize Listener
  window.addEventListener('resize', onWindowResize);

  // Event bindings for keyboard shortcuts
  window.addEventListener('keydown', handleKeyboardShortcuts);

  // Render loop
  animate();
}

// Blender Default Startup Scene Setup
function loadStartupScene() {
  // 1. Cube
  const cubeGeo = new THREE.BoxGeometry(2, 2, 2);
  const cubeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.5 });
  const cube = new THREE.Mesh(cubeGeo, cubeMat);
  cube.name = "Cube";
  cube.castShadow = true;
  cube.receiveShadow = true;
  addObjectToScene(cube);

  // 2. Camera Mock Mesh
  const camGeo = new THREE.ConeGeometry(0.4, 0.8, 4);
  camGeo.rotateX(Math.PI / 2);
  const camMat = new THREE.MeshBasicMaterial({ color: 0x8e8e8e, wireframe: true });
  const cameraHelper = new THREE.Mesh(camGeo, camMat);
  cameraHelper.name = "Camera";
  cameraHelper.position.set(-4, 3, 5);
  cameraHelper.lookAt(0, 0, 0);
  addObjectToScene(cameraHelper);

  // 3. Light Mock Mesh
  const lightGeo = new THREE.SphereGeometry(0.18, 8, 8);
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
  const lightHelper = new THREE.Mesh(lightGeo, lightMat);
  lightHelper.name = "Light";
  lightHelper.position.set(5, 8, 5);
  addObjectToScene(lightHelper);

  // Select Cube
  selectObject(cube);
}

// Add objects helper
export function addObjectToScene(object) {
  scene.add(object);
  sceneObjects.push(object);

  object.userData = {
    uuid: object.uuid,
    modifiers: []
  };

  updateOutliner();
}

// Delete Selected
export function deleteSelectedObject() {
  if (!selectedObject) return;
  if (selectedObject.name === "Camera" || selectedObject.name === "Light") {
    alert("Cannot delete startup Camera or Light helper nodes.");
    return;
  }

  scene.remove(selectedObject);
  const idx = sceneObjects.indexOf(selectedObject);
  if (idx > -1) sceneObjects.splice(idx, 1);

  selectedObject = null;
  selectObject(null);
  updateOutliner();
}

// Create new meshes & show F9 last operation parameters
export function createNewMesh(type, config = {}) {
  let geo, mat;
  mat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.5 });

  const radius = config.radius !== undefined ? parseFloat(config.radius) : 1.0;
  const size = config.size !== undefined ? parseFloat(config.size) : 1.5;
  const segments = config.segments !== undefined ? parseInt(config.segments) : 16;
  const rings = config.rings !== undefined ? parseInt(config.rings) : 16;
  const height = config.height !== undefined ? parseFloat(config.height) : 1.8;

  switch(type) {
    case 'cube':
      geo = new THREE.BoxGeometry(size, size, size);
      break;
    case 'sphere':
      geo = new THREE.SphereGeometry(radius, segments, rings);
      break;
    case 'cylinder':
      geo = new THREE.CylinderGeometry(radius, radius, height, segments);
      break;
    case 'cone':
      geo = new THREE.ConeGeometry(radius, height, segments);
      break;
    case 'torus':
      geo = new THREE.TorusGeometry(radius, radius * 0.3, 8, segments);
      break;
    default:
      return;
  }

  const namePrefix = type.charAt(0).toUpperCase() + type.slice(1);
  const count = sceneObjects.filter(o => o.name.startsWith(namePrefix)).length;
  const finalName = count > 0 ? `${namePrefix}.${String(count).padStart(3, '0')}` : namePrefix;

  // If we are modifying parameters of the last operation (re-building geometry)
  if (config.isUpdate && selectedObject) {
    selectedObject.geometry.dispose();
    selectedObject.geometry = geo;
    updateOutliner();
    fillPropertiesForms(selectedObject);
    return;
  }

  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = finalName;
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Offset position slightly from center
  mesh.position.set((Math.random() - 0.5) * 1.5, 0, (Math.random() - 0.5) * 1.5);

  addObjectToScene(mesh);
  selectObject(mesh);

  // Setup last operation data for F9 panel
  lastOperationData = {
    type: type,
    size: size,
    radius: radius,
    segments: segments,
    rings: rings,
    height: height
  };
  triggerF9Panel();
}

// Select an object
export function selectObject(obj) {
  if (selectedObject && selectedObject.material && selectedObject.material.emissive) {
    selectedObject.material.emissive.setHex(0x000000);
  }

  selectedObject = obj;

  if (selectedObject) {
    if (selectedObject.material && selectedObject.material.emissive) {
      selectedObject.material.emissive.setHex(0x3d1a00); // Orange highlight outline glow
    }

    document.getElementById('selection-info').innerText = `Active: ${selectedObject.name} | Verts: ${selectedObject.geometry ? selectedObject.geometry.attributes.position.count : 0}`;
    fillPropertiesForms(selectedObject);
  } else {
    document.getElementById('selection-info').innerText = "Select an object to inspect";
    clearPropertiesForms();
  }

  highlightOutlinerNode(selectedObject);
}

// Sync selection to form inputs
function fillPropertiesForms(obj) {
  // Main Panel renaming
  document.getElementById('prop-object-title').innerText = `Object Properties: ${obj.name}`;
  document.getElementById('obj-name-input').value = obj.name;

  // Location
  document.getElementById('loc-x').value = obj.position.x.toFixed(3);
  document.getElementById('loc-y').value = obj.position.y.toFixed(3);
  document.getElementById('loc-z').value = obj.position.z.toFixed(3);

  // Rotation (radians to Euler degrees)
  document.getElementById('rot-x').value = Math.round(THREE.MathUtils.radToDeg(obj.rotation.x));
  document.getElementById('rot-y').value = Math.round(THREE.MathUtils.radToDeg(obj.rotation.y));
  document.getElementById('rot-z').value = Math.round(THREE.MathUtils.radToDeg(obj.rotation.z));

  // Scale
  document.getElementById('scale-x').value = obj.scale.x.toFixed(3);
  document.getElementById('scale-y').value = obj.scale.y.toFixed(3);
  document.getElementById('scale-z').value = obj.scale.z.toFixed(3);

  // Visibility
  document.getElementById('obj-visible').checked = obj.visible;

  // Material
  if (obj.material) {
    document.getElementById('mat-name-input').value = obj.name + "_Mat";
    document.getElementById('mat-color-input').value = "#" + obj.material.color.getHexString();
    
    if (obj.material.roughness !== undefined) document.getElementById('mat-roughness').value = obj.material.roughness;
    if (obj.material.metalness !== undefined) document.getElementById('mat-metalness').value = obj.material.metalness;
  }

  // Sidebar (N-Panel) values
  document.getElementById('n-loc-x').value = obj.position.x.toFixed(3);
  document.getElementById('n-loc-y').value = obj.position.y.toFixed(3);
  document.getElementById('n-loc-z').value = obj.position.z.toFixed(3);
  
  document.getElementById('n-rot-x').value = Math.round(THREE.MathUtils.radToDeg(obj.rotation.x));
  document.getElementById('n-rot-y').value = Math.round(THREE.MathUtils.radToDeg(obj.rotation.y));
  document.getElementById('n-rot-z').value = Math.round(THREE.MathUtils.radToDeg(obj.rotation.z));
  
  document.getElementById('n-scale-x').value = obj.scale.x.toFixed(3);
  document.getElementById('n-scale-y').value = obj.scale.y.toFixed(3);
  document.getElementById('n-scale-z').value = obj.scale.z.toFixed(3);

  // Modifiers
  renderModifiersList(obj);
}

function clearPropertiesForms() {
  document.getElementById('prop-object-title').innerText = "Object Properties";
  document.getElementById('obj-name-input').value = "";
  
  const ids = ['loc-x','loc-y','loc-z','rot-x','rot-y','rot-z','scale-x','scale-y','scale-z',
               'n-loc-x','n-loc-y','n-loc-z','n-rot-x','n-rot-y','n-rot-z','n-scale-x','n-scale-y','n-scale-z'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = id.includes('scale') ? "1.000" : "0.000";
  });
}

// Bind input changes back to object
export function updateObjectFromForms(source) {
  if (!selectedObject) return;

  if (source === 'properties') {
    // Rename
    const newName = document.getElementById('obj-name-input').value.trim();
    if (newName && newName !== selectedObject.name) {
      selectedObject.name = newName;
      updateOutliner();
    }

    selectedObject.position.set(
      parseFloat(document.getElementById('loc-x').value) || 0,
      parseFloat(document.getElementById('loc-y').value) || 0,
      parseFloat(document.getElementById('loc-z').value) || 0
    );

    selectedObject.rotation.set(
      THREE.MathUtils.degToRad(parseFloat(document.getElementById('rot-x').value) || 0),
      THREE.MathUtils.degToRad(parseFloat(document.getElementById('rot-y').value) || 0),
      THREE.MathUtils.degToRad(parseFloat(document.getElementById('rot-z').value) || 0)
    );

    selectedObject.scale.set(
      parseFloat(document.getElementById('scale-x').value) || 1,
      parseFloat(document.getElementById('scale-y').value) || 1,
      parseFloat(document.getElementById('scale-z').value) || 1
    );

    selectedObject.visible = document.getElementById('obj-visible').checked;

    if (selectedObject.material) {
      selectedObject.material.color.set(document.getElementById('mat-color-input').value);
      selectedObject.material.roughness = parseFloat(document.getElementById('mat-roughness').value) || 0.5;
      selectedObject.material.metalness = parseFloat(document.getElementById('mat-metalness').value) || 0.0;
    }

    // Sync to N-panel
    document.getElementById('n-loc-x').value = selectedObject.position.x.toFixed(3);
    document.getElementById('n-loc-y').value = selectedObject.position.y.toFixed(3);
    document.getElementById('n-loc-z').value = selectedObject.position.z.toFixed(3);
    document.getElementById('n-rot-x').value = Math.round(THREE.MathUtils.radToDeg(selectedObject.rotation.x));
    document.getElementById('n-rot-y').value = Math.round(THREE.MathUtils.radToDeg(selectedObject.rotation.y));
    document.getElementById('n-rot-z').value = Math.round(THREE.MathUtils.radToDeg(selectedObject.rotation.z));
    document.getElementById('n-scale-x').value = selectedObject.scale.x.toFixed(3);
    document.getElementById('n-scale-y').value = selectedObject.scale.y.toFixed(3);
    document.getElementById('n-scale-z').value = selectedObject.scale.z.toFixed(3);

  } else if (source === 'npanel') {
    selectedObject.position.set(
      parseFloat(document.getElementById('n-loc-x').value) || 0,
      parseFloat(document.getElementById('n-loc-y').value) || 0,
      parseFloat(document.getElementById('n-loc-z').value) || 0
    );

    selectedObject.rotation.set(
      THREE.MathUtils.degToRad(parseFloat(document.getElementById('n-rot-x').value) || 0),
      THREE.MathUtils.degToRad(parseFloat(document.getElementById('n-rot-y').value) || 0),
      THREE.MathUtils.degToRad(parseFloat(document.getElementById('n-rot-z').value) || 0)
    );

    selectedObject.scale.set(
      parseFloat(document.getElementById('n-scale-x').value) || 1,
      parseFloat(document.getElementById('n-scale-y').value) || 1,
      parseFloat(document.getElementById('n-scale-z').value) || 1
    );

    // Sync to properties panel
    document.getElementById('loc-x').value = selectedObject.position.x.toFixed(3);
    document.getElementById('loc-y').value = selectedObject.position.y.toFixed(3);
    document.getElementById('loc-z').value = selectedObject.position.z.toFixed(3);
    document.getElementById('rot-x').value = Math.round(THREE.MathUtils.radToDeg(selectedObject.rotation.x));
    document.getElementById('rot-y').value = Math.round(THREE.MathUtils.radToDeg(selectedObject.rotation.y));
    document.getElementById('rot-z').value = Math.round(THREE.MathUtils.radToDeg(selectedObject.rotation.z));
    document.getElementById('scale-x').value = selectedObject.scale.x.toFixed(3);
    document.getElementById('scale-y').value = selectedObject.scale.y.toFixed(3);
    document.getElementById('scale-z').value = selectedObject.scale.z.toFixed(3);
  }
}

// Raycast selection on viewport click
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

export function onViewportClick(event) {
  // If actively doing a keyboard grab transform, clicking confirms the transform instead!
  if (activeTransformMode) {
    confirmTransform();
    return;
  }

  const canvas = document.getElementById('three-canvas');
  const rect = canvas.getBoundingClientRect();
  
  mouse.x = ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, activeCamera);
  const intersects = raycaster.intersectObjects(sceneObjects, true);

  if (intersects.length > 0) {
    let target = intersects[0].object;
    while (target.parent && target.parent !== scene) {
      target = target.parent;
    }
    selectObject(target);
  } else {
    selectObject(null);
  }
}

// Dynamic Outliner Generation
function updateOutliner() {
  const list = document.getElementById('outliner-list');
  list.innerHTML = "";

  sceneObjects.forEach(obj => {
    const li = document.createElement('li');
    let iconName = "box";
    if (obj.name === "Camera") iconName = "video";
    else if (obj.name === "Light") iconName = "sun";

    li.innerHTML = `
      <div class="tree-item" id="node-${obj.uuid}">
        <span class="tree-icon"><i data-lucide="${iconName}"></i></span>
        <span class="tree-label">${obj.name}</span>
        <div class="tree-actions">
          <i data-lucide="${obj.visible ? 'eye' : 'eye-off'}" class="btn-toggle-vis" data-uuid="${obj.uuid}"></i>
        </div>
      </div>
    `;

    li.querySelector('.tree-item').addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-toggle-vis')) return;
      selectObject(obj);
    });

    li.querySelector('.btn-toggle-vis').addEventListener('click', () => {
      obj.visible = !obj.visible;
      updateOutliner();
      if (selectedObject === obj) {
        document.getElementById('obj-visible').checked = obj.visible;
      }
    });

    list.appendChild(li);
  });

  lucide.createIcons();
}

function highlightOutlinerNode(obj) {
  document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('selected'));
  if (obj) {
    const activeNode = document.getElementById(`node-${obj.uuid}`);
    if (activeNode) activeNode.classList.add('selected');
  }
}

// keyboard hotkeys active operator system (G, R, S)
function handleKeyboardShortcuts(event) {
  // Ignore if user is writing in input field
  if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;

  const key = event.key.toLowerCase();
  
  if (key === 'g' || key === 'r' || key === 's') {
    if (!selectedObject) return;
    event.preventDefault();
    startTransform(key);
  }

  // Axis lock while transforming
  if (activeTransformMode && (key === 'x' || key === 'y' || key === 'z')) {
    event.preventDefault();
    setTransformAxis(key);
  }

  // Cancel with Escape
  if (key === 'escape') {
    event.preventDefault();
    if (activeTransformMode) {
      cancelTransform();
    }
  }

  // Confirm with Enter
  if (key === 'enter') {
    event.preventDefault();
    if (activeTransformMode) {
      confirmTransform();
    }
  }

  // Delete Object
  if (key === 'x' || event.key === 'Delete') {
    if (activeTransformMode) return;
    event.preventDefault();
    if (selectedObject) deleteSelectedObject();
  }

  // Toggle Left Toolbar shelf (T)
  if (key === 't') {
    event.preventDefault();
    document.getElementById('left-toolbar').classList.toggle('hidden');
  }

  // Toggle Right N-Panel (N)
  if (key === 'n') {
    event.preventDefault();
    document.getElementById('n-sidebar').classList.toggle('hidden');
  }

  // Toggle Shading Pie Menu (Z)
  if (key === 'z') {
    event.preventDefault();
    const pie = document.getElementById('pie-menu');
    pie.classList.toggle('hidden');
  }
}

// Programmatically start transformations (supports virtual shortcuts)
export function startTransform(mode) {
  if (!selectedObject) return;
  if (selectedObject.name === "Camera" || selectedObject.name === "Light") return;

  // Stop Orbit controls temporarily so drag doesn't move camera
  controls.enabled = false;

  activeTransformMode = (mode === 'g' || mode === 'translate') ? 'translate' : (mode === 'r' || mode === 'rotate') ? 'rotate' : 'scale';
  transformAxis = null; // reset locking

  // Save initial state for cancellation
  initialObjectState.position = selectedObject.position.clone();
  initialObjectState.rotation = selectedObject.rotation.clone();
  initialObjectState.scale = selectedObject.scale.clone();

  // Track mouse and touch coordinate drag
  window.addEventListener('mousemove', handleTransformDrag);
  window.addEventListener('touchmove', handleTransformTouchDrag, { passive: false });

  // Show UI overlay
  const overlay = document.getElementById('transform-overlay');
  if (overlay) {
    overlay.classList.remove('hidden');
    document.getElementById('transform-label').innerText = `${activeTransformMode.charAt(0).toUpperCase() + activeTransformMode.slice(1)} Mode:`;
    updateTransformOverlayText();
  }

  // Fire UI state change callback if it exists
  if (window.onTransformStateChange) {
    window.onTransformStateChange(activeTransformMode, transformAxis);
  }
}

export function setTransformAxis(axis) {
  if (!activeTransformMode) return;
  // Toggle axis lock off if pressing the same axis again
  transformAxis = (transformAxis === axis) ? null : axis;
  updateTransformOverlayText();
  
  if (window.onTransformStateChange) {
    window.onTransformStateChange(activeTransformMode, transformAxis);
  }
}

// Manipulate position on mouse drag
function handleTransformDrag(e) {
  if (!activeTransformMode || !selectedObject) return;

  const canvas = document.getElementById('three-canvas');
  const rect = canvas.getBoundingClientRect();
  
  // Calculate relative cursor position from center of screen in web coordinates
  const cx = ((e.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
  const cy = -((e.clientY - rect.top) / canvas.clientHeight) * 2 + 1;
  
  // Basic movement delta coefficient
  const factor = activeTransformMode === 'scale' ? 2 : 5;
  const deltaX = cx * factor;
  const deltaY = cy * factor;

  // Restore initial state first to apply absolute delta cleanly
  selectedObject.position.copy(initialObjectState.position);
  selectedObject.rotation.copy(initialObjectState.rotation);
  selectedObject.scale.copy(initialObjectState.scale);

  if (activeTransformMode === 'translate') {
    if (transformAxis === 'x') selectedObject.position.x += deltaX;
    else if (transformAxis === 'y') selectedObject.position.y += deltaY;
    else if (transformAxis === 'z') selectedObject.position.z += deltaY;
    else {
      // Free move relative to camera frame orientation
      const dirRight = new THREE.Vector3(1, 0, 0).applyQuaternion(activeCamera.quaternion);
      const dirUp = new THREE.Vector3(0, 1, 0).applyQuaternion(activeCamera.quaternion);
      selectedObject.position.addScaledVector(dirRight, deltaX);
      selectedObject.position.addScaledVector(dirUp, deltaY);
    }
  } else if (activeTransformMode === 'rotate') {
    const angle = deltaX * Math.PI;
    if (transformAxis === 'x') selectedObject.rotation.x = initialObjectState.rotation.x + angle;
    else if (transformAxis === 'y') selectedObject.rotation.y = initialObjectState.rotation.y + angle;
    else if (transformAxis === 'z') selectedObject.rotation.z = initialObjectState.rotation.z + angle;
    else {
      selectedObject.rotation.y = initialObjectState.rotation.y + angle;
    }
  } else if (activeTransformMode === 'scale') {
    const s = Math.max(0.1, 1.0 + deltaX);
    if (transformAxis === 'x') selectedObject.scale.x = initialObjectState.scale.x * s;
    else if (transformAxis === 'y') selectedObject.scale.y = initialObjectState.scale.y * s;
    else if (transformAxis === 'z') selectedObject.scale.z = initialObjectState.scale.z * s;
    else {
      selectedObject.scale.set(
        initialObjectState.scale.x * s,
        initialObjectState.scale.y * s,
        initialObjectState.scale.z * s
      );
    }
  }

  // Update properties forms
  fillPropertiesForms(selectedObject);
  updateTransformOverlayText();
}

// Convert touch movements on Android into transform drag coordinates
function handleTransformTouchDrag(e) {
  if (e.touches && e.touches.length > 0) {
    e.preventDefault(); // Stop screen from scrolling
    const touch = e.touches[0];
    handleTransformDrag({
      clientX: touch.clientX,
      clientY: touch.clientY
    });
  }
}

function updateTransformOverlayText() {
  const overlayVal = document.getElementById('transform-value');
  if (!overlayVal) return;
  const axisLabel = transformAxis ? transformAxis.toUpperCase() : "Free";
  
  if (activeTransformMode === 'translate') {
    overlayVal.innerText = `X: ${selectedObject.position.x.toFixed(3)}, Y: ${selectedObject.position.y.toFixed(3)}, Z: ${selectedObject.position.z.toFixed(3)} (Axis: ${axisLabel})`;
  } else if (activeTransformMode === 'rotate') {
    const rx = Math.round(THREE.MathUtils.radToDeg(selectedObject.rotation.x));
    const ry = Math.round(THREE.MathUtils.radToDeg(selectedObject.rotation.y));
    const rz = Math.round(THREE.MathUtils.radToDeg(selectedObject.rotation.z));
    overlayVal.innerText = `X: ${rx}°, Y: ${ry}°, Z: ${rz}° (Axis: ${axisLabel})`;
  } else if (activeTransformMode === 'scale') {
    overlayVal.innerText = `X: ${selectedObject.scale.x.toFixed(3)}, Y: ${selectedObject.scale.y.toFixed(3)}, Z: ${selectedObject.scale.z.toFixed(3)} (Axis: ${axisLabel})`;
  }
}

export function confirmTransform() {
  window.removeEventListener('mousemove', handleTransformDrag);
  window.removeEventListener('touchmove', handleTransformTouchDrag);
  activeTransformMode = null;
  transformAxis = null;
  controls.enabled = true;
  const overlay = document.getElementById('transform-overlay');
  if (overlay) overlay.classList.add('hidden');
  
  if (window.onTransformStateChange) {
    window.onTransformStateChange(null, null);
  }
}

export function cancelTransform() {
  window.removeEventListener('mousemove', handleTransformDrag);
  window.removeEventListener('touchmove', handleTransformTouchDrag);
  
  if (selectedObject) {
    selectedObject.position.copy(initialObjectState.position);
    selectedObject.rotation.copy(initialObjectState.rotation);
    selectedObject.scale.copy(initialObjectState.scale);
    fillPropertiesForms(selectedObject);
  }

  activeTransformMode = null;
  transformAxis = null;
  controls.enabled = true;
  const overlay = document.getElementById('transform-overlay');
  if (overlay) overlay.classList.add('hidden');
  
  if (window.onTransformStateChange) {
    window.onTransformStateChange(null, null);
  }
}

// F9 panel creation logic (Adjust Last Operation)
function triggerF9Panel() {
  const panel = document.getElementById('f9-panel');
  const title = document.getElementById('f9-title');
  const fields = document.getElementById('f9-content-fields');
  
  if (!lastOperationData) {
    panel.classList.add('hidden');
    return;
  }

  panel.classList.remove('hidden');
  title.innerText = `Add ${lastOperationData.type.charAt(0).toUpperCase() + lastOperationData.type.slice(1)}`;
  fields.innerHTML = "";

  if (lastOperationData.type === 'cube') {
    fields.innerHTML = `
      <div class="f9-row"><label>Size</label><input type="number" step="0.1" value="${lastOperationData.size}" id="f9-cube-size"></div>
    `;
    document.getElementById('f9-cube-size').addEventListener('change', (e) => {
      lastOperationData.size = parseFloat(e.target.value) || 1.0;
      createNewMesh('cube', { size: lastOperationData.size, isUpdate: true });
    });
  } else if (lastOperationData.type === 'sphere') {
    fields.innerHTML = `
      <div class="f9-row"><label>Radius</label><input type="number" step="0.1" value="${lastOperationData.radius}" id="f9-sphere-radius"></div>
      <div class="f9-row"><label>Segments</label><input type="number" value="${lastOperationData.segments}" id="f9-sphere-seg"></div>
      <div class="f9-row"><label>Rings</label><input type="number" value="${lastOperationData.rings}" id="f9-sphere-rings"></div>
    `;
    const syncSphere = () => {
      lastOperationData.radius = parseFloat(document.getElementById('f9-sphere-radius').value) || 1.0;
      lastOperationData.segments = parseInt(document.getElementById('f9-sphere-seg').value) || 8;
      lastOperationData.rings = parseInt(document.getElementById('f9-sphere-rings').value) || 8;
      createNewMesh('sphere', { radius: lastOperationData.radius, segments: lastOperationData.segments, rings: lastOperationData.rings, isUpdate: true });
    };
    document.getElementById('f9-sphere-radius').addEventListener('change', syncSphere);
    document.getElementById('f9-sphere-seg').addEventListener('change', syncSphere);
    document.getElementById('f9-sphere-rings').addEventListener('change', syncSphere);
  } else if (lastOperationData.type === 'cylinder' || lastOperationData.type === 'cone' || lastOperationData.type === 'torus') {
    fields.innerHTML = `
      <div class="f9-row"><label>Radius</label><input type="number" step="0.1" value="${lastOperationData.radius}" id="f9-radius"></div>
      <div class="f9-row"><label>Height/Segments</label><input type="number" step="0.1" value="${lastOperationData.height || lastOperationData.segments}" id="f9-dim"></div>
    `;
    const syncMesh = () => {
      lastOperationData.radius = parseFloat(document.getElementById('f9-radius').value) || 1.0;
      const dim = parseFloat(document.getElementById('f9-dim').value) || 1.0;
      if (lastOperationData.type === 'torus') {
        createNewMesh(lastOperationData.type, { radius: lastOperationData.radius, segments: Math.round(dim), isUpdate: true });
      } else {
        createNewMesh(lastOperationData.type, { radius: lastOperationData.radius, height: dim, isUpdate: true });
      }
    };
    document.getElementById('f9-radius').addEventListener('change', syncMesh);
    document.getElementById('f9-dim').addEventListener('change', syncMesh);
  }
}

// Shading selector
export function setShadingMode(mode) {
  shadingMode = mode;
  document.querySelectorAll('.shading-btn').forEach(b => b.classList.remove('active'));
  
  const el = document.getElementById(`shade-${mode}`);
  if (el) el.classList.add('active');

  sceneObjects.forEach(obj => {
    if (!obj.material) return;
    obj.material.wireframe = (mode === 'wire');

    if (mode === 'wire') {
      // Wireframe
    } else if (mode === 'solid') {
      scene.background.setHex(0x212121);
      ambientLight.intensity = 0.20;
      dirLight.intensity = 0.85;
    } else if (mode === 'material') {
      scene.background.setHex(0x181818);
      ambientLight.intensity = 0.50;
      dirLight.intensity = 0.85;
    } else if (mode === 'render') {
      scene.background.setHex(0x0a0a0a);
      ambientLight.intensity = 0.10;
      dirLight.intensity = 1.6;
    }
  });
}

export function toggleXray() {
  xrayActive = !xrayActive;
  document.getElementById('toggle-xray').classList.toggle('active', xrayActive);
  sceneObjects.forEach(obj => {
    if (!obj.material) return;
    obj.material.transparent = xrayActive;
    obj.material.opacity = xrayActive ? 0.35 : 1.0;
  });
}

export function toggleGrid() {
  gridActive = !gridActive;
  gridHelper.visible = gridActive;
  document.getElementById('toggle-grid').classList.toggle('active', gridActive);
}

// Alignment Camera Views
export function alignCamera(axis) {
  controls.reset();
  const radius = 9;
  if (axis === 'x') activeCamera.position.set(radius, 0, 0);
  else if (axis === 'y') activeCamera.position.set(0, radius, 0);
  else if (axis === 'z') activeCamera.position.set(0, 0, radius);
  controls.update();
}

export function zoomIn() {
  if (activeCamera.isPerspectiveCamera) activeCamera.position.z -= 1.0;
  else {
    activeCamera.zoom += 0.1;
    activeCamera.updateProjectionMatrix();
  }
}

export function zoomOut() {
  if (activeCamera.isPerspectiveCamera) activeCamera.position.z += 1.0;
  else {
    activeCamera.zoom -= 0.1;
    activeCamera.updateProjectionMatrix();
  }
}

export function toggleCameraOrtho() {
  const target = controls.target.clone();
  const position = activeCamera.position.clone();

  if (activeCamera === persCamera) {
    orthoCamera.position.copy(position);
    controls.object = orthoCamera;
    activeCamera = orthoCamera;
    document.getElementById('btn-ortho').classList.add('active');
  } else {
    persCamera.position.copy(position);
    controls.object = persCamera;
    activeCamera = persCamera;
    document.getElementById('btn-ortho').classList.remove('active');
  }

  controls.target.copy(target);
  controls.update();
  onWindowResize();
}

// Window resizing
function onWindowResize() {
  const canvas = document.getElementById('three-canvas');
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  persCamera.aspect = width / height;
  persCamera.updateProjectionMatrix();

  orthoCamera.left = width / -120;
  orthoCamera.right = width / 120;
  orthoCamera.top = height / 120;
  orthoCamera.bottom = height / -120;
  orthoCamera.updateProjectionMatrix();

  renderer.setSize(width, height, false);
}

// Playback Logic
export function togglePlay() {
  isPlaying = !isPlaying;
  const playIcon = document.getElementById('play-icon');
  
  if (isPlaying) {
    playIcon.setAttribute('data-lucide', 'pause');
    document.getElementById('rendering-indicator').className = 'rendering';
    document.getElementById('rendering-indicator').innerHTML = '<i data-lucide="activity"></i> Rendering [24fps]';
    animateTimeline();
  } else {
    playIcon.setAttribute('data-lucide', 'play');
    document.getElementById('rendering-indicator').className = 'idle';
    document.getElementById('rendering-indicator').innerHTML = '<i data-lucide="activity"></i> Render Engine: Eevee';
    cancelAnimationFrame(animationFrameId);
  }
  lucide.createIcons();
}

export function updateFrame(f) {
  currentFrame = Math.max(startFrame, Math.min(endFrame, f));
  document.getElementById('frame-current').value = currentFrame;

  const container = document.getElementById('timeline-slider-container');
  const width = container.clientWidth;
  const ratio = (currentFrame - startFrame) / (endFrame - startFrame);
  const pos = ratio * width;
  document.getElementById('timeline-scrubber').style.left = `${pos}px`;

  // Rotate default cube relative to current frame
  if (sceneObjects.find(o => o.name === 'Cube')) {
    const cube = sceneObjects.find(o => o.name === 'Cube');
    cube.rotation.y = (currentFrame / 250) * Math.PI * 2;
    if (selectedObject === cube) {
      document.getElementById('rot-y').value = Math.round(THREE.MathUtils.radToDeg(cube.rotation.y));
      document.getElementById('n-rot-y').value = Math.round(THREE.MathUtils.radToDeg(cube.rotation.y));
    }
  }
}

function animateTimeline() {
  if (!isPlaying) return;
  
  currentFrame++;
  if (currentFrame > endFrame) currentFrame = startFrame;
  updateFrame(currentFrame);
  
  setTimeout(() => {
    if (isPlaying) {
      animationFrameId = requestAnimationFrame(animateTimeline);
    }
  }, 41); // ~24fps
}

// Modifiers Add/Remove
export function addModifier(type) {
  if (!selectedObject) return;
  if (selectedObject.name === "Camera" || selectedObject.name === "Light") return;

  const modifiers = selectedObject.userData.modifiers;
  if (modifiers.find(m => m.type === type)) {
    alert("Modifier already exists.");
    return;
  }

  const mod = { type: type, name: type.charAt(0).toUpperCase() + type.slice(1) };
  modifiers.push(mod);

  if (type === 'wireframe') {
    selectedObject.material.wireframe = true;
  } else if (type === 'subdivision') {
    selectedObject.scale.multiplyScalar(1.05);
  } else if (type === 'bevel') {
    selectedObject.scale.y *= 0.95;
  }

  renderModifiersList(selectedObject);
  fillPropertiesForms(selectedObject);
}

export function removeModifier(index) {
  if (!selectedObject) return;
  const modifiers = selectedObject.userData.modifiers;
  const mod = modifiers[index];

  if (mod.type === 'wireframe') {
    selectedObject.material.wireframe = (shadingMode === 'wire');
  } else if (mod.type === 'subdivision') {
    selectedObject.scale.multiplyScalar(1 / 1.05);
  } else if (mod.type === 'bevel') {
    selectedObject.scale.y /= 0.95;
  }

  modifiers.splice(index, 1);
  renderModifiersList(selectedObject);
  fillPropertiesForms(selectedObject);
}

function renderModifiersList(obj) {
  const container = document.getElementById('modifiers-list');
  container.innerHTML = "";

  const modifiers = obj.userData ? obj.userData.modifiers : [];

  if (modifiers.length === 0) {
    container.innerHTML = '<div class="no-modifiers-msg">No Modifiers active on this object</div>';
    return;
  }

  modifiers.forEach((mod, index) => {
    const card = document.createElement('div');
    card.className = "modifier-card";
    card.innerHTML = `
      <div class="modifier-card-header">
        <span>${mod.name}</span>
        <button class="remove-mod-btn" data-index="${index}"><i data-lucide="x"></i></button>
      </div>
      <div class="modifier-card-body">
        ${mod.type === 'subdivision' ? 'Levels Viewport: 2 | Render: 2' : ''}
        ${mod.type === 'wireframe' ? 'Thickness: 0.02m | Offset: 0.00' : ''}
        ${mod.type === 'bevel' ? 'Width: 0.10m | Segments: 3' : ''}
      </div>
    `;

    card.querySelector('.remove-mod-btn').addEventListener('click', () => {
      removeModifier(index);
    });

    container.appendChild(card);
  });
  
  lucide.createIcons();
}

// World setting bindings
export function updateWorldSettings() {
  const bgColor = document.getElementById('world-bg-color').value;
  scene.background.set(bgColor);
  const ambientIntensity = parseFloat(document.getElementById('world-ambient-intensity').value);
  ambientLight.intensity = ambientIntensity;
}

// Render loop
function animate() {
  requestAnimationFrame(animate);

  controls.update();

  if (lightHelperObj && dirLight) {
    const t = Date.now() * 0.001;
    dirLight.position.x = 5 + Math.sin(t) * 2;
    dirLight.position.z = 5 + Math.cos(t) * 2;
    lightHelperObj.position.copy(dirLight.position);
  }

  renderer.render(scene, activeCamera);
}

// Mock lights rotate representation
let lightHelperObj;
window.addEventListener('DOMContentLoaded', () => {
  init();
  lightHelperObj = sceneObjects.find(o => o.name === "Light");
});
