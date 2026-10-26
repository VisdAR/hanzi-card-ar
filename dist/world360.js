import * as THREE from 'three';
import { copy, realmNarration, realmTitles, preferredLanguage, saveLanguage } from './world360-copy.js?v=6';
import { createSpatialGame } from './world360-game.js?v=6';

const scanAt = Number(sessionStorage.getItem('hanzi-world-scan') || 0);
const localPreview = ['localhost', '127.0.0.1'].includes(location.hostname) &&
  new URLSearchParams(location.search).get('preview') === '1';
if (!localPreview && (!scanAt || Date.now() - scanAt > 2 * 60 * 60 * 1000)) {
  window.location.replace('./index.html?play=1');
}

const ui = {
  video: document.querySelector('#cameraFeed'),
  layer: document.querySelector('#sceneLayer'),
  reveal: document.querySelector('#voxelReveal'),
  gate: document.querySelector('#entryGate'),
  floorButton: document.querySelector('#startFloor'),
  compassButton: document.querySelector('#startCompass'),
  capability: document.querySelector('#capabilityNote'),
  status: document.querySelector('#statusLine'),
  reticle: document.querySelector('#floorReticle'),
  badge: document.querySelector('#modeBadge'),
  safety: document.querySelector('#safetyBadge'),
  realmName: document.querySelector('#realmName'),
  realmIndex: document.querySelector('#realmIndex'),
  realmTranslation: document.querySelector('#realmTranslation'),
  realmNav: document.querySelector('#realmNav'),
  languageFr: document.querySelector('#languageFr'),
  languageEn: document.querySelector('#languageEn'),
  gateTitle: document.querySelector('#gateTitle'),
  gateIntro: document.querySelector('#gateIntro'),
  gateWarning: document.querySelector('#gateWarning'),
  backLink: document.querySelector('#backLink'),
  narration: document.querySelector('#realmNarration'),
  interaction: document.querySelector('#interactionPanel'),
  hint: document.querySelector('#gameHint'),
  explainer: document.querySelector('#gameExplainer'),
  grab: document.querySelector('#grabButton'),
  release: document.querySelector('#releaseButton'),
  next: document.querySelector('#nextWord'),
  gameReticle: document.querySelector('#gameReticle'),
  handPointer: document.querySelector('#handPointer'),
};
let language = preferredLanguage();
let statusKey = 'preparing';
let capabilityKey = 'capabilityChecking';
let modeKey = 'modeCompass';

function pair(element, entry) {
  if (!element || !entry) return;
  const zh = element.querySelector('.zh-copy');
  const foreign = element.querySelector('.foreign-copy');
  if (zh) zh.textContent = entry.zh;
  if (foreign) {
    foreign.lang = language;
    foreign.textContent = entry[language];
  }
}

function refreshGate() {
  const unavailable = ['capabilityNoXR', 'capabilityUnsupported', 'capabilityPermission', 'capabilityFailed'].includes(capabilityKey);
  ui.gate.classList.toggle('no-floor', unavailable);
  ui.gateIntro.hidden = unavailable;
  ui.floorButton.hidden = unavailable || capabilityKey !== 'capabilityXR';
  ui.capability.hidden = capabilityKey !== 'cameraFailed';
  pair(ui.gateTitle, copy[capabilityKey === 'cameraFailed' ? 'gateCameraFailed' : unavailable ? 'gateNoFloor' : 'gateTitle']);
  pair(ui.compassButton, copy[capabilityKey === 'cameraFailed' ? 'retryCamera' : 'compassButton']);
  pair(ui.capability, copy[capabilityKey]);
}

function refreshLanguage() {
  document.documentElement.lang = 'zh-CN';
  ui.languageFr.setAttribute('aria-pressed', String(language === 'fr'));
  ui.languageEn.setAttribute('aria-pressed', String(language === 'en'));
  ui.realmTranslation.textContent = realmTitles[realm - 1][language];
  ui.realmTranslation.lang = language;
  ui.backLink.textContent = copy.back[language];
  ui.backLink.setAttribute('aria-label', copy.back[language]);
  refreshGate();
  pair(ui.gateIntro, copy.gateIntro);
  pair(ui.gateWarning, copy.gateWarning);
  pair(ui.floorButton, copy.floorButton);
  pair(ui.safety, copy.safety);
  pair(ui.status, copy[statusKey]);
  pair(ui.badge, copy[modeKey]);
  pair(ui.narration, realmNarration[realm - 1]);
  game?.refreshLanguage();
}

