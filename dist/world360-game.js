import { makeGlyphSprite, changeGlyph } from './oasis3d.js';

// One three-word route per realm. The nouns are also the scene's discoverable objects.
const routes = [
  [
    ['茶', 'chá', ['艹', '人', '木'], '茶由草字头、人和木构成；绿洲中的茶树在水边生长。', 'Le thé réunit l’herbe, la personne et l’arbre. Cherchez le théier près de l’eau.', 'Tea joins grass, person and tree. Find the tea plant near the water.'],
    ['菜', 'cài', ['艹', '采'], '菜由草字头与采组成；藤廊下的菜叶随风轻动。', 'Le caractère des légumes unit l’herbe et la cueillette. Regardez sous la treille.', 'The character for vegetables joins grass and gathering. Look beneath the trellis.'],
    ['苹', 'píng', ['艹', '平'], '苹由草字头与平组成；水面平静时可看见岸边的嫩叶。', 'Ce caractère unit l’herbe et la plaine. Observez les jeunes feuilles près de l’eau.', 'This character joins grass and level ground. Look for new leaves near the water.'],
  ],
  [
    ['药', 'yào', ['艹', '约'], '药由草字头与约组成；在引水小径旁寻找草药。', 'Le remède unit l’herbe et 约. Cherchez les plantes médicinales au bord du canal.', 'Medicine joins grass and 约. Find the herbs along the canal.'],
    ['茶', 'chá', ['艹', '人', '木'], '茶由草字头、人和木构成；在药径旁回顾这枚字。', 'Le thé réunit l’herbe, la personne et l’arbre. Retrouvez ce caractère près des plantes médicinales.', 'Tea joins grass, person and tree. Review it near the herb path.'],
    ['菜', 'cài', ['艹', '采'], '菜由草字头与采组成；在药径旁回顾采集与植物。', 'Le caractère des légumes unit l’herbe et la cueillette. Révisez-le sur le sentier.', 'The character for vegetables joins grass and gathering. Review it on the path.'],
  ],
  [
    ['草', 'cǎo', ['艹', '早'], '草由草字头与早组成；清晨的绿意藏在小径边。', 'L’herbe unit le radical végétal et le matin. Regardez le bord du sentier.', 'Grass joins the plant radical and early morning. Look beside the path.'],
    ['花', 'huā', ['艹', '化'], '花由草字头与化组成；新的花朵从藤架旁绽开。', 'La fleur unit le végétal et la transformation. De nouvelles fleurs s’ouvrent près de la treille.', 'Flower joins grass and change. New flowers open by the trellis.'],
    ['蓝', 'lán', ['艹', '监'], '蓝由草字头与监组成；抬头可见花藤间的蓝天。', 'Le bleu unit le radical végétal et 监. Regardez le ciel entre les vignes.', 'Blue joins the plant radical and 监. Look at the sky between the vines.'],
  ],
  [
    ['苦', 'kǔ', ['艹', '古'], '苦由草字头与古组成；古道旁的植物有不同滋味。', 'L’amer unit l’herbe et l’ancien. Cherchez les plantes près de l’ancienne route.', 'Bitter joins grass and old. Find the plants by the old road.'],
    ['艺', 'yì', ['艹', '乙'], '艺由草字头与乙组成；绿洲里的手艺藏在土墙与藤架之间。', 'L’art unit l’herbe et 乙. Découvrez les traces d’artisanat près des murs de terre.', 'Art joins grass and 乙. Find craft details near the earthen walls.'],
    ['著', 'zhù', ['艹', '者'], '著由草字头与者组成；古道的故事被文字记下。', '著 unit l’herbe et 者. Les récits de la route ancienne prennent forme.', '著 joins grass and 者. Stories of the old road take shape.'],
  ],
  [
    ['落', 'luò', ['艹', '氵', '各'], '落由草字头、三点水与各组成；暮色落在水渠和集市上。', '落 assemble végétal, eau et 各. Le soir descend sur le canal et le marché.', '落 joins grass, water and 各. Evening falls over the canal and market.'],
    ['苗', 'miáo', ['艹', '田'], '苗由草字头与田组成；新苗在灌溉后的土地上生长。', 'La jeune pousse unit l’herbe et le champ. Cherchez-la sur la terre irriguée.', 'Seedling joins grass and field. Find it on irrigated soil.'],
    ['营', 'yíng', ['艹', '冖', '吕'], '营由草字头、冖与吕组成；集市的灯火渐次亮起。', '营 assemble l’herbe, 冖 et 吕. Les lumières du marché s’allument.', '营 joins grass, 冖 and 吕. The market lights begin to shine.'],
  ],
  [
    ['茂', 'mào', ['艹', '戊'], '茂由草字头与戊组成；夜色里绿洲仍然繁盛。', '茂 unit l’herbe et 戊. L’oasis reste luxuriante à la tombée de la nuit.', '茂 joins grass and 戊. The oasis remains lush at night.'],
    ['蒸', 'zhēng', ['艹', '丞', '灬'], '蒸由草字头、丞与四点底组成；热气在水边缓缓升起。', 'La vapeur réunit l’herbe, 丞 et le feu. Elle s’élève doucement près de l’eau.', 'Steam joins grass, 丞 and fire. It rises gently beside the water.'],
    ['荒', 'huāng', ['艹', '巟'], '荒由草字头与巟组成；寻找绿洲和荒野交接的地方。', '荒 unit l’herbe et 巟. Cherchez la frontière entre l’oasis et les terres arides.', '荒 joins grass and 巟. Find where the oasis meets the dry land.'],
  ],
];

