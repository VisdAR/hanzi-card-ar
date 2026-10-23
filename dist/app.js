const levels = [
  // Right-hand comfort layout: a player can hold the phone in the left hand
  // and reach both pieces without twisting across the screen.
  { word: '吐', radicals: ['口', '土'], positions: [[57, 34], [73, 46]] },
  { word: '鲁', radicals: ['鱼', '日'], positions: [[57, 35], [73, 48]] },
  { word: '番', radicals: ['米', '田'], positions: [[57, 34], [73, 47]] },
];

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
  setStatus('右手单手模式：左手持机，右手伸进镜头捏合偏旁');
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
  stageTitle.textContent = `第 ${levelIndex + 1} 关 · 组出「${level.word}」`;
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
    node.style.left = `${level.positions[index][0]}%`;
    node.style.top = `${level.positions[index][1]}%`;
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
    const origin = currentLevel().positions[index];
    node.style.left = `${origin[0]}%`;
    node.style.top = `${origin[1]}%`;
  }
}

function advanceLevel() {
  levelIndex += 1;
  if (levelIndex >= levels.length) {
    stopGame();
    complete.hidden = false;
    return;
  }
  createLevel();
  setStatus(foundTarget ? '图卡已识别，捏合偏旁来组字' : '兼容模式：捏合偏旁到下方格子');
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
    if (active?.dataset.handGrab === 'true') release();
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
  const pinching = distance < 0.065;
  cursor.style.opacity = '1';
  cursor.style.left = `${x}px`;
  cursor.style.top = `${y}px`;
  cursor.classList.toggle('pinching', pinching);
  if (handDetectionState !== 'seen' && !active) {
    handDetectionState = 'seen';
    gestureState.textContent = '已识别到手！用光圈对准偏旁，再捏合抓取';
  }
  moveActive(x, y);
  if (pinching && !active) {
    const nearby = radialNodes.find((node) => {
      if (node.classList.contains('used')) return false;
      const rect = node.getBoundingClientRect();
      return Math.hypot(x - (rect.left + rect.width / 2), y - (rect.top + rect.height / 2)) < 58;
    });
    if (nearby) {
      grab(nearby, x, y);
      nearby.dataset.handGrab = 'true';
      gestureState.textContent = '捏合已抓住偏旁';
    }
  }
  if (!pinching && active?.dataset.handGrab === 'true') {
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
      setStatus('右手单手模式：左手持机，右手捏合偏旁来组字');
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
againButton.addEventListener('click', () => { complete.hidden = true; levelIndex = 0; welcome.hidden = false; });
retryCamera.addEventListener('click', startAR);

if (shouldAutoStart()) {
  // A short delay gives mobile Chrome/Safari time to finish the QR hand-off.
  window.setTimeout(startAR, 220);
}
