import { createOasis, makeGlyphSprite, changeGlyph } from './oasis3d.js';

// Each realm selects three word missions. 葡萄 and 萌芽 require two glyphs each.
const hskWords = {
  1: [
    { word: '茶', pinyin: 'chá', radicals: ['艹', '人', '木'] },
    { word: '菜', pinyin: 'cài', radicals: ['艹', '采'] },
    { word: '苹', pinyin: 'píng', radicals: ['艹', '平'] },
  ],
  2: [
    { word: '药', pinyin: 'yào', radicals: ['艹', '约'] },
  ],
  3: [
    { word: '草', pinyin: 'cǎo', radicals: ['艹', '早'] },
    { word: '花', pinyin: 'huā', radicals: ['艹', '化'] },
    { word: '蓝', pinyin: 'lán', radicals: ['艹', '监'] },
    { word: '节', pinyin: 'jié', radicals: ['艹', '卩'] },
    { word: '葡萄', pinyin: 'pútao', glyphs: [
      { char: '葡', radicals: ['艹', '勹', '甫'] },
      { char: '萄', radicals: ['艹', '勹', '缶'] },
    ] },
  ],
  4: [
    { word: '苦', pinyin: 'kǔ', radicals: ['艹', '古'] },
    { word: '获', pinyin: 'huò', radicals: ['艹', '犭', '犬'] },
    { word: '艺', pinyin: 'yì', radicals: ['艹', '乙'] },
    { word: '著', pinyin: 'zhù', radicals: ['艹', '者'] },
  ],
  5: [
    { word: '落', pinyin: 'luò', radicals: ['艹', '氵', '各'] },
    { word: '苗', pinyin: 'miáo', radicals: ['艹', '田'] },
    { word: '蔬', pinyin: 'shū', radicals: ['艹', '疏'] },
    { word: '英', pinyin: 'yīng', radicals: ['艹', '央'] },
    { word: '营', pinyin: 'yíng', radicals: ['艹', '冖', '吕'] },
  ],
  6: [
    { word: '萌芽', pinyin: 'méngyá', glyphs: [
      { char: '萌', radicals: ['艹', '明'] },
      { char: '芽', radicals: ['艹', '牙'] },
    ] },
    { word: '茂', pinyin: 'mào', radicals: ['艹', '戊'] },
    { word: '蒸', pinyin: 'zhēng', radicals: ['艹', '丞', '灬'] },
    { word: '荒', pinyin: 'huāng', radicals: ['艹', '巟'] },
    { word: '茎', pinyin: 'jīng', radicals: ['艹', '圣'] },
  ],
};

// Curriculum source levels stay internal. Players progress through story realms.
const realmNames = {
  1: '初醒藤影',
  2: '寻泉药径',
  3: '繁花藤廊',
  4: '越岭古道',
  5: '暮市丰年',
  6: '星泉新生',
};

function realmTitle(level) {
  return `第${level.hsk}境·${realmNames[level.hsk]}`;
}