const labels = {
  target: { zh: '第 {index}/3 字 · 靠近并对准发光的偏旁；捏住或点“抓取”', fr: 'Caractère {index}/3. Visez une forme lumineuse. Pincez pour la saisir ou touchez « Saisir ».', en: 'Character {index}/3. Aim at a glowing piece. Pinch to grab it or tap Grab.' },
  hold: { zh: '已抓住：移向另一枚偏旁，靠近后自动融合', fr: 'Pièce saisie : rapprochez-la d’une autre pour les assembler.', en: 'Piece held: bring it close to another piece to join them.' },
  progress: { zh: '已组合 {parts}/{total} 个部件 · 还剩 {remaining} 个字', fr: '{parts}/{total} éléments assemblés · {remaining} caractères à découvrir', en: '{parts}/{total} pieces joined · {remaining} characters left' },
  done: { zh: '「{word}」组成了 · 本境还剩 {remaining} 个字', fr: '« {word} » est formé · encore {remaining} caractères dans ce monde', en: '“{word}” is complete · {remaining} characters remain in this realm' },
  allDone: { zh: '本境的三个字都完成了 · 可选择下一境', fr: 'Les trois caractères sont terminés. Choisissez le monde suivant.', en: 'All three characters are complete. Choose the next realm.' },
  grab: { zh: '抓取 / 放下', fr: 'Saisir / poser', en: 'Grab / release' },
  next: { zh: '寻找下一个字', fr: 'Caractère suivant', en: 'Next character' },
  near: { zh: '字形离镜头较远；原地转身，把镜头对准它', fr: 'La forme est plus loin. Tournez sur place pour la viser.', en: 'The piece is farther away. Turn in place to aim at it.' },
};

function localize(template, values = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''));
}

