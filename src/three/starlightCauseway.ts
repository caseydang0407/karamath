import * as THREE from 'three';
import type { UpgradeVisualHandle } from './models';
import type { ProceduralTextureSet } from './textures';

function createStarShape(outerR: number, innerR: number, points = 4): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const ang = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(ang) * r;
    const y = Math.sin(ang) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

export function createStarlightCausewayGroup(
  textures: ProceduralTextureSet
): UpgradeVisualHandle {
  const group = new THREE.Group();
  group.name = 'StarlightCauseway';

  // Smooth walkway spline from Moonbeam Cottage front steps -> between Kara & Kaitlyn -> Front Starlight Plaza
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.64, 0, -1.56),
    new THREE.Vector3(-0.82, 0, -0.58),
    new THREE.Vector3(0.05, 0, 0.35),
    new THREE.Vector3(0.05, 0, 2.35),
    new THREE.Vector3(0.05, 0, 4.45),
  ]);

  const gravelMat = new THREE.MeshStandardMaterial({
    color: 0xc8b89a,
    roughness: 0.94,
    metalness: 0.02,
  });
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.stoneMap,
    bumpMap: textures.stoneBump,
    bumpScale: 0.04,
    roughness: 0.8,
    metalness: 0.05,
  });
  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: 0x9ca3af,
    map: textures.stoneMap,
    bumpMap: textures.stoneBump,
    bumpScale: 0.04,
    roughness: 0.86,
    metalness: 0.06,
  });
  const curbStoneMat = new THREE.MeshStandardMaterial({
    color: 0xb6a996,
    map: textures.stoneMap,
    roughness: 0.85,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.woodMap,
    roughness: 0.72,
    metalness: 0.04,
  });
  const starGoldMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.35,
    roughness: 0.25,
    metalness: 0.65,
  });
  const lanternGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.85,
    roughness: 0.18,
  });
  const moonstoneMat = new THREE.MeshStandardMaterial({
    color: 0xa5f3fc,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.55,
    roughness: 0.22,
    metalness: 0.25,
  });
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.35,
    metalness: 0.78,
  });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.75 });
  const lightLeafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.72 });
  const stardustMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfacc15,
    emissiveIntensity: 1.25,
    roughness: 0.15,
  });

  // Helper to get point and outward right normal on XZ plane
  const sampleFrame = (t: number) => {
    const pt = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();
    const right = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    const yaw = Math.atan2(tan.x, tan.z);
    return { pt, tan, right, yaw };
  };

  // Step 1: Compact Gravel Trail Bed
  const gravelBed = new THREE.Group();
  const gravelSegs = 22;
  const gravelSegGeo = new THREE.BoxGeometry(0.96, 0.024, 0.42);
  for (let i = 0; i <= gravelSegs; i++) {
    const t = i / gravelSegs;
    const { pt, yaw } = sampleFrame(t);
    const seg = new THREE.Mesh(gravelSegGeo, gravelMat);
    seg.position.set(pt.x, 0.018, pt.z);
    seg.rotation.y = yaw;
    seg.receiveShadow = true;
    gravelBed.add(seg);
  }
  group.add(gravelBed);

  // Build 13 paving stones along the spline:
  // Step 2: stones 0..2 (Cottage Threshold)
  // Step 3: stones 3..7 (Mid-Meadow between Kara & Kaitlyn)
  // Step 4: stones 8..12 (Front Meadow Walkway)
  const stoneCount = 13;
  const paverGeo = new THREE.BoxGeometry(0.76, 0.055, 0.44);
  const starGeo = new THREE.ExtrudeGeometry(createStarShape(0.14, 0.055, 4), {
    depth: 0.014,
    bevelEnabled: false,
  });
  starGeo.rotateX(-Math.PI / 2);

  const thresholdStones = new THREE.Group();
  const midStones = new THREE.Group();
  const frontStones = new THREE.Group();
  const starInlays = new THREE.Group();

  for (let i = 0; i < stoneCount; i++) {
    const t = 0.04 + (i / (stoneCount - 1)) * 0.86;
    const { pt, yaw } = sampleFrame(t);
    const slab = new THREE.Mesh(paverGeo, i % 2 === 0 ? stoneMat : darkStoneMat);
    slab.position.set(pt.x, 0.036, pt.z);
    slab.rotation.y = yaw;
    slab.receiveShadow = true;
    slab.castShadow = true;

    if (i < 3) thresholdStones.add(slab);
    else if (i < 8) midStones.add(slab);
    else frontStones.add(slab);

    if (i % 2 === 0) {
      const inlay = new THREE.Mesh(starGeo, starGoldMat);
      inlay.position.set(pt.x, 0.064, pt.z);
      inlay.rotation.y = yaw;
      starInlays.add(inlay);
    }
  }
  group.add(thresholdStones, midStones, frontStones, starInlays);

  // Step 5: Starlight Mosaic Plaza Disc at front end (0.05, 0, 4.75)
  const plazaCenter = new THREE.Vector3(0.05, 0, 4.75);
  const plazaGroup = new THREE.Group();
  plazaGroup.position.copy(plazaCenter);
  const outerRing = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.18, 0.045, 24), darkStoneMat);
  outerRing.position.y = 0.024;
  outerRing.receiveShadow = true;
  plazaGroup.add(outerRing);
  const innerDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.98, 0.055, 24), stoneMat);
  innerDisc.position.y = 0.036;
  innerDisc.receiveShadow = true;
  plazaGroup.add(innerDisc);
  group.add(plazaGroup);

  // Step 6: Golden Star Inlay Tiles (plus large compass star on plaza!)
  const plazaStarGeo = new THREE.ExtrudeGeometry(createStarShape(0.55, 0.19, 4), {
    depth: 0.016,
    bevelEnabled: false,
  });
  plazaStarGeo.rotateX(-Math.PI / 2);
  const plazaStar = new THREE.Mesh(plazaStarGeo, starGoldMat);
  plazaStar.position.set(plazaCenter.x, 0.065, plazaCenter.z);
  starInlays.add(plazaStar);
  const plazaCenterGem = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.022, 12), moonstoneMat);
  plazaCenterGem.position.set(plazaCenter.x, 0.072, plazaCenter.z);
  starInlays.add(plazaCenterGem);

  // Step 7 & 8: Left & Right Cobble Curb Borders
  const leftCurb = new THREE.Group();
  const rightCurb = new THREE.Group();
  const curbGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.11, 7);
  for (let i = 0; i < 18; i++) {
    const t = 0.03 + (i / 17) * 0.87;
    const { pt, right } = sampleFrame(t);
    const lStone = new THREE.Mesh(curbGeo, curbStoneMat);
    lStone.position.set(pt.x - right.x * 0.46, 0.055, pt.z - right.z * 0.46);
    lStone.rotation.y = i * 0.8;
    lStone.scale.set(1, 0.85, 1.35);
    lStone.castShadow = true;
    lStone.receiveShadow = true;
    leftCurb.add(lStone);

    const rStone = new THREE.Mesh(curbGeo, curbStoneMat);
    rStone.position.set(pt.x + right.x * 0.46, 0.055, pt.z + right.z * 0.46);
    rStone.rotation.y = -i * 0.7;
    rStone.scale.set(1, 0.85, 1.35);
    rStone.castShadow = true;
    rStone.receiveShadow = true;
    rightCurb.add(rStone);
  }
  group.add(leftCurb, rightCurb);

  // Step 9: Meadow Wildflower Edging (skip t around Kara & Kaitlyn at 0.30..0.44)
  const edgingFlowers = new THREE.Group();
  const flowerColors = [0xf472b6, 0xfbbf24, 0xc084fc, 0xfb7185, 0x60a5fa];
  const flowerTs = [0.08, 0.18, 0.52, 0.64, 0.76, 0.88];
  flowerTs.forEach((t, idx) => {
    const { pt, right } = sampleFrame(t);
    for (const side of [-1, 1]) {
      const fx = pt.x + right.x * side * 0.64;
      const fz = pt.z + right.z * side * 0.64;
      const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), lightLeafMat);
      tuft.scale.set(1.2, 0.55, 1.2);
      tuft.position.set(fx, 0.045, fz);
      edgingFlowers.add(tuft);
      const bloom = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.065, 0),
        new THREE.MeshStandardMaterial({
          color: flowerColors[(idx + (side > 0 ? 2 : 0)) % flowerColors.length],
          roughness: 0.45,
        })
      );
      bloom.position.set(fx, 0.12, fz);
      edgingFlowers.add(bloom);
    }
  });
  group.add(edgingFlowers);

  // Step 10 & 11: Wooden Guard Posts (3 pairs at Cottage t=0.14, Mid t=0.58, Front t=0.88)
  // Step 12..14: Starlight Bollard Lanterns (#1 Front, #2 Middle, #3 Cottage)
  const bollardTs = [0.88, 0.58, 0.14]; // ordered Front, Middle, Cottage for lantern steps 12, 13, 14
  const leftPosts = new THREE.Group();
  const rightPosts = new THREE.Group();
  const lanternPairs: THREE.Group[] = [];

  bollardTs.forEach((t) => {
    const { pt, right } = sampleFrame(t);
    const lPair = new THREE.Group();

    for (const side of [-1, 1]) {
      const bx = pt.x + right.x * side * 0.56;
      const bz = pt.z + right.z * side * 0.56;

      const post = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.11, 0.08, 8), darkStoneMat);
      base.position.set(bx, 0.04, bz);
      post.add(base);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.078, 0.48, 8), woodMat);
      shaft.position.set(bx, 0.3, bz);
      shaft.castShadow = true;
      post.add(shaft);
      if (side === -1) leftPosts.add(post);
      else rightPosts.add(post);

      // Bollard Lantern Cap
      const capGroup = new THREE.Group();
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.13, 8), lanternGlowMat);
      glass.position.set(bx, 0.6, bz);
      capGroup.add(glass);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.115, 0.09, 8), ironMat);
      roof.position.set(bx, 0.7, bz);
      capGroup.add(roof);
      lPair.add(capGroup);
    }
    group.add(lPair);
    lanternPairs.push(lPair);
  });
  group.add(leftPosts, rightPosts);

  // Step 15: Carved Stone Plaza Gateposts (low flanking pillars at plaza entrance, never blocking Kara/Kaitlyn)
  const gatepostsGroup = new THREE.Group();
  gatepostsGroup.position.set(0.05, 0, 3.82);
  for (const sx of [-1.05, 1.05]) {
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.34), darkStoneMat);
    plinth.position.set(sx, 0.08, 0);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    gatepostsGroup.add(plinth);
    const postCol = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.52, 8), stoneMat);
    postCol.position.set(sx, 0.42, 0);
    postCol.castShadow = true;
    gatepostsGroup.add(postCol);
    const capSlab = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.28), darkStoneMat);
    capSlab.position.set(sx, 0.72, 0);
    capSlab.castShadow = true;
    gatepostsGroup.add(capSlab);
    const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), starGoldMat);
    finial.position.set(sx, 0.84, 0);
    gatepostsGroup.add(finial);
  }
  group.add(gatepostsGroup);

  // Step 16: Gatepost Climbing Vines & Blossoms
  const postVines = new THREE.Group();
  postVines.position.copy(gatepostsGroup.position);
  for (const sx of [-1.05, 1.05]) {
    for (let k = 0; k < 4; k++) {
      const ang = k * 1.45;
      const lf = new THREE.Mesh(
        new THREE.SphereGeometry(0.085, 8, 6),
        k % 2 === 0 ? leafMat : lightLeafMat
      );
      lf.position.set(sx + Math.cos(ang) * 0.12, 0.22 + k * 0.14, Math.sin(ang) * 0.12);
      postVines.add(lf);
      if (k % 2 === 1) {
        const fl = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.052, 0),
          new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.42 })
        );
        fl.position.set(sx + (sx < 0 ? 0.12 : -0.12), 0.26 + k * 0.14, 0.11);
        postVines.add(fl);
      }
    }
  }
  group.add(postVines);

  // Step 17: Plaza Starlight Beacon Lanterns (mounted cleanly atop flanking gateposts)
  const beaconLanterns = new THREE.Group();
  beaconLanterns.position.copy(gatepostsGroup.position);
  const beaconLamps: THREE.Mesh[] = [];
  for (const sx of [-1.05, 1.05]) {
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.12, 8), ironMat);
    neck.position.set(sx, 0.82, 0);
    beaconLanterns.add(neck);
    const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.105, 0), lanternGlowMat);
    lamp.position.set(sx, 0.96, 0);
    beaconLanterns.add(lamp);
    beaconLamps.push(lamp);
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.09, 8), ironMat);
    hood.position.set(sx, 1.07, 0);
    beaconLanterns.add(hood);
  }
  group.add(beaconLanterns);

  // Step 18: Glowing Moonstone Path Pebbles
  const moonstonePebbles = new THREE.Group();
  for (let i = 0; i < 14; i++) {
    const t = 0.06 + (i / 13) * 0.84;
    const { pt, right } = sampleFrame(t);
    const side = i % 2 === 0 ? -1 : 1;
    const peb = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 6), moonstoneMat);
    peb.scale.set(1.25, 0.55, 1.1);
    peb.position.set(pt.x + right.x * side * 0.35, 0.068, pt.z + right.z * side * 0.35);
    moonstonePebbles.add(peb);
  }
  group.add(moonstonePebbles);

  // Step 19: Twin Starlight Flower Planters flanking front plaza
  const flowerPlanters = new THREE.Group();
  for (const px of [-1.25, 1.35]) {
    const pz = 4.72;
    const urn = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.17, 0.34, 10), stoneMat);
    urn.position.set(px, 0.17, pz);
    urn.castShadow = true;
    flowerPlanters.add(urn);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.04, 8, 12), darkStoneMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(px, 0.34, pz);
    flowerPlanters.add(rim);
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), lightLeafMat);
    bush.position.set(px, 0.42, pz);
    flowerPlanters.add(bush);
    for (let b = 0; b < 3; b++) {
      const ang = (b / 3) * Math.PI * 2;
      const bl = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.075, 0),
        b === 0 ? starGoldMat : new THREE.MeshStandardMaterial({ color: 0x818cf8, roughness: 0.4 })
      );
      bl.position.set(px + Math.cos(ang) * 0.14, 0.58, pz + Math.sin(ang) * 0.14);
      flowerPlanters.add(bl);
    }
  }
  group.add(flowerPlanters);

  // Step 20: Floating Starlight Dust Ribbons
  const stardustGroup = new THREE.Group();
  const stardustOrbs: THREE.Mesh[] = [];
  for (let i = 0; i < 10; i++) {
    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), stardustMat);
    stardustGroup.add(orb);
    stardustOrbs.push(orb);
  }
  group.add(stardustGroup);

  let currentLvl = 0;
  const setLevel = (level: number) => {
    const lv = Math.max(0, Math.min(20, level));
    currentLvl = lv;
    gravelBed.visible = lv >= 1;
    thresholdStones.visible = lv >= 2;
    midStones.visible = lv >= 3;
    frontStones.visible = lv >= 4;
    plazaGroup.visible = lv >= 5;
    starInlays.visible = lv >= 6;
    leftCurb.visible = lv >= 7;
    rightCurb.visible = lv >= 8;
    edgingFlowers.visible = lv >= 9;
    leftPosts.visible = lv >= 10;
    rightPosts.visible = lv >= 11;
    lanternPairs.forEach((lp, idx) => {
      lp.visible = lv >= 12 + idx;
    });
    gatepostsGroup.visible = lv >= 15;
    postVines.visible = lv >= 16;
    beaconLanterns.visible = lv >= 17;
    moonstonePebbles.visible = lv >= 18;
    flowerPlanters.visible = lv >= 19;
    stardustGroup.visible = lv >= 20;
  };
  setLevel(0);

  return {
    group,
    setLevel,
    setAmbientGlow: (factor: number) => {
      lanternGlowMat.emissiveIntensity = 0.55 + factor * 1.45;
      starGoldMat.emissiveIntensity = 0.25 + factor * 0.9;
      moonstoneMat.emissiveIntensity = 0.4 + factor * 1.15;
      stardustMat.emissiveIntensity = 0.8 + factor * 1.45;
    },
    update: (elapsed) => {
      if (currentLvl >= 17) {
        for (let i = 0; i < beaconLamps.length; i++) {
          beaconLamps[i].rotation.y = elapsed * 0.9 + i * 1.5;
        }
      }
      if (currentLvl >= 20) {
        for (let i = 0; i < stardustOrbs.length; i++) {
          const orb = stardustOrbs[i];
          const t = (elapsed * 0.11 + i / stardustOrbs.length) % 1;
          const pt = curve.getPointAt(t);
          orb.position.set(
            pt.x + Math.sin(elapsed * 2.1 + i * 1.4) * 0.42,
            0.55 + Math.sin(elapsed * 2.6 + i * 0.9) * 0.25 + (t > 0.7 ? 0.35 : 0),
            pt.z + Math.cos(elapsed * 1.7 + i) * 0.15
          );
          orb.rotation.y = elapsed * 2.5 + i;
        }
      }
    },
  };
}