function setCapability(key) { capabilityKey = key; refreshGate(); }
function setMode(key) { modeKey = key; pair(ui.badge, copy[key]); }
function setGateVisible(visible) {
  ui.gate.hidden = !visible;
  ui.status.hidden = visible || !!world?.visible;
  ui.interaction.hidden = visible || !world?.visible;
  ui.narration.hidden = true;
  ui.safety.hidden = true;
  ui.badge.hidden = true;
  ui.gameReticle.hidden = visible || !world?.visible;
  if (visible) ui.handPointer.hidden = true;
  if (visible) ui.explainer.hidden = true;
}

const textureLoader = new THREE.TextureLoader();
const up = new THREE.Vector3(0, 1, 0);
const deg = THREE.MathUtils.degToRad;
const revealPalette = ['#183c47', '#53735b', '#a67b59', '#b9c4a2', '#7ba9a4'];
let manifest;
let scene;
let camera;
let renderer;
let world;
let panorama;
let panoramaMaterial;
let panoramaDay;
let panoramaNight;
let lightProbe = null;
let stream;
let xrSession;
let hitSource;
let mode = 'idle';
let realm = 1;
let revealTime = 0;
let worldFade = 0;
let basePanoOpacity = 0.38;
let stableHits = 0;
let lastFloorPoint = null;
let gyroSeen = false;
let gyroStartTimer;
let compassZero = null;
let manualYaw = 0;
let dragStart = null;
let particles;
let contactShadowTexture;
let game;
let narrationTimer;
let lightSampleCanvas;
let lightSampleContext;
let nextLightSample = 0;
let lastLightFrame = 0;
let lastLightPaint = 0;
let sceneLightGain = 1.06;
let targetLightGain = 1.06;
const artSunDirection = new THREE.Vector3(-0.86, 0.42, -0.50).normalize();
const sceneLightDirection = artSunDirection.clone();
const targetLightDirection = artSunDirection.clone();
const sceneLightTint = new THREE.Color(0xffffff);
const targetLightTint = new THREE.Color(0xffffff);
const panoramaTints = ['#ffffff', '#e4f1e4', '#f3e5ef', '#ffe0c7', '#edcdb3', '#b8d1ea'].map((color) => new THREE.Color(color));
const lightProfiles = [
  { tint: new THREE.Color('#fff6e6'), gain: 1.08, visibility: 1.08, shadow: 0.18, saturation: 1.58 },
  { tint: new THREE.Color('#f1fff0'), gain: 1.07, visibility: 1.08, shadow: 0.16, saturation: 1.56 },
  { tint: new THREE.Color('#fff2f8'), gain: 1.07, visibility: 1.07, shadow: 0.17, saturation: 1.60 },
  { tint: new THREE.Color('#ffe8d1'), gain: 1.08, visibility: 1.08, shadow: 0.23, saturation: 1.57 },
  { tint: new THREE.Color('#ffdfbd'), gain: 1.06, visibility: 1.08, shadow: 0.26, saturation: 1.58 },
  { tint: new THREE.Color('#dceaff'), gain: 1.02, visibility: 1.12, shadow: 0.08, saturation: 1.38 },
];
const propSprites = new Map();
const textureCache = new Map();

function status(key) {
  statusKey = copy[key] ? key : 'sceneFailed';
  pair(ui.status, copy[statusKey]);
  ui.status.hidden = !ui.gate.hidden || !!world?.visible;
}

function loadTexture(url) {
  if (!textureCache.has(url)) {
    textureCache.set(url, new Promise((resolve, reject) => {
      textureLoader.load(url, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        resolve(texture);
      }, undefined, reject);
    }));
  }
  return textureCache.get(url);
}

