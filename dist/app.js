// Formal six-stage curriculum. Each stage selects three words at random; HSK 2
// has only one new grass-radical word in this pilot list, so it mixes reviews.
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
  ],
  4: [
    { word: '落', pinyin: 'luò', radicals: ['艹', '氵', '各'] },
    { word: '苦', pinyin: 'kǔ', radicals: ['艹', '古'] },
    { word: '获', pinyin: 'huò', radicals: ['艹', '犭', '又'] },
  ],
  5: [
    { word: '苗', pinyin: 'miáo', radicals: ['艹', '田'] },
    { word: '荣', pinyin: 'róng', radicals: ['艹', '冖', '木'] },
    { word: '蔬', pinyin: 'shū', radicals: ['艹', '疏'] },
  ],
  6: [
    { word: '蕾', pinyin: 'lěi', radicals: ['艹', '雨', '田'] },
    { word: '芽', pinyin: 'yá', radicals: ['艹', '牙'] },
    { word: '萌', pinyin: 'méng', radicals: ['艹', '明'] },
  ],
};

function shuffled(words) {
  return [...words].sort(() => Math.random() - 0.5);
}

function positionsFor(count) {
  if (count === 2) return [[43, 46], [59, 56]];
  return [[38, 46], [51, 56], [64, 46]];
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
      positions: positionsFor(entry.radicals.length),
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
const layer = document.querySelector('#radicalLayer');
const slots = document.querySelector('#slots');
const stageTitle = document.querySelector('#stageTitle');
const status = document.querySelector('#status');
const retryCamera = document.querySelector('#retryCamera');
const cursor = document.querySelector('#handCursor');
const gestureState = document.querySelector('#gestureState');
const handModeButton = document.querySelector('#handMode');
const completeHeading = document.querySelector('#complete h1');
const completeText = document.querySelector('#complete p:not(.eyebrow)');

let levelIndex = 0;
let active = null;
let pointer = { x: 50, y: 40 };
let radialNodes = [];
let foundTarget = false;
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

const PICKUP_RADIUS_PX = 144;
const PINCH_CLOSE_DISTANCE = 0.11;
const PINCH_OPEN_DISTANCE = 0.20;
const PINCH_RELEASE_GRACE_MS = 650;
const HAND_LOSS_GRACE_MS = 850;

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

async function requestCameraPermission() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('当前浏览器不支持网页相机');
  }
  // Ask for Android/iPhone browser permission before loading the AR engine. This keeps
  // the request directly attached to the player's tap, which mobile browsers require.
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: 'environment' } },
  });
  stream.getTracks().forEach((track) => track.stop());
  // Android devices can keep the hardware camera reserved briefly after a
  // permission probe. Give the AR engine a moment before it opens the rear camera.
  await new Promise((resolve) => setTimeout(resolve, 650));
}

