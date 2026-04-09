import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.163.0/build/three.module.min.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/renderers/CSS2DRenderer.js';

const API_URL = 'https://homepage-backend-56253706933.europe-west2.run.app';

const SPHERE_COLORS = [
  0x4285f4, 0xea4335, 0x34a853, 0xfbbc05,
  0x9c27b0, 0xff5722, 0x00bcd4, 0x795548,
];

const ANIM_DURATION = 500; // ms

// --- State ---
const words = [];
const spheres = new Map();   // word -> THREE.Mesh
const labels = new Map();    // word -> CSS2DObject
const startPos = new Map();  // word -> THREE.Vector3 (lerp from)
const targetPos = new Map(); // word -> THREE.Vector3 (lerp to)
let animStart = null;

// --- Scene setup ---
const container = document.getElementById('embed-canvas-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfafafa);

const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
camera.position.set(0, 0, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(container.clientWidth, container.clientHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
container.appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

scene.add(new THREE.AxesHelper(1.5));

// --- Resize handling ---
window.addEventListener('resize', () => {
  const w = container.clientWidth;
  const h = container.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  labelRenderer.setSize(w, h);
});

// --- Animation loop ---
function animate(time) {
  requestAnimationFrame(animate);
  controls.update();

  if (animStart !== null) {
    const t = Math.min((time - animStart) / ANIM_DURATION, 1);
    const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    for (const word of words) {
      if (!spheres.has(word)) continue;
      const from = startPos.get(word);
      const to = targetPos.get(word);
      if (!from || !to) continue;
      const pos = from.clone().lerp(to, eased);
      spheres.get(word).position.copy(pos);
      labels.get(word).position.copy(pos);
    }

    if (t >= 1) animStart = null;
  }

  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
requestAnimationFrame(animate);

// --- Core: add a word ---
window.addWord = async function addWord() {
  const input = document.getElementById('embed-input');
  const btn = document.getElementById('embed-btn');
  const status = document.getElementById('embed-status');

  const word = input.value.trim().toLowerCase();
  if (!word) return;
  if (words.includes(word)) {
    status.innerHTML = `<span class="status">"${word}" is already plotted.</span>`;
    input.value = '';
    return;
  }

  words.push(word);
  input.value = '';
  btn.disabled = true;
  status.innerHTML = '<span class="status">Fetching embedding…</span>';

  try {
    const res = await fetch(`${API_URL}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Handle unknown words returned by the API
    if (data.unknown.length > 0) {
      data.unknown.forEach(w => {
        const idx = words.indexOf(w);
        if (idx !== -1) words.splice(idx, 1);
      });
      status.innerHTML = `<span class="error">Word not found in vocabulary: ${data.unknown.join(', ')}</span>`;
    } else {
      status.textContent = '';
    }

    updateScene(data.points);
    updateWordList();
  } catch (e) {
    words.pop();
    status.innerHTML = '<span class="error">Something went wrong — please try again.</span>';
  } finally {
    btn.disabled = false;
  }
};

// Enter key submits
document.getElementById('embed-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') window.addWord();
});

// --- Scene update ---
function updateScene(points) {
  // Record start positions for all existing spheres
  for (const word of words) {
    if (spheres.has(word)) {
      startPos.set(word, spheres.get(word).position.clone());
    }
  }

  points.forEach((p, i) => {
    const to = new THREE.Vector3(p.x, p.y, p.z);
    targetPos.set(p.word, to);

    if (!spheres.has(p.word)) {
      // New point: create sphere + label, start at target (no lerp needed)
      const geo = new THREE.SphereGeometry(0.07, 24, 24);
      const mat = new THREE.MeshPhongMaterial({ color: SPHERE_COLORS[i % SPHERE_COLORS.length] });
      const sphere = new THREE.Mesh(geo, mat);
      sphere.position.copy(to);
      scene.add(sphere);
      spheres.set(p.word, sphere);

      const div = document.createElement('div');
      div.className = 'embed-label';
      div.textContent = p.word;
      const label = new CSS2DObject(div);
      label.position.copy(to);
      scene.add(label);
      labels.set(p.word, label);

      startPos.set(p.word, to.clone());
    }
  });

  animStart = performance.now();
}

// --- Word tag list ---
function updateWordList() {
  const listDiv = document.getElementById('embed-words');
  listDiv.innerHTML = words.map(w => `<span class="embed-word-tag">${w}</span>`).join('');
}
