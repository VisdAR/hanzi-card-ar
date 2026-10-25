import * as THREE from 'three';

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
  realmNav: document.querySelector('#realmNav'),
};

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
const propSprites = new Map();
const textureCache = new Map();

function status(message) {
  if (ui.status.textContent !== message) ui.status.textContent = message;
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
  const texture = await loadTexture(`./assets/oasis/${prop.file}`);
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

function setFade(value) {
  worldFade = THREE.MathUtils.clamp(value, 0, 1);
  panoramaMaterial.opacity = basePanoOpacity * worldFade;
  particles.material.opacity = 0.48 * worldFade;
  for (const sprite of propSprites.values()) {
    const isFeatured = manifest?.realms[realm - 1]?.newProps.includes(sprite.userData.id);
    const strength = realm === 1 || isFeatured ? 0.92 : 0.56;
    sprite.material.opacity = sprite.visible ? strength * worldFade : 0;
    if (sprite.userData.shadow) {
      sprite.userData.shadow.visible = sprite.visible;
      sprite.userData.shadow.material.opacity = (isFeatured ? 0.28 : 0.16) * worldFade;
    }
  }
}

async function selectRealm(number) {
  realm = number;
  ui.realmName.textContent = manifest.realms[number - 1].name;
  for (const button of ui.realmNav.querySelectorAll('button')) {
    button.setAttribute('aria-current', button.dataset.realm === String(number) ? 'true' : 'false');
  }
  const needed = manifest.props.filter((prop) => prop.visibleFromRealm && prop.visibleFromRealm <= number);
  await Promise.all(needed.map(loadProp));
  if (number === 6) {
    panoramaNight ||= await loadTexture('./assets/oasis/panorama/night.webp');
    panoramaMaterial.map = panoramaNight;
  } else {
    panoramaDay ||= await loadTexture('./assets/oasis/panorama/day.webp');
    panoramaMaterial.map = panoramaDay;
  }
  panoramaMaterial.color.set(['#ffffff', '#e4f1e4', '#f3e5ef', '#ffe0c7', '#edcdb3', '#b8d1ea'][number - 1]);
  panoramaMaterial.needsUpdate = true;
  for (const sprite of propSprites.values()) sprite.visible = sprite.userData.visibleFromRealm <= number;
  setFade(worldFade);
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
    button.addEventListener('click', () => selectRealm(entry.number).catch(() => status('场景素材加载失败，请稍后重试')));
    ui.realmNav.append(button);
  }
}

async function ensureScene() {
  initializeScene();
  if (!manifest) {
    const response = await fetch('./assets/oasis/scene-manifest.json?v=3');
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
  ui.gate.hidden = true;
  ui.realmNav.hidden = false;
  ui.badge.hidden = false;
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
    const seconds = time / 1000;
    // Architectural props stay attached to the floor; only water and dust move.
    for (const sprite of propSprites.values()) {
      const { id } = sprite.userData;
      if (id === 'canal') {
        const isFeatured = manifest.realms[realm - 1].newProps.includes(id);
        sprite.material.opacity = (isFeatured ? 0.92 : 0.56) * worldFade * (0.95 + 0.05 * Math.sin(seconds * 2.3));
      }
    }
    particles.rotation.y = Math.sin(seconds * 0.12) * 0.025;
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
    status('缓慢将镜头对准脚下的平坦地面；不要边走边找');
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
    status('找到的可能是墙面或桌面；请对准脚下的平坦地面');
    return;
  }
  const current = new THREE.Vector3(point.x, point.y, point.z);
  stableHits = lastFloorPoint && lastFloorPoint.distanceTo(current) < 0.22 ? stableHits + 1 : 1;
  lastFloorPoint = current;
  status('检测到脚下水平面，正在稳定放置；请先肉眼确认安全');
  if (stableHits < 9) return;
  world.position.set(viewer.transform.position.x, point.y, viewer.transform.position.z);
  beginReveal();
  status('绿洲已展开。请站在原地慢慢转身，随时抬头确认现实环境');
  ui.badge.textContent = '设备平面定位 · 仍需肉眼避障';
}

async function startFloor() {
  ui.floorButton.disabled = true;
  status('正在启动设备的地面识别…');
  try {
    // The session request must happen directly in this button's user gesture.
    const session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay', 'local-floor'],
      domOverlay: { root: document.body },
    });
    xrSession = session;
    session.addEventListener('end', () => {
      hitSource?.cancel();
      hitSource = null;
      xrSession = null;
      mode = 'idle';
      if (world) world.visible = false;
      ui.gate.hidden = false;
      ui.reticle.hidden = true;
      ui.realmNav.hidden = true;
      ui.badge.hidden = true;
      status('地面定位已结束，可重新开始');
    }, { once: true });
    await ensureScene();
    basePanoOpacity = 0.26;
    world.visible = false;
    setFade(0);
    ui.gate.hidden = true;
    ui.reticle.hidden = false;
    mode = 'xr';
    await renderer.xr.setSession(session);
    const viewerSpace = await session.requestReferenceSpace('viewer');
    hitSource = await session.requestHitTestSource({ space: viewerSpace });
    renderer.setAnimationLoop(animate);
    status('缓慢将镜头对准脚下的平坦地面；不要边走边找');
  } catch (error) {
    if (xrSession) await xrSession.end().catch(() => {});
    xrSession = null;
    mode = 'idle';
    renderer?.setAnimationLoop(null);
    ui.gate.hidden = false;
    ui.reticle.hidden = true;
    status(`此设备未能启动地面定位（${error.name || '设备限制'}）。可选择原地环视。`);
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
    ui.badge.textContent = '原地环视 · 无地面定位';
  }
  camera.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(up, -compassZero).multiply(orientation));
}