function showCameraError(error, permissionGranted) {
  console.error(error);
  retryCamera.hidden = false;
  if (error?.name === 'NotAllowedError') {
    setStatus('相机未获允许：点地址栏左侧图标 → 权限 → 相机 → 允许，再点下方按钮');
  } else if (error?.name === 'NotFoundError') {
    setStatus('没有找到可用相机，请关闭占用相机的应用后重试');
  } else if (permissionGranted) {
    setStatus(`相机已允许，但图卡识别未启动（${error?.name || '未知原因'}）。请用 Google Chrome 打开后重试`);
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
  arView.classList.add('found');
  createLevel();
  retryCamera.hidden = true;
  setStatus('右手自然放在画面中下方，离镜头约 35–60 厘米后再捏合偏旁');
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

function createLevel() {
  active = null;
  layer.innerHTML = '';
  slots.innerHTML = '';
  radialNodes = [];
  const level = currentLevel();
  stageTitle.textContent = `HSK ${level.hsk} · 第 ${level.stageIndex}/3 字 · 组出「${level.word}」`;
  level.radicals.forEach((radical, index) => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.dataset.radical = radical;
    slots.append(slot);
    const node = document.createElement('button');
    node.className = 'radical';
    node.type = 'button';
    node.textContent = radical;
    node.dataset.radical = radical;
    const position = positionForPlayingHand(level.positions[index]);
    node.style.left = `${position[0]}%`;
    node.style.top = `${position[1]}%`;
    layer.append(node);
    radialNodes.push(node);
  });
}

function grab(node, x, y) {
  if (node.classList.contains('used')) return;
  if (active && active !== node) active.classList.remove('held');
  active = node;
  active.classList.add('held');
  moveActive(x, y);
  gestureState.textContent = '已抓住，移到空格后松开';
}

function moveActive(x, y) {
  pointer = { x, y };
  if (!active) return;
  active.style.left = `${x}px`;
  active.style.top = `${y}px`;
}

function placeActiveInSlot(slot) {
  if (!active || slot.classList.contains('filled')) return false;
  const node = active;
  if (slot.dataset.radical !== node.dataset.radical) {
    gestureState.textContent = '这个格子不对，换另一个虚线格';
    return false;
  }
  active = null;
  node.classList.remove('held');
  slot.textContent = node.dataset.radical;
  slot.classList.add('filled');
  node.classList.add('used');
  gestureState.textContent = '很好！继续找下一个偏旁';
  if (document.querySelectorAll('.slot.filled').length === currentLevel().radicals.length) {
    setTimeout(advanceLevel, 520);
  }
  return true;
}

function release() {
  if (!active) return;
  const node = active;
  const matchingSlot = [...document.querySelectorAll('.slot:not(.filled)')]
    .find((slot) => slot.dataset.radical === node.dataset.radical);
  const slotsRect = slots.getBoundingClientRect();
  const inAnswerZone = pointer.y >= slotsRect.top - 35;
  if (matchingSlot && inAnswerZone && placeActiveInSlot(matchingSlot)) {
    return;
  } else {
    active = null;
    gestureState.textContent = '捏合偏旁后，把手移到下方虚线格再松开';
    const index = radialNodes.indexOf(node);
    const origin = positionForPlayingHand(currentLevel().positions[index]);
    node.style.left = `${origin[0]}%`;
    node.style.top = `${origin[1]}%`;
  }
}

function advanceLevel() {
  levelIndex += 1;
  if (levelIndex >= levels.length) {
    stopGame();
    completeHeading.textContent = '六级绿洲完成';
    completeText.textContent = '你完成了 HSK 1–6 的 18 个随机草字头组字挑战。';
    complete.hidden = false;
    return;
  }
  createLevel();
  const level = currentLevel();
  setStatus((foundTarget ? '图卡已识别' : '相机游戏') + ` · HSK ${level.hsk} 第 ${level.stageIndex}/3 字：捏合偏旁来组字`);
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
      numHands: 1,
      minHandDetectionConfidence: 0.25,
      minHandPresenceConfidence: 0.25,
      minTrackingConfidence: 0.25,
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

function updateHand(result) {
  const hand = result?.landmarks?.[0];
  if (!hand) {
    cursor.style.opacity = '0';
    if (active?.dataset.handGrab === 'true' && performance.now() - lastHandSeenAt > HAND_LOSS_GRACE_MS) {
      pinchHeld = false;
      pinchReleaseStartedAt = 0;
      delete active.dataset.handGrab;
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
  const x = tip.x * innerWidth;
  const y = tip.y * innerHeight;
  const distance = Math.hypot(tip.x - thumb.x, tip.y - thumb.y);
  lastHandSeenAt = performance.now();
  const pinchLimit = pinchHeld ? PINCH_OPEN_DISTANCE : PINCH_CLOSE_DISTANCE;
  if (distance < pinchLimit) {
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
  if (handDetectionState !== 'seen' && !active) {
    handDetectionState = 'seen';
    gestureState.textContent = '已识别到手！保持整只手入镜，在中下方对准偏旁后捏合';
  }
  moveActive(x, y);
  if (pinchHeld && !active) {
    const nearby = radialNodes
      .filter((node) => !node.classList.contains('used'))
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return { node, distance: Math.hypot(x - (rect.left + rect.width / 2), y - (rect.top + rect.height / 2)) };
      })
      .sort((a, b) => a.distance - b.distance)[0];
    if (nearby && nearby.distance < PICKUP_RADIUS_PX) {
      grab(nearby.node, x, y);
      nearby.node.dataset.handGrab = 'true';
      gestureState.textContent = '捏合已抓住偏旁';
    }
  }
  if (!pinchHeld && active?.dataset.handGrab === 'true') {
    delete active.dataset.handGrab;
    release();
  }
}

async function startAR() {
  startButton.disabled = true;
  retryCamera.hidden = true;
  releaseMindARCamera();
  fallbackStream?.getTracks().forEach((track) => track.stop());
  fallbackStream = null;
  document.querySelector('#cameraContainer').replaceChildren();
  welcome.hidden = true;
  arView.style.display = 'block';
  setStatus('请在浏览器弹窗中允许使用相机…');
  let permissionGranted = false;
  try {
    await requestCameraPermission();
    permissionGranted = true;
    setStatus('相机已允许，正在载入图卡识别…');
    ({ MindARThree } = await import('https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js'));
    THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js');
    mindar = new MindARThree({
      container: document.querySelector('#cameraContainer'),
      imageTargetSrc: './assets/turpan-card.mind',
      uiLoading: 'no',
      uiScanning: 'no',
      uiError: 'no',
      webcamConfig: { facingMode: 'environment' },
      filterMinCF: 0.001,
      filterBeta: 0.01,
    });
    const { renderer, scene, camera } = mindar;
    const anchor = mindar.addAnchor(0);
    anchor.onTargetFound = () => {
      foundTarget = true;
      arView.classList.add('found');
      setStatus('图卡已识别：右手放在画面中下方，离镜头约 35–60 厘米后捏合偏旁');
    };
    anchor.onTargetLost = () => {
      foundTarget = false;
      arView.classList.remove('found');
      setStatus('图卡离开镜头，请重新对准');
    };
    const markerLight = new THREE.HemisphereLight(0xffffff, 0x22113c, 1.4);
    scene.add(markerLight);
    await mindar.start();
    renderer.setAnimationLoop(() => renderer.render(scene, camera));
    createLevel();
    setStatus('请将吐鲁番图卡完整放进镜头');
    await setupHandTracking(mindar.video);
  } catch (error) {
    if (permissionGranted) {
      try {
        releaseMindARCamera();
        await startFallbackCamera();
        return;
      } catch (fallbackError) {
        showCameraError(fallbackError, true);
      }
    } else {
      showCameraError(error, false);
    }
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
  welcome.hidden = true;
  arView.style.display = 'block';
  foundTarget = false;
  try {
    await startFallbackCamera();
  } catch (error) {
    showCameraError(error, false);
  } finally {
    practiceButton.disabled = false;
  }
}

function stopGame() {
  cancelAnimationFrame(animationFrame);
  animationFrame = 0;
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
  arView.classList.remove('found');
  cursor.style.opacity = '0';
  retryCamera.hidden = true;
}

startButton.addEventListener('click', startAR);
practiceButton.addEventListener('click', startPractice);
exitButton.addEventListener('click', () => { stopGame(); welcome.hidden = false; });
againButton.addEventListener('click', () => { complete.hidden = true; levelIndex = 0; levels = createCampaign(); welcome.hidden = false; });
retryCamera.addEventListener('click', startAR);
handModeButton.addEventListener('click', () => {
  playingHand = playingHand === 'right' ? 'left' : 'right';
  localStorage.setItem('hanzi-playing-hand', playingHand);
  refreshHandModeLabel();
  if (arView.style.display === 'block') {
    createLevel();
    gestureState.textContent = '已切换手势方向，保持整只抓取手在中下方入镜';
  }
});
refreshHandModeLabel();

if (shouldAutoStart()) {
  // A short delay gives mobile Chrome/Safari time to finish the QR hand-off.
  window.setTimeout(startAR, 220);
}