function shuffled(words) {
  const result = [...words];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function positionsFor(count) {
  // Keep pieces near the sides of the floating scene instead of close to the
  // camera centre, where the player's hand needs room to be recognised.
  if (count === 2) return [[25, 47], [75, 43]];
  return [[20, 46], [50, 35], [80, 51]];
}

function createCampaign() {
  const campaign = [];
  const learned = [];
  for (let hsk = 1; hsk <= 6; hsk += 1) {
    const primary = shuffled(hskWords[hsk]);
    const selected = primary.slice(0, 3);
    if (selected.length < 3) selected.push(...shuffled(learned).slice(0, 3 - selected.length));
    selected.forEach((entry, stageIndex) => campaign.push({
      ...entry,
      hsk,
      stageIndex: stageIndex + 1,
    }));
    learned.push(...hskWords[hsk]);
  }
  return campaign;
}

let levels = createCampaign();

const welcome = document.querySelector('#welcome');
const arView = document.querySelector('#arView');
const complete = document.querySelector('#complete');
const startButton = document.querySelector('#startButton');
const practiceButton = document.querySelector('#practiceButton');
const exitButton = document.querySelector('#exitButton');
const againButton = document.querySelector('#againButton');
const stageTitle = document.querySelector('#stageTitle');
const status = document.querySelector('#status');
const retryCamera = document.querySelector('#retryCamera');
const cursor = document.querySelector('#handCursor');
const gestureState = document.querySelector('#gestureState');
const handModeButton = document.querySelector('#handMode');
const completeHeading = document.querySelector('#complete h1');
const completeText = document.querySelector('#complete p:not(.eyebrow)');
const sceneCaption = document.querySelector('#sceneCaption');
const worldPortal = document.querySelector('#worldPortal');
const enterWorld = document.querySelector('#enterWorld');

let levelIndex = 0;
let glyphIndex = 0;
let active = null;
let pointer = { x: 0, y: 0 };
let radialNodes = [];
let arRuntime = null;
let hoveredNode = null;
let combineCandidate = null;
let combineStartedAt = 0;
let completing = false;
let completionTimeout = 0;
let foundTarget = false;
let scanConfirmed = false;
let practiceMode = false;
let handLandmarker = null;
let lastVideoTime = -1;
let mindar = null;
let animationFrame = 0;
let MindARThree;
let THREE;
let fallbackStream = null;
let handDetectionState = 'starting';
let lastHandStatusAt = 0;
let lastHandSeenAt = 0;
let pinchReleaseStartedAt = 0;
let pinchHeld = false;
let playingHand = localStorage.getItem('hanzi-playing-hand') === 'left' ? 'left' : 'right';

const PINCH_CLOSE_RATIO = 0.95;
const PINCH_OPEN_RATIO = 1.35;
const PINCH_RELEASE_GRACE_MS = 380;
const HAND_LOSS_GRACE_MS = 2400;

function describeHandMode() {
  return playingHand === 'right' ? '左手持机 · 右手抓取' : '右手持机 · 左手抓取';
}

function positionForPlayingHand(position) {
  return playingHand === 'right' ? position : [100 - position[0], position[1]];
}

function refreshHandModeLabel() {
  handModeButton.textContent = describeHandMode() + '（点此切换）';
}

function setStatus(message) { status.textContent = message; }

function setSceneCaption(message) { sceneCaption.textContent = message; }

function sceneMessage(level, complete = false) {
  if (complete) return `「${level.word}」已成 · 绿洲回应了你的文字`;
  const glyph = currentGlyph();
  return `${realmNames[level.hsk]} · 找到「${glyph.char}」的构字部件`;
}

function playChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const now = context.currentTime;
    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + index * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.09, now + index * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.46);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now + index * 0.08);
      oscillator.stop(now + index * 0.08 + 0.5);
    });
    window.setTimeout(() => context.close(), 1000);
  } catch { /* sound is an optional enhancement */ }
}

function showCameraError(error, afterCameraAttempt) {
  console.error(error);
  retryCamera.hidden = false;
  if (error?.name === 'NotAllowedError') {
    setStatus('相机未获允许：点地址栏左侧图标 → 权限 → 相机 → 允许，再点下方按钮');
  } else if (error?.name === 'NotFoundError') {
    setStatus('没有找到可用相机，请关闭占用相机的应用后重试');
  } else if (afterCameraAttempt) {
    setStatus(`图卡扫描未启动（${error?.message || error?.name || '未知原因'}）。已改为一次性启动相机，请点下方按钮重试`);
  } else {
    setStatus('相机启动失败，请点“重新开启相机”再试');
  }
}

async function startFallbackCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: 'environment' } },
  });
  fallbackStream = stream;
  const video = document.createElement('video');
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  document.querySelector('#cameraContainer').replaceChildren(video);
  await video.play();
  THREE = await import('three');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(47, innerWidth / innerHeight, 0.01, 20);
  camera.position.z = 1.55;
  scene.add(camera);
  scene.add(new THREE.HemisphereLight(0xf9f0dc, 0x335d61, 2.0));
  const keyLight = new THREE.DirectionalLight(0xffdcad, 1.7);
  keyLight.position.set(-0.5, 1, 2);
  scene.add(keyLight);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  document.querySelector('#cameraContainer').append(renderer.domElement);
  const oasis = createOasis(THREE);
  oasis.root.scale.setScalar(0.52);
  scene.add(oasis.root);
  arRuntime = { scene, camera, renderer, oasis, mode: 'practice' };
  renderer.setAnimationLoop((time) => {
    oasis.update(time);
    renderer.render(scene, camera);
  });
  practiceMode = true;
  scanConfirmed = true;
  arView.classList.add('practice', 'scanned', 'story-mode');
  createLevel();
  retryCamera.hidden = true;
  setSceneCaption('试玩模式 · 立体绿洲随镜头移动');
  setStatus('试玩模式：把手伸入镜头，捏住字形并与另一枚相碰');
  await setupHandTracking(video);
}