function resize() {
  if (!renderer || !camera) return;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  const pixelRatio = Math.min(devicePixelRatio || 1, 1.5);
  ui.reveal.width = Math.round(innerWidth * pixelRatio);
  ui.reveal.height = Math.round(innerHeight * pixelRatio);
  ui.reveal.getContext('2d').setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function makeSkyAlpha() {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, 128);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.36, '#eeeeee');
  gradient.addColorStop(0.60, '#aaaaaa');
  gradient.addColorStop(0.78, '#343434');
  gradient.addColorStop(1, '#050505');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 2, 128);
  return new THREE.CanvasTexture(canvas);
}

function initializeScene() {
  if (renderer) return;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.04, 30);
  camera.position.set(0, 1.42, 0);
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
  renderer.setClearColor(0x000000, 0);
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local');
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.style.filter = 'saturate(1.55) contrast(1.08)';
  ui.layer.append(renderer.domElement);
  world = new THREE.Group();
  world.visible = false;
  scene.add(world);
  panoramaMaterial = new THREE.MeshBasicMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false,
    alphaMap: makeSkyAlpha(), opacity: 0,
  });
  panorama = new THREE.Mesh(new THREE.SphereGeometry(9, 48, 24), panoramaMaterial);
  panorama.position.y = 1.42;
  panorama.renderOrder = -10;
  world.add(panorama);
  const dustPosition = new Float32Array(36 * 3);
  for (let i = 0; i < 36; i += 1) {
    const angle = (i * 2.39996) % (Math.PI * 2);
    const distance = 1.2 + (i % 9) * 0.16;
    dustPosition[i * 3] = Math.sin(angle) * distance;
    dustPosition[i * 3 + 1] = 0.2 + (i % 11) * 0.15;
    dustPosition[i * 3 + 2] = -Math.cos(angle) * distance;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPosition, 3));
  particles = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: 0xd8e3bd, size: 0.012, transparent: true, opacity: 0, depthWrite: false }));
  world.add(particles);
  game = createSpatialGame(THREE, { world, getCamera: () => mode === 'xr' ? renderer.xr.getCamera() : camera,
    ui, getMode: () => mode, getLanguage: () => language });
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const shadowContext = shadowCanvas.getContext('2d');
  const shade = shadowContext.createRadialGradient(64, 64, 5, 64, 64, 63);
  shade.addColorStop(0, '#061b1bbb');
  shade.addColorStop(0.5, '#061b1b66');
  shade.addColorStop(1, '#061b1b00');
  shadowContext.fillStyle = shade;
  shadowContext.fillRect(0, 0, 128, 128);
  contactShadowTexture = new THREE.CanvasTexture(shadowCanvas);
  resize();
}

const propHeights = {
  village: 1.45, grapes: 1.55, canal: 0.78, herbStation: 0.9,
  flowerTrellis: 1.3, redPass: 1.65, harvest: 1.1, sprout: 0.92,
};
const propRadii = {
  village: 3.4, grapes: 2.55, canal: 2.2, herbStation: 2.6,
  flowerTrellis: 2.8, redPass: 3.8, harvest: 2.9, sprout: 2.2,
};

