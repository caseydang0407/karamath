import * as THREE from 'three';
import type { CharacterOutfitSelection } from '../game/types';
import type { ProceduralTextureSet } from './textures';

export function addContactShadow(
  parent: THREE.Object3D,
  shadowMap: THREE.Texture,
  radius: number,
  yOffset: number = 0.02
): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, 24);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: shadowMap,
    transparent: true,
    depthWrite: false,
    opacity: 0.7,
  });
  const disc = new THREE.Mesh(geo, mat);
  disc.position.y = yOffset;
  parent.add(disc);
  return disc;
}

export function createMeadowIsland(textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  group.name = 'MeadowIsland';

  // 1. Lush grassy upper meadow plateau (y top = 0)
  const topGeo = new THREE.CylinderGeometry(13.5, 13.8, 0.75, 48);
  const topMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.grassMap,
    bumpMap: textures.grassBump,
    bumpScale: 0.08,
    roughness: 0.88,
    metalness: 0.02,
  });
  const topMesh = new THREE.Mesh(topGeo, topMat);
  topMesh.position.y = -0.375;
  topMesh.receiveShadow = true;
  group.add(topMesh);

  // 2. Sculpted earth & rock floating island underside (tapered cliff layers)
  const earthMat = new THREE.MeshStandardMaterial({
    color: 0x9c6b43,
    roughness: 0.92,
    metalness: 0.04,
  });
  const midCliff = new THREE.Mesh(new THREE.CylinderGeometry(13.2, 9.6, 2.2, 24), earthMat);
  midCliff.position.y = -1.85;
  group.add(midCliff);

  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x7b6d62,
    roughness: 0.85,
    metalness: 0.08,
  });
  const lowerRock = new THREE.Mesh(new THREE.ConeGeometry(9.4, 4.8, 16), rockMat);
  lowerRock.rotation.x = Math.PI;
  lowerRock.position.y = -5.3;
  group.add(lowerRock);

  // 3. Colorful wildflowers scattered across the meadow
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const flowerGeo = new THREE.CylinderGeometry(0.14, 0.05, 0.12, 6);
  flowerGeo.translate(0, 0.26, 0);
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 });
  const flowerCount = 42;
  const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, flowerCount);
  const flowerColors = [0xff7eb6, 0xffd166, 0xfff3b0, 0xa78bfa, 0xfb7185];
  for (let i = 0; i < flowerCount; i++) {
    const angle = (i * 2.1 + 0.5) % (Math.PI * 2);
    const rad = 4.5 + ((i * 2.13) % 7.5);
    dummy.position.set(Math.cos(angle) * rad, 0, Math.sin(angle) * rad);
    dummy.rotation.set(0, angle, 0);
    const s = 0.85 + (i % 4) * 0.1;
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    flowers.setMatrixAt(i, dummy.matrix);
    color.setHex(flowerColors[i % flowerColors.length]);
    flowers.setColorAt(i, color);
  }
  flowers.instanceMatrix.needsUpdate = true;
  if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
  flowers.computeBoundingSphere();
  group.add(flowers);

  return group;
}

export interface CharacterHandle {
  group: THREE.Group;
  bodyGroup: THREE.Group;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  setLevel: (level: number) => void;
  setOutfitSelection: (selection: CharacterOutfitSelection) => void;
}

export function createKaraBunny(textures: ProceduralTextureSet): CharacterHandle {
  const root = new THREE.Group();
  root.name = 'KaraBunny';

  const shadowDisc = addContactShadow(root, textures.contactShadowMap, 0.85, 0.025);
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const cottonMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const furMat = new THREE.MeshStandardMaterial({ color: 0xfefcf9, roughness: 0.78 });
  const chestMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86 });
  const pinkMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.55 });
  const basketMat = new THREE.MeshStandardMaterial({ color: 0xc2854c, roughness: 0.84 });
  const blanketMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.78 });
  const tearMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.25,
    roughness: 0.15,
  });

  // Lv 0: Tiny white cotton ball sitting on meadow grass
  const cottonBall = new THREE.Group();
  const cMain = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 14), cottonMat);
  cMain.position.y = 0.26;
  cMain.castShadow = true;
  cottonBall.add(cMain);
  for (const [ox, oy, oz, r] of [
    [-0.14, 0.24, 0.12, 0.14],
    [0.14, 0.26, 0.1, 0.13],
    [0, 0.34, -0.1, 0.15],
  ]) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), cottonMat);
    puff.position.set(ox, oy, oz);
    cottonBall.add(puff);
  }
  root.add(cottonBall);

  // Lv 1–2: Woven fabric basket with soft blanket
  const fabricBasket = new THREE.Group();
  const bBase = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.52, 0.36, 18), basketMat);
  bBase.position.y = 0.18;
  bBase.castShadow = true;
  fabricBasket.add(bBase);
  const bRim = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.075, 10, 20), blanketMat);
  bRim.rotation.x = Math.PI / 2;
  bRim.position.y = 0.36;
  fabricBasket.add(bRim);
  const bPillow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), blanketMat);
  bPillow.scale.set(1.05, 0.32, 0.85);
  bPillow.position.y = 0.24;
  fabricBasket.add(bPillow);
  root.add(fabricBasket);

  // Bunny anatomy inside bunnyFigure (allows sitting, lying, standing & scaling)
  const bunnyFigure = new THREE.Group();
  bodyGroup.add(bunnyFigure);

  const torsoProfile = [
    new THREE.Vector2(0.01, 0.25),
    new THREE.Vector2(0.44, 0.34),
    new THREE.Vector2(0.48, 0.54),
    new THREE.Vector2(0.41, 0.78),
    new THREE.Vector2(0.3, 0.96),
    new THREE.Vector2(0.01, 1.02),
  ];
  const torso = new THREE.Mesh(new THREE.LatheGeometry(torsoProfile, 22), furMat);
  torso.castShadow = true;
  bunnyFigure.add(torso);

  const chestFluff = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), chestMat);
  chestFluff.scale.set(0.95, 1.12, 0.62);
  chestFluff.position.set(0, 0.66, 0.26);
  bunnyFigure.add(chestFluff);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 22, 18), furMat);
  head.scale.set(1.04, 0.95, 1.02);
  head.position.set(0, 1.24, 0.06);
  head.castShadow = true;
  bunnyFigure.add(head);

  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), chestMat);
  muzzle.scale.set(1.25, 0.82, 0.92);
  muzzle.position.set(0, 1.13, 0.37);
  bunnyFigure.add(muzzle);

  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), cottonMat);
  tail.position.set(0, 0.42, -0.48);
  bunnyFigure.add(tail);

  // Ears + Lv 12 Left Ear Bowtie + Lv 13 Right Ear Bowtie
  const makeEarBow = (colorHex: number): THREE.Group => {
    const bow = new THREE.Group();
    const bMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.42 });
    const leftLoop = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), bMat);
    leftLoop.scale.set(1.3, 0.8, 0.45);
    leftLoop.position.x = -0.09;
    bow.add(leftLoop);
    const rightLoop = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), bMat);
    rightLoop.scale.set(1.3, 0.8, 0.45);
    rightLoop.position.x = 0.09;
    bow.add(rightLoop);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), bMat);
    bow.add(knot);
    return bow;
  };

  let leftEarBow!: THREE.Group;
  let rightEarBow!: THREE.Group;
  for (const side of [-1, 1] as const) {
    const earGroup = new THREE.Group();
    earGroup.position.set(side * 0.24, 1.54, 0.02);
    earGroup.rotation.z = side * -0.24;
    const outerEar = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.46, 8, 12), furMat);
    outerEar.scale.set(1, 1, 0.68);
    outerEar.position.y = 0.25;
    outerEar.castShadow = true;
    earGroup.add(outerEar);
    const innerEar = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.34, 6, 10), pinkMat);
    innerEar.scale.set(1, 1, 0.5);
    innerEar.position.set(0, 0.24, 0.05);
    earGroup.add(innerEar);

    const bow = makeEarBow(0xf43f5e);
    bow.position.set(0, 0.36, 0.08);
    earGroup.add(bow);
    if (side === -1) leftEarBow = bow;
    else rightEarBow = bow;

    bunnyFigure.add(earGroup);
  }

  // Face details + crying tears (Lv 1)
  const irisMat = new THREE.MeshStandardMaterial({ color: 0x3f2314, roughness: 0.14 });
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const tearsGroup = new THREE.Group();
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), irisMat);
    eye.position.set(side * 0.17, 1.28, 0.41);
    bunnyFigure.add(eye);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), glintMat);
    glint.position.set(side * 0.17 + 0.02, 1.31, 0.47);
    bunnyFigure.add(glint);
    const cheek = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xfba0b6, roughness: 0.7 })
    );
    cheek.scale.set(1.15, 0.65, 0.4);
    cheek.position.set(side * 0.28, 1.15, 0.35);
    bunnyFigure.add(cheek);

    const tear = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), tearMat);
    tear.scale.set(0.7, 1.35, 0.7);
    tear.position.set(side * 0.17, 1.16, 0.45);
    tearsGroup.add(tear);
  }
  bunnyFigure.add(tearsGroup);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), pinkMat);
  nose.scale.set(1.25, 0.85, 0.85);
  nose.position.set(0, 1.19, 0.52);
  bunnyFigure.add(nose);

  // Lv 2: Baby Milk Bottle
  const milkBottle = new THREE.Group();
  milkBottle.position.set(0.1, 1.03, 0.58);
  milkBottle.rotation.x = -0.65;
  milkBottle.rotation.z = 0.25;
  const bottleBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.085, 0.26, 12),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 })
  );
  milkBottle.add(bottleBody);
  const bottleCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.05, 12),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4 })
  );
  bottleCollar.position.y = 0.14;
  milkBottle.add(bottleCollar);
  const nipple = new THREE.Mesh(
    new THREE.ConeGeometry(0.045, 0.08, 10),
    new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.5 })
  );
  nipple.position.y = 0.2;
  milkBottle.add(nipple);
  bunnyFigure.add(milkBottle);

  // Arms + Lv 9 Pink Sleeves + Lv 20 Working Black Suitcase on Left Hand
  const armGeo = new THREE.CapsuleGeometry(0.088, 0.24, 6, 10);
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.44, 0.84, 0.05);
  leftArm.rotation.z = -0.26;
  leftArm.add(new THREE.Mesh(armGeo, furMat));
  const leftPaw = new THREE.Mesh(new THREE.SphereGeometry(0.084, 10, 8), chestMat);
  leftPaw.position.y = -0.18;
  leftArm.add(leftPaw);
  bunnyFigure.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.44, 0.84, 0.05);
  rightArm.rotation.z = 0.26;
  rightArm.add(new THREE.Mesh(armGeo, furMat));
  const rightPaw = new THREE.Mesh(new THREE.SphereGeometry(0.084, 10, 8), chestMat);
  rightPaw.position.y = -0.18;
  rightArm.add(rightPaw);
  bunnyFigure.add(rightArm);

  const pinkShirtMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.58 });
  const leftSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.14, 0.19, 12), pinkShirtMat);
  leftSleeve.position.y = 0.04;
  leftArm.add(leftSleeve);
  const rightSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.14, 0.19, 12), pinkShirtMat);
  rightSleeve.position.y = 0.04;
  rightArm.add(rightSleeve);

  // Lv 20: Working Black Suitcase in Left Hand
  const suitcase = new THREE.Group();
  suitcase.position.set(-0.08, -0.34, 0.05);
  const caseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.38, metalness: 0.25 });
  const silverMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.88, roughness: 0.2 });
  const caseBox = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.3, 0.42), caseMat);
  caseBox.castShadow = true;
  suitcase.add(caseBox);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.018, 6, 12, Math.PI), silverMat);
  handle.position.set(0, 0.15, 0);
  suitcase.add(handle);
  for (const cz of [-0.12, 0.12]) {
    const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.04), silverMat);
    clasp.position.set(0, 0.12, cz);
    suitcase.add(clasp);
  }
  leftArm.add(suitcase);

  // Legs + Lv 14/15 Brown Socks + Lv 17/18 Pink Sneakers
  const makeLeg = (side: -1 | 1) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.2, 0.28, 0.04);
    const thigh = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), furMat);
    thigh.scale.set(0.95, 1.12, 1.05);
    leg.add(thigh);
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.08, 0.22, 10), furMat);
    shin.position.y = -0.14;
    leg.add(shin);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), chestMat);
    foot.scale.set(0.95, 0.5, 1.5);
    foot.position.set(0, -0.23, 0.09);
    leg.add(foot);

    const sock = new THREE.Mesh(
      new THREE.CylinderGeometry(0.098, 0.095, 0.19, 12),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.78 })
    );
    sock.position.y = -0.14;
    leg.add(sock);

    const sneaker = new THREE.Group();
    sneaker.position.set(0, -0.22, 0.06);
    const sole = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.055, 0.32),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })
    );
    sole.position.y = -0.02;
    sneaker.add(sole);
    const upper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.105, 0.115, 0.13, 12),
      new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.45 })
    );
    upper.position.set(0, 0.05, -0.03);
    sneaker.add(upper);
    const toeCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.105, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 })
    );
    toeCap.scale.set(1, 0.62, 1.12);
    toeCap.position.set(0, 0.035, 0.09);
    sneaker.add(toeCap);
    leg.add(sneaker);

    bunnyFigure.add(leg);
    return { leg, sock, sneaker };
  };
  const leftLegObj = makeLeg(-1);
  const rightLegObj = makeLeg(1);

  // Clothing layers:
  // Lv 6: Blue Undershirt
  const blueUndershirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.39, 0.47, 0.46, 20),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.72 })
  );
  blueUndershirt.position.set(0, 0.69, 0.01);
  bunnyFigure.add(blueUndershirt);

  // Lv 7: Pink Underwear
  const pinkUnderwear = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.36, 0.24, 20),
    new THREE.MeshStandardMaterial({ color: 0xf9a8d4, roughness: 0.72 })
  );
  pinkUnderwear.position.set(0, 0.35, 0.01);
  bunnyFigure.add(pinkUnderwear);

  // Lv 9: Pink Shirt
  const pinkShirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.41, 0.49, 0.48, 20),
    pinkShirtMat
  );
  pinkShirt.position.set(0, 0.69, 0.01);
  bunnyFigure.add(pinkShirt);

  // Lv 10: Buttons on Shirt
  const shirtButtons = new THREE.Group();
  const btnMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.3 });
  for (const by of [0.82, 0.69, 0.56]) {
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), btnMat);
    btn.scale.set(1, 1, 0.55);
    btn.position.set(0, by, 0.47);
    shirtButtons.add(btn);
  }
  bunnyFigure.add(shirtButtons);

  // Lv 11: Blue Skirt
  const blueSkirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.62, 0.34, 24),
    new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.65 })
  );
  blueSkirt.position.set(0, 0.36, 0.01);
  blueSkirt.castShadow = true;
  bunnyFigure.add(blueSkirt);

  // Lv 19: Little Pink Hat on Head
  const littlePinkHat = new THREE.Group();
  littlePinkHat.position.set(0, 1.56, 0.04);
  const hatBrim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.44, 0.47, 0.04, 20),
    new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.55 })
  );
  littlePinkHat.add(hatBrim);
  const hatCrown = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.28, 0.19, 18),
    new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.52 })
  );
  hatCrown.position.y = 0.1;
  littlePinkHat.add(hatCrown);
  const hatBand = new THREE.Mesh(
    new THREE.TorusGeometry(0.26, 0.028, 8, 18),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
  );
  hatBand.rotation.x = Math.PI / 2;
  hatBand.position.y = 0.03;
  littlePinkHat.add(hatBand);
  bunnyFigure.add(littlePinkHat);

  const setLevel = (level: number) => {
    const lv = Math.max(0, Math.min(20, level));
    cottonBall.visible = lv === 0;
    fabricBasket.visible = lv === 1 || lv === 2;
    bunnyFigure.visible = lv >= 1;
    shadowDisc.visible = lv >= 1;

    // Posture transitions (Lv 1-2 lying in basket, Lv 3 sitting, Lv 4+ standing)
    if (lv === 1 || lv === 2) {
      bunnyFigure.position.set(0, 0.34, 0.08);
      bunnyFigure.rotation.x = -0.92;
      bunnyFigure.scale.setScalar(0.68);
      leftLegObj.leg.rotation.x = -0.4;
      rightLegObj.leg.rotation.x = -0.4;
    } else if (lv === 3) {
      bunnyFigure.position.set(0, -0.08, 0);
      bunnyFigure.rotation.x = 0;
      bunnyFigure.scale.setScalar(0.75);
      leftLegObj.leg.rotation.x = -1.2;
      rightLegObj.leg.rotation.x = -1.2;
    } else if (lv >= 4) {
      bunnyFigure.position.set(0, 0, 0);
      bunnyFigure.rotation.x = 0;
      leftLegObj.leg.rotation.x = 0;
      rightLegObj.leg.rotation.x = 0;
      let s = 0.78;
      if (lv >= 5) s = 0.88;
      if (lv >= 8) s = 0.98;
      if (lv >= 16) s = 1.08;
      bunnyFigure.scale.setScalar(s);
    }

    tearsGroup.visible = lv === 1;
    milkBottle.visible = lv === 2;

    blueUndershirt.visible = lv >= 6 && lv < 9;
    pinkUnderwear.visible = lv >= 7 && lv < 11;
    pinkShirt.visible = lv >= 9;
    leftSleeve.visible = lv >= 9;
    rightSleeve.visible = lv >= 9;
    shirtButtons.visible = lv >= 10;
    blueSkirt.visible = lv >= 11;
    leftEarBow.visible = lv >= 12;
    rightEarBow.visible = lv >= 13;
    leftLegObj.sock.visible = lv >= 14;
    rightLegObj.sock.visible = lv >= 15;
    leftLegObj.sneaker.visible = lv >= 17;
    rightLegObj.sneaker.visible = lv >= 18;
    littlePinkHat.visible = lv >= 19;
    suitcase.visible = lv >= 20;
  };

  setLevel(0);

  return {
    group: root,
    bodyGroup,
    leftArm,
    rightArm,
    setLevel,
    setOutfitSelection: () => {},
  };
}