function releaseMindARCamera() {
  if (!mindar) return;
  try { mindar.controller?.stopProcessVideo?.(); } catch { /* no controller on an early failure */ }
  try { mindar.video?.srcObject?.getTracks?.().forEach((track) => track.stop()); } catch { /* stream was never attached */ }
  mindar.video?.remove?.();
  mindar = null;
}

function currentLevel() { return levels[levelIndex]; }
function currentGlyph() {
  const level = currentLevel();
  return level.glyphs?.[glyphIndex] || { char: level.word, radicals: level.radicals };
}

function createLevel() {
  if (!arRuntime || !currentLevel()) return;
  active = null;
  hoveredNode = null;
  combineCandidate = null;
  completing = false;
  radialNodes.forEach((node) => {
    node.parent?.remove(node);
    node.userData.texture?.dispose();
    node.material?.dispose();
  });
  radialNodes = [];
  const level = currentLevel();
  const glyph = currentGlyph();
  const positions = positionsFor(glyph.radicals.length);
  arView.dataset.hsk = level.hsk;
  arRuntime.oasis.setRealm(level.hsk);
  stageTitle.textContent = `${realmTitle(level)} · 第 ${level.stageIndex}/3 词 · 组「${level.word}」${level.glyphs ? `中的「${glyph.char}」` : ''}`;
  setSceneCaption(sceneMessage(level));
  glyph.radicals.forEach((radical, index) => {
    const position = positionForPlayingHand(positions[index]);
    const node = makeGlyphSprite(THREE, radical, 0.19);
    node.position.set((position[0] - 50) / 100, 0.12 + (50 - position[1]) / 100, 0.31 + index * 0.025);
    node.userData.parts = [index];
    node.userData.origin = node.position.clone();
    arRuntime.oasis.root.add(node);
    radialNodes.push(node);
  });
  gestureState.textContent = '捏住一个部件，碰到另一个部件就会融合';
}

function screenPosition(node) {
  if (!arRuntime || !node.visible) return null;
  arRuntime.camera.updateMatrixWorld(true);
  arRuntime.scene.updateMatrixWorld(true);
  const p = new THREE.Vector3();
  node.getWorldPosition(p);
  p.project(arRuntime.camera);
  if (p.z < -1 || p.z > 1) return null;
  const rect = arRuntime.renderer.domElement.getBoundingClientRect();
  return { x: rect.left + (p.x + 1) * rect.width / 2, y: rect.top + (1 - p.y) * rect.height / 2 };
}

function revealNearbyEgg(x, y) {
  if (!arRuntime || completing) return false;
  const radius = Math.max(58, Math.min(95, innerWidth * 0.10));
  const egg = arRuntime.oasis.eggs
    .filter((candidate) => candidate.visible)
    .map((candidate) => {
      const point = screenPosition(candidate);
      return { candidate, distance: point ? Math.hypot(x - point.x, y - point.y) : Infinity };
    })
    .sort((a, b) => a.distance - b.distance)[0];
  if (!egg || egg.distance > radius) return false;
  const discovery = arRuntime.oasis.revealEgg(egg.candidate);
  if (!discovery) return false;
  setSceneCaption(`发现彩蛋 · ${discovery}`);
  gestureState.textContent = '找到了隐藏彩蛋！继续把构字部件靠在一起';
  playChime();
  return true;
}

function grab(node, x, y) {
  if (!node.visible || completing) return;
  active = node;
  node.scale.setScalar(node.userData.parts.length > 1 ? 0.23 : 0.21);
  moveActive(x, y);
  gestureState.textContent = '抓住了！移向另一枚字形，靠近就会组合';
}

