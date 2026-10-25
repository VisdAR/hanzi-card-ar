export const copy = {
  back: {
    zh: '主菜单', fr: 'Menu principal', en: 'Main menu',
  },
  gateTitle: {
    zh: '让绿洲在身边展开', fr: 'L’oasis prend vie autour de vous', en: 'Let the oasis unfold around you',
  },
  gateIntro: {
    zh: '先用眼睛确认地面平坦、周围没有障碍，再把镜头缓缓对向地面。场景出现后请站在原地转身观看。',
    fr: 'Vérifiez d’abord que le sol est plat et que l’espace autour de vous est libre. Orientez ensuite lentement la caméra vers le sol. Restez sur place pour explorer la scène.',
    en: 'First check that the ground is level and the space around you is clear. Then slowly point the camera at the ground. Stay in one place while exploring the scene.',
  },
  gateWarning: {
    zh: '远离楼梯、阳台或悬崖边缘、道路和水边。手机可能看不到障碍或落差，画面不能代替你观察真实环境。',
    fr: 'Éloignez-vous des escaliers, des rebords, des routes et de l’eau. Le téléphone peut manquer un obstacle ou une dénivellation. Regardez aussi autour de vous.',
    en: 'Keep away from stairs, edges, roads and water. Your phone may miss obstacles or drops. Keep checking your real surroundings.',
  },
  floorButton: {
    zh: '识别地面并放置场景', fr: 'Repérer le sol et placer la scène', en: 'Find the floor and place the scene',
  },
  compassButton: {
    zh: '原地环视（不定位地面）', fr: 'Explorer sur place (sans ancrage au sol)', en: 'Look around in place (no floor anchor)',
  },
  safety: {
    zh: '只在平坦空旷处原地转身，随时抬头看路',
    fr: 'Restez sur place, sur un sol plat. Regardez autour de vous.',
    en: 'Stay in one place on level ground. Keep looking around you.',
  },
  capabilityChecking: {
    zh: '正在检查这台设备是否支持地面定位…',
    fr: 'Vérification de la localisation du sol…',
    en: 'Checking floor tracking support…',
  },
  capabilityXR: {
    zh: '设备报告支持 WebXR；点击后再检查是否具备平面识别。',
    fr: 'WebXR est annoncé comme disponible. La détection des surfaces sera vérifiée au démarrage.',
    en: 'WebXR is reported as available. Surface tracking will be checked when it starts.',
  },
  capabilityNoXR: {
    zh: '这台手机或浏览器没有 WebXR 地面定位；仍可用相机原地环视。',
    fr: 'Cet appareil ne permet pas l’ancrage WebXR au sol. Le mode de visite sur place reste disponible.',
    en: 'This device cannot anchor the scene to a floor with WebXR. You can still look around in place.',
  },
  capabilityUnsupported: {
    zh: '这台手机无法启动地面识别。原地环视仍可使用，但它不会检测或固定真实地面。',
    fr: 'Ce téléphone ne peut pas démarrer la détection du sol. Vous pouvez explorer sur place, sans ancrage ni détection du sol réel.',
    en: 'This phone cannot start floor tracking. You can look around in place, without detecting or anchoring to the real floor.',
  },
  capabilityPermission: {
    zh: '地面识别未获允许。请检查浏览器权限，或选择原地环视。',
    fr: 'L’accès à la réalité augmentée a été refusé. Vérifiez les autorisations du navigateur ou choisissez la visite sur place.',
    en: 'AR access was denied. Check browser permissions or choose the look-around mode.',
  },
  capabilityFailed: {
    zh: '地面识别暂时无法启动。可选择原地环视；该模式不会检测地面。',
    fr: 'La détection du sol ne démarre pas. Choisissez la visite sur place, qui ne détecte pas le sol.',
    en: 'Floor tracking could not start. Choose look-around mode, which does not detect the floor.',
  },
  preparing: {
    zh: '正在准备立体场景…', fr: 'Préparation de la scène…', en: 'Preparing the scene…',
  },
  ready: {
    zh: '图卡已识别。先确认现实环境安全，再选择进入方式。',
    fr: 'Carte reconnue. Vérifiez d’abord votre environnement, puis choisissez un mode.',
    en: 'Card recognized. Check your surroundings, then choose a mode.',
  },
  xrStarting: {
    zh: '正在启动设备的地面识别…',
    fr: 'Démarrage de la détection du sol…', en: 'Starting floor tracking…',
  },
  lookFloor: {
    zh: '缓慢将镜头对准脚下的平坦地面；不要边走边找。',
    fr: 'Visez lentement un sol plat près de vos pieds. Ne marchez pas pendant la recherche.',
    en: 'Slowly aim at level ground near your feet. Do not walk while searching.',
  },
  notFloor: {
    zh: '找到的可能是墙面或桌面；请对准脚下的平坦地面。',
    fr: 'La surface peut être un mur ou une table. Visez le sol plat près de vos pieds.',
    en: 'That may be a wall or table. Aim at level ground near your feet.',
  },
  floorStable: {
    zh: '检测到脚下水平面，正在稳定放置；请先肉眼确认安全。',
    fr: 'Une surface horizontale est repérée. Vérifiez-la visuellement avant de rester sur place.',
    en: 'A horizontal surface was found. Check it with your own eyes before staying in place.',
  },
  xrPlaced: {
    zh: '绿洲已展开。请站在原地慢慢转身，随时抬头确认现实环境。',
    fr: 'L’oasis est ouverte. Tournez lentement sur place et vérifiez régulièrement le monde réel.',
    en: 'The oasis is open. Turn slowly in place and keep checking the real world.',
  },
  xrEnded: {
    zh: '地面定位已结束，可重新开始。',
    fr: 'L’ancrage au sol est terminé. Vous pouvez recommencer.',
    en: 'Floor tracking has ended. You can start again.',
  },
  cameraStarting: {
    zh: '正在打开相机并准备环视场景…',
    fr: 'Ouverture de la caméra et préparation du panorama…',
    en: 'Opening the camera and preparing the panorama…',
  },
  compassRunning: {
    zh: '绿洲已展开。此模式没有检测地面或障碍；只在原地慢慢转身。',
    fr: 'L’oasis est visible. Ce mode ne détecte ni le sol ni les obstacles. Tournez lentement sur place.',
    en: 'The oasis is visible. This mode detects neither the floor nor obstacles. Turn slowly in place.',
  },
  motionDenied: {
    zh: '相机已打开，但运动传感器未获允许；滑动屏幕仅能预览场景。',
    fr: 'La caméra est ouverte, mais le capteur de mouvement est bloqué. Glissez le doigt pour prévisualiser seulement.',
    en: 'The camera is open, but motion access was denied. Swipe only to preview the scene.',
  },
  noGyro: {
    zh: '未收到手机转动数据；滑动屏幕仅能预览场景，不能用于空间定位。',
    fr: 'Aucune donnée de mouvement reçue. Le glissement sert seulement à prévisualiser, sans ancrage spatial.',
    en: 'No motion data received. Swiping is only a preview and does not anchor the scene.',
  },
  cameraFailed: {
    zh: '相机未能开启。请检查浏览器相机权限。',
    fr: 'La caméra ne démarre pas. Vérifiez son autorisation dans le navigateur.',
    en: 'The camera could not start. Check its browser permission.',
  },
  preview: {
    zh: '本地场景预览，不使用相机或地面定位',
    fr: 'Aperçu local sans caméra ni ancrage au sol',
    en: 'Local preview without camera or floor tracking',
  },
  previewFailed: {
    zh: '本地预览加载失败。', fr: 'Échec du chargement de l’aperçu local.', en: 'Local preview failed to load.',
  },
  sceneFailed: {
    zh: '场景素材加载失败，请稍后重试。',
    fr: 'Le décor ne se charge pas. Réessayez plus tard.',
    en: 'The scene did not load. Please try again later.',
  },
  paused: {
    zh: '相机已暂停；返回后请重新确认周围安全。',
    fr: 'Caméra en pause. Vérifiez de nouveau votre environnement avant de reprendre.',
    en: 'Camera paused. Check your surroundings again before resuming.',
  },
  modeXR: {
    zh: '设备平面定位，仍需肉眼避障',
    fr: 'Ancrage au sol : surveillez les obstacles',
    en: 'Floor anchor: watch for obstacles',
  },
  modeCompass: {
    zh: '原地环视，无地面定位',
    fr: 'Visite sur place, sans ancrage au sol',
    en: 'Look around in place, without a floor anchor',
  },
  modePreview: {
    zh: '本地预览，无地面定位',
    fr: 'Aperçu local, sans ancrage au sol',
    en: 'Local preview, without a floor anchor',
  },
  portalIntro: {
    zh: '进入下一步后，请先肉眼确认周围安全，再将镜头对准平坦地面。',
    fr: 'Vérifiez votre sécurité avant d’entrer. Visez ensuite un sol plat avec la caméra.',
    en: 'Check your surroundings before entering. Then aim the camera at level ground.',
  },
  portalButton: {
    zh: '寻找地面，展开 360° 绿洲',
    fr: 'Ouvrir l’oasis à 360°',
    en: 'Open the 360° oasis',
  },
};

