import * as THREE from 'three';
import { addContactShadow, type UpgradeVisualHandle } from './models';
import type { ProceduralTextureSet } from './textures';

export function createEnchantedAcreGroup(textures: ProceduralTextureSet): UpgradeVisualHandle {
  const root = new THREE.Group();
  root.name = 'EnchantedAcre';

  addContactShadow(root, textures.contactShadowMap, 2.05, 0.02);

  const soilMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.94 });
  const darkSoilMat = new THREE.MeshStandardMaterial({ color: 0x432818, roughness: 0.96 });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.woodMap,
    roughness: 0.78,
  });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.72 });
  const brightLeafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.68 });
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.stoneMap,
    roughness: 0.88,
  });

  // Stage 1: Cleared Rich Farm Soil Bed
  const soilBed = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 2.5), soilMat);
  soilBed.position.y = 0.06;
  soilBed.receiveShadow = true;
  root.add(soilBed);

  // Stage 2: Split-Rail Timber Plot Border
  const plotBorder = new THREE.Group();
  const cornerCoords: Array<[number, number]> = [
    [-1.65, -1.3],
    [1.65, -1.3],
    [-1.65, 1.3],
    [1.65, 1.3],
    [0, -1.3],
    [-1.65, 0],
    [1.65, 0],
  ];
  for (const [cx, cz] of cornerCoords) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.54, 8), woodMat);
    post.position.set(cx, 0.27, cz);
    post.castShadow = true;
    plotBorder.add(post);
  }
  const railSpecs: Array<[number, number, number, number, number]> = [
    [0, 0.36, -1.3, 3.32, 0.07], // Back rail
    [-1.65, 0.36, 0, 0.07, 2.62], // Left rail
    [1.65, 0.36, 0, 0.07, 2.62], // Right rail
    [-0.95, 0.36, 1.3, 1.4, 0.07], // Front-left rail (leaving gap for entry stones)
    [0.95, 0.36, 1.3, 1.4, 0.07], // Front-right rail
  ];
  for (const [rx, ry, rz, w, d] of railSpecs) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, d), woodMat);
    rail.position.set(rx, ry, rz);
    rail.castShadow = true;
    plotBorder.add(rail);
  }
  root.add(plotBorder);

  // Stage 3: Plump Furrowed Soil Rows (3 ridges: z = +0.66 Carrots, z = 0 Pumpkins, z = -0.66 Wheat)
  const furrows = new THREE.Group();
  for (const rz of [0.66, 0.0, -0.66]) {
    const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 2.65, 10), darkSoilMat);
    ridge.rotation.z = Math.PI / 2;
    ridge.scale.set(0.65, 1, 1.2);
    ridge.position.set(0, 0.13, rz);
    ridge.receiveShadow = true;
    furrows.add(ridge);
  }
  root.add(furrows);

  // Stage 4: Row 1 Tiny Carrot Leaf Sprouts & Stage 5: Plump Orange Carrots (z = +0.66)
  const carrotSprouts = new THREE.Group();
  const ripeCarrots = new THREE.Group();
  const carrotMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.45 });
  for (let i = 0; i < 6; i++) {
    const cx = -1.05 + i * 0.42;
    const tuft = new THREE.Group();
    tuft.position.set(cx, 0.22, 0.66);
    for (let j = -1; j <= 1; j++) {
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.24, 6), brightLeafMat);
      frond.position.set(j * 0.035, 0.1, (j % 2) * 0.03);
      frond.rotation.z = j * -0.25;
      tuft.add(frond);
    }
    carrotSprouts.add(tuft);

    const shoulder = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 10), carrotMat);
    shoulder.rotation.x = Math.PI;
    shoulder.position.set(cx, 0.19, 0.66);
    ripeCarrots.add(shoulder);
  }
  // Extra pulled carrot resting proudly at front edge of carrot row
  const pulledCarrot = new THREE.Group();
  pulledCarrot.position.set(-0.55, 0.16, 0.94);
  pulledCarrot.rotation.set(0.15, 0.4, Math.PI / 2 - 0.15);
  const pBody = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.34, 10), carrotMat);
  pulledCarrot.add(pBody);
  const pLeaves = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 6), brightLeafMat);
  pLeaves.position.y = -0.24;
  pLeaves.rotation.x = Math.PI;
  pulledCarrot.add(pLeaves);
  ripeCarrots.add(pulledCarrot);
  root.add(carrotSprouts, ripeCarrots);

  // Stage 6: Baby Pumpkin Vines, Stage 7: Blossoms & Small Green Squash, Stage 8: Big Ripe Pumpkins (z = 0.0)
  const pumpkinVines = new THREE.Group();
  const greenSquash = new THREE.Group();
  const ripePumpkins = new THREE.Group();

  const vineCurlMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.78 });
  const vineTrack = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.5, 8), vineCurlMat);
  vineTrack.rotation.z = Math.PI / 2;
  vineTrack.position.set(0, 0.18, 0.04);
  pumpkinVines.add(vineTrack);
  for (let i = 0; i < 6; i++) {
    const px = -1.0 + i * 0.4;
    const broadLeaf = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.025, 7), leafMat);
    broadLeaf.position.set(px, 0.21, (i % 2 === 0 ? 1 : -1) * 0.14);
    broadLeaf.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.18;
    pumpkinVines.add(broadLeaf);
  }

  const blossomMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45 });
  const greenGourdMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.55 });
  for (const gx of [-0.75, 0.15, 0.95]) {
    const fl = new THREE.Mesh(new THREE.DodecahedronGeometry(0.065, 0), blossomMat);
    fl.position.set(gx - 0.16, 0.25, 0.14);
    greenSquash.add(fl);
    const gourd = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), greenGourdMat);
    gourd.scale.set(1.1, 0.85, 1.1);
    gourd.position.set(gx + 0.12, 0.24, -0.06);
    greenSquash.add(gourd);
  }

  const pumpkinMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.42 });
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.8 });
  for (const [px, pz, ps] of [
    [-0.88, 0.02, 1.05],
    [0.0, -0.02, 1.2],
    [0.85, 0.03, 0.95],
  ]) {
    const pGroup = new THREE.Group();
    pGroup.position.set(px, 0.32 * ps, pz);
    pGroup.scale.setScalar(ps);
    for (let rib = 0; rib < 4; rib++) {
      const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), pumpkinMat);
      lobe.scale.set(0.75, 0.82, 1.05);
      lobe.rotation.y = (rib / 4) * Math.PI;
      lobe.castShadow = true;
      pGroup.add(lobe);
    }
    const pStem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.048, 0.14, 6), stemMat);
    pStem.position.y = 0.2;
    pStem.rotation.z = 0.2;
    pGroup.add(pStem);
    ripePumpkins.add(pGroup);
  }
  root.add(pumpkinVines, greenSquash, ripePumpkins);

  // Stage 9: Tender Green Wheat Shoots & Stage 10: Tall Golden Ripening Wheat (z = -0.66)
  const wheatShoots = new THREE.Group();
  const goldenWheat = new THREE.Group();
  const wheatStalks: THREE.Group[] = [];
  const wheatStemMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.65 });
  const wheatHeadMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.55 });
  for (let i = 0; i < 11; i++) {
    const wx = -1.2 + i * 0.21;
    const shoot = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.28, 6), brightLeafMat);
    shoot.position.set(wx, 0.28, -0.66 + (i % 2) * 0.08);
    wheatShoots.add(shoot);

    const stalk = new THREE.Group();
    stalk.position.set(wx, 0.18, -0.66 + (i % 2 === 0 ? -0.05 : 0.06));
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.68, 6), wheatStemMat);
    stem.position.y = 0.34;
    stalk.add(stem);
    const grain = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 6), wheatHeadMat);
    grain.scale.set(0.85, 2.2, 0.85);
    grain.position.set(0.02, 0.72, 0);
    grain.rotation.z = -0.18;
    stalk.add(grain);
    goldenWheat.add(stalk);
    wheatStalks.push(stalk);
  }
  root.add(wheatShoots, goldenWheat);

  // Stage 11–14: Cheerful Farm Scarecrow at back-right corner (1.18, 0, -0.78)
  const scarecrowRoot = new THREE.Group();
  scarecrowRoot.position.set(1.18, 0, -0.78);
  scarecrowRoot.rotation.y = -0.4;

  // Stage 11: Wooden Cross Post
  const scPost = new THREE.Group();
  const vPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.48, 8), woodMat);
  vPole.position.y = 0.74;
  vPole.castShadow = true;
  scPost.add(vPole);
  const hPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.05, 8), woodMat);
  hPole.rotation.z = Math.PI / 2;
  hPole.position.y = 1.05;
  hPole.castShadow = true;
  scPost.add(hPole);
  scarecrowRoot.add(scPost);

  // Stage 12: Flannel Shirt & Straw Arms
  const scOutfit = new THREE.Group();
  const flannelMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.76 });
  const strawMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.85 });
  const scShirt = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.56, 12), flannelMat);
  scShirt.position.y = 0.86;
  scShirt.castShadow = true;
  scOutfit.add(scShirt);
  const scSleeves = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.88, 10), flannelMat);
  scSleeves.rotation.z = Math.PI / 2;
  scSleeves.position.y = 1.04;
  scOutfit.add(scSleeves);
  for (const side of [-1, 1]) {
    const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 6), strawMat);
    tuft.rotation.z = side * -Math.PI / 2;
    tuft.position.set(side * 0.52, 1.04, 0);
    scOutfit.add(tuft);
  }
  const scJeans = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.14, 0.26, 10),
    new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.78 })
  );
  scJeans.position.y = 0.5;
  scOutfit.add(scJeans);
  scarecrowRoot.add(scOutfit);

  // Stage 13: Burlap Head & Smiling Face
  const scHeadGroup = new THREE.Group();
  scHeadGroup.position.y = 1.32;
  const burlapMat = new THREE.MeshStandardMaterial({ color: 0xe7c697, roughness: 0.88 });
  const scHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), burlapMat);
  scHead.castShadow = true;
  scHeadGroup.add(scHead);
  const btnEyeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), btnEyeMat);
    eye.position.set(side * 0.075, 0.03, 0.175);
    scHeadGroup.add(eye);
  }
  const scNose = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 6), carrotMat);
  scNose.rotation.x = Math.PI / 2;
  scNose.position.set(0, -0.02, 0.21);
  scHeadGroup.add(scNose);
  const scSmile = new THREE.Mesh(
    new THREE.TorusGeometry(0.065, 0.012, 6, 10, Math.PI),
    btnEyeMat
  );
  scSmile.rotation.x = Math.PI;
  scSmile.position.set(0, -0.05, 0.175);
  scHeadGroup.add(scSmile);
  scarecrowRoot.add(scHeadGroup);

  // Stage 14: Patchwork Straw Hat & Crow Buddy
  const scHatGroup = new THREE.Group();
  scHatGroup.position.set(0, 1.48, 0);
  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.035, 16), strawMat);
  scHatGroup.add(hatBrim);
  const hatCrown = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.32, 12), strawMat);
  hatCrown.position.y = 0.16;
  hatCrown.rotation.z = -0.12;
  scHatGroup.add(hatCrown);
  const hatBand = new THREE.Mesh(
    new THREE.TorusGeometry(0.2, 0.025, 6, 14),
    new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.6 })
  );
  hatBand.rotation.x = Math.PI / 2;
  hatBand.position.y = 0.03;
  scHatGroup.add(hatBand);
  // Little black crow buddy perched on the hat brim
  const crowMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45 });
  const crow = new THREE.Group();
  crow.position.set(0.24, 0.08, 0.06);
  const crowBody = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), crowMat);
  crowBody.scale.set(0.85, 0.9, 1.35);
  crow.add(crowBody);
  const crowBeak = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.07, 5), blossomMat);
  crowBeak.rotation.x = Math.PI / 2;
  crowBeak.position.set(0, 0.02, 0.1);
  crow.add(crowBeak);
  scHatGroup.add(crow);
  scarecrowRoot.add(scHatGroup);
  root.add(scarecrowRoot);

  // Stage 15: Wooden Farm Wheelbarrow (front-left corner)
  const wheelbarrow = new THREE.Group();
  wheelbarrow.position.set(-1.32, 0, 1.52);
  wheelbarrow.rotation.y = 0.55;
  const wbTub = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.22, 0.56),
    new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.72 })
  );
  wbTub.position.set(0, 0.28, 0);
  wbTub.castShadow = true;
  wheelbarrow.add(wbTub);
  const wbWheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.14, 0.035, 8, 14),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 })
  );
  wbWheel.rotation.y = Math.PI / 2;
  wbWheel.position.set(0, 0.15, 0.34);
  wheelbarrow.add(wbWheel);
  for (const side of [-1, 1]) {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.46, 6), woodMat);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(side * 0.16, 0.32, -0.38);
    wheelbarrow.add(handle);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.24, 6), woodMat);
    leg.position.set(side * 0.16, 0.12, -0.2);
    wheelbarrow.add(leg);
  }
  root.add(wheelbarrow);

  // Stage 16: Harvest Crate of Carrots & Mini Pumpkins
  const harvestCrate = new THREE.Group();
  harvestCrate.position.set(1.38, 0, 1.48);
  harvestCrate.rotation.y = -0.3;
  const crateBox = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.28, 0.38), woodMat);
  crateBox.position.y = 0.14;
  crateBox.castShadow = true;
  harvestCrate.add(crateBox);
  const miniP1 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), pumpkinMat);
  miniP1.position.set(-0.08, 0.31, 0.02);
  harvestCrate.add(miniP1);
  const miniP2 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), carrotMat);
  miniP2.position.set(0.1, 0.3, -0.02);
  harvestCrate.add(miniP2);
  root.add(harvestCrate);

  // Stage 17: Copper Watering Can & Stepping Stones
  const wateringAndStones = new THREE.Group();
  for (const [sx, sz] of [
    [0, 1.55],
    [-0.18, 1.92],
  ]) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.05, 8), stoneMat);
    st.position.set(sx, 0.025, sz);
    wateringAndStones.add(st);
  }
  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.6,
    roughness: 0.32,
  });
  const wCan = new THREE.Group();
  wCan.position.set(0.55, 0.13, 1.48);
  wCan.rotation.y = -0.7;
  wCan.add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.22, 10), copperMat));
  const wSpout = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.036, 0.22, 8), copperMat);
  wSpout.position.set(0, 0.02, 0.16);
  wSpout.rotation.x = 0.85;
  wCan.add(wSpout);
  wateringAndStones.add(wCan);
  root.add(wateringAndStones);

  // Stage 18: Sunflowers Along Back Farm Rail
  const sunflowers = new THREE.Group();
  const sunflowerHeads: THREE.Group[] = [];
  const brownSeedMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.85 });
  for (const [fx, fz, fh] of [
    [-1.18, -1.16, 1.05],
    [-0.45, -1.16, 1.2],
    [0.32, -1.16, 1.08],
  ]) {
    const sf = new THREE.Group();
    sf.position.set(fx, 0, fz);
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.04, fh, 8), leafMat);
    stalk.position.y = fh / 2;
    sf.add(stalk);
    const head = new THREE.Group();
    head.position.set(0, fh, 0.05);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 12), brownSeedMat);
    disc.rotation.x = Math.PI / 2;
    head.add(disc);
    const petals = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.06, 6, 12), blossomMat);
    head.add(petals);
    sf.add(head);
    sunflowers.add(sf);
    sunflowerHeads.push(head);
  }
  root.add(sunflowers);

  // Stage 19: Cozy Farm Gate Sign & Hanging Lantern
  const farmSign = new THREE.Group();
  farmSign.position.set(-0.35, 0, 1.26);
  const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.15, 8), woodMat);
  signPost.position.y = 0.575;
  farmSign.add(signPost);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.055, 0.055), woodMat);
  arm.position.set(0.18, 1.08, 0);
  farmSign.add(arm);
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.18, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.72 })
  );
  board.position.set(0.18, 0.88, 0);
  farmSign.add(board);
  const signLanternMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.8,
    roughness: 0.2,
  });
  const sLantern = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.12, 8), signLanternMat);
  sLantern.position.set(0.38, 0.96, 0);
  farmSign.add(sLantern);
  root.add(farmSign);

  // Stage 20: Twirling Garden Wind-Spinner & Golden Harvest Sparkles
  const spinnerAndSparkles = new THREE.Group();
  const spinnerPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.03, 1.05, 8),
    woodMat
  );
  spinnerPole.position.set(-1.35, 0.525, -0.92);
  spinnerAndSparkles.add(spinnerPole);
  const spinnerWheel = new THREE.Group();
  spinnerWheel.position.set(-1.35, 1.05, -0.87);
  const bladeColors = [0xf43f5e, 0xfacc15, 0x38bdf8, 0x22c55e];
  for (let b = 0; b < 4; b++) {
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.22, 0.02),
      new THREE.MeshStandardMaterial({ color: bladeColors[b], roughness: 0.35 })
    );
    const ang = (b / 4) * Math.PI * 2;
    blade.position.set(Math.cos(ang) * 0.11, Math.sin(ang) * 0.11, 0);
    blade.rotation.z = ang + 0.35;
    spinnerWheel.add(blade);
  }
  spinnerAndSparkles.add(spinnerWheel);

  const sparkleCount = 12;
  const sparkleMesh = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(0.06, 0),
    new THREE.MeshBasicMaterial({ color: 0xfef08a }),
    sparkleCount
  );
  sparkleMesh.frustumCulled = false;
  spinnerAndSparkles.add(sparkleMesh);
  root.add(spinnerAndSparkles);
  const dummy = new THREE.Object3D();

  let currentLevel = 0;

  const setLevel = (level: number) => {
    const lv = Math.max(0, Math.min(20, level));
    currentLevel = lv;
    root.visible = lv >= 1;
    if (lv === 0) return;

    soilBed.visible = lv >= 1;
    plotBorder.visible = lv >= 2;
    furrows.visible = lv >= 3;
    carrotSprouts.visible = lv >= 4;
    ripeCarrots.visible = lv >= 5;
    pumpkinVines.visible = lv >= 6;
    greenSquash.visible = lv >= 7 && lv < 8;
    ripePumpkins.visible = lv >= 8;
    wheatShoots.visible = lv >= 9 && lv < 10;
    goldenWheat.visible = lv >= 10;
    scarecrowRoot.visible = lv >= 11;
    scPost.visible = lv >= 11;
    scOutfit.visible = lv >= 12;
    scHeadGroup.visible = lv >= 13;
    scHatGroup.visible = lv >= 14;
    wheelbarrow.visible = lv >= 15;
    harvestCrate.visible = lv >= 16;
    wateringAndStones.visible = lv >= 17;
    sunflowers.visible = lv >= 18;
    farmSign.visible = lv >= 19;
    spinnerAndSparkles.visible = lv >= 20;
  };

  const update = (elapsed: number, dt: number) => {
    if (currentLevel >= 10) {
      for (let i = 0; i < wheatStalks.length; i++) {
        wheatStalks[i].rotation.z = Math.sin(elapsed * 2.1 + i * 0.45) * 0.08;
      }
    }
    if (currentLevel >= 11) {
      scarecrowRoot.rotation.z = Math.sin(elapsed * 1.4) * 0.035;
    }
    if (currentLevel >= 18) {
      for (let i = 0; i < sunflowerHeads.length; i++) {
        sunflowerHeads[i].rotation.z = Math.sin(elapsed * 1.8 + i) * 0.07;
      }
    }
    if (currentLevel >= 20) {
      spinnerWheel.rotation.z += dt * 3.4;
      for (let i = 0; i < sparkleCount; i++) {
        const ang = elapsed * 0.9 + i * 0.52;
        dummy.position.set(
          Math.cos(ang) * (0.4 + (i % 3) * 0.45),
          0.55 + Math.sin(elapsed * 2.2 + i) * 0.25 + (i % 2) * 0.2,
          Math.sin(ang) * (0.35 + (i % 3) * 0.35)
        );
        dummy.rotation.set(elapsed * 2, elapsed * 1.5, 0);
        dummy.scale.setScalar(0.65 + Math.sin(elapsed * 4 + i) * 0.3);
        dummy.updateMatrix();
        sparkleMesh.setMatrixAt(i, dummy.matrix);
      }
      sparkleMesh.instanceMatrix.needsUpdate = true;
    }
  };

  const setAmbientGlow = (glowFactor: number) => {
    signLanternMat.emissiveIntensity = 0.45 + glowFactor * 1.25;
  };

  setLevel(0);
  return { group: root, setLevel, update, setAmbientGlow };
}