function moveActive(x, y) {
  pointer = { x, y };
  if (!active || !arRuntime) return;
  const rect = arRuntime.renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2((x - rect.left) / rect.width * 2 - 1, 1 - (y - rect.top) / rect.height * 2);
  const ray = new THREE.Raycaster();
  ray.setFromCamera(ndc, arRuntime.camera);
  arRuntime.scene.updateMatrixWorld(true);
  const normal = new THREE.Vector3(0, 0, 1).transformDirection(arRuntime.oasis.root.matrixWorld);
  const point = arRuntime.oasis.root.localToWorld(new THREE.Vector3(0, 0, active.position.z));
  const hit = new THREE.Vector3();
  if (!ray.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(normal, point), hit)) return;
  const local = arRuntime.oasis.root.worldToLocal(hit);
  active.position.x = THREE.MathUtils.clamp(local.x, -0.62, 0.62);
  active.position.y = THREE.MathUtils.clamp(local.y, -0.48, 0.49);
  tryCombine();
}

function tryCombine() {
  if (!active || completing) return;
  const here = screenPosition(active);
  if (!here) return;
  const radius = Math.max(65, Math.min(108, innerWidth * 0.12));
  const nearby = radialNodes
    .filter((node) => node !== active && node.visible)
    .map((node) => ({ node, point: screenPosition(node) }))
    .filter(({ point }) => point && Math.hypot(here.x - point.x, here.y - point.y) < radius)
    .sort((a, b) => Math.hypot(here.x - a.point.x, here.y - a.point.y) - Math.hypot(here.x - b.point.x, here.y - b.point.y))[0]?.node;
  if (!nearby) { combineCandidate = null; return; }
  if (nearby !== combineCandidate) { combineCandidate = nearby; combineStartedAt = performance.now(); return; }
  if (performance.now() - combineStartedAt < 110) return;
  combineCandidate = null;
  active.userData.parts.push(...nearby.userData.parts);
  nearby.visible = false;
  const level = currentLevel();
  const glyph = currentGlyph();
  if (active.userData.parts.length === glyph.radicals.length) {
    completing = true;
    active.position.set(0, 0.06, 0.48);
    active.scale.set(0.36, 0.36, 1);
    changeGlyph(active, glyph.char);
    const wordFinished = !level.glyphs || glyphIndex === level.glyphs.length - 1;
    setSceneCaption(wordFinished ? `「${level.word}」· ${level.pinyin} · 绿洲被唤醒` : `「${glyph.char}」已成 · 继续组「${level.glyphs[glyphIndex + 1].char}」`);
    gestureState.textContent = wordFinished ? `组出了「${level.word}」！看看场景的变化` : `第一个字「${glyph.char}」完成，准备下一个字`;
    if (wordFinished) arRuntime.oasis.bloom(level.word);
    playChime();
    active = null;
    completionTimeout = window.setTimeout(advanceLevel, wordFinished ? 2100 : 1300);
  } else {
    const joined = active.userData.parts.sort((a, b) => a - b).map((index) => glyph.radicals[index]).join('·');
    changeGlyph(active, joined);
    active.scale.set(0.24, 0.24, 1);
    gestureState.textContent = `已融合 ${active.userData.parts.length}/${glyph.radicals.length} 个部件，继续寻找`;
    playChime();
  }
}

function release() {
  if (!active) return;
  active.scale.setScalar(active.userData.parts.length > 1 ? 0.24 : 0.19);
  active = null;
  combineCandidate = null;
  gestureState.textContent = '字形留在原处；再次捏住，靠近另一枚字形即可组合';
}

function advanceLevel() {
  const finishedLevel = currentLevel();
  if (finishedLevel?.glyphs && glyphIndex < finishedLevel.glyphs.length - 1) {
    glyphIndex += 1;
    createLevel();
    return;
  }
  glyphIndex = 0;
  levelIndex += 1;
  if (levelIndex >= levels.length) {
    stopGame();
    completeHeading.textContent = '六境绿洲完成';
    completeText.textContent = '你在立体绿洲里完成了 18 个组字挑战。';
    complete.hidden = false;
    return;
  }
  createLevel();
  const level = currentLevel();
  setStatus((practiceMode ? '试玩模式' : foundTarget ? '图卡正在追踪' : '请重新对准图卡') + ` · ${realmTitle(level)} 第 ${level.stageIndex}/3 词`);
}

