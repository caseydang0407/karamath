import * as THREE from 'three';
import { addContactShadow, type UpgradeVisualHandle } from './models';
import type { ProceduralTextureSet } from './textures';

interface FishState {
  group: THREE.Group;
  tailGroup: THREE.Group;
  baseAngle: number;
  orbitRx: number;
  orbitRz: number;
  speed: number;
  phase: number;
  jumping: boolean;
  jumpTime: number;
  jumpDuration: number;
  jumpHeight: number;
  cooldown: number;
  splashTriggeredStart: boolean;
  splashTriggeredEnd: boolean;
}

interface RippleState {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  active: boolean;
  age: number;
  maxAge: number;
}

function buildCompositeFish(
  bodyColor: number,
  finColor: number,
  bellyColor: number,
  scale = 1
): { group: THREE.Group; tailGroup: THREE.Group } {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.25,
    metalness: 0.12,
  });
  const bellyMat = new THREE.MeshStandardMaterial({
    color: bellyColor,
    roughness: 0.35,
  });
  const finMat = new THREE.MeshStandardMaterial({
    color: finColor,
    roughness: 0.4,
    side: THREE.DoubleSide,
  });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1 });

  // Primary silhouette: streamlined fish body oriented forward along +Z
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.11 * scale, 12, 10), bodyMat);
  torso.scale.set(0.72, 0.92, 1.85);
  torso.castShadow = true;
  group.add(torso);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.088 * scale, 10, 8), bellyMat);
  belly.scale.set(0.68, 0.62, 1.5);
  belly.position.set(0, -0.028 * scale, 0.015 * scale);
  group.add(belly);

  // Dorsal fin
  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.05 * scale, 0.14 * scale, 5), finMat);
  dorsal.scale.set(0.28, 1, 1.35);
  dorsal.rotation.x = -0.35;
  dorsal.position.set(0, 0.105 * scale, -0.02 * scale);
  group.add(dorsal);

  // Pectoral side fins
  for (const s of [-1, 1]) {
    const pFin = new THREE.Mesh(new THREE.ConeGeometry(0.042 * scale, 0.11 * scale, 4), finMat);
    pFin.scale.set(0.25, 1, 0.95);
    pFin.rotation.z = s * 1.15;
    pFin.rotation.x = -0.3;
    pFin.position.set(s * 0.082 * scale, -0.02 * scale, 0.04 * scale);
    group.add(pFin);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018 * scale, 6, 6), eyeMat);
    eye.position.set(s * 0.056 * scale, 0.026 * scale, 0.135 * scale);
    group.add(eye);
  }

  // Forked tail fin pivot
  const tailGroup = new THREE.Group();
  tailGroup.position.set(0, 0, -0.185 * scale);
  const upperLobe = new THREE.Mesh(new THREE.ConeGeometry(0.058 * scale, 0.14 * scale, 4), finMat);
  upperLobe.scale.set(0.24, 1, 0.9);
  upperLobe.rotation.x = -Math.PI / 2 - 0.35;
  upperLobe.position.set(0, 0.035 * scale, -0.06 * scale);
  tailGroup.add(upperLobe);
  const lowerLobe = new THREE.Mesh(new THREE.ConeGeometry(0.052 * scale, 0.13 * scale, 4), finMat);
  lowerLobe.scale.set(0.24, 1, 0.9);
  lowerLobe.rotation.x = -Math.PI / 2 + 0.35;
  lowerLobe.position.set(0, -0.035 * scale, -0.06 * scale);
  tailGroup.add(lowerLobe);
  group.add(tailGroup);

  return { group, tailGroup };
}