async function loadProp(prop) {
  if (propSprites.has(prop.id)) return propSprites.get(prop.id);
  const texture = await loadTexture(`./assets/oasis/${prop.file}?v=4`);
  const height = propHeights[prop.id] || 1.1;
  const aspect = texture.image.width / texture.image.height;
  const material = new THREE.SpriteMaterial({
    map: texture, transparent: true, depthWrite: false, opacity: 0,
    alphaTest: prop.id === 'grapes' ? 0.16 : 0,
  });
  const sprite = new THREE.Sprite(material);
  const yaw = deg(prop.yawDegrees || 0);
  const radius = propRadii[prop.id] || 2.8;
  sprite.position.set(Math.sin(yaw) * radius, height / 2, -Math.cos(yaw) * radius);
  sprite.scale.set(height * aspect, height, 1);
  sprite.userData = { id: prop.id, visibleFromRealm: prop.visibleFromRealm, baseY: sprite.position.y, yaw };
  world.add(sprite);
  if (prop.id !== 'canal') {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.max(0.65, height * aspect * 0.75), 0.65),
      new THREE.MeshBasicMaterial({ map: contactShadowTexture, transparent: true, depthWrite: false, opacity: 0 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(sprite.position.x, 0.012, sprite.position.z);
    world.add(ground);
    sprite.userData.shadow = ground;
  }
  propSprites.set(prop.id, sprite);
  return sprite;
}

function resetLightProfile() {
  const profile = lightProfiles[realm - 1];
  sceneLightGain = targetLightGain = profile.gain;
  sceneLightDirection.copy(artSunDirection);
  targetLightDirection.copy(artSunDirection);
  sceneLightTint.set(0xffffff);
  targetLightTint.set(0xffffff);
  nextLightSample = 0;
  lastLightFrame = 0;
  applyLighting();
}

function applyLighting() {
  if (!renderer || !panoramaMaterial) return;
  const profile = lightProfiles[realm - 1];
  const gain = Math.min(1.16, sceneLightGain);
  panoramaMaterial.color.copy(panoramaTints[realm - 1]).multiply(sceneLightTint).multiplyScalar(gain);
  for (const sprite of propSprites.values()) {
    sprite.material.color.copy(profile.tint).multiply(sceneLightTint).multiplyScalar(gain);
    if (sprite.userData.shadow) {
      const offset = profile.shadow * Math.max(0.2, 1 - sceneLightDirection.y);
      sprite.userData.shadow.position.set(
        sprite.position.x - sceneLightDirection.x * offset,
        0.012,
        sprite.position.z - sceneLightDirection.z * offset,
      );
    }
  }
  // CSS boosts the camera compositing path; material colors also work in XR compositors.
  const cssBrightness = 1 + (sceneLightGain - 1) * 0.45;
  renderer.domElement.style.filter = `saturate(${profile.saturation}) contrast(1.12) brightness(${cssBrightness.toFixed(3)})`;
  setFade(worldFade);
}

function readCameraLighting() {
  if (ui.video.readyState < 2 || !ui.video.videoWidth) return;
  if (!lightSampleCanvas) {
    lightSampleCanvas = document.createElement('canvas');
    lightSampleCanvas.width = 24;
    lightSampleCanvas.height = 18;
    lightSampleContext = lightSampleCanvas.getContext('2d', { willReadFrequently: true });
  }
  try {
    lightSampleContext.drawImage(ui.video, 0, 0, 24, 18);
    const pixels = lightSampleContext.getImageData(0, 0, 24, 18).data;
    let red = 0, green = 0, blue = 0, count = 0;
    for (let i = 0; i < pixels.length; i += 16) {
      red += pixels[i]; green += pixels[i + 1]; blue += pixels[i + 2]; count += 1;
    }
    red /= count * 255; green /= count * 255; blue /= count * 255;
    const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    targetLightGain = THREE.MathUtils.clamp(1.22 - luminance * 0.23, 1.00, 1.20);
    const mean = Math.max(0.06, (red + green + blue) / 3);
    targetLightTint.setRGB(
      THREE.MathUtils.clamp(1 + (red / mean - 1) * 0.12, 0.92, 1.08),
      THREE.MathUtils.clamp(1 + (green / mean - 1) * 0.12, 0.92, 1.08),
      THREE.MathUtils.clamp(1 + (blue / mean - 1) * 0.12, 0.92, 1.08),
    );
  } catch { /* A blocked video frame leaves the artistic lighting in place. */ }
}

function readXRLighting(frame) {
  if (!lightProbe || !frame?.getLightEstimate) return;
  try {
    const estimate = frame.getLightEstimate(lightProbe);
    if (!estimate) return;
    const intensity = estimate.primaryLightIntensity;
    const luminance = intensity.x * 0.2126 + intensity.y * 0.7152 + intensity.z * 0.0722;
    if (Number.isFinite(luminance) && luminance > 0.001) {
      targetLightGain = THREE.MathUtils.clamp(0.96 + Math.log2(1 + luminance) * 0.10, 0.96, 1.20);
      targetLightTint.setRGB(
        THREE.MathUtils.clamp(1 + (intensity.x / luminance - 1) * 0.16, 0.88, 1.12),
        THREE.MathUtils.clamp(1 + (intensity.y / luminance - 1) * 0.16, 0.88, 1.12),
        THREE.MathUtils.clamp(1 + (intensity.z / luminance - 1) * 0.16, 0.88, 1.12),
      );
    }
    const pose = frame.getPose(lightProbe.probeSpace, renderer.xr.getReferenceSpace());
    if (!pose) return;
    const source = estimate.primaryLightDirection;
    const realDirection = new THREE.Vector3(source.x, source.y, source.z)
      .applyQuaternion(new THREE.Quaternion(
        pose.transform.orientation.x, pose.transform.orientation.y,
        pose.transform.orientation.z, pose.transform.orientation.w,
      )).normalize();
    if (!Number.isFinite(realDirection.x + realDirection.y + realDirection.z)) return;
    realDirection.y = Math.max(0.15, realDirection.y);
    targetLightDirection.copy(artSunDirection).lerp(realDirection.normalize(), 0.55).normalize();
  } catch { /* Light estimation is optional; the baked sun still matches the panorama. */ }
}

function updateLighting(time, frame) {
  if (time >= nextLightSample) {
    if (mode === 'xr') readXRLighting(frame);
    else if (mode === 'compass') readCameraLighting();
    nextLightSample = time + 850;
  }
  const elapsed = lastLightFrame ? Math.min(100, time - lastLightFrame) : 16;
  lastLightFrame = time;
  const easing = 1 - Math.exp(-elapsed / 900);
  sceneLightGain = THREE.MathUtils.lerp(sceneLightGain, targetLightGain, easing);
  sceneLightTint.lerp(targetLightTint, easing);
  sceneLightDirection.lerp(targetLightDirection, easing).normalize();
  if (time - lastLightPaint > 110) {
    lastLightPaint = time;
    applyLighting();
  }
}

function setFade(value) {
  worldFade = THREE.MathUtils.clamp(value, 0, 1);
  const profile = lightProfiles[realm - 1];
  panoramaMaterial.opacity = Math.min(0.58, basePanoOpacity * profile.visibility) * worldFade;
  particles.material.opacity = 0.48 * worldFade;
  for (const sprite of propSprites.values()) {
    const isFeatured = manifest?.realms[realm - 1]?.newProps.includes(sprite.userData.id);
    const strength = realm === 1 || isFeatured ? 0.72 : 0.44;
    sprite.material.opacity = sprite.visible ? Math.min(0.88, strength * profile.visibility) * worldFade : 0;
    if (sprite.userData.shadow) {
      sprite.userData.shadow.visible = sprite.visible;
      sprite.userData.shadow.material.opacity = (isFeatured ? 0.18 : 0.10) * worldFade *
        (realm === 6 ? 0.55 : THREE.MathUtils.clamp(sceneLightGain, 0.8, 1.2));
    }
  }
}

async function selectRealm(number) {
  realm = number;
  ui.realmName.textContent = manifest.realms[number - 1].name;
  ui.realmIndex.textContent = ['一', '二', '三', '四', '五', '六'][number - 1];
  ui.realmTranslation.textContent = realmTitles[number - 1][language];
  ui.realmTranslation.lang = language;
  pair(ui.narration, realmNarration[number - 1]);
  if (world?.visible) showNarration();
  for (const button of ui.realmNav.querySelectorAll('button')) {
    button.setAttribute('aria-current', button.dataset.realm === String(number) ? 'true' : 'false');
  }
  const needed = manifest.props.filter((prop) => prop.visibleFromRealm && prop.visibleFromRealm <= number);
  await Promise.all(needed.map(loadProp));
  if (number === 6) {
    panoramaNight ||= await loadTexture('./assets/oasis/panorama/night.webp?v=4');
    panoramaMaterial.map = panoramaNight;
  } else {
    panoramaDay ||= await loadTexture('./assets/oasis/panorama/day.webp?v=4');
    panoramaMaterial.map = panoramaDay;
  }
  panoramaMaterial.needsUpdate = true;
  for (const sprite of propSprites.values()) sprite.visible = sprite.userData.visibleFromRealm <= number;
  resetLightProfile();
  game?.selectRealm(number);
}

function buildRealmNav() {
  ui.realmNav.replaceChildren();
  for (const entry of manifest.realms) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = entry.number;
    button.dataset.realm = String(entry.number);
    button.title = entry.name;
    button.setAttribute('aria-label', `预览第${entry.number}境：${entry.name}`);
    button.addEventListener('click', () => selectRealm(entry.number).catch(() => status('sceneFailed')));
    ui.realmNav.append(button);
  }
}