export function createSpatialGame(THREE, { world, getCamera, ui, getMode, getLanguage }) {
  const playRoutes = routes.map((route) => {
    const result = [...route];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  });
  const nodes = [];
  const cameraPoint = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const ray = new THREE.Raycaster();
  let realm = 1;
  let wordIndex = 0;
  const progress = Array(6).fill(0);
  let active = null;
  let nearby = null;
  let cursor = null;
  let joinedAt = 0;
  let handLandmarker = null;
  let handFrame = 0;
  let lastVideoTime = -1;
  let lastHandTime = 0;
  let lastHandSeenAt = 0;
  let pinched = false;
  let releaseAt = 0;
  let completed = false;

  function pair(element, entry, values) {
    const foreign = element.querySelector('.foreign-copy');
    const zh = element.querySelector('.zh-copy');
    if (foreign) {
      foreign.lang = getLanguage();
      foreign.textContent = localize(entry[getLanguage()], values);
    }
    if (zh) zh.textContent = localize(entry.zh, values);
  }

  function say(entry, values) { pair(ui.hint, entry, values); }
  function remaining() { return 3 - wordIndex - (completed ? 1 : 0); }

  function removeNodes() {
    for (const node of nodes) {
      node.removeFromParent();
      node.userData.texture?.dispose();
      node.material.dispose();
    }
    nodes.length = 0;
    active = null;
    nearby = null;
    cursor = null;
    joinedAt = 0;
  }

  function setWord() {
    removeNodes();
    ui.explainer.hidden = true;
    ui.narration.hidden = !world.visible;
    ui.next.hidden = true;
    completed = false;
    if (wordIndex >= 3) {
      say(labels.allDone);
      ui.grab.hidden = true;
      return;
    }
    const word = playRoutes[realm - 1][wordIndex];
    const angles = word[2].length === 2 ? [-0.36, 0.36] : [-0.52, 0, 0.52];
    word[2].forEach((part, index) => {
      const glyph = makeGlyphSprite(THREE, part, 0.30);
      const a = angles[index];
      const radius = 1.55;
      glyph.position.set(Math.sin(a) * radius, 1.42, -Math.cos(a) * radius);
      glyph.userData.parts = [index];
      glyph.userData.home = glyph.position.clone();
      glyph.userData.baseScale = 0.30;
      world.add(glyph);
      nodes.push(glyph);
    });
    ui.grab.hidden = false;
    pair(ui.grab, labels.grab);
    pair(ui.next, labels.next);
    say(labels.target, { index: wordIndex + 1 });
  }

  function selectRealm(number) {
    realm = number;
    wordIndex = progress[number - 1];
    setWord();
  }

  function refreshLanguage() {
    pair(ui.grab, labels.grab);
    pair(ui.next, labels.next);
    if (completed) showExplanation();
    else if (active) say(labels.hold);
    else say(labels.target, { index: wordIndex + 1 });
  }

  function screenPoint(node) {
    const camera = getCamera();
    node.getWorldPosition(projected);
    projected.project(camera);
    if (projected.z < -1 || projected.z > 1) return null;
    return { x: (projected.x + 1) * innerWidth / 2, y: (1 - projected.y) * innerHeight / 2 };
  }

  function findNear(x, y) {
    const camera = getCamera();
    camera.getWorldPosition(cameraPoint);
    return nodes.filter((node) => node.visible && node !== active)
      .map((node) => {
        node.getWorldPosition(projected);
        const distance = cameraPoint.distanceTo(projected);
        const screen = screenPoint(node);
        return { node, distance, screenDistance: screen ? Math.hypot(screen.x - x, screen.y - y) : Infinity };
      })
      .filter((item) => item.distance < (getMode() === 'xr' ? 1.35 : 1.70) && item.screenDistance < 100)
      .sort((a, b) => a.screenDistance - b.screenDistance)[0]?.node || null;
  }

  function pick(node) {
    if (!node || completed) return;
    active = node;
    node.scale.setScalar(0.36);
    say(labels.hold);
  }

  function release() {
    if (!active) return;
    active.position.copy(active.userData.home);
    active.userData.baseScale = active.userData.parts.length > 1 ? 0.34 : 0.30;
    active.scale.setScalar(active.userData.baseScale);
    active = null;
    cursor = null;
  }

  function grabOrRelease() {
    if (active) release();
    else pick(nearby);
  }

  function tap(x, y) {
    if (completed) return;
    if (active) return;
    pick(findNear(x, y));
    cursor = null;
  }

  function showExplanation() {
    const [word, pinyin, parts, zh, fr, en] = playRoutes[realm - 1][wordIndex];
    pair(ui.explainer, { zh: `${word} · ${pinyin}。${zh}`, fr, en });
    ui.explainer.hidden = false;
    ui.narration.hidden = true;
    say(remaining() ? labels.done : labels.allDone, { word, remaining: remaining() });
  }

  function combine(other) {
    if (!active || !other) return;
    active.userData.parts.push(...other.userData.parts);
    other.visible = false;
    const word = playRoutes[realm - 1][wordIndex];
    if (active.userData.parts.length === word[2].length) {
      completed = true;
      changeGlyph(active, word[0]);
      active.position.copy(other.position);
      active.scale.setScalar(0.47);
      active.userData.baseScale = 0.47;
      active = null;
      ui.grab.hidden = true;
      ui.next.hidden = false;
      showExplanation();
    } else {
      const text = active.userData.parts.sort((a, b) => a - b).map((i) => word[2][i]).join('·');
      changeGlyph(active, text);
      say(labels.progress, { parts: active.userData.parts.length, total: word[2].length, remaining: remaining() });
    }
  }

  function update(time) {
    if (!world.visible || wordIndex >= 3) return;
    const camera = getCamera();
    camera.updateMatrixWorld(true);
    world.updateMatrixWorld(true);
    if (completed) {
      const wordNode = nodes.find((node) => node.visible);
      const point = wordNode && screenPoint(wordNode);
      if (point) {
        ui.explainer.style.top = `${Math.max(330, Math.min(innerHeight - 230, point.y + 125))}px`;
      }
      return;
    }
    const x = cursor?.x ?? innerWidth / 2;
    const y = cursor?.y ?? innerHeight / 2;
    nearby = findNear(x, y);
    ui.grab.disabled = !active && !nearby;
    for (const node of nodes) {
      if (!node.visible || node === active || completed) continue;
      const scale = node === nearby ? node.userData.baseScale * 1.18 : node.userData.baseScale;
      node.scale.setScalar(THREE.MathUtils.lerp(node.scale.x, scale, 0.25));
    }
    if (!active) return;
    ray.setFromCamera(new THREE.Vector2(x / innerWidth * 2 - 1, 1 - y / innerHeight * 2), camera);
    const point = ray.ray.at(1.30, new THREE.Vector3());
    world.worldToLocal(point);
    active.position.lerp(point, 0.38);
    active.updateMatrixWorld(true);
    const closest = nodes.filter((node) => node.visible && node !== active).find((node) => {
      node.getWorldPosition(projected);
      const held = active.getWorldPosition(new THREE.Vector3());
      return held.distanceTo(projected) < 0.36;
    });
    if (!closest) { joinedAt = 0; return; }
    if (!joinedAt) joinedAt = time;
    if (time - joinedAt > 170) { joinedAt = 0; combine(closest); }
  }

  async function startHands(video) {
    if (handLandmarker || !video) return;
    try {
      const { FilesetResolver, HandLandmarker } = await import('./assets/mediapipe/vision_bundle.mjs');
      const files = await FilesetResolver.forVisionTasks('./assets/mediapipe/wasm');
      handLandmarker = await HandLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: './assets/mediapipe/hand_landmarker.task', delegate: 'CPU' },
        runningMode: 'VIDEO', numHands: 2,
        minHandDetectionConfidence: 0.22, minHandPresenceConfidence: 0.22, minTrackingConfidence: 0.22,
      });
      if (getMode() !== 'compass') { stopHands(); return; }
      const tick = (now) => {
        if (!handLandmarker || getMode() !== 'compass') return;
        if (video.readyState >= 2 && video.currentTime !== lastVideoTime && now - lastHandTime > 65) {
          lastVideoTime = video.currentTime;
          lastHandTime = now;
          try { readHand(handLandmarker.detectForVideo(video, now), video); }
          catch { stopHands(); return; }
        }
        handFrame = requestAnimationFrame(tick);
      };
      handFrame = requestAnimationFrame(tick);
    } catch { stopHands(); }
  }

  function readHand(result, video) {
    const wanted = localStorage.getItem('hanzi-playing-hand') === 'left' ? 'left' : 'right';
    const labels = result.handednesses || [];
    const index = labels.findIndex((set) => set?.[0]?.categoryName?.toLowerCase() === wanted);
    const hand = result.landmarks?.[index < 0 ? 0 : index];
    if (!hand) {
      cursor = null;
      ui.handPointer.hidden = true;
      if (active && performance.now() - lastHandSeenAt > 1600) release();
      return;
    }
    lastHandSeenAt = performance.now();
    const tip = hand[8], thumb = hand[4];
    const scale = Math.max(innerWidth / video.videoWidth, innerHeight / video.videoHeight);
    const width = video.videoWidth * scale, height = video.videoHeight * scale;
    cursor = { x: (innerWidth - width) / 2 + ((tip.x + thumb.x) / 2) * width,
      y: (innerHeight - height) / 2 + ((tip.y + thumb.y) / 2) * height };
    ui.handPointer.style.left = `${cursor.x}px`;
    ui.handPointer.style.top = `${cursor.y}px`;
    ui.handPointer.hidden = false;
    const palm = Math.max(0.045, Math.hypot(hand[0].x - hand[9].x, hand[0].y - hand[9].y));
    const ratio = Math.hypot(tip.x - thumb.x, tip.y - thumb.y) / palm;
    if (ratio < (pinched ? 1.32 : 0.92)) {
      if (!pinched) pick(findNear(cursor.x, cursor.y));
      pinched = true;
      ui.handPointer.classList.add('pinching');
      releaseAt = 0;
    } else if (pinched) {
      if (!releaseAt) releaseAt = performance.now();
      if (performance.now() - releaseAt > 330) { pinched = false; ui.handPointer.classList.remove('pinching'); release(); }
    }
  }

  function stopHands() {
    cancelAnimationFrame(handFrame);
    handFrame = 0;
    handLandmarker?.close?.();
    handLandmarker = null;
    pinched = false;
    ui.handPointer.hidden = true;
    ui.handPointer.classList.remove('pinching');
    cursor = null;
    release();
  }

  ui.grab.addEventListener('click', grabOrRelease);
  ui.next.addEventListener('click', () => { if (!completed) return; wordIndex += 1; progress[realm - 1] = wordIndex; setWord(); });
  return { selectRealm, refreshLanguage, update, startHands, stopHands, tap, grabOrRelease };
}
