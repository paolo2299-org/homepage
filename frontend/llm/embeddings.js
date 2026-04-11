import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import {
  fetchEmbeddings,
  getUnknownWordsMessage,
  prepareWordSubmission,
  reconcileWords,
} from './embedding-model.js';
import { clearContent, setMessage } from './messages.js';

const SPHERE_COLORS = [
  0x4285f4, 0xea4335, 0x34a853, 0xfbbc05,
  0x9c27b0, 0xff5722, 0x00bcd4, 0x795548,
];

const ANIM_DURATION = 500; // ms

function createEmbeddingScene(container, doc = document) {
  const words = [];
  const spheres = new Map();
  const labels = new Map();
  const startPos = new Map();
  const targetPos = new Map();
  let animStart = null;

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

  function handleResize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    labelRenderer.setSize(width, height);
  }

  window.addEventListener('resize', handleResize);

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

      if (t >= 1) {
        animStart = null;
      }
    }

    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }

  function removeWord(word) {
    const sphere = spheres.get(word);
    if (sphere) {
      scene.remove(sphere);
      sphere.geometry.dispose();
      sphere.material.dispose();
      spheres.delete(word);
    }

    const label = labels.get(word);
    if (label) {
      scene.remove(label);
      labels.delete(word);
    }

    startPos.delete(word);
    targetPos.delete(word);
  }

  function updateScene(points) {
    for (const word of words) {
      if (spheres.has(word)) {
        startPos.set(word, spheres.get(word).position.clone());
      }
    }

    points.forEach((point, index) => {
      const to = new THREE.Vector3(point.x, point.y, point.z);
      targetPos.set(point.word, to);

      if (!spheres.has(point.word)) {
        const geometry = new THREE.SphereGeometry(0.07, 24, 24);
        const material = new THREE.MeshPhongMaterial({ color: SPHERE_COLORS[index % SPHERE_COLORS.length] });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(to);
        scene.add(sphere);
        spheres.set(point.word, sphere);

        const div = doc.createElement('div');
        div.className = 'embed-label';
        div.textContent = point.word;
        const label = new CSS2DObject(div);
        label.position.copy(to);
        scene.add(label);
        labels.set(point.word, label);

        startPos.set(point.word, to.clone());
      }
    });

    animStart = performance.now();
  }

  requestAnimationFrame(animate);

  return {
    words,
    removeWord,
    updateScene,
  };
}

function updateWordList(doc, listElement, words) {
  clearContent(listElement);

  words.forEach(word => {
    const tag = doc.createElement('span');
    tag.className = 'embed-word-tag';
    tag.textContent = word;
    listElement.appendChild(tag);
  });
}

function initEmbeddings({
  doc = document,
  fetchImpl = fetch,
} = {}) {
  const container = doc.getElementById('embed-canvas-container');
  const input = doc.getElementById('embed-input');
  const button = doc.getElementById('embed-btn');
  const status = doc.getElementById('embed-status');
  const list = doc.getElementById('embed-words');

  if (!container || !input || !button || !status || !list) {
    return null;
  }

  const scene = createEmbeddingScene(container, doc);

  async function handleAddWord() {
    const submission = prepareWordSubmission(scene.words, input.value);
    input.value = '';

    if (!submission.ok) {
      if (submission.reason === 'duplicate') {
        setMessage(status, 'status', `"${submission.word}" is already plotted.`, doc);
      }
      return;
    }

    scene.words.push(submission.word);
    button.disabled = true;
    setMessage(status, 'status', 'Fetching embedding…', doc);

    try {
      const data = await fetchEmbeddings(fetchImpl, scene.words);
      const nextWords = reconcileWords(scene.words, data.unknown);
      const removedWords = scene.words.filter(word => !nextWords.includes(word));

      removedWords.forEach(word => scene.removeWord(word));
      scene.words.splice(0, scene.words.length, ...nextWords);

      if (data.unknown.length > 0) {
        setMessage(status, 'error', getUnknownWordsMessage(data.unknown), doc);
      } else {
        clearContent(status);
      }

      scene.updateScene(data.points);
      updateWordList(doc, list, scene.words);
    } catch {
      scene.words.pop();
      setMessage(status, 'error', 'Something went wrong — please try again.', doc);
    } finally {
      button.disabled = false;
    }
  }

  button.addEventListener('click', handleAddWord);
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      handleAddWord();
    }
  });

  return { handleAddWord };
}

initEmbeddings();