export function createKaitlynChick(textures: ProceduralTextureSet): CharacterHandle {
  const root = new THREE.Group();
  root.name = 'KaitlynChick';

  addContactShadow(root, textures.contactShadowMap, 0.82, 0.025);

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const strawMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.92 });
  const eggMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.35 });
  const crackMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
  const chickMat = new THREE.MeshStandardMaterial({ color: 0xfcd34d, roughness: 0.72 });
  const warmDownMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.76 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.8 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.45 });

  // Lv 1–5: Cozy Straw Nest
  const strawNest = new THREE.Group();
  const nestRing = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.14, 10, 20), strawMat);
  nestRing.rotation.x = Math.PI / 2;
  nestRing.position.y = 0.14;
  nestRing.castShadow = true;
  strawNest.add(nestRing);
  const nestBed = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.42, 0.12, 16), strawMat);
  nestBed.position.y = 0.06;
  strawNest.add(nestBed);
  root.add(strawNest);

  // Lv 2–5: Yellow Egg & Cracked Hatched Halves
  const wholeEggGroup = new THREE.Group();
  const eggMesh = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 14), eggMat);
  eggMesh.scale.set(0.88, 1.25, 0.88);
  eggMesh.position.y = 0.38;
  eggMesh.castShadow = true;
  wholeEggGroup.add(eggMesh);

  const crackLines = new THREE.Group();
  for (const [cx, cy, cz, rz] of [
    [0, 0.42, 0.24, 0.4],
    [0.12, 0.38, 0.21, -0.5],
    [-0.1, 0.45, 0.21, -0.45],
  ]) {
    const cStrip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.03), crackMat);
    cStrip.position.set(cx, cy, cz);
    cStrip.rotation.z = rz;
    crackLines.add(cStrip);
  }
  wholeEggGroup.add(crackLines);
  root.add(wholeEggGroup);

  const hatchedShell = new THREE.Group();
  const bottomShell = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 16, 12, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55),
    eggMat
  );
  bottomShell.scale.set(0.95, 1.15, 0.95);
  bottomShell.position.y = 0.36;
  hatchedShell.add(bottomShell);
  const topShellCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.44),
    eggMat
  );
  topShellCap.position.set(0.26, 0.35, 0.15);
  topShellCap.rotation.z = -0.8;
  hatchedShell.add(topShellCap);
  root.add(hatchedShell);

  // Lv 5: Baby Chick Head Peeking Out of Egg
  const peekingHead = new THREE.Group();
  peekingHead.position.set(0, 0.54, 0.02);
  const pHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), chickMat);
  peekingHead.add(pHead);
  const pBeak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 8), orangeMat);
  pBeak.rotation.x = Math.PI / 2;
  pBeak.position.set(0, -0.02, 0.24);
  peekingHead.add(pBeak);
  for (const s of [-1, 1]) {
    const pEye = new THREE.Mesh(
      new THREE.SphereGeometry(0.038, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x1e1b18 })
    );
    pEye.position.set(s * 0.09, 0.04, 0.19);
    peekingHead.add(pEye);
  }
  root.add(peekingHead);

  // Lv 6–21: Full Chick / Chicken Body
  const chickFigure = new THREE.Group();
  bodyGroup.add(chickFigure);

  const torsoProfile = [
    new THREE.Vector2(0.01, 0.26),
    new THREE.Vector2(0.44, 0.35),
    new THREE.Vector2(0.49, 0.56),
    new THREE.Vector2(0.41, 0.79),
    new THREE.Vector2(0.3, 0.96),
    new THREE.Vector2(0.01, 1.01),
  ];
  const torso = new THREE.Mesh(new THREE.LatheGeometry(torsoProfile, 22), chickMat);
  torso.castShadow = true;
  chickFigure.add(torso);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), bellyMat);
  belly.scale.set(0.92, 1.05, 0.55);
  belly.position.set(0, 0.62, 0.31);
  chickFigure.add(belly);

  for (const [tx, ty, rz] of [
    [-0.08, 0.46, 0.22],
    [0, 0.5, 0],
    [0.08, 0.46, -0.22],
  ]) {
    const tailFeather = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.26, 8), warmDownMat);
    tailFeather.position.set(tx, ty, -0.48);
    tailFeather.rotation.x = -1.15;
    tailFeather.rotation.z = rz;
    chickFigure.add(tailFeather);
  }

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.39, 22, 18), chickMat);
  head.position.set(0, 1.2, 0.04);
  head.castShadow = true;
  chickFigure.add(head);

  for (const [tx, rotZ, h] of [
    [-0.06, 0.28, 0.16],
    [0, 0, 0.22],
    [0.06, -0.28, 0.15],
  ]) {
    const feather = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, h, 4, 8), warmDownMat);
    feather.position.set(tx, 1.61, 0.02);
    feather.rotation.z = rotZ;
    chickFigure.add(feather);
  }

  const irisMat = new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.12 });
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), irisMat);
    eye.position.set(side * 0.16, 1.25, 0.38);
    chickFigure.add(eye);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), glintMat);
    glint.position.set(side * 0.16 + 0.02, 1.28, 0.44);
    chickFigure.add(glint);
    const cheek = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xfb7185, roughness: 0.7 })
    );
    cheek.scale.set(1.2, 0.7, 0.42);
    cheek.position.set(side * 0.27, 1.12, 0.33);
    chickFigure.add(cheek);
  }

  const upperBeak = new THREE.Mesh(new THREE.ConeGeometry(0.082, 0.18, 10), orangeMat);
  upperBeak.rotation.x = Math.PI / 2 + 0.12;
  upperBeak.position.set(0, 1.17, 0.47);
  chickFigure.add(upperBeak);
  const lowerBeak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.13, 10), orangeMat);
  lowerBeak.rotation.x = Math.PI / 2 - 0.15;
  lowerBeak.position.set(0, 1.12, 0.44);
  chickFigure.add(lowerBeak);

  // Lv 7: First Wriggling Worm in Beak
  const firstWorm = new THREE.Group();
  firstWorm.position.set(0.05, 1.13, 0.56);
  const wormMat = new THREE.MeshStandardMaterial({ color: 0xfb7185, roughness: 0.45 });
  for (let w = 0; w < 4; w++) {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), wormMat);
    seg.position.set(Math.sin(w * 1.1) * 0.045, -w * 0.055, w * 0.02);
    firstWorm.add(seg);
  }
  chickFigure.add(firstWorm);

  // Wings + Lv 12 Blue Shirt Sleeves + Lv 21 Garden Shovel in Left Hand
  const blueShirtMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.58 });
  const makeWing = (side: -1 | 1) => {
    const wing = new THREE.Group();
    wing.position.set(side * 0.46, 0.74, 0.02);
    wing.rotation.z = side * -0.32;
    const baseGeo = new THREE.SphereGeometry(0.17, 14, 12);
    baseGeo.scale(0.52, 1.15, 0.8);
    const wingBase = new THREE.Mesh(baseGeo, chickMat);
    wingBase.castShadow = true;
    wing.add(wingBase);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.135, 0.18, 12), blueShirtMat);
    sleeve.position.y = 0.06;
    wing.add(sleeve);
    chickFigure.add(wing);
    return { wing, sleeve };
  };
  const leftWingObj = makeWing(-1);
  const rightWingObj = makeWing(1);
  const leftArm = leftWingObj.wing;
  const rightArm = rightWingObj.wing;

  // Lv 21: Garden Shovel carried on Left Hand
  const shovel = new THREE.Group();
  shovel.position.set(-0.08, -0.18, 0.12);
  shovel.rotation.x = 0.3;
  const shovelShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.028, 0.78, 8),
    new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.72 })
  );
  shovelShaft.position.y = 0.08;
  shovel.add(shovelShaft);
  const shovelGrip = new THREE.Mesh(
    new THREE.TorusGeometry(0.055, 0.018, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.7 })
  );
  shovelGrip.position.y = 0.49;
  shovel.add(shovelGrip);
  const shovelBlade = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.24, 0.03),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.82, roughness: 0.25 })
  );
  shovelBlade.position.y = -0.36;
  shovel.add(shovelBlade);
  leftArm.add(shovel);

  // Legs + Lv 15/16 Blue Socks + Lv 18 White Sneaker / Lv 19 Chick Sneaker
  const makeChickLeg = (side: -1 | 1, sneakerColor: number) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.2, 0.28, 0.02);
    leg.add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), chickMat));
    const tarsus = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.038, 0.22, 8), orangeMat);
    tarsus.position.y = -0.14;
    leg.add(tarsus);
    for (const ang of [-0.35, 0, 0.35]) {
      const toe = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.13, 4, 6), orangeMat);
      toe.rotation.x = Math.PI / 2;
      toe.rotation.z = -ang;
      toe.position.set(Math.sin(ang) * 0.07, -0.24, 0.08);
      leg.add(toe);
    }

    const sock = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.07, 0.19, 12),
      new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.72 })
    );
    sock.position.y = -0.14;
    leg.add(sock);

    const sneaker = new THREE.Group();
    sneaker.position.set(0, -0.22, 0.06);
    sneaker.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.05, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65 })
      )
    );
    const upper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.105, 0.12, 12),
      new THREE.MeshStandardMaterial({ color: sneakerColor, roughness: 0.45 })
    );
    upper.position.set(0, 0.05, -0.02);
    sneaker.add(upper);
    leg.add(sneaker);

    chickFigure.add(leg);
    return { leg, sock, sneaker };
  };
  const leftLegObj = makeChickLeg(-1, 0xf8fafc); // White sneaker
  const rightLegObj = makeChickLeg(1, 0xfacc15); // Chick sneaker

  // Lv 9: White Undershirt
  const whiteUndershirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.39, 0.47, 0.46, 20),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.76 })
  );
  whiteUndershirt.position.set(0, 0.69, 0.01);
  chickFigure.add(whiteUndershirt);

  // Lv 10: Blue Underwear
  const blueUnderwear = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.36, 0.24, 20),
    new THREE.MeshStandardMaterial({ color: 0x60a5fa, roughness: 0.72 })
  );
  blueUnderwear.position.set(0, 0.35, 0.01);
  chickFigure.add(blueUnderwear);

  // Lv 12: Blue Shirt
  const blueShirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.41, 0.49, 0.48, 20),
    blueShirtMat
  );
  blueShirt.position.set(0, 0.69, 0.01);
  chickFigure.add(blueShirt);

  // Lv 13: White Bowtie on Shirt
  const whiteBowtie = new THREE.Group();
  whiteBowtie.position.set(0, 0.9, 0.38);
  const bowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
  for (const side of [-1, 1]) {
    const loop = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), bowMat);
    loop.scale.set(1.25, 0.75, 0.45);
    loop.position.x = side * 0.08;
    whiteBowtie.add(loop);
  }
  whiteBowtie.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), bowMat));
  chickFigure.add(whiteBowtie);

  // Lv 14: Pink Skirt
  const pinkSkirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.62, 0.34, 24),
    new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.62 })
  );
  pinkSkirt.position.set(0, 0.36, 0.01);
  pinkSkirt.castShadow = true;
  chickFigure.add(pinkSkirt);

  // Lv 20: Little Violet Cap on Head
  const violetCap = new THREE.Group();
  violetCap.position.set(0, 1.52, 0.04);
  const capMat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.5 });
  const capDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
    capMat
  );
  violetCap.add(capDome);
  const capVisor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.41, 0.43, 0.035, 16, 1, false, -0.75, 1.5),
    capMat
  );
  capVisor.position.set(0, 0.01, 0.12);
  violetCap.add(capVisor);
  chickFigure.add(violetCap);

  const setLevel = (level: number) => {
    const lv = Math.max(0, Math.min(20, level));
    root.visible = lv >= 1;
    if (lv === 0) return;

    strawNest.visible = lv >= 1 && lv <= 5;
    wholeEggGroup.visible = lv === 2 || lv === 3;
    crackLines.visible = lv === 3;
    hatchedShell.visible = lv === 4 || lv === 5;
    peekingHead.visible = lv === 5;
    chickFigure.visible = lv >= 6;

    if (lv >= 6) {
      let s = 0.72;
      if (lv >= 8) s = 0.84;
      if (lv >= 11) s = 0.96;
      if (lv >= 16) s = 1.08;
      chickFigure.scale.setScalar(s);
    }

    firstWorm.visible = lv === 7;
    whiteUndershirt.visible = lv >= 9 && lv < 12;
    blueUnderwear.visible = lv >= 10 && lv < 14;
    blueShirt.visible = lv >= 12;
    leftWingObj.sleeve.visible = lv >= 12;
    rightWingObj.sleeve.visible = lv >= 12;
    whiteBowtie.visible = lv >= 13;
    pinkSkirt.visible = lv >= 14;
    leftLegObj.sock.visible = lv >= 15;
    rightLegObj.sock.visible = lv >= 15;
    leftLegObj.sneaker.visible = lv >= 17;
    rightLegObj.sneaker.visible = lv >= 18;
    violetCap.visible = lv >= 19;
    shovel.visible = lv >= 20;
  };

  setLevel(0);

  return {
    group: root,
    bodyGroup,
    leftArm,
    rightArm,
    setLevel,
    setOutfitSelection: () => {},
  };
}