async function setupHandTracking(video) {
  try {
    gestureState.textContent = '正在准备真实手势识别…';
    const { FilesetResolver, HandLandmarker } = await import(
      './assets/mediapipe/vision_bundle.mjs'
    );
    const vision = await FilesetResolver.forVisionTasks(
      './assets/mediapipe/wasm'
    );
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: './assets/mediapipe/hand_landmarker.task',
        delegate: 'CPU',
      },
      runningMode: 'VIDEO',
      // Two hands lets the player hold the phone naturally and still have the
      // free hand selected, including a left-handed setup.
      numHands: 2,
      minHandDetectionConfidence: 0.14,
      minHandPresenceConfidence: 0.14,
      minTrackingConfidence: 0.14,
    });
    gestureState.textContent = '等待看见手…请让整只手出现在相机画面内';
    handDetectionState = 'waiting';
    const tick = () => {
      if (!handLandmarker || !video || video.readyState < 2) {
        animationFrame = requestAnimationFrame(tick);
        return;
      }
      if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        try {
          const result = handLandmarker.detectForVideo(video, performance.now());
          updateHand(result);
        } catch (error) {
          console.error('Hand tracking stopped while analyzing video:', error);
          handLandmarker?.close?.();
          handLandmarker = null;
          cursor.style.opacity = '0';
          gestureState.textContent = '手势引擎运行中断，正在准备修复版本';
          return;
        }
      }
      animationFrame = requestAnimationFrame(tick);
    };
    tick();
  } catch (error) {
    console.error('Hand tracking could not start:', error);
    gestureState.textContent = '手势识别未启动，请刷新页面后重新允许相机';
  }
}

function selectPlayingHand(result) {
  const hands = result?.landmarks || [];
  if (!hands.length) return null;
  const wanted = playingHand === 'right' ? 'right' : 'left';
  const labels = result?.handednesses || [];
  const matchingIndex = labels.findIndex((labelSet) => {
    const label = labelSet?.[0]?.categoryName?.toLowerCase();
    return label === wanted;
  });
  // Some rear cameras report no handedness or reverse it. A visible hand is
  // still more useful than silently refusing to recognise anything.
  return hands[matchingIndex >= 0 ? matchingIndex : 0];
}

function updateHand(result) {
  // A hand cannot manipulate an image-anchored piece without a current marker
  // pose. Do not keep moving invisible pieces after the card leaves the frame.
  if (!practiceMode && !foundTarget) {
    cursor.style.opacity = '0';
    if (active) release();
    return;
  }
  const hand = selectPlayingHand(result);
  if (!hand) {
    cursor.style.opacity = '0';
    cursor.classList.remove('near');
    if (hoveredNode && hoveredNode !== active && hoveredNode.visible) hoveredNode.scale.setScalar(0.19);
    hoveredNode = null;
    if (active && performance.now() - lastHandSeenAt > HAND_LOSS_GRACE_MS) {
      pinchHeld = false;
      pinchReleaseStartedAt = 0;
      release();
    }
    if (handDetectionState !== 'missing' || performance.now() - lastHandStatusAt > 1800) {
      handDetectionState = 'missing';
      lastHandStatusAt = performance.now();
      gestureState.textContent = '正在分析相机画面：暂未识别到手';
    }
    return;
  }
  const tip = hand[8];
  const thumb = hand[4];
  const video = document.querySelector('#cameraContainer video');
  const videoRect = video?.getBoundingClientRect();
  const scale = video && videoRect ? Math.max(videoRect.width / video.videoWidth, videoRect.height / video.videoHeight) : 1;
  const imageWidth = video ? video.videoWidth * scale : innerWidth;
  const imageHeight = video ? video.videoHeight * scale : innerHeight;
  const imageLeft = (videoRect?.left || 0) + ((videoRect?.width || innerWidth) - imageWidth) / 2;
  const imageTop = (videoRect?.top || 0) + ((videoRect?.height || innerHeight) - imageHeight) / 2;
  const x = imageLeft + ((tip.x + thumb.x) / 2) * imageWidth;
  const y = imageTop + ((tip.y + thumb.y) / 2) * imageHeight;
  const distance = Math.hypot(tip.x - thumb.x, tip.y - thumb.y);
  const palmSize = Math.max(0.045, Math.hypot(hand[0].x - hand[9].x, hand[0].y - hand[9].y));
  const pinchRatio = distance / palmSize;
  lastHandSeenAt = performance.now();
  const pinchLimit = pinchHeld ? PINCH_OPEN_RATIO : PINCH_CLOSE_RATIO;
  if (pinchRatio < pinchLimit) {
    pinchHeld = true;
    pinchReleaseStartedAt = 0;
  } else if (pinchHeld) {
    if (!pinchReleaseStartedAt) pinchReleaseStartedAt = performance.now();
    if (performance.now() - pinchReleaseStartedAt >= PINCH_RELEASE_GRACE_MS) {
      pinchHeld = false;
      pinchReleaseStartedAt = 0;
    }
  }
  cursor.style.opacity = '1';
  cursor.style.left = `${x}px`;
  cursor.style.top = `${y}px`;
  cursor.classList.toggle('pinching', pinchHeld);
  const pickupRadius = Math.max(74, Math.min(125, innerWidth * 0.14));
  const nearest = radialNodes
    .filter((node) => node.visible && node !== active)
    .map((node) => {
      const point = screenPosition(node);
      return { node, distance: point ? Math.hypot(x - point.x, y - point.y) : Infinity };
    })
    .sort((a, b) => a.distance - b.distance)[0];
  const nearNode = nearest?.distance < pickupRadius ? nearest.node : null;
  if (hoveredNode && hoveredNode !== nearNode && hoveredNode !== active && hoveredNode.visible) hoveredNode.scale.setScalar(0.19);
  hoveredNode = nearNode;
  if (nearNode) nearNode.scale.setScalar(0.23);
  cursor.classList.toggle('near', !!nearNode);
  if (handDetectionState !== 'seen' && !active && !completing) {
    handDetectionState = 'seen';
    gestureState.textContent = '已看到手。拇指与食指捏住字形，移近另一枚字形';
  }
  moveActive(x, y);
  if (pinchHeld && !active && !completing) {
    if (nearNode) grab(nearNode, x, y);
    else revealNearbyEgg(x, y);
  }
  if (!pinchHeld && active) release();
}

