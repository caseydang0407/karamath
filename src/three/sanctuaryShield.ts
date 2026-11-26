import * as THREE from 'three';
import type { UpgradeVisualHandle } from './models';
import type { ProceduralTextureSet } from './textures';

export function createSanctuaryShieldGroup(textures: ProceduralTextureSet): UpgradeVisualHandle {
  const root = new THREE.Group();
  root.name = 'SanctuaryShield';

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.woodMap,
    roughness: 0.78,
    metalness: 0.04,
  });
  const warmWoodMat = new THREE.MeshStandardMaterial({
    color: 0xd99b5e,
    roughness: 0.7,
    metalness: 0.05,
  });
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.stoneMap,
    roughness: 0.88,
    metalness: 0.04,
  });
  const finialMat = new THREE.MeshStandardMaterial({ color: 0xe6a15c, roughness: 0.52 });
  const ivyMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.72 });
  const darkIvyMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.78 });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xd97706,
    emissiveIntensity: 0.35,
    metalness: 0.65,
    roughness: 0.28,
  });
  const lanternGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.75,
    roughness: 0.2,
  });
  const lanternCapMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.55,
    metalness: 0.35,
  });

  const fenceR = 12.1;
  const frontGapHalf = 0.22; // Leaves ~5.3 unit welcoming front opening at +Z for Starlight Causeway
  const startAng = Math.PI / 2 + frontGapHalf;
  const endAng = Math.PI * 2 + Math.PI / 2 - frontGapHalf;
  const totalSpan = endAng - startAng;
  const postCount = 23; // 0 & 22 are twin gate pillars; 1..21 are 21 regular posts (7 groups of 3)

  interface PostInfo {
    pos: THREE.Vector3;
    angle: number;
    isGate: boolean;
    stageGroup: number; // 1..8
  }

  const posts: PostInfo[] = [];
  for (let i = 0; i < postCount; i++) {
    const t = i / (postCount - 1);
    const ang = startAng + t * totalSpan;
    const fx = Math.cos(ang) * fenceR;
    const fz = Math.sin(ang) * fenceR;
    const isGate = i === 0 || i === postCount - 1;
    let stageGroup = 8;
    if (!isGate) {
      // Map i (1..21) into directional build stages 1..7:
      // 1: North (10,11,12), 2: NW (7,8,9), 3: NE (13,14,15), 4: West (4,5,6),
      // 5: East (16,17,18), 6: SW (1,2,3), 7: SE (19,20,21)
      if (i >= 10 && i <= 12) stageGroup = 1;
      else if (i >= 7 && i <= 9) stageGroup = 2;
      else if (i >= 13 && i <= 15) stageGroup = 3;
      else if (i >= 4 && i <= 6) stageGroup = 4;
      else if (i >= 16 && i <= 18) stageGroup = 5;
      else if (i >= 1 && i <= 3) stageGroup = 6;
      else stageGroup = 7;
    }
    posts.push({ pos: new THREE.Vector3(fx, 0, fz), angle: ang, isGate, stageGroup });
  }

  // Stage 1–7: Perimeter Fence Posts + Stage 8: Entrance Twin Gate Pillars
  const postMeshes: Array<{ mesh: THREE.Object3D; stage: number }> = [];
  const finialMeshes: THREE.Object3D[] = [];
  const footingMeshes: THREE.Object3D[] = [];
  const lanternGroup = new THREE.Group();
  const crestGroup = new THREE.Group();

  posts.forEach((p, idx) => {
    const postH = p.isGate ? 1.75 : 1.18;
    const postR = p.isGate ? 0.2 : 0.135;
    const postGeo = p.isGate
      ? new THREE.BoxGeometry(postR * 2, postH, postR * 2)
      : new THREE.CylinderGeometry(postR * 0.92, postR, postH, 10);
    const post = new THREE.Mesh(postGeo, p.isGate ? warmWoodMat : woodMat);
    post.position.set(p.pos.x, postH / 2, p.pos.z);
    if (p.isGate) {
      post.lookAt(0, postH / 2, 0);
    }
    post.castShadow = true;
    post.receiveShadow = true;
    root.add(post);
    postMeshes.push({ mesh: post, stage: p.stageGroup });

    // Stage 15: Carved Acorn Post Finials
    const finial = new THREE.Group();
    finial.position.set(p.pos.x, postH, p.pos.z);
    const capBase = new THREE.Mesh(
      new THREE.CylinderGeometry(postR * 1.32, postR * 1.15, 0.09, 10),
      finialMat
    );
    capBase.position.y = 0.045;
    finial.add(capBase);
    const acorn = new THREE.Mesh(
      new THREE.SphereGeometry(p.isGate ? 0.16 : 0.115, 10, 8),
      finialMat
    );
    acorn.scale.set(1, 1.25, 1);
    acorn.position.y = 0.18;
    finial.add(acorn);
    root.add(finial);
    finialMeshes.push(finial);

    // Stage 16: Perimeter Moss & Stone Footings
    const footing = new THREE.Group();
    footing.position.set(p.pos.x, 0, p.pos.z);
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(postR * 1.55, postR * 1.85, 0.24, 8),
      stoneMat
    );
    collar.position.y = 0.12;
    collar.receiveShadow = true;
    footing.add(collar);
    if (p.isGate) {
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.36, 0.68), stoneMat);
      plinth.position.y = 0.18;
      plinth.receiveShadow = true;
      footing.add(plinth);
    }
    root.add(footing);
    footingMeshes.push(footing);

    // Stage 19: Warm Perimeter Fence Lanterns (on gate pillars + every 3rd post)
    if (p.isGate || idx % 3 === 1) {
      const lWrap = new THREE.Group();
      const topY = postH + (p.isGate ? 0.32 : 0.26);
      lWrap.position.set(p.pos.x, topY, p.pos.z);
      const lGlass = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.09, 0.2, 8),
        lanternGlowMat
      );
      lGlass.position.y = 0.12;
      lWrap.add(lGlass);
      const lHat = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.11, 8), lanternCapMat);
      lHat.position.y = 0.25;
      lWrap.add(lHat);
      lanternGroup.add(lWrap);
    }

    // Stage 20: Golden Starlight Shield Crest on Gate Pillars
    if (p.isGate) {
      const crest = new THREE.Group();
      crest.position.set(p.pos.x, 1.15, p.pos.z);
      crest.lookAt(0, 1.15, 0);
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.15, 0.08, 6), goldMat);
      shield.rotation.x = Math.PI / 2;
      shield.position.z = 0.22;
      crest.add(shield);
      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.09, 0),
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 0.7,
          roughness: 0.2,
        })
      );
      gem.position.z = 0.26;
      crest.add(gem);
      crestGroup.add(crest);
    }
  });
  root.add(lanternGroup, crestGroup);

  // Bays between consecutive posts: 22 bays (i -> i+1)
  // Stage 9: North rails (bays 8..13)
  // Stage 10: West rails (bays 3..7)
  // Stage 11: East rails (bays 14..18)
  // Stage 12: South rails (bays 0..2 & 19..21)
  const railMeshes: Array<{ mesh: THREE.Object3D; stage: number }> = [];
  const latticeMeshes: Array<{ mesh: THREE.Object3D; stage: number }> = [];
  const vineGroup = new THREE.Group();
  const blossomGroup = new THREE.Group();
  const flowerPalette = [0xf472b6, 0xfacc15, 0xa78bfa, 0xfb7185];
  const flowerMats = flowerPalette.map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45 })
  );

  for (let i = 0; i < postCount - 1; i++) {
    const a = posts[i].pos;
    const b = posts[i + 1].pos;
    const len = a.distanceTo(b);
    const mid = a.clone().add(b).multiplyScalar(0.5);

    let railStage = 12;
    if (i >= 8 && i <= 13) railStage = 9;
    else if (i >= 3 && i <= 7) railStage = 10;
    else if (i >= 14 && i <= 18) railStage = 11;

    const bayRails = new THREE.Group();
    bayRails.position.set(mid.x, 0, mid.z);
    bayRails.lookAt(b.x, 0, b.z);
    for (const ry of [0.42, 0.88]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.11, len), woodMat);
      rail.position.y = ry;
      rail.castShadow = true;
      bayRails.add(rail);
    }
    root.add(bayRails);
    railMeshes.push({ mesh: bayRails, stage: railStage });

    // Stage 13 (Back arc bays 6..15) & Stage 14 (Side/front arc bays 0..5, 16..21): Lattice pickets
    const latticeStage = i >= 6 && i <= 15 ? 13 : 14;
    const bayLattice = new THREE.Group();
    bayLattice.position.set(mid.x, 0, mid.z);
    bayLattice.lookAt(b.x, 0, b.z);
    for (const pz of [-len * 0.25, 0, len * 0.25]) {
      const picket = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.72, 0.08), warmWoodMat);
      picket.position.set(0, 0.56, pz);
      picket.castShadow = true;
      bayLattice.add(picket);
    }
    root.add(bayLattice);
    latticeMeshes.push({ mesh: bayLattice, stage: latticeStage });

    // Stage 17: Climbing Fence Vines & Ivy + Stage 18: Blooming Meadow Rose Garlands
    if (i % 2 === 0 || i === 0 || i === postCount - 2) {
      const vineBay = new THREE.Group();
      vineBay.position.set(mid.x, 0.78, mid.z);
      vineBay.lookAt(b.x, 0.78, b.z);
      for (let v = -1; v <= 1; v++) {
        const leaf = new THREE.Mesh(
          new THREE.SphereGeometry(0.16, 8, 6),
          v === 0 ? ivyMat : darkIvyMat
        );
        leaf.scale.set(1.2, 0.85, 1.3);
        leaf.position.set(v === 0 ? 0.07 : -0.06, Math.sin(v * 1.4) * 0.14, v * (len * 0.24));
        vineBay.add(leaf);
      }
      vineGroup.add(vineBay);

      const blossomBay = new THREE.Group();
      blossomBay.position.set(mid.x, 0.86, mid.z);
      blossomBay.lookAt(b.x, 0.86, b.z);
      for (let f = 0; f < 2; f++) {
        const fl = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.085, 0),
          flowerMats[(i + f) % flowerMats.length]
        );
        fl.position.set(f === 0 ? 0.11 : -0.1, (f - 0.5) * 0.12, (f - 0.5) * len * 0.32);
        blossomBay.add(fl);
      }
      blossomGroup.add(blossomBay);
    }
  }
  root.add(vineGroup, blossomGroup);

  // Stage 20: Shimmering Firefly Wisp Ring orbiting around the sanctuary fence
  const wispCount = 16;
  const wispGeo = new THREE.SphereGeometry(0.085, 8, 6);
  const wispMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const wisps = new THREE.InstancedMesh(wispGeo, wispMat, wispCount);
  wisps.frustumCulled = false;
  root.add(wisps);
  const dummy = new THREE.Object3D();

  let currentLevel = 0;
  let currentGlow = 0.25;

  const setLevel = (level: number) => {
    const lv = Math.max(0, Math.min(20, level));
    currentLevel = lv;
    root.visible = lv >= 1;
    if (lv === 0) return;

    for (const item of postMeshes) item.mesh.visible = lv >= item.stage;
    for (const item of railMeshes) item.mesh.visible = lv >= item.stage;
    for (const item of latticeMeshes) item.mesh.visible = lv >= item.stage;
    for (const f of finialMeshes) f.visible = lv >= 15;
    for (const f of footingMeshes) f.visible = lv >= 16;
    vineGroup.visible = lv >= 17;
    blossomGroup.visible = lv >= 18;
    lanternGroup.visible = lv >= 19;
    crestGroup.visible = lv >= 20;
    wisps.visible = lv >= 20;
  };

  const update = (elapsed: number) => {
    if (currentLevel >= 20) {
      for (let i = 0; i < wispCount; i++) {
        const ang = elapsed * 0.22 + (i / wispCount) * Math.PI * 2;
        const r = fenceR + Math.sin(elapsed * 1.4 + i) * 0.28;
        dummy.position.set(
          Math.cos(ang) * r,
          1.25 + Math.sin(elapsed * 2.4 + i * 1.3) * 0.32,
          Math.sin(ang) * r
        );
        dummy.scale.setScalar(0.75 + Math.sin(elapsed * 3.5 + i) * 0.3);
        dummy.updateMatrix();
        wisps.setMatrixAt(i, dummy.matrix);
      }
      wisps.instanceMatrix.needsUpdate = true;
    }
  };

  const setAmbientGlow = (glowFactor: number) => {
    currentGlow = glowFactor;
    lanternGlowMat.emissiveIntensity = 0.45 + currentGlow * 1.35;
    goldMat.emissiveIntensity = 0.25 + currentGlow * 0.55;
  };

  setLevel(0);
  return { group: root, setLevel, update, setAmbientGlow };
}