export interface FlyingBirdHandle {
  group: THREE.Group;
  body: THREE.Group;
  leftWing: THREE.Group;
  rightWing: THREE.Group;
  hitbox: THREE.Mesh;
}

export function createFlyingBird(birdIndex: number, bodyColorHex: number): FlyingBirdHandle {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  const plumageMat = new THREE.MeshStandardMaterial({ color: bodyColorHex, roughness: 0.6 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.72 });
  const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.1 });

  // Streamlined songbird body oriented along +X flight vector
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), plumageMat);
  torso.scale.set(1.45, 0.9, 0.9);
  body.add(torso);

  const breast = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), bellyMat);
  breast.position.set(0.06, -0.05, 0);
  breast.scale.set(1.15, 0.75, 0.8);
  body.add(breast);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), plumageMat);
  head.position.set(0.24, 0.08, 0);
  body.add(head);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.11, 8), beakMat);
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.38, 0.07, 0);
  body.add(beak);

  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), eyeMat);
    eye.position.set(0.29, 0.11, s * 0.09);
    body.add(eye);
  }

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.24, 6), plumageMat);
  tail.rotation.z = Math.PI / 2 + 0.15;
  tail.scale.set(1, 1, 0.4);
  tail.position.set(-0.3, 0.04, 0);
  body.add(tail);

  const wingGeo = new THREE.BoxGeometry(0.22, 0.025, 0.34);
  const leftWing = new THREE.Group();
  leftWing.position.set(0.02, 0.06, 0.11);
  const lwMesh = new THREE.Mesh(wingGeo, plumageMat);
  lwMesh.position.z = 0.16;
  leftWing.add(lwMesh);
  body.add(leftWing);

  const rightWing = new THREE.Group();
  rightWing.position.set(0.02, 0.06, -0.11);
  const rwMesh = new THREE.Mesh(wingGeo, plumageMat);
  rwMesh.position.z = -0.16;
  rightWing.add(rwMesh);
  body.add(rightWing);

  // Generous invisible hitbox on layer 1 for easy clicking while flying
  const hitbox = new THREE.Mesh(
    new THREE.SphereGeometry(0.75, 8, 8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitbox.layers.set(1);
  hitbox.userData.birdIndex = birdIndex;
  group.add(hitbox);

  return {
    group,
    body,
    leftWing,
    rightWing,
    hitbox,
  };
}

export interface UpgradeVisualHandle {
  group: THREE.Group;
  setLevel: (level: number) => void;
  update: (elapsed: number, dt: number) => void;
  setAmbientGlow?: (factor: number) => void;
}

interface OrchardTreeSpec {
  flowerHex: number;
  fruitHex: number;
  fruitShape: 'apple' | 'plum' | 'pear';
}

function buildFruitMesh(
  spec: OrchardTreeSpec,
  fruitMat: THREE.Material,
  stemMat: THREE.Material,
  radiusScale = 1
): THREE.Group {
  const fg = new THREE.Group();
  if (spec.fruitShape === 'pear') {
    const lower = new THREE.Mesh(new THREE.SphereGeometry(0.125 * radiusScale, 10, 8), fruitMat);
    lower.position.y = -0.02 * radiusScale;
    fg.add(lower);
    const upper = new THREE.Mesh(new THREE.SphereGeometry(0.088 * radiusScale, 10, 8), fruitMat);
    upper.scale.set(0.95, 1.35, 0.95);
    upper.position.y = 0.08 * radiusScale;
    fg.add(upper);
  } else if (spec.fruitShape === 'plum') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.125 * radiusScale, 10, 8), fruitMat);
    body.scale.set(0.9, 1.18, 0.9);
    fg.add(body);
  } else {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.135 * radiusScale, 10, 8), fruitMat);
    body.scale.set(1.05, 0.94, 1.05);
    fg.add(body);
  }
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.015 * radiusScale, 0.018 * radiusScale, 0.07 * radiusScale, 6), stemMat);
  st.position.y = 0.14 * radiusScale;
  fg.add(st);
  return fg;
}