export function createLilypadPondGroup(
  textures: ProceduralTextureSet
): UpgradeVisualHandle {
  const group = new THREE.Group();
  group.name = 'LilypadPond';

  const contactShadow = addContactShadow(group, textures.contactShadowMap, 2.05, 0.022);

  const bankMat = new THREE.MeshStandardMaterial({ color: 0x785535, roughness: 0.92 });
  const basinBedMat = new THREE.MeshStandardMaterial({ color: 0x164e63, roughness: 0.94 });
  const shallowBaseMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x075985,
    emissiveIntensity: 0.16,
    roughness: 0.25,
    metalness: 0.1,
  });
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0369a1,
    emissiveIntensity: 0.24,
    roughness: 0.08,
    metalness: 0.24,
    transparent: true,
    opacity: 0.74,
  });
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.stoneMap,
    bumpMap: textures.stoneBump,
    bumpScale: 0.04,
    roughness: 0.84,
  });
  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    map: textures.stoneMap,
    roughness: 0.88,
  });
  const padMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.65 });
  const padMatAlt = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.62 });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.woodMap,
    roughness: 0.74,
  });
  const bambooMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.58 });
  const reedMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.72 });
  const cattailMat = new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.88 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });

  // Step 1: Earthen Bank Rim & Pebble Basin (sunken center so water is never occluded)
  const basinGroup = new THREE.Group();
  const outerSkirt = new THREE.Mesh(
    new THREE.CylinderGeometry(1.74, 1.96, 0.06, 28),
    bankMat
  );
  outerSkirt.position.y = 0.03;
  outerSkirt.receiveShadow = true;
  basinGroup.add(outerSkirt);

  const rimRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.58, 0.18, 10, 32),
    bankMat
  );
  rimRing.rotation.x = Math.PI / 2;
  rimRing.scale.set(1, 1, 0.45);
  rimRing.position.y = 0.085;
  rimRing.receiveShadow = true;
  basinGroup.add(rimRing);

  const bedFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(1.46, 1.46, 0.03, 28),
    basinBedMat
  );
  bedFloor.position.y = 0.055;
  bedFloor.receiveShadow = true;
  basinGroup.add(bedFloor);

  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2 + 0.2;
    const rad = 0.45 + (i % 3) * 0.34;
    const peb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08 + (i % 3) * 0.02, 0), darkStoneMat);
    peb.scale.set(1.2, 0.55, 1.0);
    peb.position.set(Math.cos(ang) * rad, 0.075, Math.sin(ang) * rad);
    basinGroup.add(peb);
  }
  group.add(basinGroup);

  // Step 2: Clear Shimmering Pond Water
  const waterGroup = new THREE.Group();
  const waterBaseDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(1.45, 1.45, 0.03, 32),
    shallowBaseMat
  );
  waterBaseDisc.position.y = 0.088;
  waterBaseDisc.receiveShadow = true;
  waterGroup.add(waterBaseDisc);

  const waterDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(1.49, 1.49, 0.045, 32),
    waterMat
  );
  waterDisc.position.y = 0.12;
  waterDisc.receiveShadow = true;
  waterGroup.add(waterDisc);

  const shimmerMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const shimmerRing = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.71, 24), shimmerMat);
  shimmerRing.rotation.x = -Math.PI / 2;
  shimmerRing.position.y = 0.146;
  waterGroup.add(shimmerRing);
  group.add(waterGroup);

  // Splash Ripple Pool (shared for jumping fish & trickle spout)
  const ripples: RippleState[] = [];
  const rippleGeo = new THREE.RingGeometry(0.09, 0.16, 18);
  rippleGeo.rotateX(-Math.PI / 2);
  for (let i = 0; i < 6; i++) {
    const rMat = new THREE.MeshBasicMaterial({
      color: 0xf0f9ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const rMesh = new THREE.Mesh(rippleGeo, rMat);
    rMesh.position.y = 0.149;
    rMesh.visible = false;
    group.add(rMesh);
    ripples.push({ mesh: rMesh, mat: rMat, active: false, age: 0, maxAge: 0.95 });
  }
  const triggerRipple = (x: number, z: number) => {
    const slot = ripples.find((r) => !r.active) ?? ripples[0];
    slot.active = true;
    slot.age = 0;
    slot.mesh.position.set(x, 0.149, z);
    slot.mesh.scale.setScalar(1);
    slot.mesh.visible = true;
    slot.mat.opacity = 0.85;
  };

  // Fishes (Step 3: Golden Koi #1, Step 7: Ruby Koi #2, Step 11: Azure Minnow Pair)
  const koi1 = buildCompositeFish(0xf97316, 0xfef08a, 0xfffbeb, 1.32);
  const koi2 = buildCompositeFish(0xef4444, 0xfef9c3, 0xffffff, 1.22);
  const minnowA = buildCompositeFish(0x0ea5e9, 0xe0f2fe, 0xf8fafc, 0.88);
  const minnowB = buildCompositeFish(0x6366f1, 0xe0e7ff, 0xf8fafc, 0.84);

  group.add(koi1.group, koi2.group, minnowA.group, minnowB.group);

  const fishes: Array<{ minLv: number; state: FishState }> = [
    {
      minLv: 3,
      state: {
        group: koi1.group,
        tailGroup: koi1.tailGroup,
        baseAngle: 0,
        orbitRx: 0.78,
        orbitRz: 0.66,
        speed: 0.78,
        phase: 0.2,
        jumping: false,
        jumpTime: 0,
        jumpDuration: 1.05,
        jumpHeight: 1.18,
        cooldown: 0.45,
        splashTriggeredStart: false,
        splashTriggeredEnd: false,
      },
    },
    {
      minLv: 7,
      state: {
        group: koi2.group,
        tailGroup: koi2.tailGroup,
        baseAngle: Math.PI,
        orbitRx: 0.68,
        orbitRz: 0.8,
        speed: -0.72,
        phase: 2.1,
        jumping: false,
        jumpTime: 0,
        jumpDuration: 1.0,
        jumpHeight: 1.08,
        cooldown: 1.35,
        splashTriggeredStart: false,
        splashTriggeredEnd: false,
      },
    },
    {
      minLv: 11,
      state: {
        group: minnowA.group,
        tailGroup: minnowA.tailGroup,
        baseAngle: 1.4,
        orbitRx: 0.5,
        orbitRz: 0.56,
        speed: 1.08,
        phase: 0.9,
        jumping: false,
        jumpTime: 0,
        jumpDuration: 0.88,
        jumpHeight: 0.85,
        cooldown: 2.05,
        splashTriggeredStart: false,
        splashTriggeredEnd: false,
      },
    },
    {
      minLv: 11,
      state: {
        group: minnowB.group,
        tailGroup: minnowB.tailGroup,
        baseAngle: 1.75,
        orbitRx: 0.56,
        orbitRz: 0.48,
        speed: 1.08,
        phase: 1.2,
        jumping: false,
        jumpTime: 0,
        jumpDuration: 0.92,
        jumpHeight: 0.9,
        cooldown: 2.85,
        splashTriggeredStart: false,
        splashTriggeredEnd: false,
      },
    },
  ];

  // Step 4 & 5: River Stone Borders (Back Arc & Front Arc)
  const buildRockArc = (startAng: number, endAng: number, count: number) => {
    const arc = new THREE.Group();
    for (let i = 0; i < count; i++) {
      const t = i / Math.max(1, count - 1);
      const ang = startAng + t * (endAng - startAng);
      const rad = 1.62 + (i % 2) * 0.08;
      const rSize = 0.22 + (i % 3) * 0.055;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(rSize, 0),
        i % 2 === 0 ? stoneMat : darkStoneMat
      );
      rock.scale.set(1.25, 0.7, 1.05);
      rock.position.set(Math.cos(ang) * rad, 0.11, Math.sin(ang) * rad);
      rock.rotation.set(i * 0.3, ang, i * 0.4);
      rock.castShadow = true;
      rock.receiveShadow = true;
      arc.add(rock);
    }
    return arc;
  };
  const backStones = buildRockArc(Math.PI * 1.05, Math.PI * 1.95, 11);
  const frontStones = buildRockArc(Math.PI * 0.08, Math.PI * 0.92, 10);
  group.add(backStones, frontStones);

  // Helper: notched lily pad
  const createLilyPad = (r: number, rotY: number, alt = false) => {
    const geo = new THREE.CylinderGeometry(r, r, 0.022, 18, 1, false, 0.22, Math.PI * 1.84);
    const pad = new THREE.Mesh(geo, alt ? padMatAlt : padMat);
    pad.rotation.y = rotY;
    pad.receiveShadow = true;
    return pad;
  };

  // Step 6: First Trio of Lily Pads
  const lilyGroup1 = new THREE.Group();
  const padCoords1: Array<[number, number, number, number]> = [
    [-0.78, -0.45, 0.28, 0.4],
    [-0.36, -0.82, 0.22, 1.8],
    [-0.95, 0.15, 0.24, -0.9],
  ];
  const padMeshes: THREE.Mesh[] = [];
  padCoords1.forEach(([px, pz, pr, ry], idx) => {
    const p = createLilyPad(pr, ry, idx % 2 === 1);
    p.position.set(px, 0.156, pz);
    lilyGroup1.add(p);
    padMeshes.push(p);
  });
  group.add(lilyGroup1);

  // Step 8: Blooming Pink Lotus Flowers
  const lotusGroup = new THREE.Group();
  const petalMat = new THREE.MeshStandardMaterial({ color: 0xf9a8d4, roughness: 0.4 });
  const centerMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45 });
  for (const [lx, lz] of [
    [-0.78, -0.45],
    [-0.95, 0.15],
  ]) {
    const fl = new THREE.Group();
    fl.position.set(lx, 0.182, lz);
    for (let k = 0; k < 6; k++) {
      const ang = (k / 6) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), petalMat);
      petal.scale.set(0.85, 0.5, 1.45);
      petal.position.set(Math.cos(ang) * 0.065, 0.02, Math.sin(ang) * 0.065);
      petal.rotation.y = -ang + Math.PI / 2;
      fl.add(petal);
    }
    const stamen = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 6), centerMat);
    stamen.position.y = 0.04;
    fl.add(stamen);
    lotusGroup.add(fl);
  }
  group.add(lotusGroup);

  // Step 9: Tall Cattails & Pond Reeds
  const reedsGroup = new THREE.Group();
  const reedClusters: THREE.Group[] = [];
  for (const [rx, rz, ry] of [
    [-1.42, -0.68, 0.3],
    [-1.12, -1.12, -0.4],
    [1.08, -1.16, 0.7],
  ]) {
    const cluster = new THREE.Group();
    cluster.position.set(rx, 0.08, rz);
    cluster.rotation.y = ry;
    for (let b = 0; b < 5; b++) {
      const stalk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.026, 0.65 + (b % 3) * 0.18, 6),
        reedMat
      );
      stalk.position.set((b - 2) * 0.055, 0.34, (b % 2) * 0.04);
      stalk.rotation.z = (b - 2) * 0.09;
      cluster.add(stalk);
      if (b === 1 || b === 3) {
        const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.12, 4, 8), cattailMat);
        head.position.set((b - 2) * 0.075, 0.64 + (b % 3) * 0.12, (b % 2) * 0.04);
        head.rotation.z = (b - 2) * 0.09;
        cluster.add(head);
      }
    }
    reedsGroup.add(cluster);
    reedClusters.push(cluster);
  }
  group.add(reedsGroup);

  // Step 10: Second Cluster of Lily Pads
  const lilyGroup2 = new THREE.Group();
  const padCoords2: Array<[number, number, number, number]> = [
    [0.68, 0.55, 0.27, 2.2],
    [0.98, 0.15, 0.21, -1.4],
    [0.32, 0.88, 0.24, 0.8],
  ];
  padCoords2.forEach(([px, pz, pr, ry], idx) => {
    const p = createLilyPad(pr, ry, idx % 2 === 0);
    p.position.set(px, 0.156, pz);
    lilyGroup2.add(p);
    padMeshes.push(p);
  });
  group.add(lilyGroup2);

  // Step 12: Pebble Cove & Stepping Stones
  const coveSteps = new THREE.Group();
  for (const [sx, sz, sr] of [
    [1.62, 0.85, 0.24],
    [1.92, 1.18, 0.22],
    [2.18, 1.48, 0.2],
  ]) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(sr, sr * 1.08, 0.07, 9), stoneMat);
    st.position.set(sx, 0.035, sz);
    st.receiveShadow = true;
    coveSteps.add(st);
  }
  group.add(coveSteps);

  // Step 13: Tiny Wooden Pond Dock
  const dockGroup = new THREE.Group();
  dockGroup.position.set(1.42, 0, -0.15);
  dockGroup.rotation.y = -0.35;
  for (const pz of [-0.3, 0.3]) {
    const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.34, 8), woodMat);
    piling.position.set(-0.32, 0.17, pz);
    piling.castShadow = true;
    dockGroup.add(piling);
  }
  for (let p = 0; p < 4; p++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.82), woodMat);
    plank.position.set(-0.4 + p * 0.22, 0.24, 0);
    plank.castShadow = true;
    dockGroup.add(plank);
  }
  group.add(dockGroup);

  // Step 14: Bamboo Water Trickle Spout
  const spoutGroup = new THREE.Group();
  spoutGroup.position.set(0.35, 0, -1.55);
  const spoutPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.62, 8), bambooMat);
  spoutPost.position.set(0, 0.31, 0);
  spoutPost.castShadow = true;
  spoutGroup.add(spoutPost);
  const spoutPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.56, 8), bambooMat);
  spoutPipe.position.set(0, 0.5, 0.22);
  spoutPipe.rotation.x = 1.22;
  spoutGroup.add(spoutPipe);
  const trickleStream = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.032, 0.34, 8),
    new THREE.MeshBasicMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.72 })
  );
  trickleStream.position.set(0, 0.27, 0.44);
  spoutGroup.add(trickleStream);
  group.add(spoutGroup);

  // Step 15: Mossy Boulder & Smiling Pond Frog
  const frogRockGroup = new THREE.Group();
  frogRockGroup.position.set(-0.35, 0, 1.48);
  const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), darkStoneMat);
  boulder.scale.set(1.3, 0.58, 1.1);
  boulder.position.y = 0.14;
  boulder.castShadow = true;
  frogRockGroup.add(boulder);

  const frogMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.48 });
  const frogGroup = new THREE.Group();
  frogGroup.position.set(0, 0.3, 0);
  frogGroup.rotation.y = Math.PI;
  const fBody = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), frogMat);
  fBody.scale.set(1.1, 0.78, 1.2);
  frogGroup.add(fBody);
  const fHead = new THREE.Mesh(new THREE.SphereGeometry(0.088, 10, 8), frogMat);
  fHead.position.set(0, 0.06, 0.08);
  frogGroup.add(fHead);
  for (const s of [-1, 1]) {
    const fEyeBump = new THREE.Mesh(new THREE.SphereGeometry(0.034, 8, 6), frogMat);
    fEyeBump.position.set(s * 0.05, 0.13, 0.1);
    frogGroup.add(fEyeBump);
    const fPupil = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0x0f172a })
    );
    fPupil.position.set(s * 0.05, 0.14, 0.125);
    frogGroup.add(fPupil);
  }
  frogRockGroup.add(frogGroup);
  group.add(frogRockGroup);

  // Step 16: Graceful Willow Sapling
  const willowGroup = new THREE.Group();
  willowGroup.position.set(-1.62, 0, -1.15);
  const wTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.32, 8), bankMat);
  wTrunk.position.set(0, 0.65, 0);
  wTrunk.rotation.z = -0.14;
  wTrunk.castShadow = true;
  willowGroup.add(wTrunk);
  const crownOffsets: Array<[number, number, number, number]> = [
    [0.12, 1.46, 0.08, 0.56],
    [-0.18, 1.34, -0.12, 0.42],
    [0.34, 1.32, 0.22, 0.4],
  ];
  crownOffsets.forEach(([cx, cy, cz, cr], idx) => {
    const lobe = new THREE.Mesh(
      new THREE.SphereGeometry(cr, 11, 9),
      idx === 0 ? padMatAlt : padMat
    );
    lobe.scale.set(1.12, 0.86, 1.12);
    lobe.position.set(cx, cy, cz);
    lobe.castShadow = true;
    willowGroup.add(lobe);
  });
  const wStrands: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.008, 0.68, 5), reedMat);
    strand.position.set(0.12 + Math.cos(ang) * 0.48, 1.02, 0.08 + Math.sin(ang) * 0.48);
    strand.rotation.z = -Math.cos(ang) * 0.14;
    strand.rotation.x = Math.sin(ang) * 0.14;
    willowGroup.add(strand);
    wStrands.push(strand);
  }
  group.add(willowGroup);

  // Step 17: Carved Stone Garden Lantern
  const stoneLantern = new THREE.Group();
  stoneLantern.position.set(1.52, 0, -1.12);
  const slBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.16, 6), stoneMat);
  slBase.position.y = 0.08;
  stoneLantern.add(slBase);
  const slPost = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.42, 6), stoneMat);
  slPost.position.y = 0.36;
  stoneLantern.add(slPost);
  const slLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 6), glowMat);
  slLamp.position.y = 0.66;
  stoneLantern.add(slLamp);
  const slRoof = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.18, 6), darkStoneMat);
  slRoof.position.y = 0.84;
  stoneLantern.add(slRoof);
  group.add(stoneLantern);

  // Step 18: Floating Glowing Lotus Lanterns
  const lotusLanterns = new THREE.Group();
  const llNodes: THREE.Group[] = [];
  for (const [lx, lz] of [
    [0.12, -0.45],
    [-0.25, 0.42],
  ]) {
    const ll = new THREE.Group();
    ll.position.set(lx, 0.168, lz);
    const pad = createLilyPad(0.16, lx * 4, true);
    ll.add(pad);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), glowMat);
    orb.position.y = 0.07;
    ll.add(orb);
    lotusLanterns.add(ll);
    llNodes.push(ll);
  }
  group.add(lotusLanterns);

  // Step 19: Skimming Meadow Dragonflies
  const dragonflyGroup = new THREE.Group();
  const dragonflies: THREE.Group[] = [];
  const dfColors = [0x38bdf8, 0xfbbf24, 0xa78bfa];
  for (let i = 0; i < 3; i++) {
    const df = new THREE.Group();
    const dBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.012, 0.18, 6),
      new THREE.MeshStandardMaterial({ color: dfColors[i], roughness: 0.25, metalness: 0.4 })
    );
    dBody.rotation.x = Math.PI / 2;
    df.add(dBody);
    const wingGeo = new THREE.BoxGeometry(0.18, 0.008, 0.04);
    const wingMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.72,
    });
    const wing1 = new THREE.Mesh(wingGeo, wingMat);
    wing1.position.y = 0.015;
    df.add(wing1);
    dragonflyGroup.add(df);
    dragonflies.push(df);
  }
  group.add(dragonflyGroup);

  // Step 20: Golden Starlight Pond Mist
  const pondMist = new THREE.Group();
  const mistOrbs: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), glowMat);
    pondMist.add(orb);
    mistOrbs.push(orb);
  }
  group.add(pondMist);

  let currentLvl = 0;
  let trickleTimer = 0;
  const setLevel = (level: number) => {
    const lv = Math.max(0, Math.min(20, level));
    currentLvl = lv;
    contactShadow.visible = lv >= 1;
    basinGroup.visible = lv >= 1;
    waterGroup.visible = lv >= 2;
    fishes.forEach((f) => {
      f.state.group.visible = lv >= f.minLv;
    });
    backStones.visible = lv >= 4;
    frontStones.visible = lv >= 5;
    lilyGroup1.visible = lv >= 6;
    lotusGroup.visible = lv >= 8;
    reedsGroup.visible = lv >= 9;
    lilyGroup2.visible = lv >= 10;
    coveSteps.visible = lv >= 12;
    dockGroup.visible = lv >= 13;
    spoutGroup.visible = lv >= 14;
    frogRockGroup.visible = lv >= 15;
    willowGroup.visible = lv >= 16;
    stoneLantern.visible = lv >= 17;
    lotusLanterns.visible = lv >= 18;
    dragonflyGroup.visible = lv >= 19;
    pondMist.visible = lv >= 20;
  };
  setLevel(0);

  return {
    group,
    setLevel,
    setAmbientGlow: (factor: number) => {
      glowMat.emissiveIntensity = 0.65 + factor * 1.45;
      waterMat.emissiveIntensity = 0.14 + factor * 0.25;
    },
    update: (elapsed, dt) => {
      if (currentLvl >= 2) {
        shimmerRing.scale.setScalar(0.92 + Math.sin(elapsed * 1.4) * 0.12);
        shimmerMat.opacity = 0.2 + Math.sin(elapsed * 1.8) * 0.1;
      }

      // Update animated splash ripple rings
      for (const r of ripples) {
        if (!r.active) continue;
        r.age += dt;
        const p = r.age / r.maxAge;
        if (p >= 1) {
          r.active = false;
          r.mesh.visible = false;
        } else {
          r.mesh.scale.setScalar(1 + p * 3.8);
          r.mat.opacity = (1 - p) * 0.72;
        }
      }

      // Occasional trickle splash ripple from bamboo spout
      if (currentLvl >= 14) {
        trickleTimer += dt;
        if (trickleTimer >= 1.35) {
          trickleTimer = 0;
          triggerRipple(0.35, -1.11);
        }
      }

      // Swimming & occasional jumping fishes
      for (const entry of fishes) {
        if (currentLvl < entry.minLv) continue;
        const f = entry.state;
        const ang = f.baseAngle + elapsed * f.speed + f.phase;
        const x = Math.cos(ang) * f.orbitRx;
        const z = Math.sin(ang) * f.orbitRz;
        const vx = -Math.sin(ang) * f.orbitRx * f.speed;
        const vz = Math.cos(ang) * f.orbitRz * f.speed;
        const headingYaw = Math.atan2(vx, vz);

        f.tailGroup.rotation.y = Math.sin(elapsed * 11 + f.phase) * 0.36;

        let y = 0.112 + Math.sin(elapsed * 2.5 + f.phase) * 0.014;
        let pitchX = 0;

        if (!f.jumping) {
          f.cooldown -= dt;
          if (f.cooldown <= 0) {
            f.jumping = true;
            f.jumpTime = 0;
            f.splashTriggeredStart = false;
            f.splashTriggeredEnd = false;
          }
        } else {
          f.jumpTime += dt;
          const p = Math.min(1, f.jumpTime / f.jumpDuration);
          y = 0.095 + Math.sin(p * Math.PI) * f.jumpHeight;
          // Nose tilts up during breach, levels at apex, dives nose-down on entry
          pitchX = -Math.cos(p * Math.PI) * 0.96;

          if (!f.splashTriggeredStart && p >= 0.08) {
            f.splashTriggeredStart = true;
            triggerRipple(x, z);
          }
          if (!f.splashTriggeredEnd && p >= 0.9) {
            f.splashTriggeredEnd = true;
            triggerRipple(x, z);
          }
          if (p >= 1) {
            f.jumping = false;
            f.cooldown = 1.8 + ((f.phase * 1.37) % 1.6);
          }
        }

        f.group.position.set(x, y, z);
        f.group.rotation.set(pitchX, headingYaw, 0, 'YXZ');
      }

      // Gentle bobbing for lily pads, lotus lanterns, reeds, frog & dragonflies
      if (currentLvl >= 6) {
        for (let i = 0; i < padMeshes.length; i++) {
          padMeshes[i].position.y = 0.156 + Math.sin(elapsed * 1.9 + i * 1.1) * 0.008;
        }
      }
      if (currentLvl >= 9) {
        for (let i = 0; i < reedClusters.length; i++) {
          reedClusters[i].rotation.z = Math.sin(elapsed * 1.6 + i) * 0.055;
        }
      }
      if (currentLvl >= 15) {
        frogGroup.position.y = 0.3 + Math.abs(Math.sin(elapsed * 1.4)) * 0.035;
      }
      if (currentLvl >= 16) {
        for (let i = 0; i < wStrands.length; i++) {
          wStrands[i].rotation.z = Math.sin(elapsed * 1.7 + i * 0.8) * 0.08;
        }
      }
      if (currentLvl >= 18) {
        for (let i = 0; i < llNodes.length; i++) {
          llNodes[i].position.y = 0.168 + Math.sin(elapsed * 2.0 + i * 1.5) * 0.015;
        }
      }
      if (currentLvl >= 19) {
        for (let i = 0; i < dragonflies.length; i++) {
          const df = dragonflies[i];
          const a = elapsed * (1.5 + i * 0.25) + i * 2.1;
          df.position.set(
            Math.cos(a) * 0.92,
            0.34 + Math.sin(elapsed * 3.8 + i) * 0.09,
            Math.sin(a * 1.3) * 0.78
          );
          df.rotation.y = -a;
        }
      }
      if (currentLvl >= 20) {
        for (let i = 0; i < mistOrbs.length; i++) {
          const a = elapsed * 0.9 + i * ((Math.PI * 2) / mistOrbs.length);
          mistOrbs[i].position.set(
            Math.cos(a) * 1.18,
            0.36 + Math.sin(elapsed * 2.2 + i) * 0.24,
            Math.sin(a) * 1.12
          );
        }
      }
    },
  };
}