async function ensureScene() {
  initializeScene();
  if (!manifest) {
    const response = await fetch('./assets/oasis/scene-manifest.json?v=4');
    if (!response.ok) throw new Error('场景目录加载失败');
    manifest = await response.json();
    buildRealmNav();
  }
  await selectRealm(realm);
}

function revealBlocks(now) {
  const elapsed = (now - revealTime) / 1000;
  const context = ui.reveal.getContext('2d');
  context.clearRect(0, 0, innerWidth, innerHeight);
  if (!revealTime || elapsed > 2.25) return;
  const cols = 13;
  const rows = 23;
  const cellW = innerWidth / cols;
  const cellH = innerHeight / rows;
  for (let row = rows - 1; row >= 0; row -= 1) {
    const rowFromBottom = rows - row - 1;
    const start = rowFromBottom * 0.038;
    for (let col = 0; col < cols; col += 1) {
      const jitter = ((col * 13 + row * 7) % 9) * 0.018;
      const age = elapsed - start - jitter;
      if (age < 0 || age > 0.85) continue;
      const progress = age / 0.85;
      const travel = (1 - progress) ** 2 * 105;
      context.globalAlpha = Math.sin(progress * Math.PI) * 0.72;
      context.fillStyle = revealPalette[(col * 5 + row * 3) % revealPalette.length];
      context.fillRect(col * cellW + 1, row * cellH + travel, cellW - 2, cellH - 2);
    }
  }
  context.globalAlpha = 1;
}