async function startAR() {
  startButton.disabled = true;
  retryCamera.hidden = true;
  window.clearTimeout(completionTimeout);
  arRuntime?.renderer.setAnimationLoop(null);
  arRuntime?.renderer.dispose();
  arRuntime = null;
  radialNodes = [];
  active = null;
  practiceMode = false;
  scanConfirmed = false;
  foundTarget = false;
  worldPortal.hidden = true;
  arView.classList.remove('found', 'scanned', 'story-mode', 'practice', 'scene-bloom', 'world-ready');
  releaseMindARCamera();
  fallbackStream?.getTracks().forEach((track) => track.stop());
  fallbackStream = null;
  document.querySelector('#cameraContainer').replaceChildren();
  welcome.hidden = true;
  arView.style.display = 'block';
  setStatus('正在启动图卡扫描…浏览器如有提示，请允许使用相机');
  try {
    // MindAR must own the first and only camera request. On several Android
    // devices a preliminary getUserMedia probe leaves the camera unavailable
    // to the tracker even after its tracks are stopped.
    ({ MindARThree } = await import('mindar-image-three'));
    THREE = await import('three');
    mindar = new MindARThree({
      container: document.querySelector('#cameraContainer'),
      imageTargetSrc: './assets/turpan-card.mind',
      uiLoading: 'no',
      uiScanning: 'no',
      uiError: 'no',
      webcamConfig: { facingMode: 'environment' },
      warmupTolerance: 5,
      missTolerance: 8,
    });
    const { renderer, scene, camera } = mindar;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    scene.add(camera);
    const oasis = createOasis(THREE);
    const anchor = mindar.addAnchor(0);
    anchor.group.add(oasis.root);
    arRuntime = { scene, camera, renderer, oasis, anchor, mode: 'marker' };
    anchor.onTargetFound = () => {
      foundTarget = true;
      const isFirstScan = !scanConfirmed;
      scanConfirmed = true;
      worldPortal.hidden = false;
      arView.classList.add('world-ready');
      arView.classList.add('found', 'scanned');
      arView.classList.remove('story-mode');
      if (isFirstScan) {
        createLevel();
        setStatus('图卡已识别：立体绿洲浮现。捏住一枚字形，移近另一枚');
        gestureState.textContent = '手心或手背均可；让整只抓取手出现在镜头里';
      } else {
        setStatus('图卡重新校准完成：继续在绿洲中抓取偏旁');
      }
    };
    anchor.onTargetLost = () => {
      foundTarget = false;
      arView.classList.remove('found', 'scanned', 'story-mode');
      cursor.style.opacity = '0';
      pinchHeld = false;
      pinchReleaseStartedAt = 0;
      if (active) release();
      if (scanConfirmed) {
        setStatus('图卡离开镜头，场景已暂停；请重新对准图卡继续组字');
      } else {
        setStatus('请将吐鲁番图卡完整放进镜头');
      }
    };
    const markerLight = new THREE.HemisphereLight(0xf9f0dc, 0x335d61, 2.0);
    scene.add(markerLight);
    const sunlight = new THREE.DirectionalLight(0xffdfb0, 1.6);
    sunlight.position.set(-0.7, 1.2, 1.5);
    scene.add(sunlight);
    await mindar.start();
    renderer.setAnimationLoop((time) => {
      oasis.update(time);
      renderer.render(scene, camera);
    });
    setStatus('请将吐鲁番图卡完整放进镜头；识别成功后才会出现偏旁');
    await setupHandTracking(mindar.video);
  } catch (error) {
    arRuntime?.renderer.setAnimationLoop(null);
    arRuntime?.renderer.dispose();
    arRuntime = null;
    releaseMindARCamera();
    showCameraError(error, true);
    practiceButton.hidden = false;
  } finally {
    startButton.disabled = false;
  }
}