function createProgressiveOrchardTree(
  spec: OrchardTreeSpec,
  textures: ProceduralTextureSet
): {
  group: THREE.Group;
  setStage: (stage: number) => void;
  setAmbientGlow?: (factor: number) => void;
  update: (elapsed: number) => void;
} {
  const group = new THREE.Group();
  addContactShadow(group, textures.contactShadowMap, 1.55, 0.025);

  const soilMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.95 });
  const soilRimMat = new THREE.MeshStandardMaterial({ color: 0x523218, roughness: 0.95 });
  const seedMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.42, metalness: 0.1 });
  const sproutMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.65 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.72 });
  const deepLeafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.76 });
  const barkMat = new THREE.MeshStandardMaterial({ color: 0x714424, roughness: 0.9 });
  const flowerMat = new THREE.MeshStandardMaterial({ color: spec.flowerHex, roughness: 0.42 });
  const flowerCenterMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.5 });
  const fruitMat = new THREE.MeshStandardMaterial({
    color: spec.fruitHex,
    roughness: 0.22,
    metalness: 0.08,
  });
  const basketMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.woodMap,
    roughness: 0.78,
  });

  // Stage 0+: Round brown dirt pad
  const dirtPad = new THREE.Group();
  const padDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.96, 0.12, 20), soilMat);
  padDisc.position.y = 0.06;
  padDisc.receiveShadow = true;
  dirtPad.add(padDisc);
  const padRim = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.08, 8, 20), soilRimMat);
  padRim.rotation.x = Math.PI / 2;
  padRim.position.y = 0.06;
  dirtPad.add(padRim);
  group.add(dirtPad);

  // Stage 1: Seed
  const stageSeed = new THREE.Group();
  const seedMound = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), soilRimMat);
  seedMound.scale.set(1.1, 0.45, 1.1);
  seedMound.position.y = 0.12;
  stageSeed.add(seedMound);
  const seedBody = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), seedMat);
  seedBody.scale.set(0.85, 1.35, 0.85);
  seedBody.position.y = 0.25;
  stageSeed.add(seedBody);
  group.add(stageSeed);

  // Stage 2: Sprout
  const stageSprout = new THREE.Group();
  const sStem = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.048, 0.44, 8), sproutMat);
  sStem.position.y = 0.28;
  stageSprout.add(sStem);
  for (const s of [-1, 1]) {
    const lf = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), sproutMat);
    lf.scale.set(1.4, 0.35, 0.75);
    lf.position.set(s * 0.14, 0.48, 0);
    lf.rotation.z = s * 0.38;
    stageSprout.add(lf);
  }
  group.add(stageSprout);

  // Stage 3: Sapling
  const stageSapling = new THREE.Group();
  const sapStem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.92, 8), barkMat);
  sapStem.position.y = 0.5;
  sapStem.castShadow = true;
  stageSapling.add(sapStem);
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2;
    const lf = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), leafMat);
    lf.scale.set(1.25, 0.45, 0.85);
    lf.position.set(Math.cos(ang) * 0.22, 0.78 + (i % 2) * 0.15, Math.sin(ang) * 0.22);
    lf.rotation.y = -ang;
    stageSapling.add(lf);
  }
  group.add(stageSapling);

  // Stage 4: Small tree
  const stageSmallTree = new THREE.Group();
  const stTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.15, 1.3, 10), barkMat);
  stTrunk.position.y = 0.68;
  stTrunk.castShadow = true;
  stageSmallTree.add(stTrunk);
  const stCrown = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 12), leafMat);
  stCrown.position.y = 1.48;
  stCrown.castShadow = true;
  stageSmallTree.add(stCrown);
  group.add(stageSmallTree);

  // Stage 5: Young tree
  const stageYoungTree = new THREE.Group();
  const ytTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 1.65, 10), barkMat);
  ytTrunk.position.y = 0.86;
  ytTrunk.castShadow = true;
  stageYoungTree.add(ytTrunk);
  for (const [bx, by, bz, br, mat] of [
    [0, 1.95, 0, 0.72, leafMat],
    [-0.48, 1.72, 0.22, 0.5, deepLeafMat],
    [0.48, 1.78, -0.18, 0.52, leafMat],
  ] as Array<[number, number, number, number, THREE.Material]>) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(br, 12, 10), mat);
    p.position.set(bx, by, bz);
    p.castShadow = true;
    stageYoungTree.add(p);
  }
  group.add(stageYoungTree);

  // Stage 6+: Medium tree (base) -> More branches (7) -> More leaves (8) -> Flowers/Fruits (9..14)
  const matureTree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 2.05, 12), barkMat);
  trunk.position.y = 1.05;
  trunk.castShadow = true;
  matureTree.add(trunk);

  for (let r = 0; r < 4; r++) {
    const ang = (r / 4) * Math.PI * 2 + 0.35;
    const root = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.13, 0.45, 8), barkMat);
    root.position.set(Math.cos(ang) * 0.26, 0.2, Math.sin(ang) * 0.26);
    root.rotation.z = -Math.cos(ang) * 0.55;
    root.rotation.x = Math.sin(ang) * 0.55;
    matureTree.add(root);
  }

  for (const [cx, cy, cz, cr, mat] of [
    [0, 2.45, 0, 0.98, leafMat],
    [-0.68, 2.15, 0.32, 0.68, deepLeafMat],
    [0.7, 2.2, -0.3, 0.7, leafMat],
    [0.08, 2.22, 0.64, 0.65, deepLeafMat],
  ] as Array<[number, number, number, number, THREE.Material]>) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(cr, 14, 12), mat);
    p.position.set(cx, cy, cz);
    p.castShadow = true;
    matureTree.add(p);
  }

  // Stage 7+: More branches
  const extraBranches = new THREE.Group();
  for (const [ang, tilt, len, by] of [
    [0.3, 0.68, 1.05, 1.65],
    [2.4, 0.72, 1.0, 1.72],
    [4.4, 0.65, 1.05, 1.62],
  ]) {
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.11, len, 8), barkMat);
    br.position.set(Math.cos(ang) * 0.44, by, Math.sin(ang) * 0.44);
    br.rotation.z = -Math.cos(ang) * tilt;
    br.rotation.x = Math.sin(ang) * tilt;
    br.castShadow = true;
    extraBranches.add(br);
  }
  matureTree.add(extraBranches);

  // Stage 8+: More leaves
  const extraLeaves = new THREE.Group();
  for (const [cx, cy, cz, cr, mat] of [
    [-0.22, 3.02, -0.15, 0.74, leafMat],
    [0.38, 2.92, 0.32, 0.68, deepLeafMat],
    [-0.08, 2.38, -0.74, 0.72, leafMat],
    [0.85, 2.55, 0.25, 0.62, deepLeafMat],
    [-0.88, 2.48, -0.18, 0.62, leafMat],
  ] as Array<[number, number, number, number, THREE.Material]>) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(cr, 14, 12), mat);
    p.position.set(cx, cy, cz);
    p.castShadow = true;
    extraLeaves.add(p);
  }
  matureTree.add(extraLeaves);

  // Stage 9-11: 12 canopy blossom/fruit nodes (half swap at Stage 10, all swap at Stage 11+)
  const canopyNodeCoords: Array<[number, number, number]> = [
    [-0.78, 2.15, 0.82],
    [0.65, 2.48, 0.75],
    [0.05, 1.98, 1.02],
    [-0.98, 2.45, -0.12],
    [0.92, 2.25, 0.36],
    [-0.36, 2.9, 0.78],
    [0.42, 3.05, -0.32],
    [-0.58, 2.65, -0.72],
    [0.22, 2.62, 0.92],
    [0.98, 2.6, -0.35],
    [-0.82, 2.78, 0.32],
    [0.12, 3.22, 0.28],
  ];
  const flowerNodes: THREE.Group[] = [];
  const fruitNodes: THREE.Group[] = [];
  for (const [nx, ny, nz] of canopyNodeCoords) {
    const fl = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.DodecahedronGeometry(0.115, 0), flowerMat);
    fl.add(outer);
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), flowerCenterMat);
    center.position.z = 0.07;
    fl.add(center);
    fl.position.set(nx, ny, nz);
    matureTree.add(fl);
    flowerNodes.push(fl);

    const fr = buildFruitMesh(spec, fruitMat, barkMat, 1);
    fr.position.set(nx, ny, nz);
    fr.castShadow = true;
    matureTree.add(fr);
    fruitNodes.push(fr);
  }

  // Stage 12+: 1 fruit dropped to the ground
  const droppedFruit = buildFruitMesh(spec, fruitMat, barkMat, 1.08);
  droppedFruit.position.set(-0.56, 0.22, 0.62);
  droppedFruit.rotation.z = 0.42;
  droppedFruit.castShadow = true;
  group.add(droppedFruit);

  // Stage 13+: Basket of fruit next to trunk
  const basketGroup = new THREE.Group();
  basketGroup.position.set(0.84, 0, 0.56);
  const basketBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.26, 0.36, 12),
    basketMat
  );
  basketBody.position.y = 0.22;
  basketBody.castShadow = true;
  basketGroup.add(basketBody);
  const basketRim = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.045, 8, 16), barkMat);
  basketRim.rotation.x = Math.PI / 2;
  basketRim.position.y = 0.4;
  basketGroup.add(basketRim);
  for (const [bx, by, bz] of [
    [-0.11, 0.42, 0.09],
    [0.12, 0.42, -0.06],
    [0.01, 0.48, 0.02],
    [-0.08, 0.41, -0.1],
    [0.11, 0.41, 0.09],
  ]) {
    const bf = buildFruitMesh(spec, fruitMat, barkMat, 0.78);
    bf.position.set(bx, by, bz);
    basketGroup.add(bf);
  }
  group.add(basketGroup);

  // Stage 14: Wild flowers around the trunk
  const wildFlowers = new THREE.Group();
  const wfColors = [0xf43f5e, 0xfbbf24, 0xa855f7, 0x38bdf8, 0xfb7185, 0xffffff, 0xf97316];
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + 0.25;
    const rad = 0.58 + (i % 2) * 0.16;
    const fx = Math.cos(ang) * rad;
    const fz = Math.sin(ang) * rad;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.26, 6), sproutMat);
    stem.position.set(fx, 0.2, fz);
    wildFlowers.add(stem);
    const petal = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.085, 0),
      new THREE.MeshStandardMaterial({ color: wfColors[i % wfColors.length], roughness: 0.45 })
    );
    petal.position.set(fx, 0.34, fz);
    wildFlowers.add(petal);
  }
  group.add(wildFlowers);

  // Stage 15: Wooden Tree Guard & Garden Fence Ring around dirt pad
  const treeGuard = new THREE.Group();
  const guardRadius = 1.08;
  const guardPosts: THREE.Vector3[] = [];
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + 0.18;
    const px = Math.cos(ang) * guardRadius;
    const pz = Math.sin(ang) * guardRadius;
    guardPosts.push(new THREE.Vector3(px, 0.24, pz));
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.48, 8), basketMat);
    post.position.set(px, 0.24, pz);
    post.castShadow = true;
    treeGuard.add(post);
  }
  for (let i = 0; i < 7; i++) {
    // Leave small gap at front-right for basket access
    if (i === 1) continue;
    const a = guardPosts[i];
    const b = guardPosts[(i + 1) % 8];
    const len = a.distanceTo(b);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.05, len), basketMat);
    rail.position.set(mid.x, 0.34, mid.z);
    rail.lookAt(b.x, 0.34, b.z);
    treeGuard.add(rail);
  }
  group.add(treeGuard);

  // Stage 16: Wooden Orchard Harvest Ladder leaning on the tree
  const ladderGroup = new THREE.Group();
  ladderGroup.position.set(-0.62, 0, -0.32);
  ladderGroup.rotation.y = 0.45;
  ladderGroup.rotation.z = -0.26;
  for (const lx of [-0.17, 0.17]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 1.85, 8), basketMat);
    rail.position.set(lx, 0.92, 0);
    rail.castShadow = true;
    ladderGroup.add(rail);
  }
  for (let r = 0; r < 5; r++) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.36, 6), basketMat);
    rung.rotation.z = Math.PI / 2;
    rung.position.set(0, 0.32 + r * 0.32, 0);
    ladderGroup.add(rung);
  }
  group.add(ladderGroup);

  // Stage 17: Second Harvest Crate Full of Apples (placed cleanly outside the fence guard)
  const appleCrate = new THREE.Group();
  appleCrate.position.set(-1.32, 0, 0.72);
  appleCrate.rotation.y = 0.36;
  const crateBox = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.32, 0.42), basketMat);
  crateBox.position.y = 0.16;
  crateBox.castShadow = true;
  appleCrate.add(crateBox);
  for (const [ax, ay, az] of [
    [-0.14, 0.35, -0.06],
    [0.02, 0.36, 0.05],
    [0.15, 0.35, -0.04],
    [-0.06, 0.36, 0.09],
    [0.09, 0.42, 0.01],
  ]) {
    const cf = buildFruitMesh(spec, fruitMat, barkMat, 0.72);
    cf.position.set(ax, ay, az);
    appleCrate.add(cf);
  }
  group.add(appleCrate);

  // Stage 18: Cozy Hanging Wooden Birdhouse
  const birdhouse = new THREE.Group();
  birdhouse.position.set(-0.74, 1.78, 0.42);
  const bhCord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.24, 6), barkMat);
  bhCord.position.y = 0.12;
  birdhouse.add(bhCord);
  const bhBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.26, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.68 })
  );
  bhBody.castShadow = true;
  birdhouse.add(bhBody);
  const bhRoof = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.16, 4),
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.55 })
  );
  bhRoof.rotation.y = Math.PI / 4;
  bhRoof.position.y = 0.2;
  birdhouse.add(bhRoof);
  const bhHole = new THREE.Mesh(
    new THREE.CircleGeometry(0.045, 10),
    new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.9 })
  );
  bhHole.position.set(0, 0.02, 0.115);
  birdhouse.add(bhHole);
  group.add(birdhouse);

  // Stage 19: Playful Tire Swing on Sturdy Right Branch
  const swingBranch = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.09, 1.15, 8), barkMat);
  swingBranch.position.set(0.62, 1.88, 0.05);
  swingBranch.rotation.z = -1.15;
  swingBranch.castShadow = true;
  group.add(swingBranch);

  const tireSwing = new THREE.Group();
  tireSwing.position.set(1.06, 1.98, 0.05);
  const swingRopeMat = new THREE.MeshStandardMaterial({ color: 0xd6b57c, roughness: 0.9 });
  const swingRope = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.18, 6), swingRopeMat);
  swingRope.position.y = -0.59;
  tireSwing.add(swingRope);
  const tire = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.075, 10, 18),
    new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.78 })
  );
  tire.position.y = -1.24;
  tire.castShadow = true;
  tireSwing.add(tire);
  group.add(tireSwing);

  // Stage 20: Branch String Lantern & Golden Firefly Halo
  const orchardLanternMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.85,
    roughness: 0.2,
  });
  const branchLanternGroup = new THREE.Group();
  branchLanternGroup.position.set(0.66, 1.85, 0.42);
  const blCord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 6), barkMat);
  blCord.position.y = -0.11;
  branchLanternGroup.add(blCord);
  const blLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.075, 0.18, 8), orchardLanternMat);
  blLamp.position.y = -0.28;
  branchLanternGroup.add(blLamp);
  group.add(branchLanternGroup);

  const orchardFireflyMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfacc15,
    emissiveIntensity: 1.2,
    roughness: 0.15,
  });
  const orchardFireflies: THREE.Mesh[] = [];
  const fireflyOrbitGroup = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 6), orchardFireflyMat);
    fireflyOrbitGroup.add(orb);
    orchardFireflies.push(orb);
  }
  group.add(fireflyOrbitGroup);

  group.add(matureTree);

  let currentStage = 0;
  const setStage = (stage: number) => {
    currentStage = stage;
    dirtPad.visible = stage >= 0;
    stageSeed.visible = stage === 1;
    stageSprout.visible = stage === 2;
    stageSapling.visible = stage === 3;
    stageSmallTree.visible = stage === 4;
    stageYoungTree.visible = stage === 5;
    matureTree.visible = stage >= 6;
    extraBranches.visible = stage >= 7;
    extraLeaves.visible = stage >= 8;

    for (let i = 0; i < canopyNodeCoords.length; i++) {
      if (stage === 9) {
        flowerNodes[i].visible = true;
        fruitNodes[i].visible = false;
      } else if (stage === 10) {
        const turnedToFruit = i % 2 === 0;
        flowerNodes[i].visible = !turnedToFruit;
        fruitNodes[i].visible = turnedToFruit;
      } else if (stage >= 11) {
        flowerNodes[i].visible = false;
        fruitNodes[i].visible = true;
      } else {
        flowerNodes[i].visible = false;
        fruitNodes[i].visible = false;
      }
    }

    droppedFruit.visible = stage >= 12;
    basketGroup.visible = stage >= 13;
    wildFlowers.visible = stage >= 14;
    treeGuard.visible = stage >= 15;
    ladderGroup.visible = stage >= 16;
    appleCrate.visible = stage >= 17;
    birdhouse.visible = stage >= 18;
    swingBranch.visible = stage >= 19;
    tireSwing.visible = stage >= 19;
    branchLanternGroup.visible = stage >= 20;
    fireflyOrbitGroup.visible = stage >= 20;
  };
  setStage(0);

  return {
    group,
    setStage,
    setAmbientGlow: (factor: number) => {
      orchardLanternMat.emissiveIntensity = 0.55 + factor * 1.45;
      orchardFireflyMat.emissiveIntensity = 0.8 + factor * 1.4;
    },
    update: (elapsed) => {
      const sway = Math.sin(elapsed * 1.35) * 0.028;
      if (currentStage === 2) stageSprout.rotation.z = sway * 1.5;
      else if (currentStage === 3) stageSapling.rotation.z = sway * 1.3;
      else if (currentStage === 4) stageSmallTree.rotation.z = sway * 0.9;
      else if (currentStage === 5) stageYoungTree.rotation.z = sway * 0.7;
      else if (currentStage >= 6) matureTree.rotation.z = sway * 0.4;

      if (currentStage >= 18) {
        birdhouse.rotation.z = Math.sin(elapsed * 1.9 + 0.4) * 0.06;
      }
      if (currentStage >= 19) {
        tireSwing.rotation.z = Math.sin(elapsed * 1.65) * 0.14;
      }
      if (currentStage >= 20) {
        branchLanternGroup.rotation.z = Math.sin(elapsed * 2.2) * 0.08;
        orchardFireflies.forEach((orb, i) => {
          const ang = elapsed * 1.2 + i * ((Math.PI * 2) / 6);
          orb.position.set(
            Math.cos(ang) * 1.25,
            1.7 + Math.sin(elapsed * 2.5 + i) * 0.45,
            Math.sin(ang) * 1.25
          );
        });
      }
    },
  };
}