async function startCompass() {
  ui.compassButton.disabled = true;
  status('正在打开相机并准备环视场景…');
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
    basePanoOpacity = 0.42;
    ui.video.srcObject = stream;
    ui.video.style.display = 'block';
    await ui.video.play();
    mode = 'compass';
    compassZero = null;
    gyroSeen = false;
    manualYaw = 0;
    camera.position.set(0, 1.42, 0);
    camera.quaternion.identity();
    world.position.set(0, 0, 0);
    window.addEventListener('deviceorientation', onOrientation);
    beginReveal();
    renderer.setAnimationLoop(animate);
    ui.badge.textContent = '原地环视 · 无地面定位';
    status('绿洲已展开。此模式没有检测地面或障碍；只在原地慢慢转身');
    if (motionPermission !== 'granted') status('已打开相机；运动传感器未获准，滑动屏幕可预览场景');
    clearTimeout(gyroStartTimer);
    gyroStartTimer = setTimeout(() => {
      if (mode === 'compass' && !gyroSeen) status('未收到手机转动数据；滑动屏幕仅能预览场景，不能用于空间定位');
    }, 3500);
  } catch (error) {
    stopCompass();
    status(`相机未能开启（${error.name || error.message || '未知原因'}）。请检查浏览器相机权限。`);
  } finally {
    ui.compassButton.disabled = false;
  }
}

function stopCompass() {
  stream?.getTracks().forEach((track) => track.stop());
  stream = null;
  ui.video.srcObject = null;
  ui.video.style.display = 'none';
  window.removeEventListener('deviceorientation', onOrientation);
  clearTimeout(gyroStartTimer);
  renderer?.setAnimationLoop(null);
  mode = 'idle';
  if (world) world.visible = false;
  ui.gate.hidden = false;
  ui.realmNav.hidden = true;
  ui.badge.hidden = true;
}

function pointerDown(event) {
  if (mode !== 'compass' || gyroSeen || !ui.gate.hidden) return;
  dragStart = { x: event.clientX, yaw: manualYaw };
}
function pointerMove(event) {
  if (!dragStart || mode !== 'compass' || gyroSeen) return;
  manualYaw = dragStart.yaw - (event.clientX - dragStart.x) / innerWidth * Math.PI;
  camera.rotation.set(0, manualYaw, 0, 'YXZ');
}

async function bootstrap() {
  if (localPreview) {
    try {
      await ensureScene();
      mode = 'preview';
      world.position.set(0, 0, 0);
      beginReveal();
      renderer.setAnimationLoop(animate);
      status('本地场景预览 · 不使用相机或地面定位');
      ui.badge.textContent = '本地预览 · 无地面定位';
    } catch (error) { status(`预览加载失败：${error.message}`); }
    return;
  }
  if (!scanAt || Date.now() - scanAt > 2 * 60 * 60 * 1000) return;
  try {
    const available = !!navigator.xr && await navigator.xr.isSessionSupported('immersive-ar');
    ui.floorButton.hidden = !available;
    ui.capability.textContent = available
      ? '设备报告支持 WebXR；点击后再检查是否具备平面识别。'
      : '这台手机或浏览器没有 WebXR 地面定位；仍可用相机原地环视。';
    status('图卡已识别。先确认现实环境安全，再选择进入方式');
  } catch {
    ui.floorButton.hidden = true;
    ui.capability.textContent = '无法查询地面定位能力；可用相机原地环视。';
    status('图卡已识别。先确认现实环境安全，再进入场景');
  }
}

ui.floorButton.addEventListener('click', startFloor);
ui.compassButton.addEventListener('click', startCompass);
window.addEventListener('resize', resize);
window.addEventListener('pointerdown', pointerDown);
window.addEventListener('pointermove', pointerMove);
window.addEventListener('pointerup', () => { dragStart = null; });
window.addEventListener('pointercancel', () => { dragStart = null; });
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  if (mode === 'compass') {
    stopCompass();
    status('相机已暂停；返回后请重新确认周围安全');
  } else if (mode === 'xr') xrSession?.end();
});
window.addEventListener('pagehide', () => {
  stream?.getTracks().forEach((track) => track.stop());
  xrSession?.end();
});

bootstrap();