function beginReveal() {
  world.visible = true;
  setFade(0);
  revealTime = performance.now();
  ui.reticle.hidden = true;
  setGateVisible(false);
  showNarration();
  ui.realmNav.hidden = false;
  ui.gameReticle.hidden = false;
}

function showNarration() {
  clearTimeout(narrationTimer);
  ui.narration.hidden = false;
  narrationTimer = setTimeout(() => { ui.narration.hidden = true; }, 3800);
}

function animate(time, frame) {
  if (mode === 'xr' && frame && hitSource && !world.visible) checkFloor(frame);
  if (revealTime) {
    const seconds = (time - revealTime) / 1000;
    setFade(Math.min(1, Math.max(0, (seconds - 0.15) / 1.65)));
    revealBlocks(time);
    if (seconds > 2.25) revealTime = 0;
  }
  if (world.visible) {
    updateLighting(time, frame);
    const seconds = time / 1000;
    // Architectural props stay attached to the floor; only water and dust move.
    for (const sprite of propSprites.values()) {
      const { id } = sprite.userData;
      if (id === 'canal') {
        const isFeatured = manifest.realms[realm - 1].newProps.includes(id);
        sprite.material.opacity = (isFeatured ? 0.72 : 0.44) * worldFade * (0.95 + 0.05 * Math.sin(seconds * 2.3));
      }
    }
    particles.rotation.y = Math.sin(seconds * 0.12) * 0.025;
    game?.update(time);
  }
  renderer.render(scene, camera);
}

function checkFloor(frame) {
  const referenceSpace = renderer.xr.getReferenceSpace();
  if (!referenceSpace) return;
  const hit = frame.getHitTestResults(hitSource)[0];
  const viewer = frame.getViewerPose(referenceSpace);
  const pose = hit?.getPose(referenceSpace);
  if (!pose || !viewer) {
    stableHits = 0;
    status('lookFloor');
    return;
  }
  const point = pose.transform.position;
  const normal = up.clone().applyQuaternion(new THREE.Quaternion(
    pose.transform.orientation.x, pose.transform.orientation.y,
    pose.transform.orientation.z, pose.transform.orientation.w,
  ));
  const heightBelowPhone = viewer.transform.position.y - point.y;
  const looksLikeFloor = Math.abs(normal.dot(up)) > 0.72 && heightBelowPhone > 0.65 && heightBelowPhone < 2.25;
  if (!looksLikeFloor) {
    stableHits = 0;
    status('notFloor');
    return;
  }
  const current = new THREE.Vector3(point.x, point.y, point.z);
  stableHits = lastFloorPoint && lastFloorPoint.distanceTo(current) < 0.22 ? stableHits + 1 : 1;
  lastFloorPoint = current;
  status('floorStable');
  if (stableHits < 9) return;
  world.position.set(viewer.transform.position.x, point.y, viewer.transform.position.z);
  beginReveal();
  status('xrPlaced');
  setMode('modeXR');
}