export function createOrchardGroup(textures: ProceduralTextureSet): UpgradeVisualHandle {
  const group = new THREE.Group();
  group.name = 'SunbeamOrchardApple';

  const appleTree = createProgressiveOrchardTree(
    { flowerHex: 0xffffff, fruitHex: 0xef4444, fruitShape: 'apple' },
    textures
  );
  group.add(appleTree.group);

  const setLevel = (level: number) => {
    const lvl = Math.max(0, Math.min(20, level));
    appleTree.setStage(lvl);
  };
  setLevel(0);

  return {
    group,
    setLevel,
    setAmbientGlow: (factor: number) => {
      appleTree.setAmbientGlow?.(factor);
    },
    update: (elapsed) => {
      appleTree.update(elapsed);
    },
  };
}

export function createNetherlandsWindmillGroup(textures: ProceduralTextureSet): UpgradeVisualHandle {
  const group = new THREE.Group();
  group.name = 'SkySpinnerWindmill';
  const contactShadow = addContactShadow(group, textures.contactShadowMap, 2.15, 0.025);

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.stoneMap,
    bumpMap: textures.stoneBump,
    bumpScale: 0.05,
    roughness: 0.88,
  });
  const brickMat = new THREE.MeshStandardMaterial({
    color: 0xb93829,
    map: textures.stoneMap,
    roughness: 0.82,
  });
  const smockMat = new THREE.MeshStandardMaterial({
    color: 0x166534,
    map: textures.woodMap,
    roughness: 0.68,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.woodMap,
    roughness: 0.72,
  });
  const creamTrimMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    roughness: 0.48,
  });
  const thatchMat = new THREE.MeshStandardMaterial({
    color: 0x85582f,
    map: textures.woodMap,
    roughness: 0.94,
  });
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.35,
    metalness: 0.78,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.22,
    metalness: 0.88,
  });
  const windowGlassMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    emissive: 0xffb703,
    emissiveIntensity: 0.15,
    roughness: 0.2,
    metalness: 0.15,
  });
  const canvasMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    roughness: 0.56,
    side: THREE.DoubleSide,
  });

  // Step 1: Brick & Stone Foundation Pad
  const foundationGroup = new THREE.Group();
  const basePlinth = new THREE.Mesh(new THREE.CylinderGeometry(1.48, 1.62, 0.34, 8), stoneMat);
  basePlinth.position.y = 0.17;
  basePlinth.castShadow = true;
  basePlinth.receiveShadow = true;
  foundationGroup.add(basePlinth);
  const frontStep = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.22, 0.58), stoneMat);
  frontStep.position.set(0, 0.11, 1.56);
  frontStep.receiveShadow = true;
  foundationGroup.add(frontStep);
  group.add(foundationGroup);

  // Step 2: Octagonal Stone Base Wall
  const stoneBaseWall = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.42, 0.86, 8), stoneMat);
  stoneBaseWall.position.y = 0.77;
  stoneBaseWall.castShadow = true;
  stoneBaseWall.receiveShadow = true;
  group.add(stoneBaseWall);

  // Step 3: Red Brick Lower Tower
  const brickTower = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.28, 1.24, 8), brickMat);
  brickTower.position.y = 1.82;
  brickTower.castShadow = true;
  brickTower.receiveShadow = true;
  group.add(brickTower);

  // Step 4: Tapered Timber Smock Body (rises to y = 4.78)
  const smockGroup = new THREE.Group();
  const smockBody = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 1.12, 2.34, 8), smockMat);
  smockBody.position.y = 3.61;
  smockBody.castShadow = true;
  smockBody.receiveShadow = true;
  smockGroup.add(smockBody);
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const batten = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.36, 0.08), creamTrimMat);
    batten.position.set(Math.cos(ang) * 0.93, 3.61, Math.sin(ang) * 0.93);
    batten.rotation.y = -ang;
    smockGroup.add(batten);
  }
  group.add(smockGroup);

  // Step 5: Arched Wooden Mill Door
  const doorGroup = new THREE.Group();
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.18, 0.14), creamTrimMat);
  doorFrame.position.set(0, 0.86, 1.26);
  doorGroup.add(doorFrame);
  const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.56, 1.06, 0.16), woodMat);
  doorLeaf.position.set(0, 0.82, 1.28);
  doorGroup.add(doorLeaf);
  const doorArch = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.16, 12, 1, false, 0, Math.PI),
    woodMat
  );
  doorArch.rotation.x = Math.PI / 2;
  doorArch.rotation.z = -Math.PI / 2;
  doorArch.position.set(0, 1.35, 1.28);
  doorGroup.add(doorArch);
  const doorHandle = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), brassMat);
  doorHandle.position.set(0.18, 0.84, 1.38);
  doorGroup.add(doorHandle);
  group.add(doorGroup);

  // Step 6: Tower Lattice Windows
  const windowsGroup = new THREE.Group();
  for (const [wx, wy, wz, ry] of [
    [0, 1.85, 1.16, 0],
    [0, 3.65, 0.88, 0],
    [-0.86, 3.65, 0.22, -Math.PI / 2.2],
    [0.86, 3.65, 0.22, Math.PI / 2.2],
  ] as Array<[number, number, number, number]>) {
    const wg = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.56, 0.1), creamTrimMat);
    wg.add(frame);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.12), windowGlassMat);
    wg.add(pane);
    const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.44, 0.13), creamTrimMat);
    wg.add(mullionV);
    const mullionH = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.13), creamTrimMat);
    wg.add(mullionH);
    wg.position.set(wx, wy, wz);
    wg.rotation.y = ry;
    windowsGroup.add(wg);
  }
  group.add(windowsGroup);

  // Step 7: Wooden Gallery Deck Ring
  const galleryDeck = new THREE.Mesh(new THREE.CylinderGeometry(1.74, 1.74, 0.14, 8), woodMat);
  galleryDeck.position.y = 2.44;
  galleryDeck.castShadow = true;
  galleryDeck.receiveShadow = true;
  group.add(galleryDeck);

  // Step 8: Gallery Railing & Support Braces
  const galleryRailGroup = new THREE.Group();
  const railRadius = 1.66;
  const cornerPts: THREE.Vector3[] = [];
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const px = Math.cos(ang) * railRadius;
    const pz = Math.sin(ang) * railRadius;
    cornerPts.push(new THREE.Vector3(px, 2.95, pz));

    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.54, 0.08), creamTrimMat);
    post.position.set(px, 2.72, pz);
    galleryRailGroup.add(post);

    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.85, 0.09), woodMat);
    brace.position.set(Math.cos(ang) * 1.38, 2.08, Math.sin(ang) * 1.38);
    brace.rotation.z = Math.cos(ang) * 0.52;
    brace.rotation.x = -Math.sin(ang) * 0.52;
    galleryRailGroup.add(brace);
  }
  for (let i = 0; i < 8; i++) {
    const a = cornerPts[i];
    const b = cornerPts[(i + 1) % 8];
    const len = a.distanceTo(b);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    for (const ry of [2.95, 2.72]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.06, len), creamTrimMat);
      rail.position.set(mid.x, ry, mid.z);
      rail.lookAt(b.x, ry, b.z);
      galleryRailGroup.add(rail);
    }
  }
  group.add(galleryRailGroup);

  // Step 9: Upper Cap Bearing Collar
  const capCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.84, 0.18, 12), creamTrimMat);
  capCollar.position.y = 4.82;
  group.add(capCollar);

  // Step 10: Thatched Dome Windmill Cap
  const capGroup = new THREE.Group();
  const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.88, 14, 10), thatchMat);
  capDome.scale.set(1, 0.88, 1.24);
  capDome.position.set(0, 5.18, 0);
  capDome.castShadow = true;
  capGroup.add(capDome);
  const capFinial = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 8), brassMat);
  capFinial.position.set(0, 5.98, 0);
  capGroup.add(capFinial);
  group.add(capGroup);

  // Step 11: Rear Tailpole & Turning Beam
  const tailpoleGroup = new THREE.Group();
  const mainPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.085, 2.45, 8), creamTrimMat);
  mainPole.position.set(0, 4.18, -1.35);
  mainPole.rotation.x = 0.68;
  tailpoleGroup.add(mainPole);
  for (const sx of [-0.55, 0.55]) {
    const sideStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.55, 6), woodMat);
    sideStrut.position.set(sx, 3.85, -1.25);
    sideStrut.rotation.x = 0.68;
    sideStrut.rotation.z = sx < 0 ? -0.35 : 0.35;
    tailpoleGroup.add(sideStrut);
  }
  group.add(tailpoleGroup);

  // Step 12..20: Rotating Windshaft, Brass Hub, 4 Lattice Spars, and 4 White Canvas Sails
  const rotorGroup = new THREE.Group();
  rotorGroup.position.set(0, 5.18, 0.96);
  rotorGroup.rotation.x = -0.1;

  const windshaft = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.72, 12), woodMat);
  windshaft.rotation.x = Math.PI / 2;
  windshaft.position.z = -0.12;
  rotorGroup.add(windshaft);

  const hubCap = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), brassMat);
  hubCap.position.z = 0.24;
  rotorGroup.add(hubCap);

  const spars: THREE.Group[] = [];
  const canvasSails: THREE.Mesh[] = [];
  // Order: Top (+Y), Bottom (-Y), Left (-X), Right (+X)
  const armAngles = [0, Math.PI, Math.PI / 2, -Math.PI / 2];

  for (let i = 0; i < 4; i++) {
    const armHolder = new THREE.Group();
    armHolder.rotation.z = armAngles[i];
    armHolder.position.z = 0.1;

    const sparGroup = new THREE.Group();
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.52, 0.08), creamTrimMat);
    stock.position.y = 1.32;
    stock.castShadow = true;
    sparGroup.add(stock);

    // Lattice frame rails & cross bars
    const outerRail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.98, 0.04), woodMat);
    outerRail.position.set(0.42, 1.52, 0.02);
    sparGroup.add(outerRail);

    for (let r = 0; r < 6; r++) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.035, 0.035), woodMat);
      rung.position.set(0.21, 0.65 + r * 0.34, 0.02);
      sparGroup.add(rung);
    }
    armHolder.add(sparGroup);
    spars.push(sparGroup);

    const canvasMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1.9, 0.02), canvasMat);
    canvasMesh.position.set(0.23, 1.52, 0.045);
    canvasMesh.castShadow = true;
    armHolder.add(canvasMesh);
    canvasSails.push(canvasMesh);

    rotorGroup.add(armHolder);
  }
  group.add(rotorGroup);

  // Step 20 extra accent: Two Dutch Tulip Planters flanking the entrance
  const tulipPlanters = new THREE.Group();
  const tulipColors = [0xef4444, 0xfbbf24, 0xf97316, 0xf43f5e];
  for (const px of [-0.92, 0.92]) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.24, 0.32), woodMat);
    box.position.set(px, 0.12, 1.48);
    box.castShadow = true;
    tulipPlanters.add(box);
    for (let t = -1; t <= 1; t++) {
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.024, 0.22, 6),
        new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.7 })
      );
      stem.position.set(px + t * 0.14, 0.32, 1.48);
      tulipPlanters.add(stem);
      const bloom = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.075, 0),
        new THREE.MeshStandardMaterial({
          color: tulipColors[Math.abs(t + (px > 0 ? 1 : 0)) % tulipColors.length],
          roughness: 0.42,
        })
      );
      bloom.position.set(px + t * 0.14, 0.44, 1.48);
      tulipPlanters.add(bloom);
    }
  }
  group.add(tulipPlanters);

  let currentLvl = 0;
  const setLevel = (level: number) => {
    const lv = Math.max(0, Math.min(20, level));
    currentLvl = lv;
    contactShadow.visible = lv >= 1;
    foundationGroup.visible = lv >= 1;
    stoneBaseWall.visible = lv >= 2;
    brickTower.visible = lv >= 3;
    smockGroup.visible = lv >= 4;
    doorGroup.visible = lv >= 5;
    windowsGroup.visible = lv >= 6;
    galleryDeck.visible = lv >= 7;
    galleryRailGroup.visible = lv >= 8;
    capCollar.visible = lv >= 9;
    capGroup.visible = lv >= 10;
    tailpoleGroup.visible = lv >= 11;
    rotorGroup.visible = lv >= 12;
    spars.forEach((sp, idx) => {
      sp.visible = lv >= 13 + idx;
    });
    canvasSails.forEach((cs, idx) => {
      cs.visible = lv >= 17 + idx;
    });
    tulipPlanters.visible = lv >= 20;
  };
  setLevel(0);

  return {
    group,
    setLevel,
    setAmbientGlow: (factor: number) => {
      windowGlassMat.emissiveIntensity = 0.15 + factor * 1.1;
    },
    update: (_elapsed, dt) => {
      if (currentLvl >= 13) {
        const activeSails = Math.max(0, currentLvl - 16);
        const speed = 0.55 + activeSails * 0.25;
        rotorGroup.rotation.z -= dt * speed;
      }
    },
  };
}

