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
const sceneCaption = document.querySelector('#sceneCaption');

let levelIndex = 0;
let active = null;
let pointer = { x: 50, y: 40 };
let radialNodes = [];
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

const PICKUP_RADIUS_PX = 195;
const PINCH_CLOSE_RATIO = 0.72;
const PINCH_OPEN_RATIO = 1.05;
const PINCH_RELEASE_GRACE_MS = 1050;
const HAND_LOSS_GRACE_MS = 1500;

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
  const messages = {
    1: `初学绿洲 · 找到「${level.word}」的偏旁`,
    2: `香草小径 · 找到「${level.word}」的偏旁`,
    3: `花影庭院 · 找到「${level.word}」的偏旁`,
    4: `风沙古道 · 找到「${level.word}」的偏旁`,
    5: `苗圃月色 · 找到「${level.word}」的偏旁`,
    6: `蕾光秘境 · 找到「${level.word}」的偏旁`,
  };
  return messages[level.hsk];
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
  practiceMode = true;
  scanConfirmed = true;
  arView.classList.add('practice', 'scanned', 'story-mode');
  createLevel();
  retryCamera.hidden = true;
  setSceneCaption('试玩模式 · 没有图卡定位，偏旁只会跟随镜头画面');
  setStatus('试玩模式：手势可用，但不会有图卡扫描后的定位效果');
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
  arView.dataset.hsk = level.hsk;
  stageTitle.textContent = `HSK ${level.hsk} · 第 ${level.stageIndex}/3 字 · 组出「${level.word}」`;
  setSceneCaption(sceneMessage(level));
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
    const level = currentLevel();
    setSceneCaption(sceneMessage(level, true));
    arView.classList.add('scene-bloom');
    playChime();
    gestureState.textContent = `「${level.word}」完成！绿洲正在变化…`;
    setTimeout(() => {
      arView.classList.remove('scene-bloom');
      advanceLevel();
    }, 1400);
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
  setStatus((practiceMode ? '试玩模式' : foundTarget ? '图卡正在追踪' : '绿洲已唤醒') + ` · HSK ${level.hsk} 第 ${level.stageIndex}/3 字：捏合偏旁来组字`);
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
  const hand = selectPlayingHand(result);
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
  const video = document.querySelector('#cameraContainer video');
  const videoRect = video?.getBoundingClientRect();
  const x = (videoRect?.left || 0) + tip.x * (videoRect?.width || innerWidth);
  const y = (videoRect?.top || 0) + tip.y * (videoRect?.height || innerHeight);
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
  if (handDetectionState !== 'seen' && !active) {
    handDetectionState = 'seen';
    gestureState.textContent = '已识别到手！手心或手背都可，食指和拇指合拢约 1 秒即可抓住';
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
  practiceMode = false;
  scanConfirmed = false;
  foundTarget = false;
  arView.classList.remove('found', 'scanned', 'story-mode', 'practice', 'scene-bloom');
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
      const isFirstScan = !scanConfirmed;
      scanConfirmed = true;
      arView.classList.add('found', 'scanned');
      arView.classList.remove('story-mode');
      if (isFirstScan) {
        createLevel();
        setStatus('图卡已识别：绿洲已在现实画面中浮现，偏旁藏在场景里');
        gestureState.textContent = '图卡已唤醒。手心或手背都可；整只抓取手入镜，拇指和食指合拢约 1 秒';
      } else {
        setStatus('图卡重新校准完成：继续在绿洲中抓取偏旁');
      }
    };
    anchor.onTargetLost = () => {
      foundTarget = false;
      arView.classList.remove('found');
      if (scanConfirmed) {
        // Image tracking needs the card in view to stay spatially anchored.
        // Keep the story scene alive after a scan, but state this honestly.
        arView.classList.add('story-mode');
        setStatus('绿洲已唤醒：图卡离开后进入漂浮场景；需要定位时请再扫一次图卡');
      } else {
        setStatus('请将吐鲁番图卡完整放进镜头');
      }
    };
    const markerLight = new THREE.HemisphereLight(0xffffff, 0x22113c, 1.4);
    scene.add(markerLight);
    await mindar.start();
    renderer.setAnimationLoop(() => renderer.render(scene, camera));
    setStatus('请将吐鲁番图卡完整放进镜头；识别成功后才会出现偏旁');
    await setupHandTracking(mindar.video);
  } catch (error) {
    releaseMindARCamera();
    showCameraError(error, permissionGranted);
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
  arView.classList.remove('found', 'scanned', 'story-mode', 'practice', 'scene-bloom');
  scanConfirmed = false;
  practiceMode = false;
  foundTarget = false;
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
    if (scanConfirmed) createLevel();
    gestureState.textContent = '已切换手势方向，保持整只抓取手在中下方入镜';
  }
});
refreshHandModeLabel();

if (shouldAutoStart()) {
  // A short delay gives mobile Chrome/Safari time to finish the QR hand-off.
  window.setTimeout(startAR, 220);
}
