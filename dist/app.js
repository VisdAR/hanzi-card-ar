const levels = [
  { word: '吐', radicals: ['口', '土'], positions: [[27, 37], [71, 30]] },
  { word: '鲁', radicals: ['鱼', '日'], positions: [[25, 42], [72, 34]] },
  { word: '番', radicals: ['米', '田'], positions: [[31, 32], [70, 42]] },
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
    node.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      grab(node, event.clientX, event.clientY);
      node.setPointerCapture?.(event.pointerId);
    });
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

function release() {
  if (!active) return;
  const node = active;
  active = null;
  node.classList.remove('held');
  const matchingSlot = [...document.querySelectorAll('.slot:not(.filled)')]
    .find((slot) => slot.dataset.radical === node.dataset.radical);
  const slotsRect = slots.getBoundingClientRect();
  const inAnswerZone = pointer.y >= slotsRect.top - 35;
  if (matchingSlot && inAnswerZone) {
    matchingSlot.textContent = node.dataset.radical;
    matchingSlot.classList.add('filled');
    node.classList.add('used');
    gestureState.textContent = '很好！继续找下一个偏旁';
    if (document.querySelectorAll('.slot.filled').length === currentLevel().radicals.length) {
      setTimeout(advanceLevel, 520);
    }
  } else {
    gestureState.textContent = '把偏旁拖到下方虚线格里';
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
  setStatus(foundTarget ? '图卡已识别，偏旁已出现' : '试玩模式：拖动偏旁到下方格子');
}

async function setupHandTracking(video) {
  try {
    const { FilesetResolver, HandLandmarker } = await import(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/+esm'
    );
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm'
    );
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 1,
    });
    const tick = () => {
      if (!handLandmarker || !video || video.readyState < 2) {
        animationFrame = requestAnimationFrame(tick);
        return;
      }
      if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        const result = handLandmarker.detectForVideo(video, performance.now());
        updateHand(result);
      }
      animationFrame = requestAnimationFrame(tick);
    };
    tick();
  } catch {
    gestureState.textContent = '手势加载失败，也可以直接手指拖动偏旁';
  }
}

function updateHand(result) {
  const hand = result?.landmarks?.[0];
  if (!hand) {
    cursor.style.opacity = '0';
    if (active?.dataset.handGrab === 'true') release();
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
  if (mindar) {
    mindar.stop();
    mindar = null;
  }
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
      setStatus('图卡已识别！捏合或拖动偏旁');
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
    showCameraError(error, permissionGranted);
    practiceButton.hidden = false;
  } finally {
    startButton.disabled = false;
  }
}

function startPractice() {
  welcome.hidden = true;
  arView.style.display = 'block';
  foundTarget = false;
  arView.classList.add('found');
  createLevel();
  setStatus('试玩模式：直接拖动偏旁到下方虚线格');
}

function stopGame() {
  cancelAnimationFrame(animationFrame);
  animationFrame = 0;
  handLandmarker?.close?.();
  handLandmarker = null;
  if (mindar) {
    mindar.stop();
    mindar = null;
  }
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
window.addEventListener('pointermove', (event) => moveActive(event.clientX, event.clientY));
window.addEventListener('pointerup', release);
window.addEventListener('pointercancel', release);