export function createLanternPergolaGroup(textures: ProceduralTextureSet): UpgradeVisualHandle {
  const group = new THREE.Group();
  group.name = 'FireflyPergola20';
  const contactShadow = addContactShadow(group, textures.contactShadowMap, 1.95, 0.025);

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.stoneMap,
    bumpMap: textures.stoneBump,
    bumpScale: 0.04,
    roughness: 0.86,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.woodMap,
    roughness: 0.72,
  });
  const darkWoodMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    map: textures.woodMap,
    roughness: 0.76,
  });
  const vineMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.78 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.72 });
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.85,
    roughness: 0.2,
  });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.42, metalness: 0.55 });
  const fireflyMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfacc15,
    emissiveIntensity: 1.25,
    roughness: 0.15,
  });

  const postCoords: Array<[number, number]> = [
    [-1.12, 0.74],  // Front Left (Lv 2)
    [1.12, 0.74],   // Front Right (Lv 3)
    [-1.12, -0.74], // Back Left (Lv 4)
    [1.12, -0.74],  // Back Right (Lv 5)
  ];

  // Step 1: Four Stone Post Pads
  const stonePads = new THREE.Group();
  for (const [px, pz] of postCoords) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.38), stoneMat);
    pad.position.set(px, 0.08, pz);
    pad.receiveShadow = true;
    stonePads.add(pad);
  }
  group.add(stonePads);

  // Step 2..5: Four Timber Posts one by one
  const posts: THREE.Group[] = postCoords.map(([px, pz]) => {
    const pg = new THREE.Group();
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.34, 0.18), woodMat);
    beam.position.set(px, 1.28, pz);
    beam.castShadow = true;
    pg.add(beam);
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.24), darkWoodMat);
    collar.position.set(px, 0.22, pz);
    pg.add(collar);
    group.add(pg);
    return pg;
  });

  // Step 6: Front & Back Crossbeams
  const crossBeams = new THREE.Group();
  for (const pz of [0.74, -0.74]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.18, 0.2), woodMat);
    beam.position.set(0, 2.48, pz);
    beam.castShadow = true;
    crossBeams.add(beam);
  }
  group.add(crossBeams);

  // Step 7: Side Stringer Beams
  const sideStringers = new THREE.Group();
  for (const px of [-1.12, 1.12]) {
    const str = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 1.98), darkWoodMat);
    str.position.set(px, 2.62, 0);
    str.castShadow = true;
    sideStringers.add(str);
  }
  group.add(sideStringers);

  // Step 8: Pergola Roof Rafters
  const raftersGroup = new THREE.Group();
  for (let i = -2; i <= 2; i++) {
    const rafter = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 2.1), woodMat);
    rafter.position.set(i * 0.56, 2.74, 0);
    rafter.castShadow = true;
    raftersGroup.add(rafter);
  }
  group.add(raftersGroup);

  // Step 9: Side Lattice Trellis Panels
  const trellisGroup = new THREE.Group();
  for (const px of [-1.12, 1.12]) {
    for (const ry of [0.85, 1.35, 1.85]) {
      const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.38), darkWoodMat);
      hBar.position.set(px, ry, 0);
      trellisGroup.add(hBar);
    }
    for (const rz of [-0.36, 0, 0.36]) {
      const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.82, 0.05), darkWoodMat);
      vBar.position.set(px, 1.38, rz);
      trellisGroup.add(vBar);
    }
  }
  group.add(trellisGroup);

  // Step 10: Climbing Ivy Vines
  const vinesGroup = new THREE.Group();
  for (const [vx, vz] of [
    [-1.12, 0.62],
    [1.12, -0.62],
  ]) {
    for (let k = 0; k < 6; k++) {
      const tuft = new THREE.Mesh(
        new THREE.SphereGeometry(0.14 + (k % 2) * 0.04, 8, 6),
        k % 2 === 0 ? vineMat : leafMat
      );
      tuft.position.set(vx + Math.sin(k) * 0.08, 0.55 + k * 0.36, vz + Math.cos(k) * 0.12);
      vinesGroup.add(tuft);
    }
  }
  for (let r = -2; r <= 2; r++) {
    const topVine = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), leafMat);
    topVine.scale.set(1.2, 0.7, 1.3);
    topVine.position.set(r * 0.52, 2.82, (r % 2) * 0.32);
    vinesGroup.add(topVine);
  }
  group.add(vinesGroup);

  // Step 11: Pergola Vine Blossoms
  const blossomsGroup = new THREE.Group();
  const blossomColors = [0xf472b6, 0xc084fc, 0xfbbf24, 0xfb7185];
  for (let i = 0; i < 10; i++) {
    const side = i < 5 ? -1 : 1;
    const bl = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.075, 0),
      new THREE.MeshStandardMaterial({ color: blossomColors[i % blossomColors.length], roughness: 0.42 })
    );
    bl.position.set(
      side * (1.02 - (i % 3) * 0.25),
      1.35 + (i % 5) * 0.36,
      (i % 2 === 0 ? 0.55 : -0.42)
    );
    blossomsGroup.add(bl);
  }
  group.add(blossomsGroup);

  // Step 12: Flagstone Garden Patio
  const patioGroup = new THREE.Group();
  for (const [fx, fz, fr] of [
    [-0.55, 0.25, 0.38],
    [0.2, 0.32, 0.42],
    [0.65, -0.2, 0.34],
    [-0.35, -0.32, 0.36],
    [0.05, -0.08, 0.4],
  ]) {
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(fr, fr * 1.06, 0.06, 7), stoneMat);
    stone.position.set(fx, 0.03, fz);
    stone.receiveShadow = true;
    patioGroup.add(stone);
  }
  group.add(patioGroup);

  // Step 13: Wooden Garden Bench
  const benchGroup = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.09, 0.48), woodMat);
  seat.position.set(0, 0.46, -0.08);
  seat.castShadow = true;
  benchGroup.add(seat);
  const backRest = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.38, 0.08), woodMat);
  backRest.position.set(0, 0.76, -0.3);
  backRest.castShadow = true;
  benchGroup.add(backRest);
  for (const lx of [-0.56, 0.56]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.46, 0.42), darkWoodMat);
    leg.position.set(lx, 0.23, -0.08);
    benchGroup.add(leg);
  }
  group.add(benchGroup);

  // Step 14..18: 5 Hanging Glowing Lanterns
  const lanternCoords: Array<[number, number, number]> = [
    [-0.78, 2.4, 0.74],  // Lv 14: Front Left
    [0, 2.66, 0],        // Lv 15: Center
    [0.78, 2.4, 0.74],   // Lv 16: Front Right
    [-0.78, 2.4, -0.74], // Lv 17: Back Left
    [0.78, 2.4, -0.74],  // Lv 18: Back Right
  ];
  const lanternNodes: THREE.Group[] = lanternCoords.map(([lx, ly, lz]) => {
    const lGroup = new THREE.Group();
    lGroup.position.set(lx, ly, lz);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.34, 6), capMat);
    cord.position.y = -0.17;
    lGroup.add(cord);
    const roofCap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.13, 8), capMat);
    roofCap.position.y = -0.26;
    lGroup.add(roofCap);
    const lanternBody = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.26, 8), lanternMat);
    lanternBody.position.y = -0.43;
    lGroup.add(lanternBody);
    group.add(lGroup);
    return lGroup;
  });

  // Step 19: Flower Baskets on Front Posts
  const flowerBaskets = new THREE.Group();
  for (const px of [-1.12, 1.12]) {
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.11, 0.18, 10),
      new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.75 })
    );
    pot.position.set(px, 1.56, 0.96);
    flowerBaskets.add(pot);
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), leafMat);
    bush.position.set(px, 1.68, 0.96);
    flowerBaskets.add(bush);
    const bloom = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.09, 0),
      new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.42 })
    );
    bloom.position.set(px, 1.78, 0.98);
    flowerBaskets.add(bloom);
  }
  group.add(flowerBaskets);

  // Step 20: Golden Firefly Halo Swarm
  const fireflySwarm = new THREE.Group();
  const fireflyOrbs: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), fireflyMat);
    fireflySwarm.add(orb);
    fireflyOrbs.push(orb);
  }
  group.add(fireflySwarm);

  let currentLvl = 0;
  const setLevel = (level: number) => {
    const lv = Math.max(0, Math.min(20, level));
    currentLvl = lv;
    contactShadow.visible = lv >= 1;
    stonePads.visible = lv >= 1;
    posts.forEach((p, idx) => {
      p.visible = lv >= 2 + idx;
    });
    crossBeams.visible = lv >= 6;
    sideStringers.visible = lv >= 7;
    raftersGroup.visible = lv >= 8;
    trellisGroup.visible = lv >= 9;
    vinesGroup.visible = lv >= 10;
    blossomsGroup.visible = lv >= 11;
    patioGroup.visible = lv >= 12;
    benchGroup.visible = lv >= 13;
    lanternNodes.forEach((ln, idx) => {
      ln.visible = lv >= 14 + idx;
    });
    flowerBaskets.visible = lv >= 19;
    fireflySwarm.visible = lv >= 20;
  };
  setLevel(0);

  return {
    group,
    setLevel,
    setAmbientGlow: (factor: number) => {
      lanternMat.emissiveIntensity = 0.55 + factor * 1.45;
      fireflyMat.emissiveIntensity = 0.8 + factor * 1.5;
    },
    update: (elapsed) => {
      lanternNodes.forEach((ln, i) => {
        if (!ln.visible) return;
        ln.rotation.z = Math.sin(elapsed * 2.1 + i * 1.3) * 0.08;
      });
      if (currentLvl >= 20) {
        fireflyOrbs.forEach((orb, i) => {
          const ang = elapsed * 1.15 + i * ((Math.PI * 2) / 8);
          orb.position.set(
            Math.cos(ang) * 1.35,
            1.45 + Math.sin(elapsed * 2.4 + i) * 0.45,
            Math.sin(ang) * 1.05
          );
        });
      }
    },
  };
}