async function startFloor() {
  ui.floorButton.disabled = true;
  status('xrStarting');
  try {
    // The session request must happen directly in this button's user gesture.
    const session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay', 'local-floor', 'light-estimation'],
      domOverlay: { root: document.body },
    });
    xrSession = session;
    if (session.requestLightProbe) {
      session.requestLightProbe().then((probe) => {
        if (xrSession === session) lightProbe = probe;
      }).catch(() => { /* The scene retains its art-directed sun. */ });
    }
    session.addEventListener('select', () => {
      if (!session.domOverlayState) game?.grabOrRelease();
    });
    session.addEventListener('end', () => {
      hitSource?.cancel();
      hitSource = null;
      lightProbe = null;
      xrSession = null;
      mode = 'idle';
      if (world) world.visible = false;
      setGateVisible(true);
      ui.reticle.hidden = true;
      ui.realmNav.hidden = true;
      game?.stopHands();
      status('xrEnded');
    }, { once: true });
    await ensureScene();
    basePanoOpacity = 0.16;
    world.visible = false;
    setFade(0);
    setGateVisible(false);
    ui.reticle.hidden = false;
    mode = 'xr';
    await renderer.xr.setSession(session);
    const viewerSpace = await session.requestReferenceSpace('viewer');
    hitSource = await session.requestHitTestSource({ space: viewerSpace });
    renderer.setAnimationLoop(animate);
    status('lookFloor');
  } catch (error) {
    if (xrSession) await xrSession.end().catch(() => {});
    lightProbe = null;
    xrSession = null;
    mode = 'idle';
    renderer?.setAnimationLoop(null);
    setGateVisible(true);
    ui.reticle.hidden = true;
    if (error.name === 'NotSupportedError') {
      ui.floorButton.hidden = true;
      setCapability('capabilityUnsupported');
    } else if (error.name === 'NotAllowedError') setCapability('capabilityPermission');
    else setCapability('capabilityFailed');
  } finally {
    ui.floorButton.disabled = false;
  }
}

const zee = new THREE.Vector3(0, 0, 1);
const screenQuaternion = new THREE.Quaternion();
const cameraCorrection = new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2);
const sensorEuler = new THREE.Euler();

function onOrientation(event) {
  if (mode !== 'compass' || event.alpha == null || event.beta == null || event.gamma == null) return;
  gyroSeen = true;
  const screenAngle = screen.orientation?.angle ?? window.orientation ?? 0;
  sensorEuler.set(deg(event.beta), deg(event.alpha), -deg(event.gamma), 'YXZ');
  const orientation = new THREE.Quaternion().setFromEuler(sensorEuler)
    .multiply(cameraCorrection)
    .multiply(screenQuaternion.setFromAxisAngle(zee, -deg(screenAngle)));
  if (compassZero === null) {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(orientation);
    compassZero = Math.atan2(-forward.x, -forward.z);
    setMode('modeCompass');
  }
  camera.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(up, -compassZero).multiply(orientation));
}