// Printed-card QR codes use ?play=1. A phone camera opens the secure page and
// immediately requests the only permission the game needs, without making the
// player find the site or press the start button first.
function shouldAutoStart() {
  return new URLSearchParams(window.location.search).get('play') === '1';
}

async function startPractice() {
  practiceButton.disabled = true;
  window.clearTimeout(completionTimeout);
  arRuntime?.renderer.setAnimationLoop(null);
  arRuntime?.renderer.dispose();
  arRuntime = null;
  radialNodes = [];
  active = null;
  welcome.hidden = true;
  arView.style.display = 'block';
  foundTarget = false;
  arView.classList.remove('found', 'scene-bloom');
  try {
    await startFallbackCamera();
  } catch (error) {
    showCameraError(error, false);
  } finally {
    practiceButton.disabled = false;
  }
}

function stopGame() {
  window.clearTimeout(completionTimeout);
  cancelAnimationFrame(animationFrame);
  animationFrame = 0;
  arRuntime?.renderer.setAnimationLoop(null);
  arRuntime?.renderer.dispose();
  arRuntime = null;
  radialNodes = [];
  active = null;
  hoveredNode = null;
  completing = false;
  handLandmarker?.close?.();
  handLandmarker = null;
  pinchHeld = false;
  pinchReleaseStartedAt = 0;
  if (mindar) {
    releaseMindARCamera();
  }
  fallbackStream?.getTracks().forEach((track) => track.stop());
  fallbackStream = null;
  document.querySelector('#cameraContainer').replaceChildren();
  arView.style.display = 'none';
  arView.classList.remove('found', 'scanned', 'story-mode', 'practice', 'scene-bloom', 'world-ready');
  scanConfirmed = false;
  worldPortal.hidden = true;
  practiceMode = false;
  foundTarget = false;
  cursor.style.opacity = '0';
  retryCamera.hidden = true;
}

startButton.addEventListener('click', startAR);
practiceButton.addEventListener('click', startPractice);
exitButton.addEventListener('click', () => { stopGame(); welcome.hidden = false; });
againButton.addEventListener('click', () => { complete.hidden = true; levelIndex = 0; glyphIndex = 0; levels = createCampaign(); welcome.hidden = false; });
retryCamera.addEventListener('click', startAR);
enterWorld.addEventListener('click', () => {
  if (!scanConfirmed) return;
  sessionStorage.setItem('hanzi-world-scan', String(Date.now()));
  stopGame();
  window.location.assign('./world360.html');
});
handModeButton.addEventListener('click', () => {
  playingHand = playingHand === 'right' ? 'left' : 'right';
  localStorage.setItem('hanzi-playing-hand', playingHand);
  refreshHandModeLabel();
  if (arView.style.display === 'block') {
    window.clearTimeout(completionTimeout);
    if (scanConfirmed) createLevel();
    gestureState.textContent = '已切换抓取手；让整只手自然进入镜头';
  }
});
refreshHandModeLabel();

if (shouldAutoStart()) {
  // A short delay gives mobile Chrome/Safari time to finish the QR hand-off.
  window.setTimeout(startAR, 220);
}