export function createWishingWellGroup(textures: ProceduralTextureSet): UpgradeVisualHandle {
  const group = new THREE.Group();
  group.name = 'StoneWishingWell';
  const contactShadow = addContactShadow(group, textures.contactShadowMap, 1.65, 0.025);

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.stoneMap,
    bumpMap: textures.stoneBump,
    bumpScale: 0.05,
    roughness: 0.84,
  });
  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: 0x9ca3af,
    map: textures.stoneMap,
    bumpMap: textures.stoneBump,
    bumpScale: 0.05,
    roughness: 0.88,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.woodMap,
    roughness: 0.72,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x92400e,
    map: textures.woodMap,
    roughness: 0.68,
  });
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.35,
    metalness: 0.78,
  });
  const ropeMat = new THREE.MeshStandardMaterial({
    color: 0xd6b57c,
    roughness: 0.92,
  });
  const pitSoilMat = new THREE.MeshStandardMaterial({
    color: 0x2c1e14,
    roughness: 0.98,
  });
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    emissive: 0x0369a1,
    emissiveIntensity: 0.22,
    roughness: 0.08,
    metalness: 0.32,
  });
  const mossMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.85 });
  const lanternGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.95,
    roughness: 0.2,
  });

  // Step 1: Dug pit & dark shaft base
  const pitGroup = new THREE.Group();
  const pitRing = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.08, 20), pitSoilMat);
  pitRing.position.y = 0.04;
  pitRing.receiveShadow = true;
  pitGroup.add(pitRing);
  group.add(pitGroup);

  // Step 2: Deep water pool inside well
  const waterPool = new THREE.Mesh(new THREE.CircleGeometry(0.76, 20), waterMat);
  waterPool.rotation.x = -Math.PI / 2;
  waterPool.position.y = 0.095;
  group.add(waterPool);

  const buildStoneCourse = (y: number, radius: number, count: number, phase: number, mat: THREE.Material) => {
    const course = new THREE.Group();
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + phase;
      const block = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.28), mat);
      block.position.set(Math.cos(ang) * radius, y, Math.sin(ang) * radius);
      block.rotation.y = -ang + Math.PI / 2;
      block.castShadow = true;
      block.receiveShadow = true;
      course.add(block);
    }
    return course;
  };

  // Step 3: Stone base ring
  const stoneBase = buildStoneCourse(0.14, 0.92, 12, 0, darkStoneMat);
  group.add(stoneBase);
  // Step 4: Stone wall course #1
  const wallCourse1 = buildStoneCourse(0.36, 0.88, 12, 0.26, stoneMat);
  group.add(wallCourse1);
  // Step 5: Stone wall course #2
  const wallCourse2 = buildStoneCourse(0.58, 0.88, 12, 0, darkStoneMat);
  group.add(wallCourse2);
  // Step 6: Stone wall course #3
  const wallCourse3 = buildStoneCourse(0.8, 0.88, 12, 0.26, stoneMat);
  group.add(wallCourse3);

  // Step 7: Wide stone coping rim
  const copingRim = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.14, 10, 24), stoneMat);
  copingRim.rotation.x = Math.PI / 2;
  copingRim.position.y = 0.96;
  copingRim.castShadow = true;
  copingRim.receiveShadow = true;
  group.add(copingRim);

  // Step 8: Stepping stones at base
  const stepStones = new THREE.Group();
  for (const [sx, sz, sr] of [
    [-0.36, 1.25, 0.24],
    [0.12, 1.32, 0.28],
    [0.48, 1.18, 0.2],
  ]) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(sr, sr * 1.08, 0.08, 10), darkStoneMat);
    st.position.set(sx, 0.04, sz);
    st.receiveShadow = true;
    stepStones.add(st);
  }
  group.add(stepStones);

  // Step 9 & 10: Left & Right Timber Posts
  const makePost = (x: number) => {
    const pg = new THREE.Group();
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.65, 0.16), woodMat);
    beam.position.set(x, 1.72, 0);
    beam.castShadow = true;
    pg.add(beam);
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.12, 0.19), ironMat);
    bracket.position.set(x, 1.05, 0);
    pg.add(bracket);
    return pg;
  };
  const leftPost = makePost(-0.92);
  const rightPost = makePost(0.92);
  group.add(leftPost, rightPost);

  // Step 11: Crossbar axle beam
  const axleGroup = new THREE.Group();
  axleGroup.position.set(0, 1.88, 0);
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 1.98, 12), woodMat);
  axle.rotation.z = Math.PI / 2;
  axle.castShadow = true;
  axleGroup.add(axle);
  group.add(axleGroup);

  // Step 12: Hand crank handle
  const crankGroup = new THREE.Group();
  crankGroup.position.set(1.02, 1.88, 0);
  const crankArm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.06), ironMat);
  crankArm.position.set(0.05, 0.14, 0);
  crankGroup.add(crankArm);
  const crankGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.24, 8), woodMat);
  crankGrip.rotation.z = Math.PI / 2;
  crankGrip.position.set(0.18, 0.28, 0);
  crankGroup.add(crankGrip);
  group.add(crankGroup);

  // Step 13: Roof frame rafters
  const raftersGroup = new THREE.Group();
  for (const zOff of [-0.72, 0.72]) {
    for (const side of [-1, 1]) {
      const rafter = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.1, 0.1), woodMat);
      rafter.position.set(side * 0.52, 2.86, zOff);
      rafter.rotation.z = -side * 0.62;
      rafter.castShadow = true;
      raftersGroup.add(rafter);
    }
  }
  const tieBeam = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.12, 0.14), woodMat);
  tieBeam.position.set(0, 2.48, 0);
  raftersGroup.add(tieBeam);
  group.add(raftersGroup);

  // Step 14: Shingled well roof
  const roofPanels = new THREE.Group();
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1.72), roofMat);
    panel.position.set(side * 0.54, 2.94, 0);
    panel.rotation.z = -side * 0.62;
    panel.castShadow = true;
    panel.receiveShadow = true;
    roofPanels.add(panel);
  }
  group.add(roofPanels);

  // Step 15: Roof ridge cap & gable trim
  const ridgeGroup = new THREE.Group();
  const ridgeBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.82, 8), woodMat);
  ridgeBeam.rotation.x = Math.PI / 2;
  ridgeBeam.position.set(0, 3.38, 0);
  ridgeBeam.castShadow = true;
  ridgeGroup.add(ridgeBeam);
  for (const zOff of [-0.85, 0.85]) {
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), woodMat);
    finial.position.set(0, 3.44, zOff);
    ridgeGroup.add(finial);
  }
  group.add(ridgeGroup);

  // Step 16: Coiled rope on axle
  const ropeGroup = new THREE.Group();
  for (let i = -3; i <= 3; i++) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 6, 12), ropeMat);
    coil.rotation.y = Math.PI / 2;
    coil.position.set(i * 0.048, 1.88, 0);
    ropeGroup.add(coil);
  }
  const hangingRope = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.82, 8), ropeMat);
  hangingRope.position.set(0, 1.47, 0);
  ropeGroup.add(hangingRope);
  group.add(ropeGroup);

  // Step 17 & 18: Wooden water bucket + water inside bucket
  const bucketGroup = new THREE.Group();
  bucketGroup.position.set(0, 1.06, 0);
  const bucketBody = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.19, 0.34, 12), woodMat);
  bucketBody.position.y = -0.17;
  bucketBody.castShadow = true;
  bucketGroup.add(bucketBody);
  const bucketHoop = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.022, 6, 16), ironMat);
  bucketHoop.rotation.x = Math.PI / 2;
  bucketHoop.position.y = -0.07;
  bucketGroup.add(bucketHoop);
  const bucketHandle = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.018, 6, 12, Math.PI), ironMat);
  bucketHandle.position.y = 0.0;
  bucketGroup.add(bucketHandle);
  const bucketWater = new THREE.Mesh(new THREE.CircleGeometry(0.21, 14), waterMat);
  bucketWater.rotation.x = -Math.PI / 2;
  bucketWater.position.y = -0.02;
  bucketGroup.add(bucketWater);
  group.add(bucketGroup);

  // Step 19: Moss & ivy on stone wall
  const mossGroup = new THREE.Group();
  for (const [mx, my, mz, mr] of [
    [-0.92, 0.25, 0.42, 0.14],
    [-0.78, 0.62, 0.62, 0.11],
    [0.88, 0.42, 0.45, 0.13],
    [0.45, 0.88, 0.82, 0.1],
    [-0.45, 0.22, -0.86, 0.14],
    [0.65, 0.55, -0.72, 0.12],
  ]) {
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(mr, 8, 6), mossMat);
    tuft.scale.set(1.2, 0.7, 1.2);
    tuft.position.set(mx, my, mz);
    mossGroup.add(tuft);
  }
  group.add(mossGroup);

  // Step 20: Hanging well lantern
  const lanternGroup = new THREE.Group();
  lanternGroup.position.set(0, 2.48, 0.88);
  const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 6), ironMat);
  hook.position.y = -0.11;
  lanternGroup.add(hook);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.12, 8), ironMat);
  cap.position.y = -0.22;
  lanternGroup.add(cap);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.2, 8), lanternGlowMat);
  lamp.position.y = -0.35;
  lanternGroup.add(lamp);
  group.add(lanternGroup);

  let currentLvl = 0;
  const setLevel = (level: number) => {
    currentLvl = level;
    contactShadow.visible = level >= 1;
    pitGroup.visible = level >= 1;
    waterPool.visible = level >= 2;
    stoneBase.visible = level >= 3;
    wallCourse1.visible = level >= 4;
    wallCourse2.visible = level >= 5;
    wallCourse3.visible = level >= 6;
    copingRim.visible = level >= 7;
    stepStones.visible = level >= 8;
    leftPost.visible = level >= 9;
    rightPost.visible = level >= 10;
    axleGroup.visible = level >= 11;
    crankGroup.visible = level >= 12;
    raftersGroup.visible = level >= 13;
    roofPanels.visible = level >= 14;
    ridgeGroup.visible = level >= 15;
    ropeGroup.visible = level >= 16;
    bucketGroup.visible = level >= 17;
    bucketWater.visible = level >= 18;
    bucketGroup.position.y = level >= 18 ? 1.28 : 1.06;
    hangingRope.scale.y = level >= 18 ? 0.73 : 1;
    hangingRope.position.y = level >= 18 ? 1.58 : 1.47;
    mossGroup.visible = level >= 19;
    lanternGroup.visible = level >= 20;
  };
  setLevel(0);

  return {
    group,
    setLevel,
    setAmbientGlow: (factor: number) => {
      lanternGlowMat.emissiveIntensity = 0.65 + factor * 1.35;
    },
    update: (elapsed) => {
      if (currentLvl >= 17) {
        bucketGroup.rotation.z = Math.sin(elapsed * 1.8) * 0.05;
      }
      if (currentLvl >= 20) {
        lanternGroup.rotation.z = Math.sin(elapsed * 2.1 + 0.5) * 0.07;
      }
    },
  };
}