async function startCompass() {
  ui.compassButton.disabled = true;
  status('cameraStarting');
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('浏览器没有相机接口');
    // Trigger both permission requests in the same tap where possible.
    const cameraRequest = navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' } } });
    const motionRequest = typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
      ? DeviceOrientationEvent.requestPermission().catch(() => 'denied') : Promise.resolve('granted');
    stream = await cameraRequest;
    const motionPermission = await motionRequest;
    await ensureScene();
    basePanoOpacity = 0.16;
    ui.video.srcObject = stream;
    ui.video.style.display = 'block';
    await ui.video.play();
    mode = 'compass';
    lightProbe = null;
    nextLightSample = 0;
    compassZero = null;
    gyroSeen = false;
    manualYaw = 0;
    camera.position.set(0, 1.42, 0);
    camera.quaternion.identity();
    world.position.set(0, 0, 0);
    window.addEventListener('deviceorientation', onOrientation);
    beginReveal();
    renderer.setAnimationLoop(animate);
    setMode('modeCompass');
    status('compassRunning');
    game?.startHands(ui.video);
    if (motionPermission !== 'granted') status('motionDenied');
    clearTimeout(gyroStartTimer);
    gyroStartTimer = setTimeout(() => {
      if (mode === 'compass' && !gyroSeen) status('noGyro');
    }, 3500);
  } catch (error) {
    stopCompass();
    status('cameraFailed');
    setCapability('cameraFailed');
  } finally {
    ui.compassButton.disabled = false;
  }
}

function stopCompass() {
  nextLightSample = 0;
  stream?.getTracks().forEach((track) => track.stop());
  stream = null;
  ui.video.srcObject = null;
  ui.video.style.display = 'none';
  window.removeEventListener('deviceorientation', onOrientation);
  clearTimeout(gyroStartTimer);
  renderer?.setAnimationLoop(null);
  mode = 'idle';
  if (world) world.visible = false;
  game?.stopHands();
  setGateVisible(true);
  ui.realmNav.hidden = true;
}

function pointerDown(event) {
  if (world?.visible && !event.target.closest('button, a, .entry-gate, .interaction-panel, .realm-nav')) {
    game?.tap(event.clientX, event.clientY);
  }
  if ((mode !== 'compass' && mode !== 'preview') || (mode === 'compass' && gyroSeen) || !ui.gate.hidden) return;
  dragStart = { x: event.clientX, yaw: manualYaw };
}
function pointerMove(event) {
  if (!dragStart || (mode !== 'compass' && mode !== 'preview') || (mode === 'compass' && gyroSeen)) return;
  manualYaw = dragStart.yaw - (event.clientX - dragStart.x) / innerWidth * Math.PI;
  camera.rotation.set(0, manualYaw, 0, 'YXZ');
}

async function bootstrap() {
  if (localPreview) {
    if (new URLSearchParams(location.search).get('gate') === '1') {
      setCapability('capabilityNoXR');
      status('ready');
      return;
    }
    try {
      await ensureScene();
      mode = 'preview';
      world.position.set(0, 0, 0);
      beginReveal();
      renderer.setAnimationLoop(animate);
      status('preview');
      setMode('modePreview');
    } catch (error) { status('previewFailed'); }
    return;
  }
  if (!scanAt || Date.now() - scanAt > 2 * 60 * 60 * 1000) return;
  try {
    const available = !!navigator.xr && await navigator.xr.isSessionSupported('immersive-ar');
    ui.floorButton.hidden = !available;
    setCapability(available ? 'capabilityXR' : 'capabilityNoXR');
    status('ready');
  } catch {
    ui.floorButton.hidden = true;
    setCapability('capabilityNoXR');
    status('ready');
  }
}

ui.floorButton.addEventListener('click', startFloor);
ui.compassButton.addEventListener('click', startCompass);
for (const [button, choice] of [[ui.languageFr, 'fr'], [ui.languageEn, 'en']]) {
  button.addEventListener('click', () => { language = choice; saveLanguage(language); refreshLanguage(); });
}
window.addEventListener('resize', resize);
window.addEventListener('pointerdown', pointerDown);
window.addEventListener('pointermove', pointerMove);
window.addEventListener('pointerup', () => { dragStart = null; });
window.addEventListener('pointercancel', () => { dragStart = null; });
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  if (mode === 'compass') {
    stopCompass();
    status('paused');
  } else if (mode === 'xr') xrSession?.end();
});
window.addEventListener('pagehide', () => {
  stream?.getTracks().forEach((track) => track.stop());
  xrSession?.end();
});

refreshLanguage();
setGateVisible(true);
bootstrap();
