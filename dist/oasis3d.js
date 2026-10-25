// Lightweight, procedural Three.js oasis. The printed picture gives the first
// pose; all of these meshes live in real 3D coordinates, not CSS layers.
export function createOasis(THREE, { scenery = true } = {}) {
  const root = new THREE.Group();
  // The card game now uses the photographic 360° world for its scenery.
  // Keep this anchor for the glyphs without showing the superseded block models.
  if (!scenery) return {
    root, eggs: [], setRealm() {}, update() {}, bloom() {}, revealEgg() { return null; },
  };
  const animated = [];
  const realmMaterials = [];
  const makeMat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.84, ...extra });
  const clay = makeMat(0xb8774d);
  const clayLight = makeMat(0xd2a075);
  const hill = makeMat(0x9b614f, { flatShading: true });
  const hillFar = makeMat(0x746473, { flatShading: true });
  const leaf = makeMat(0x3b7757, { side: THREE.DoubleSide });
  const leafLight = makeMat(0x70a268, { side: THREE.DoubleSide });
  const vine = makeMat(0x755a3e);
  const grape = makeMat(0x6d4b82, { roughness: 0.35 });
  const water = makeMat(0x35b9bd, { metalness: 0.08, roughness: 0.25, transparent: true, opacity: 0.78 });
  const waterLight = makeMat(0xb6f6e9, { emissive: 0x45a9a5, emissiveIntensity: 0.3 });
  const gold = makeMat(0xe1ba7c, { emissive: 0x8c693a, emissiveIntensity: 0.22 });
  const flower = makeMat(0xdf9d93, { emissive: 0x6b262f, emissiveIntensity: 0.15 });
  const nightLight = makeMat(0xf0cd90, { emissive: 0xf2b963, emissiveIntensity: 0.6 });
  const sphere = new THREE.SphereGeometry(1, 8, 6);
  const box = new THREE.BoxGeometry(1, 1, 1);

  function mesh(geometry, material, x, y, z, sx = 1, sy = 1, sz = 1, parent = root) {
    const item = new THREE.Mesh(geometry, material);
    item.position.set(x, y, z);
    item.scale.set(sx, sy, sz);
    parent.add(item);
    return item;
  }
  function branch(points, radius, material, parent = root) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    const item = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, radius, 5, false), material);
    parent.add(item);
    return item;
  }

  // Mountains sit behind the card plane. Their separated depths make the
  // ridge move more slowly than the near foliage as the camera moves.
  [
    [-0.42, 0.14, -0.40, 0.28, 0.20, 0.12, hillFar],
    [-0.12, 0.20, -0.33, 0.34, 0.22, 0.15, hill],
    [0.30, 0.17, -0.43, 0.34, 0.24, 0.15, hillFar],
    [0.51, 0.12, -0.28, 0.20, 0.17, 0.12, hill],
  ].forEach(([x, y, z, sx, sy, sz, material]) => {
    const ridge = mesh(new THREE.IcosahedronGeometry(1, 1), material, x, y, z, sx, sy, sz);
    ridge.rotation.z = 0.15;
  });

  // A small adobe village and watchtower rise above the middle layer.
  const houses = [
    [-0.27, -0.07, -0.06, 0.10, 0.12],
    [-0.12, -0.10, -0.01, 0.12, 0.09],
    [0.04, -0.07, -0.09, 0.10, 0.11],
    [0.17, -0.09, -0.05, 0.12, 0.12],
  ];
  houses.forEach(([x, y, z, w, h], index) => {
    mesh(box, index % 2 ? clayLight : clay, x, y, z, w, h, 0.085);
    mesh(box, vine, x, y + h * 0.54, z + 0.003, w * 1.13, 0.016, 0.09);
    mesh(box, nightLight, x + w * 0.2, y - 0.005, z + 0.046, 0.019, 0.029, 0.003);
  });
  mesh(box, clay, 0.38, 0.02, -0.02, 0.105, 0.31, 0.11);
  mesh(box, clayLight, 0.38, 0.18, -0.02, 0.145, 0.035, 0.14);
  mesh(box, vine, 0.38, 0.21, -0.02, 0.112, 0.026, 0.11);
  mesh(box, vine, 0.38, 0.08, 0.039, 0.025, 0.048, 0.005);

  // Water is a curved mesh with separate traveling highlights. It starts in
  // the printed canal and extends beyond that shape in the virtual scene.
  const waterPath = [
    [-0.04, -0.45, 0.10], [0.04, -0.32, 0.10], [0.18, -0.25, 0.10],
    [0.25, -0.15, 0.08], [0.31, -0.06, 0.06], [0.29, 0.02, 0.02],
  ];
  branch(waterPath, 0.036, water);
  const shimmer = [];
  for (let i = 0; i < 7; i += 1) {
    const p = waterPath[Math.min(waterPath.length - 1, Math.floor(i * waterPath.length / 7))];
    const spark = mesh(sphere, waterLight, p[0] + (i % 2 ? -0.013 : 0.015), p[1], p[2] + 0.035, 0.012, 0.004, 0.002);
    shimmer.push(spark);
  }

  // Grapevine and near foliage sit in front of the image plane.
  const trellis = new THREE.Group();
  root.add(trellis);
  [-0.42, -0.27, -0.11].forEach((x) => {
    branch([[x, -0.31, 0.20], [x - 0.015, -0.04, 0.24], [x + 0.02, 0.20, 0.27]], 0.010, vine, trellis);
  });
  branch([[-0.48, 0.19, 0.29], [-0.27, 0.22, 0.31], [-0.04, 0.18, 0.29]], 0.011, vine, trellis);
  const bunches = [];
  for (let i = 0; i < 13; i += 1) {
    const x = -0.49 + (i % 5) * 0.095;
    const y = 0.20 - Math.floor(i / 5) * 0.07;
    const z = 0.30 + (i % 3) * 0.035;
    const leafShape = mesh(sphere, i % 2 ? leaf : leafLight, x, y + 0.035, z, 0.055, 0.025, 0.013, trellis);
    leafShape.rotation.z = i * 0.7;
    if (i % 3 === 0) {
      const bunch = new THREE.Group();
      bunch.position.set(x, y - 0.025, z + 0.015);
      trellis.add(bunch);
      for (let j = 0; j < 6; j += 1) {
        mesh(sphere, grape, (j % 2 - 0.5) * 0.018, -Math.floor(j / 2) * 0.018, 0, 0.011, 0.013, 0.012, bunch);
      }
      bunches.push(bunch);
    }
  }

  // Two palms frame the village; individual fronds cast real depth changes.
  [-0.47, 0.46].forEach((x, side) => {
    const palm = new THREE.Group();
    palm.position.set(x, -0.23, 0.22 + side * 0.03);
    root.add(palm);
    branch([[0, 0, 0], [side ? -0.03 : 0.03, 0.15, 0], [0, 0.32, 0.01]], 0.016, vine, palm);
    for (let i = 0; i < 6; i += 1) {
      const a = i * Math.PI / 3;
      const frond = mesh(sphere, i % 2 ? leafLight : leaf, Math.cos(a) * 0.09, 0.32 + Math.sin(a) * 0.04, 0.02 + (i % 2) * 0.03, 0.11, 0.014, 0.022, palm);
      frond.rotation.z = a * 0.35;
    }
    animated.push({ node: palm, phase: side * 1.7 });
  });

  // New objects beyond the photograph become visible as realms progress.
  const herbTable = new THREE.Group();
  herbTable.position.set(0.27, -0.20, 0.25);
  root.add(herbTable);
  mesh(box, clayLight, 0, 0, 0, 0.19, 0.035, 0.08, herbTable);
  [-0.06, 0, 0.06].forEach((x, i) => {
    mesh(sphere, leafLight, x, 0.035, 0.01, 0.025, 0.052 + i * 0.01, 0.02, herbTable);
  });
  const flowers = new THREE.Group();
  flowers.position.set(-0.08, -0.29, 0.23);
  root.add(flowers);
  for (let i = 0; i < 11; i += 1) {
    const x = (i % 5) * 0.052 - 0.10;
    const y = Math.floor(i / 5) * 0.05;
    mesh(sphere, leafLight, x, y, 0, 0.018, 0.031, 0.012, flowers);
    mesh(sphere, flower, x, y + 0.025, 0.019, 0.012, 0.012, 0.008, flowers);
  }
  const marketLights = new THREE.Group();
  root.add(marketLights);
  [-0.27, -0.12, 0.04, 0.17].forEach((x, i) => {
    mesh(sphere, nightLight, x, -0.02 + (i % 2) * 0.025, 0.025, 0.010, 0.010, 0.010, marketLights);
  });
  const moon = mesh(sphere, waterLight, 0.12, 0.37, -0.46, 0.055, 0.055, 0.018);

  const sprouts = new THREE.Group();
  root.add(sprouts);
  for (let i = 0; i < 9; i += 1) {
    const x = -0.35 + (i % 5) * 0.068;
    const y = -0.39 + Math.floor(i / 5) * 0.045;
    mesh(sphere, leafLight, x, y + 0.032, 0.20, 0.013, 0.042, 0.009, sprouts);
  }
  sprouts.visible = false;
  const steam = new THREE.Group();
  root.add(steam);
  const mist = makeMat(0xe9f5dd, { transparent: true, opacity: 0.45, emissive: 0xa1c3b3, emissiveIntensity: 0.2 });
  for (let i = 0; i < 6; i += 1) {
    mesh(sphere, mist, 0.22 + (i % 3) * 0.026, -0.17 + Math.floor(i / 3) * 0.06, 0.32, 0.016, 0.027, 0.012, steam);
  }
  steam.visible = false;
  const looseLeaves = new THREE.Group();
  root.add(looseLeaves);
  for (let i = 0; i < 5; i += 1) {
    const leafNode = mesh(sphere, leafLight, -0.40 + i * 0.085, 0.13, 0.38, 0.024, 0.009, 0.004, looseLeaves);
    leafNode.rotation.z = i * 0.6;
  }
  looseLeaves.visible = false;

  const eggPool = {
    1: [['葡萄串奏起短曲', -0.31, 0.19, 0.41], ['水面映出了茶影', 0.23, -0.27, 0.22]],
    2: [['草药架后藏着一枚木牌', 0.27, -0.15, 0.37], ['一滴水逆流而上', 0.18, -0.31, 0.21]],
    3: [['青葡萄悄悄转紫', -0.20, 0.11, 0.43], ['花瓣拼出旧字的轮廓', -0.06, -0.26, 0.33]],
    4: [['望楼侧面出现织纹', 0.38, 0.13, 0.09], ['山影显出水渠的方向', -0.12, 0.21, -0.20]],
    5: [['村屋灯火依次点亮', 0.04, -0.06, 0.05], ['果篮里藏着一颗葡萄', -0.20, -0.30, 0.27]],
    6: [['月影里浮出一朵花蕾', 0.12, 0.37, -0.39], ['眼前闪过荒与茂的双重景象', -0.11, 0.20, -0.20]],
  };
  const eggs = [];
  let currentRealm = 0;
  const eggMaterial = makeMat(0xffe5ad, { emissive: 0xffd37d, emissiveIntensity: 1.2 });
  function chooseEggs(number) {
    eggs.forEach((egg) => egg.parent?.remove(egg));
    eggs.length = 0;
    const choices = [...eggPool[number]].sort(() => Math.random() - 0.5);
    choices.slice(0, Math.random() < 0.5 ? 1 : 2).forEach(([name, x, y, z]) => {
      const egg = mesh(sphere, eggMaterial, x, y, z, 0.014, 0.014, 0.014);
      egg.userData.eggName = name;
      eggs.push(egg);
    });
  }
  function setRealm(number) {
    if (number !== currentRealm) {
      chooseEggs(number);
      currentRealm = number;
    }
    herbTable.visible = number >= 2;
    flowers.visible = number >= 3;
    marketLights.visible = number >= 5;
    moon.visible = number >= 6;
    grape.color.set(number >= 3 ? 0x56376f : 0x8a728b);
    leaf.color.set(number >= 5 ? 0x345443 : 0x3b7757);
    hill.color.set(number >= 4 ? 0xa76044 : 0x9b614f);
    water.color.set(number >= 6 ? 0x69b6c8 : 0x35b9bd);
    flower.emissiveIntensity = number >= 6 ? 0.55 : 0.15;
    sprouts.visible = false;
    steam.visible = false;
    looseLeaves.visible = false;
  }
  let bloomUntil = 0;
  let bloomMode = '';
  function bloom(word) {
    bloomUntil = performance.now() + 1650;
    bloomMode = word;
    sprouts.visible = '菜蔬苗茎萌茂'.includes(word) || word === '萌芽';
    steam.visible = '茶药蒸'.includes(word);
    looseLeaves.visible = '落花荒'.includes(word);
  }
  function revealEgg(egg) {
    if (!eggs.includes(egg) || !egg.visible) return null;
    egg.visible = false;
    bloom(egg.userData.eggName.includes('水') ? '蓝' : egg.userData.eggName.includes('花') ? '花' : '茂');
    return egg.userData.eggName;
  }
  function update(time) {
    const seconds = time * 0.001;
    trellis.rotation.z = Math.sin(seconds * 0.8) * 0.012;
    bunches.forEach((b, i) => { b.rotation.z = Math.sin(seconds * 1.1 + i) * 0.09; });
    animated.forEach(({ node, phase }) => { node.rotation.z = Math.sin(seconds * 0.7 + phase) * 0.016; });
    shimmer.forEach((spark, i) => { spark.material = waterLight; spark.scale.x = 0.009 + 0.006 * (1 + Math.sin(seconds * 3 + i)); });
    const pulse = Math.max(0, (bloomUntil - time) / 1400);
    flowers.scale.setScalar(1 + pulse * (bloomMode === '花' ? 0.6 : 0.22));
    bunches.forEach((bunch) => { bunch.scale.setScalar(1 + pulse * (bloomMode === '葡萄' ? 0.5 : 0)); });
    sprouts.scale.y = 0.5 + (1 - pulse) * 0.9;
    steam.children.forEach((node, i) => { node.position.y = -0.17 + Math.floor(i / 3) * 0.06 + (1 - pulse) * 0.12; });
    looseLeaves.children.forEach((node, i) => { node.position.y = 0.13 - (1 - pulse) * (0.2 + i * 0.025); node.rotation.z += 0.012; });
    marketLights.scale.setScalar(1 + pulse * ('获英营著'.includes(bloomMode) ? 0.8 : 0.12));
    waterLight.emissiveIntensity = 0.3 + pulse * ('蓝蒸荒'.includes(bloomMode) ? 1 : 0.6);
    if (pulse <= 0) { sprouts.visible = false; steam.visible = false; looseLeaves.visible = false; }
    if (moon.visible) moon.material.emissiveIntensity = 0.3 + Math.sin(seconds * 1.4) * 0.1;
    eggs.forEach((egg, i) => { egg.scale.setScalar(0.013 + Math.sin(seconds * 2 + i * 2) * 0.003); });
  }
  setRealm(1);
  return { root, setRealm, update, bloom, eggs, revealEgg };
}

export function makeGlyphSprite(THREE, text, size = 0.16) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${text.length > 2 ? 80 : 142}px "LXGW WenKai", "STKaiti", serif`;
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#473126';
  ctx.shadowColor = '#f1d69a';
  ctx.shadowBlur = 18;
  ctx.strokeText(text, 128, 130);
  ctx.fillStyle = '#fff3cf';
  ctx.fillText(text, 128, 130);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(size, size, 1);
  sprite.userData.texture = texture;
  return sprite;
}

export function changeGlyph(sprite, text) {
  const ctx = sprite.userData.texture.image.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${text.length > 2 ? 80 : 142}px "LXGW WenKai", "STKaiti", serif`;
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#473126';
  ctx.shadowColor = '#f1d69a';
  ctx.shadowBlur = 18;
  ctx.strokeText(text, 128, 130);
  ctx.fillStyle = '#fff3cf';
  ctx.fillText(text, 128, 130);
  sprite.userData.texture.needsUpdate = true;
}