export const realmTitles = [
  { fr: 'Ombres de vigne à l’aube', en: 'Vine Shadows at Dawn' },
  { fr: 'Sentier des simples vers la source', en: 'Medicinal Herb Path to the Spring' },
  { fr: 'Allée fleurie sous les treilles', en: 'Flowering Vine Arcade' },
  { fr: 'Ancienne route par-delà les monts', en: 'Ancient Road Beyond the Mountains' },
  { fr: 'Marché des récoltes au crépuscule', en: 'Harvest Market at Dusk' },
  { fr: 'Nouvelle vie à la source étoilée', en: 'New Life at the Starlit Spring' },
];

export const realmNarration = [
  {
    zh: '葡萄藤攀上廊架，清水沿土渠流入绿洲。转身寻找藏在藤叶与水边的构字部件。',
    fr: 'La vigne grimpe sur la treille tandis que l’eau rejoint l’oasis. Tournez sur place pour découvrir les éléments cachés près des feuilles et du canal.',
    en: 'Vines climb the trellis as water reaches the oasis. Turn in place to discover the character pieces hidden near the leaves and canal.',
  },
  {
    zh: '沿着引水小径，草药在土墙边生长。听见水声时，留意藏在绿意中的字形。',
    fr: 'Le long du petit canal, les herbes poussent près des murs de terre. Au bruit de l’eau, cherchez les formes cachées dans la verdure.',
    en: 'Herbs grow beside the earthen walls along the water path. Follow the sound of water and look for shapes hidden in the greenery.',
  },
  {
    zh: '花藤在廊架间延伸，葡萄与花影交错。慢慢环视，观察近处与远处不同的层次。',
    fr: 'Les fleurs et les vignes se croisent sous la treille. Tournez lentement pour distinguer les détails proches et lointains.',
    en: 'Flowers and vines meet beneath the trellis. Turn slowly to notice the different layers near and far.',
  },
  {
    zh: '红岩映着古道，土墙留住远行的回声。找一找岩色之间新出现的构字线索。',
    fr: 'La roche rouge borde l’ancienne route et les murs de terre gardent l’écho des voyageurs. Cherchez les nouveaux indices parmi les couleurs de la pierre.',
    en: 'Red rock lines the old road, and earthen walls hold echoes of travelers. Look for new character clues among the stone colors.',
  },
  {
    zh: '暮色落在丰收的集市上，篮中的果实带来暖色。留意新出现的物件与字形。',
    fr: 'Le soir réchauffe le marché des récoltes. Observez les paniers et les nouveaux objets qui révèlent d’autres formes.',
    en: 'Evening warms the harvest market. Watch the baskets and new objects that reveal more character shapes.',
  },
  {
    zh: '夜色罩住绿洲，新芽在水边舒展。停下脚步，抬头确认周围，再寻找最后的字形。',
    fr: 'La nuit enveloppe l’oasis et de jeunes pousses s’ouvrent près de l’eau. Restez immobile, vérifiez votre environnement, puis cherchez les dernières formes.',
    en: 'Night settles over the oasis, and new shoots open by the water. Stay still, check your surroundings, then find the final shapes.',
  },
];

export function preferredLanguage() {
  return localStorage.getItem('hanzi-translation-language') === 'en' ? 'en' : 'fr';
}

export function saveLanguage(language) {
  localStorage.setItem('hanzi-translation-language', language === 'en' ? 'en' : 'fr');
}