export function createProgressiveHouseGroup(textures: ProceduralTextureSet): UpgradeVisualHandle {
  const group = new THREE.Group();
  group.name = 'MoonbeamCottage';

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.stoneMap,
    bumpMap: textures.stoneBump,
    bumpScale: 0.05,
    roughness: 0.88,
    metalness: 0.05,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xd4be9e,
    roughness: 0.86,
    metalness: 0.02,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.woodMap,
    roughness: 0.72,
    metalness: 0.06,
  });
  const simpleRoofMat = new THREE.MeshStandardMaterial({
    color: 0xa16207,
    roughness: 0.84,
  });
  const tileRoofMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.shingleMap,
    roughness: 0.62,
    metalness: 0.05,
  });
  const windowGlassMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    emissive: 0xffb703,
    emissiveIntensity: 0,
    roughness: 0.2,
    metalness: 0.15,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    metalness: 0.9,
    roughness: 0.18,
  });

  // Lv 1: Stone Foundation (Lv 0 = flat grassy ground!)
  const foundation = new THREE.Group();
  addContactShadow(foundation, textures.contactShadowMap, 3.2, 0.025);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.45, 3.8), stoneMat);
  plinth.position.y = 0.225;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  foundation.add(plinth);
  for (const [fx, fz] of [
    [-2.05, -1.75],
    [2.05, -1.75],
    [-2.05, 1.75],
    [2.05, 1.75],
  ]) {
    const cornerStone = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.52, 0.45), stoneMat);
    cornerStone.position.set(fx, 0.26, fz);
    cornerStone.castShadow = true;
    foundation.add(cornerStone);
  }
  group.add(foundation);

  // Lv 2..5: Four Wooden Corner Pillars one by one
  const pillarCoords: Array<[number, number]> = [
    [-1.96, 1.66], // Lv 2: Front Left
    [1.96, 1.66],  // Lv 3: Front Right
    [-1.96, -1.66], // Lv 4: Back Left
    [1.96, -1.66],  // Lv 5: Back Right
  ];
  const pillars: THREE.Mesh[] = pillarCoords.map(([cx, cz]) => {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.4, 0.24), woodMat);
    beam.position.set(cx, 1.62, cz);
    beam.castShadow = true;
    group.add(beam);
    return beam;
  });

  // Lv 6..9: Four Walls one by one (Back, Left, Right, Front)
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(3.84, 2.32, 0.22), wallMat);
  backWall.position.set(0, 1.6, -1.66);
  backWall.castShadow = true;
  backWall.receiveShadow = true;

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.32, 3.24), wallMat);
  leftWall.position.set(-1.96, 1.6, 0);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.32, 3.24), wallMat);
  rightWall.position.set(1.96, 1.6, 0);
  rightWall.castShadow = true;
  rightWall.receiveShadow = true;

  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(3.84, 2.32, 0.22), wallMat);
  frontWall.position.set(0, 1.6, 1.66);
  frontWall.castShadow = true;
  frontWall.receiveShadow = true;

  const gableShape = new THREE.Shape();
  gableShape.moveTo(-1.98, 0);
  gableShape.lineTo(0, 1.5);
  gableShape.lineTo(1.98, 0);
  gableShape.closePath();
  const gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: 3.36, bevelEnabled: false });
  gableGeo.translate(0, 0, -1.68);
  const gable = new THREE.Mesh(gableGeo, wallMat);
  gable.position.y = 2.78;
  group.add(backWall, leftWall, rightWall, frontWall, gable);

  // Lv 11: Simple Roof | Lv 12: Tile Roof
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-2.45, 0);
  roofShape.lineTo(0, 1.85);
  roofShape.lineTo(2.45, 0);
  roofShape.lineTo(2.15, -0.18);
  roofShape.lineTo(0, 1.48);
  roofShape.lineTo(-2.15, -0.18);
  roofShape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
    depth: 3.9,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.08,
    bevelSegments: 2,
  });
  roofGeo.translate(0, 0, -1.95);
  const roofMesh = new THREE.Mesh(roofGeo, simpleRoofMat);
  roofMesh.position.y = 2.72;
  roofMesh.castShadow = true;
  group.add(roofMesh);

  // Lv 13: Chimney
  const chimneyGroup = new THREE.Group();
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.6, 0.62), stoneMat);
  chimney.position.set(1.25, 3.85, -0.75);
  chimney.castShadow = true;
  chimneyGroup.add(chimney);
  const chimneyRim = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.16, 0.76), stoneMat);
  chimneyRim.position.set(1.25, 4.68, -0.75);
  chimneyGroup.add(chimneyRim);
  group.add(chimneyGroup);

  // Lv 14: Front Door | Lv 15: Shiny Gold Doorknob
  const doorGroup = new THREE.Group();
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.88, 1.48, 0.12), woodMat);
  door.position.set(0, 1.18, 1.74);
  doorGroup.add(door);
  const doorArch = new THREE.Mesh(
    new THREE.CylinderGeometry(0.44, 0.44, 0.12, 16, 1, false, 0, Math.PI),
    woodMat
  );
  doorArch.rotation.x = Math.PI / 2;
  doorArch.rotation.z = -Math.PI / 2;
  doorArch.position.set(0, 1.92, 1.74);
  doorGroup.add(doorArch);
  group.add(doorGroup);

  const goldKnob = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), goldMat);
  goldKnob.position.set(0.28, 1.18, 1.84);
  group.add(goldKnob);

  // Lv 16: Windows | Lv 17: Light Inside Windows
  const windowsGroup = new THREE.Group();
  for (const wx of [-1.18, 1.18]) {
    const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.72, 0.12), woodMat);
    winFrame.position.set(wx, 1.68, 1.74);
    windowsGroup.add(winFrame);
    const winGlass = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.56, 0.14), windowGlassMat);
    winGlass.position.set(wx, 1.68, 1.74);
    windowsGroup.add(winGlass);
  }
  const atticFrame = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.06, 10, 20), woodMat);
  atticFrame.position.set(0, 3.4, 1.72);
  windowsGroup.add(atticFrame);
  const atticGlass = new THREE.Mesh(new THREE.CircleGeometry(0.34, 20), windowGlassMat);
  atticGlass.position.set(0, 3.4, 1.7);
  windowsGroup.add(atticGlass);
  group.add(windowsGroup);

  // Lv 18: Window Apron | Lv 19: Grass in Apron | Lv 20: Flowers in Apron
  const windowAprons = new THREE.Group();
  const apronGrass = new THREE.Group();
  const apronFlowers = new THREE.Group();
  for (const wx of [-1.18, 1.18]) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.22, 0.28), woodMat);
    box.position.set(wx, 1.24, 1.86);
    box.castShadow = true;
    windowAprons.add(box);

    const grassTop = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 0.08, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.8 })
    );
    grassTop.position.set(wx, 1.37, 1.86);
    apronGrass.add(grassTop);

    for (let f = -1; f <= 1; f++) {
      const fl = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        new THREE.MeshStandardMaterial({
          color: f === 0 ? 0xfbbf24 : 0xf43f5e,
          roughness: 0.42,
        })
      );
      fl.position.set(wx + f * 0.22, 1.46, 1.88);
      apronFlowers.add(fl);
    }
  }
  group.add(windowAprons, apronGrass, apronFlowers);

  // Lv 21: Stone Steps to Door
  const stoneSteps = new THREE.Group();
  const step1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.22, 0.6), stoneMat);
  step1.position.set(0, 0.11, 2.15);
  stoneSteps.add(step1);
  const step2 = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.14, 0.45), stoneMat);
  step2.position.set(0, 0.07, 2.65);
  stoneSteps.add(step2);
  group.add(stoneSteps);

  // Lv 22: Designs on the Wall (timber cross-beams, trim bands, golden star gable emblem)
  const wallDesigns = new THREE.Group();
  const trimBand = new THREE.Mesh(
    new THREE.BoxGeometry(4.12, 0.14, 3.52),
    new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.65 })
  );
  trimBand.position.y = 2.74;
  wallDesigns.add(trimBand);
  for (const sx of [-1.45, 1.45]) {
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.72, 0.08), woodMat);
    brace.position.set(sx, 2.38, 1.76);
    brace.rotation.z = sx < 0 ? 0.65 : -0.65;
    wallDesigns.add(brace);
  }
  const gableMedallion = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), goldMat);
  gableMedallion.position.set(0, 3.92, 1.78);
  wallDesigns.add(gableMedallion);
  group.add(wallDesigns);

  // Lv 23: Wooden Porch Awning Over Door
  const porchAwning = new THREE.Group();
  const awningRoof = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.1, 0.82), tileRoofMat);
  awningRoof.position.set(0, 2.26, 2.1);
  awningRoof.rotation.x = 0.28;
  awningRoof.castShadow = true;
  porchAwning.add(awningRoof);
  for (const bx of [-0.56, 0.56]) {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.38, 0.1), woodMat);
    bracket.position.set(bx, 2.02, 1.94);
    bracket.rotation.x = -0.62;
    porchAwning.add(bracket);
  }
  group.add(porchAwning);

  // Lv 24: Front Porch Lantern
  const porchLanternMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.75,
    roughness: 0.2,
  });
  const porchLantern = new THREE.Group();
  porchLantern.position.set(-0.52, 2.14, 2.28);
  const plHook = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.18, 6), woodMat);
  plHook.position.y = -0.09;
  porchLantern.add(plHook);
  const plLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.075, 0.18, 8), porchLanternMat);
  plLamp.position.y = -0.24;
  porchLantern.add(plLamp);
  group.add(porchLantern);

  // Lv 25: Painted Window Shutters
  const shuttersGroup = new THREE.Group();
  const shutterMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.58 });
  for (const wx of [-1.18, 1.18]) {
    for (const side of [-1, 1]) {
      const shutter = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.72, 0.08), shutterMat);
      shutter.position.set(wx + side * 0.45, 1.68, 1.76);
      shutter.castShadow = true;
      shuttersGroup.add(shutter);
    }
  }
  group.add(shuttersGroup);

  // Lv 26: Stone Walkway & Side Windows
  const walkwayAndSideWins = new THREE.Group();
  for (const [sx, sz, sr] of [
    [-0.18, 3.12, 0.26],
    [0.24, 3.44, 0.24],
    [-0.08, 3.76, 0.25],
  ]) {
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(sr, sr * 1.05, 0.07, 10), stoneMat);
    stone.position.set(sx, 0.035, sz);
    stone.receiveShadow = true;
    walkwayAndSideWins.add(stone);
  }
  for (const sx of [-2.05, 2.05]) {
    const sideFrame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.72, 0.68), woodMat);
    sideFrame.position.set(sx, 1.68, 0);
    walkwayAndSideWins.add(sideFrame);
    const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.56, 0.52), windowGlassMat);
    sideGlass.position.set(sx, 1.68, 0);
    walkwayAndSideWins.add(sideGlass);
  }
  group.add(walkwayAndSideWins);

  // Lv 27: Cozy Chimney Smoke Puffs
  const smokeGroup = new THREE.Group();
  const smokeMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.95,
    transparent: true,
    opacity: 0.48,
  });
  const smokePuffs: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.11 + i * 0.03, 10, 8), smokeMat);
    puff.position.set(1.25, 4.68 + i * 0.22, -0.75);
    smokeGroup.add(puff);
    smokePuffs.push(puff);
  }
  group.add(smokeGroup);

  // Lv 28: Climbing Cottage Ivy & Roses
  const cottageIvy = new THREE.Group();
  const ivyLeafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.76 });
  const roseMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.42 });
  for (const ix of [-1.84, 1.84]) {
    for (let k = 0; k < 5; k++) {
      const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), ivyLeafMat);
      tuft.position.set(ix + Math.sin(k) * 0.08, 0.68 + k * 0.42, 1.78);
      cottageIvy.add(tuft);
      if (k % 2 === 1) {
        const rose = new THREE.Mesh(new THREE.DodecahedronGeometry(0.065, 0), roseMat);
        rose.position.set(ix + (ix < 0 ? 0.08 : -0.08), 0.72 + k * 0.42, 1.88);
        cottageIvy.add(rose);
      }
    }
  }
  group.add(cottageIvy);

  // Lv 29: Crescent Moon Weathervane atop roof peak
  const weathervane = new THREE.Group();
  weathervane.position.set(0, 4.58, 0.8);
  const vanePole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.72, 8), goldMat);
  vanePole.position.y = 0.36;
  weathervane.add(vanePole);
  const vaneSpin = new THREE.Group();
  vaneSpin.position.y = 0.74;
  const vaneBar = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 0.04), goldMat);
  vaneSpin.add(vaneBar);
  const crescent = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 8, 16, Math.PI * 1.35), goldMat);
  crescent.position.set(0.24, 0.1, 0);
  crescent.rotation.z = 0.6;
  vaneSpin.add(crescent);
  weathervane.add(vaneSpin);
  group.add(weathervane);

  // Lv 30: Moonbeam Porch Bench & Welcome Mat
  const porchExtras = new THREE.Group();
  const welcomeMat = new THREE.Mesh(
    new THREE.BoxGeometry(0.86, 0.05, 0.42),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.88 })
  );
  welcomeMat.position.set(0, 0.24, 2.02);
  porchExtras.add(welcomeMat);
  const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.36), woodMat);
  benchSeat.position.set(1.56, 0.48, 2.08);
  benchSeat.castShadow = true;
  porchExtras.add(benchSeat);
  const benchBack = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.32, 0.07), woodMat);
  benchBack.position.set(1.56, 0.68, 1.93);
  benchBack.castShadow = true;
  porchExtras.add(benchBack);
  for (const blx of [1.2, 1.92]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.3), stoneMat);
    leg.position.set(blx, 0.32, 2.08);
    porchExtras.add(leg);
  }
  group.add(porchExtras);

  let currentLit = false;
  let currentGlowFactor = 0.25;
  let currentLvl = 0;

  const updateWindowLight = () => {
    if (currentLit) {
      windowGlassMat.color.setHex(0xffe58f);
      windowGlassMat.emissiveIntensity = 0.55 + currentGlowFactor * 1.1;
    } else {
      windowGlassMat.color.setHex(0x94a3b8);
      windowGlassMat.emissiveIntensity = 0;
    }
    porchLanternMat.emissiveIntensity = 0.45 + currentGlowFactor * 1.45;
  };

  const setLevel = (level: number) => {
    const lv = Math.max(0, Math.min(30, level));
    currentLvl = lv;
    foundation.visible = lv >= 1;
    pillars.forEach((p, idx) => {
      p.visible = lv >= idx + 2;
    });
    backWall.visible = lv >= 6;
    leftWall.visible = lv >= 7;
    rightWall.visible = lv >= 8;
    frontWall.visible = lv >= 9;
    gable.visible = lv >= 11;

    // Lv 10: Painted wall color
    wallMat.color.setHex(lv >= 10 ? 0xfff5e4 : 0xd4be9e);

    // Lv 11: Simple roof | Lv 12: Tile roof
    roofMesh.visible = lv >= 11;
    roofMesh.material = lv >= 12 ? tileRoofMat : simpleRoofMat;

    chimneyGroup.visible = lv >= 13;
    doorGroup.visible = lv >= 14;
    goldKnob.visible = lv >= 15;
    windowsGroup.visible = lv >= 16;
    currentLit = lv >= 17;
    updateWindowLight();

    windowAprons.visible = lv >= 18;
    apronGrass.visible = lv >= 19;
    apronFlowers.visible = lv >= 20;
    stoneSteps.visible = lv >= 21;
    wallDesigns.visible = lv >= 22;
    porchAwning.visible = lv >= 23;
    porchLantern.visible = lv >= 24;
    shuttersGroup.visible = lv >= 25;
    walkwayAndSideWins.visible = lv >= 26;
    smokeGroup.visible = lv >= 27;
    cottageIvy.visible = lv >= 28;
    weathervane.visible = lv >= 29;
    porchExtras.visible = lv >= 30;
  };
  setLevel(0);

  return {
    group,
    setLevel,
    setAmbientGlow: (factor: number) => {
      currentGlowFactor = factor;
      updateWindowLight();
    },
    update: (elapsed) => {
      if (currentLvl >= 24) {
        porchLantern.rotation.z = Math.sin(elapsed * 2.2) * 0.07;
      }
      if (currentLvl >= 27) {
        smokePuffs.forEach((puff, i) => {
          const cycle = (elapsed * 0.4 + i * 0.25) % 1;
          puff.position.set(
            1.25 + Math.sin(elapsed * 1.4 + i) * 0.1 + cycle * 0.42,
            4.68 + cycle * 0.78,
            -0.75 + Math.cos(elapsed * 1.1 + i) * 0.08
          );
          puff.scale.setScalar(0.6 + cycle * 0.65);
        });
      }
      if (currentLvl >= 29) {
        vaneSpin.rotation.y = Math.sin(elapsed * 0.9) * 0.55;
      }
    },
  };
}

export interface VisitingCritterHandle {
  group: THREE.Group;
  body: THREE.Group;
  hitbox: THREE.Mesh;
  setSpecies: (species: 'rabbit' | 'squirrel') => void;
}

export function createVisitingCritter(textures: ProceduralTextureSet): VisitingCritterHandle {
  const group = new THREE.Group();
  group.name = 'VisitingCritter';
  addContactShadow(group, textures.contactShadowMap, 0.52, 0.02);

  const body = new THREE.Group();
  group.add(body);

  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.1 });
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // 1. Cute Meadow Rabbit mesh
  const rabbitGroup = new THREE.Group();
  const rFur = new THREE.MeshStandardMaterial({ color: 0xfdf8f0, roughness: 0.8 });
  const rPink = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.55 });
  const rBody = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), rFur);
  rBody.scale.set(0.92, 0.95, 1.2);
  rBody.position.y = 0.28;
  rBody.castShadow = true;
  rabbitGroup.add(rBody);
  const rHead = new THREE.Mesh(new THREE.SphereGeometry(0.21, 14, 12), rFur);
  rHead.position.set(0, 0.52, 0.2);
  rabbitGroup.add(rHead);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.24, 4, 8), rFur);
    ear.position.set(s * 0.09, 0.8, 0.15);
    ear.rotation.z = s * -0.18;
    rabbitGroup.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), eyeMat);
    eye.position.set(s * 0.09, 0.56, 0.38);
    rabbitGroup.add(eye);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), glintMat);
    glint.position.set(s * 0.09 + 0.01, 0.58, 0.405);
    rabbitGroup.add(glint);
  }
  const rNose = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 8), rPink);
  rNose.position.set(0, 0.52, 0.42);
  rabbitGroup.add(rNose);
  const rTail = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), rFur);
  rTail.position.set(0, 0.26, -0.34);
  rabbitGroup.add(rTail);
  body.add(rabbitGroup);

  // 2. Cute Meadow Squirrel mesh
  const squirrelGroup = new THREE.Group();
  const sFur = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.78 });
  const sBelly = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.82 });
  const sBody = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), sFur);
  sBody.scale.set(0.9, 1.05, 1.1);
  sBody.position.y = 0.28;
  sBody.castShadow = true;
  squirrelGroup.add(sBody);
  const sChest = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), sBelly);
  sChest.position.set(0, 0.28, 0.14);
  squirrelGroup.add(sChest);
  const sHead = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 12), sFur);
  sHead.position.set(0, 0.52, 0.16);
  squirrelGroup.add(sHead);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.13, 8), sFur);
    ear.position.set(s * 0.11, 0.72, 0.13);
    squirrelGroup.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), eyeMat);
    eye.position.set(s * 0.08, 0.55, 0.32);
    squirrelGroup.add(eye);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 6), glintMat);
    glint.position.set(s * 0.08 + 0.01, 0.57, 0.345);
    squirrelGroup.add(glint);
  }
  // Fluffy curved squirrel tail
  for (const [ty, tz, r] of [
    [0.34, -0.26, 0.14],
    [0.54, -0.34, 0.18],
    [0.72, -0.26, 0.16],
  ]) {
    const tPuff = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), sFur);
    tPuff.position.set(0, ty, tz);
    tPuff.castShadow = true;
    squirrelGroup.add(tPuff);
  }
  // Little acorn held by squirrel
  const acorn = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 })
  );
  acorn.position.set(0, 0.34, 0.29);
  squirrelGroup.add(acorn);
  body.add(squirrelGroup);

  // Generous clickable layer-1 hitbox
  const hitbox = new THREE.Mesh(
    new THREE.SphereGeometry(0.72, 10, 10),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitbox.position.y = 0.45;
  hitbox.layers.set(1);
  hitbox.userData.visitorSpecies = 'rabbit';
  group.add(hitbox);

  const setSpecies = (species: 'rabbit' | 'squirrel') => {
    rabbitGroup.visible = species === 'rabbit';
    squirrelGroup.visible = species === 'squirrel';
    hitbox.userData.visitorSpecies = species;
  };
  setSpecies('rabbit');

  return { group, body, hitbox, setSpecies };
}


