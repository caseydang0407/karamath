import * as THREE from 'three';
import { addContactShadow, type CharacterHandle } from './models';
import type { ProceduralTextureSet } from './textures';

export function createJoshuaBear(textures: ProceduralTextureSet): CharacterHandle {
  const root = new THREE.Group();
  root.name = 'JoshuaBear';

  const shadowDisc = addContactShadow(root, textures.contactShadowMap, 0.88, 0.025);
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const furMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.82 });
  const tummyMat = new THREE.MeshStandardMaterial({ color: 0xd9a773, roughness: 0.84 });
  const snoutMat = new THREE.MeshStandardMaterial({ color: 0xe6be8a, roughness: 0.8 });
  const noseMat = new THREE.MeshStandardMaterial({ color: 0x2b170b, roughness: 0.3 });
  const innerEarMat = new THREE.MeshStandardMaterial({ color: 0xd49b6a, roughness: 0.75 });
  const mossMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.92 });
  const leafPillowMat = new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.82 });

  // Lv 1–4: Warm Mossy Bear Bed
  const mossBed = new THREE.Group();
  const bedBase = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.76, 0.16, 18), mossMat);
  bedBase.position.y = 0.08;
  bedBase.receiveShadow = true;
  mossBed.add(bedBase);
  const bedRim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.11, 10, 20), mossMat);
  bedRim.rotation.x = Math.PI / 2;
  bedRim.position.y = 0.16;
  mossBed.add(bedRim);
  const pillow = new THREE.Mesh(new THREE.SphereGeometry(0.46, 12, 10), leafPillowMat);
  pillow.scale.set(1.1, 0.35, 0.9);
  pillow.position.y = 0.15;
  mossBed.add(pillow);
  root.add(mossBed);

  // Main bear anatomy
  const bearFigure = new THREE.Group();
  bodyGroup.add(bearFigure);

  const torsoProfile = [
    new THREE.Vector2(0.01, 0.25),
    new THREE.Vector2(0.48, 0.35),
    new THREE.Vector2(0.53, 0.56),
    new THREE.Vector2(0.45, 0.8),
    new THREE.Vector2(0.34, 0.98),
    new THREE.Vector2(0.01, 1.04),
  ];
  const torso = new THREE.Mesh(new THREE.LatheGeometry(torsoProfile, 22), furMat);
  torso.castShadow = true;
  bearFigure.add(torso);

  const tummyPatch = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), tummyMat);
  tummyPatch.scale.set(0.95, 1.12, 0.58);
  tummyPatch.position.set(0, 0.62, 0.3);
  bearFigure.add(tummyPatch);

  // Round bear tail
  const bearTail = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), furMat);
  bearTail.position.set(0, 0.42, -0.5);
  bearFigure.add(bearTail);

  // Head + rounded ears + snout
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.43, 22, 18), furMat);
  head.scale.set(1.06, 0.96, 1.02);
  head.position.set(0, 1.25, 0.05);
  head.castShadow = true;
  bearFigure.add(head);

  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), furMat);
    ear.scale.set(1, 1, 0.55);
    ear.position.set(side * 0.33, 1.6, 0.02);
    ear.castShadow = true;
    bearFigure.add(ear);
    const earIn = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), innerEarMat);
    earIn.scale.set(1, 1, 0.4);
    earIn.position.set(side * 0.33, 1.6, 0.075);
    bearFigure.add(earIn);
  }

  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.21, 14, 12), snoutMat);
  snout.scale.set(1.18, 0.85, 0.96);
  snout.position.set(0, 1.16, 0.4);
  bearFigure.add(snout);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), noseMat);
  nose.scale.set(1.25, 0.85, 0.85);
  nose.position.set(0, 1.23, 0.58);
  bearFigure.add(nose);

  // Open eyes (Lv 3+) and sleeping closed eyelids (Lv 2)
  const irisMat = new THREE.MeshStandardMaterial({ color: 0x1e130c, roughness: 0.14 });
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const openEyes = new THREE.Group();
  const closedEyes = new THREE.Group();
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 10), irisMat);
    eye.position.set(side * 0.17, 1.32, 0.43);
    openEyes.add(eye);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.021, 8, 8), glintMat);
    glint.position.set(side * 0.17 + 0.02, 1.35, 0.485);
    openEyes.add(glint);

    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.024, 0.03), noseMat);
    lid.position.set(side * 0.17, 1.31, 0.45);
    lid.rotation.z = side * -0.14;
    closedEyes.add(lid);

    const cheek = new THREE.Mesh(
      new THREE.SphereGeometry(0.072, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xf4a28c, roughness: 0.7 })
    );
    cheek.scale.set(1.2, 0.65, 0.4);
    cheek.position.set(side * 0.28, 1.17, 0.36);
    bearFigure.add(cheek);
  }
  bearFigure.add(openEyes, closedEyes);

  // Lv 4: Acorn snack
  const acornSnack = new THREE.Group();
  acornSnack.position.set(0.14, 0.96, 0.54);
  acornSnack.rotation.z = -0.35;
  const acornBody = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.5 })
  );
  acornBody.scale.set(0.95, 1.25, 0.95);
  acornSnack.add(acornBody);
  const acornCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.52),
    new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.85 })
  );
  acornCap.position.y = 0.03;
  acornSnack.add(acornCap);
  bearFigure.add(acornSnack);

  // Arms + Lv 10 Forest Green Sleeves + Lv 13 Honey Pot + Lv 20 Brass Lantern
  const armGeo = new THREE.CapsuleGeometry(0.105, 0.24, 6, 10);
  const greenShirtMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.62 });

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.48, 0.84, 0.05);
  leftArm.rotation.z = -0.26;
  leftArm.add(new THREE.Mesh(armGeo, furMat));
  const leftPaw = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), snoutMat);
  leftPaw.position.y = -0.18;
  leftArm.add(leftPaw);
  const leftSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.148, 0.19, 12), greenShirtMat);
  leftSleeve.position.y = 0.04;
  leftArm.add(leftSleeve);
  bearFigure.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.48, 0.84, 0.05);
  rightArm.rotation.z = 0.26;
  rightArm.add(new THREE.Mesh(armGeo, furMat));
  const rightPaw = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), snoutMat);
  rightPaw.position.y = -0.18;
  rightArm.add(rightPaw);
  const rightSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.148, 0.19, 12), greenShirtMat);
  rightSleeve.position.y = 0.04;
  rightArm.add(rightSleeve);
  bearFigure.add(rightArm);

  // Lv 13: Golden Honey Pot on Left Arm
  const honeyPot = new THREE.Group();
  honeyPot.position.set(-0.04, -0.26, 0.14);
  const potBody = new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.45 })
  );
  potBody.scale.set(1, 0.92, 1);
  honeyPot.add(potBody);
  const honeyRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.11, 0.035, 8, 14),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.22 })
  );
  honeyRim.rotation.x = Math.PI / 2;
  honeyRim.position.y = 0.13;
  honeyPot.add(honeyRim);
  const honeyTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.03, 12),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.2 })
  );
  honeyTop.position.y = 0.13;
  honeyPot.add(honeyTop);
  leftArm.add(honeyPot);

  // Lv 20: Explorer Brass Lantern on Right Arm
  const brassLantern = new THREE.Group();
  brassLantern.position.set(0.08, -0.32, 0.22);
  brassLantern.scale.setScalar(1.12);
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.65, roughness: 0.3 });
  const lHandle = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.015, 6, 12, Math.PI), brassMat);
  lHandle.position.y = 0.16;
  brassLantern.add(lHandle);
  const lCap = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.09, 8), brassMat);
  lCap.position.y = 0.12;
  brassLantern.add(lCap);
  const lGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.085, 0.16, 8),
    new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.0,
      roughness: 0.18,
    })
  );
  brassLantern.add(lGlass);
  const lBase = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.04, 8), brassMat);
  lBase.position.y = -0.09;
  brassLantern.add(lBase);
  rightArm.add(brassLantern);

  // Legs + Lv 14 Woolly Tan Socks + Lv 16/17 Hiking Boots
  const makeLeg = (side: -1 | 1) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.21, 0.28, 0.04);
    const thigh = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), furMat);
    thigh.scale.set(0.96, 1.12, 1.05);
    leg.add(thigh);
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.09, 0.22, 10), furMat);
    shin.position.y = -0.14;
    leg.add(shin);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), furMat);
    paw.scale.set(0.96, 0.55, 1.45);
    paw.position.set(0, -0.23, 0.08);
    leg.add(paw);

    const sock = new THREE.Mesh(
      new THREE.CylinderGeometry(0.106, 0.102, 0.19, 12),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.85 })
    );
    sock.position.y = -0.14;
    leg.add(sock);

    const boot = new THREE.Group();
    boot.position.set(0, -0.22, 0.06);
    const sole = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.06, 0.34),
      new THREE.MeshStandardMaterial({ color: 0x3f2314, roughness: 0.8 })
    );
    sole.position.y = -0.02;
    boot.add(sole);
    const upper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.115, 0.125, 0.14, 12),
      new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.65 })
    );
    upper.position.set(0, 0.06, -0.03);
    boot.add(upper);
    const toe = new THREE.Mesh(
      new THREE.SphereGeometry(0.115, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.65 })
    );
    toe.scale.set(1, 0.65, 1.12);
    toe.position.set(0, 0.04, 0.09);
    boot.add(toe);
    leg.add(boot);

    bearFigure.add(leg);
    return { leg, sock, boot };
  };
  const leftLegObj = makeLeg(-1);
  const rightLegObj = makeLeg(1);

  // Clothing layers:
  // Lv 7: Cream Tummy Vest
  const creamVest = new THREE.Mesh(
    new THREE.CylinderGeometry(0.41, 0.5, 0.46, 20),
    new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.78 })
  );
  creamVest.position.set(0, 0.69, 0.01);
  bearFigure.add(creamVest);

  // Lv 8: Denim Shorts
  const denimShorts = new THREE.Mesh(
    new THREE.CylinderGeometry(0.49, 0.42, 0.28, 20),
    new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.72 })
  );
  denimShorts.position.set(0, 0.36, 0.01);
  bearFigure.add(denimShorts);

  // Lv 10: Forest Green Shirt
  const greenShirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.43, 0.52, 0.48, 20),
    greenShirtMat
  );
  greenShirt.position.set(0, 0.69, 0.01);
  bearFigure.add(greenShirt);

  // Lv 11: Wooden Shirt Buttons
  const shirtButtons = new THREE.Group();
  const btnMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.45 });
  for (const [by, bz] of [
    [0.82, 0.46],
    [0.69, 0.485],
    [0.56, 0.505],
  ] as const) {
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), btnMat);
    btn.scale.set(1, 1, 0.55);
    btn.position.set(0, by, bz);
    shirtButtons.add(btn);
  }
  bearFigure.add(shirtButtons);

  // Lv 12: Red Explorer Scarf
  const redScarf = new THREE.Group();
  const scarfMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.65 });
  const scarfRing = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.065, 8, 18), scarfMat);
  scarfRing.rotation.x = Math.PI / 2;
  scarfRing.position.set(0, 0.96, 0.03);
  redScarf.add(scarfRing);
  const scarfTail = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.24, 0.05), scarfMat);
  scarfTail.position.set(0.16, 0.84, 0.38);
  scarfTail.rotation.z = -0.25;
  redScarf.add(scarfTail);
  bearFigure.add(redScarf);

  // Lv 18: Tan Ranger Hat
  const rangerHat = new THREE.Group();
  rangerHat.position.set(0, 1.62, 0.03);
  const hatBrim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.5, 0.04, 20),
    new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.68 })
  );
  rangerHat.add(hatBrim);
  const hatCrown = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.29, 0.22, 18),
    new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.66 })
  );
  hatCrown.position.y = 0.12;
  rangerHat.add(hatCrown);
  const hatBand = new THREE.Mesh(
    new THREE.TorusGeometry(0.27, 0.028, 8, 18),
    new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5 })
  );
  hatBand.rotation.x = Math.PI / 2;
  hatBand.position.y = 0.04;
  rangerHat.add(hatBand);
  bearFigure.add(rangerHat);

  // Lv 19: Adventure Backpack
  const backpack = new THREE.Group();
  backpack.position.set(0, 0.68, -0.48);
  const packMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.72 });
  const packBody = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.48, 0.24), packMat);
  packBody.castShadow = true;
  backpack.add(packBody);
  const bedroll = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.5, 10),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.65 })
  );
  bedroll.rotation.z = Math.PI / 2;
  bedroll.position.y = 0.3;
  backpack.add(bedroll);
  bearFigure.add(backpack);

  const setLevel = (level: number) => {
    const lv = Math.max(0, Math.min(20, level));
    root.visible = lv >= 1;
    if (lv === 0) return;

    mossBed.visible = lv >= 1 && lv <= 4;
    bearFigure.visible = lv >= 2;
    shadowDisc.visible = lv >= 1;

    if (lv === 2) {
      bearFigure.position.set(0, 0.32, 0.06);
      bearFigure.rotation.x = -0.92;
      bearFigure.scale.setScalar(0.66);
      leftLegObj.leg.rotation.x = -0.4;
      rightLegObj.leg.rotation.x = -0.4;
    } else if (lv === 3 || lv === 4) {
      bearFigure.position.set(0, -0.06, 0);
      bearFigure.rotation.x = 0;
      bearFigure.scale.setScalar(0.74);
      leftLegObj.leg.rotation.x = -1.2;
      rightLegObj.leg.rotation.x = -1.2;
    } else if (lv >= 5) {
      bearFigure.position.set(0, 0, 0);
      bearFigure.rotation.x = 0;
      leftLegObj.leg.rotation.x = 0;
      rightLegObj.leg.rotation.x = 0;
      let s = 0.78;
      if (lv >= 6) s = 0.88;
      if (lv >= 9) s = 0.98;
      if (lv >= 15) s = 1.08;
      bearFigure.scale.setScalar(s);
    }

    closedEyes.visible = lv === 2;
    openEyes.visible = lv >= 3;
    acornSnack.visible = lv === 4;

    creamVest.visible = lv >= 7 && lv < 10;
    denimShorts.visible = lv >= 8;
    greenShirt.visible = lv >= 10;
    leftSleeve.visible = lv >= 10;
    rightSleeve.visible = lv >= 10;
    shirtButtons.visible = lv >= 11;
    redScarf.visible = lv >= 12;
    honeyPot.visible = lv >= 13;
    leftLegObj.sock.visible = lv >= 14;
    rightLegObj.sock.visible = lv >= 14;
    leftLegObj.boot.visible = lv >= 16;
    rightLegObj.boot.visible = lv >= 17;
    rangerHat.visible = lv >= 18;
    backpack.visible = lv >= 19;
    brassLantern.visible = lv >= 20;
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

export function createKatyPig(textures: ProceduralTextureSet): CharacterHandle {
  const root = new THREE.Group();
  root.name = 'KatyPig';

  const shadowDisc = addContactShadow(root, textures.contactShadowMap, 0.86, 0.025);
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const pigMat = new THREE.MeshStandardMaterial({ color: 0xf9a8d4, roughness: 0.74 });
  const snoutMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.58 });
  const innerEarMat = new THREE.MeshStandardMaterial({ color: 0xfb7185, roughness: 0.6 });
  const hoofMat = new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.65 });
  const cloverMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.82 });
  const strawCushionMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.88 });

  // Lv 1–4: Soft Clover & Straw Cushion
  const cloverBed = new THREE.Group();
  const cushionBase = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.74, 0.14, 18), cloverMat);
  cushionBase.position.y = 0.07;
  cushionBase.receiveShadow = true;
  cloverBed.add(cushionBase);
  const innerPad = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.52, 0.15, 16), strawCushionMat);
  innerPad.position.y = 0.09;
  cloverBed.add(innerPad);
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), cloverMat);
    leaf.scale.set(1.1, 0.4, 1.1);
    leaf.position.set(Math.cos(ang) * 0.58, 0.15, Math.sin(ang) * 0.58);
    cloverBed.add(leaf);
  }
  root.add(cloverBed);

  // Main pig anatomy
  const pigFigure = new THREE.Group();
  bodyGroup.add(pigFigure);

  const torsoProfile = [
    new THREE.Vector2(0.01, 0.25),
    new THREE.Vector2(0.47, 0.35),
    new THREE.Vector2(0.52, 0.56),
    new THREE.Vector2(0.44, 0.8),
    new THREE.Vector2(0.32, 0.97),
    new THREE.Vector2(0.01, 1.03),
  ];
  const torso = new THREE.Mesh(new THREE.LatheGeometry(torsoProfile, 22), pigMat);
  torso.castShadow = true;
  pigFigure.add(torso);

  // Curly piggy tail
  const curlyTail = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.032, 8, 14, Math.PI * 1.6), snoutMat);
  curlyTail.position.set(0, 0.46, -0.5);
  curlyTail.rotation.y = Math.PI / 2;
  pigFigure.add(curlyTail);

  // Head + floppy pig ears + round flat pink snout
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.41, 22, 18), pigMat);
  head.scale.set(1.06, 0.96, 1.02);
  head.position.set(0, 1.24, 0.05);
  head.castShadow = true;
  pigFigure.add(head);

  let earBow!: THREE.Group;
  for (const side of [-1, 1]) {
    const earGroup = new THREE.Group();
    earGroup.position.set(side * 0.3, 1.54, 0.06);
    earGroup.rotation.z = side * -0.55;
    earGroup.rotation.x = 0.28;
    const earMesh = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.28, 10), pigMat);
    earMesh.scale.set(1, 1, 0.45);
    earMesh.position.y = 0.1;
    earGroup.add(earMesh);
    const earInner = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 8), innerEarMat);
    earInner.scale.set(1, 1, 0.35);
    earInner.position.set(0, 0.09, 0.03);
    earGroup.add(earInner);
    if (side === 1) {
      earBow = new THREE.Group();
      earBow.position.set(-0.04, 0.12, 0.07);
      const bowMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.4 });
      for (const bs of [-1, 1]) {
        const lp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), bowMat);
        lp.scale.set(1.25, 0.75, 0.45);
        lp.position.x = bs * 0.07;
        earBow.add(lp);
      }
      earBow.add(new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), bowMat));
      earGroup.add(earBow);
    }
    pigFigure.add(earGroup);
  }

  // Distinct cylindrical flat-tipped pig snout with 2 nostrils
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.16, 16), snoutMat);
  snout.rotation.x = Math.PI / 2;
  snout.scale.set(1.18, 1, 0.85);
  snout.position.set(0, 1.18, 0.46);
  pigFigure.add(snout);

  const nostrilMat = new THREE.MeshStandardMaterial({ color: 0x831843, roughness: 0.4 });
  for (const side of [-1, 1]) {
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), nostrilMat);
    nostril.scale.set(0.8, 1.25, 0.6);
    nostril.position.set(side * 0.052, 1.18, 0.54);
    pigFigure.add(nostril);
  }

  // Eyes (open vs napping)
  const irisMat = new THREE.MeshStandardMaterial({ color: 0x2b170b, roughness: 0.14 });
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const openEyes = new THREE.Group();
  const closedEyes = new THREE.Group();
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 10), irisMat);
    eye.position.set(side * 0.17, 1.32, 0.41);
    openEyes.add(eye);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.021, 8, 8), glintMat);
    glint.position.set(side * 0.17 + 0.02, 1.35, 0.465);
    openEyes.add(glint);

    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.024, 0.03), nostrilMat);
    lid.position.set(side * 0.17, 1.31, 0.43);
    lid.rotation.z = side * -0.12;
    closedEyes.add(lid);

    const cheek = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xfb7185, roughness: 0.65 })
    );
    cheek.scale.set(1.2, 0.68, 0.4);
    cheek.position.set(side * 0.28, 1.18, 0.35);
    pigFigure.add(cheek);
  }
  pigFigure.add(openEyes, closedEyes);

  // Lv 4: Daisy flower near snout
  const daisyFlower = new THREE.Group();
  daisyFlower.position.set(-0.18, 1.04, 0.54);
  const dStem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.26, 6), cloverMat);
  dStem.rotation.z = -0.35;
  daisyFlower.add(dStem);
  const dCenter = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 })
  );
  dCenter.position.set(0.05, 0.13, 0.02);
  daisyFlower.add(dCenter);
  const dPetalMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  for (let p = 0; p < 6; p++) {
    const ang = (p / 6) * Math.PI * 2;
    const pt = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), dPetalMat);
    pt.position.set(0.05 + Math.cos(ang) * 0.06, 0.13 + Math.sin(ang) * 0.06, 0.02);
    daisyFlower.add(pt);
  }
  pigFigure.add(daisyFlower);

  // Arms + Lv 10 Lavender Sleeves + Lv 19 Harvest Basket + Lv 20 Mint Watering Can
  const armGeo = new THREE.CapsuleGeometry(0.095, 0.24, 6, 10);
  const lavenderShirtMat = new THREE.MeshStandardMaterial({ color: 0xc084fc, roughness: 0.6 });

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.46, 0.84, 0.05);
  leftArm.rotation.z = -0.26;
  leftArm.add(new THREE.Mesh(armGeo, pigMat));
  const leftHoof = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.08, 10), hoofMat);
  leftHoof.position.y = -0.18;
  leftArm.add(leftHoof);
  const leftSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.142, 0.19, 12), lavenderShirtMat);
  leftSleeve.position.y = 0.04;
  leftArm.add(leftSleeve);
  pigFigure.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.46, 0.84, 0.05);
  rightArm.rotation.z = 0.26;
  rightArm.add(new THREE.Mesh(armGeo, pigMat));
  const rightHoof = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.08, 10), hoofMat);
  rightHoof.position.y = -0.18;
  rightArm.add(rightHoof);
  const rightSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.142, 0.19, 12), lavenderShirtMat);
  rightSleeve.position.y = 0.04;
  rightArm.add(rightSleeve);
  pigFigure.add(rightArm);

  // Lv 19: Woven Harvest Basket on Right Arm
  const harvestBasket = new THREE.Group();
  harvestBasket.position.set(0.08, -0.28, 0.08);
  const bskMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.78 });
  const bskBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.11, 0.18, 12), bskMat);
  harvestBasket.add(bskBowl);
  const bskHandle = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.018, 6, 12, Math.PI), bskMat);
  bskHandle.position.y = 0.09;
  harvestBasket.add(bskHandle);
  const berry = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 })
  );
  berry.position.set(0, 0.1, 0.02);
  harvestBasket.add(berry);
  rightArm.add(harvestBasket);

  // Lv 20: Mint Watering Can on Left Arm
  const wateringCan = new THREE.Group();
  wateringCan.position.set(-0.08, -0.28, 0.08);
  const canMat = new THREE.MeshStandardMaterial({ color: 0x2dd4bf, roughness: 0.35, metalness: 0.18 });
  const canBody = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.22, 12), canMat);
  wateringCan.add(canBody);
  const canHandle = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 6, 12, Math.PI), canMat);
  canHandle.position.y = 0.11;
  wateringCan.add(canHandle);
  const canSpout = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.24, 8), canMat);
  canSpout.position.set(0, 0.02, 0.18);
  canSpout.rotation.x = 0.85;
  wateringCan.add(canSpout);
  const canRose = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.028, 0.04, 8), canMat);
  canRose.position.set(0, 0.09, 0.27);
  canRose.rotation.x = 0.85;
  wateringCan.add(canRose);
  leftArm.add(wateringCan);

  // Legs + Lv 14 Striped Socks + Lv 16/17 Sunny Rain Boots
  const makeLeg = (side: -1 | 1) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.2, 0.28, 0.04);
    const thigh = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), pigMat);
    thigh.scale.set(0.95, 1.12, 1.05);
    leg.add(thigh);
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.08, 0.22, 10), pigMat);
    shin.position.y = -0.14;
    leg.add(shin);
    const footHoof = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, 0.09, 10), hoofMat);
    footHoof.position.set(0, -0.23, 0.05);
    leg.add(footHoof);

    const sock = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.096, 0.19, 12),
      new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.72 })
    );
    sock.position.y = -0.14;
    leg.add(sock);

    const boot = new THREE.Group();
    boot.position.set(0, -0.22, 0.05);
    const sole = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.055, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
    );
    sole.position.y = -0.02;
    boot.add(sole);
    const upper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.105, 0.115, 0.16, 12),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 })
    );
    upper.position.set(0, 0.07, -0.02);
    boot.add(upper);
    const toe = new THREE.Mesh(
      new THREE.SphereGeometry(0.105, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 })
    );
    toe.scale.set(1, 0.65, 1.12);
    toe.position.set(0, 0.04, 0.08);
    boot.add(toe);
    leg.add(boot);

    pigFigure.add(leg);
    return { leg, sock, boot };
  };
  const leftLegObj = makeLeg(-1);
  const rightLegObj = makeLeg(1);

  // Clothing layers:
  // Lv 7: Lemon Yellow Undershirt
  const yellowUndershirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.39, 0.48, 0.46, 20),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.72 })
  );
  yellowUndershirt.position.set(0, 0.69, 0.01);
  pigFigure.add(yellowUndershirt);

  // Lv 8: Polka-Dot Bloomers
  const bloomers = new THREE.Mesh(
    new THREE.CylinderGeometry(0.47, 0.38, 0.25, 20),
    new THREE.MeshStandardMaterial({ color: 0x7dd3fc, roughness: 0.72 })
  );
  bloomers.position.set(0, 0.35, 0.01);
  pigFigure.add(bloomers);

  // Lv 10: Lavender Shirt
  const lavenderShirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.41, 0.5, 0.48, 20),
    lavenderShirtMat
  );
  lavenderShirt.position.set(0, 0.69, 0.01);
  pigFigure.add(lavenderShirt);

  // Lv 11: Pearl Shirt Buttons
  const shirtButtons = new THREE.Group();
  const pearlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
  for (const by of [0.82, 0.69, 0.56]) {
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), pearlMat);
    btn.scale.set(1, 1, 0.55);
    btn.position.set(0, by, 0.48);
    shirtButtons.add(btn);
  }
  pigFigure.add(shirtButtons);

  // Lv 12: Sky-Blue Denim Overalls Skirt
  const denimOveralls = new THREE.Group();
  const denimMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.65 });
  const skirtPart = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.62, 0.34, 24), denimMat);
  skirtPart.position.set(0, 0.36, 0.01);
  skirtPart.castShadow = true;
  denimOveralls.add(skirtPart);
  const bib = new THREE.Mesh(
    new THREE.CylinderGeometry(0.428, 0.475, 0.28, 16, 1, false, -0.56, 1.12),
    denimMat
  );
  bib.position.set(0, 0.66, 0.025);
  denimOveralls.add(bib);
  const overallBtnMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 });
  for (const side of [-1, 1]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.19, 0.05), denimMat);
    strap.position.set(side * 0.16, 0.86, 0.38);
    strap.rotation.x = -0.22;
    denimOveralls.add(strap);
    const oBtn = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), overallBtnMat);
    oBtn.scale.set(1, 1, 0.55);
    oBtn.position.set(side * 0.16, 0.78, 0.45);
    denimOveralls.add(oBtn);
  }
  pigFigure.add(denimOveralls);

  // Lv 18: Straw Sunhat with Flower
  const sunhat = new THREE.Group();
  sunhat.position.set(0, 1.59, 0.03);
  const strawHatMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.72 });
  const sBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.54, 0.04, 20), strawHatMat);
  sunhat.add(sBrim);
  const sCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.29, 0.18, 18), strawHatMat);
  sCrown.position.y = 0.1;
  sunhat.add(sCrown);
  const sRibbon = new THREE.Mesh(
    new THREE.TorusGeometry(0.27, 0.028, 8, 18),
    new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.45 })
  );
  sRibbon.rotation.x = Math.PI / 2;
  sRibbon.position.y = 0.04;
  sunhat.add(sRibbon);
  const hatFlower = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.07, 0),
    new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.4 })
  );
  hatFlower.position.set(0.26, 0.08, 0.14);
  sunhat.add(hatFlower);
  pigFigure.add(sunhat);

  const setLevel = (level: number) => {
    const lv = Math.max(0, Math.min(20, level));
    root.visible = lv >= 1;
    if (lv === 0) return;

    cloverBed.visible = lv >= 1 && lv <= 4;
    pigFigure.visible = lv >= 2;
    shadowDisc.visible = lv >= 1;

    if (lv === 2) {
      pigFigure.position.set(0, 0.32, 0.06);
      pigFigure.rotation.x = -0.92;
      pigFigure.scale.setScalar(0.66);
      leftLegObj.leg.rotation.x = -0.4;
      rightLegObj.leg.rotation.x = -0.4;
    } else if (lv === 3 || lv === 4) {
      pigFigure.position.set(0, -0.06, 0);
      pigFigure.rotation.x = 0;
      pigFigure.scale.setScalar(0.74);
      leftLegObj.leg.rotation.x = -1.2;
      rightLegObj.leg.rotation.x = -1.2;
    } else if (lv >= 5) {
      pigFigure.position.set(0, 0, 0);
      pigFigure.rotation.x = 0;
      leftLegObj.leg.rotation.x = 0;
      rightLegObj.leg.rotation.x = 0;
      let s = 0.78;
      if (lv >= 6) s = 0.88;
      if (lv >= 9) s = 0.98;
      if (lv >= 15) s = 1.08;
      pigFigure.scale.setScalar(s);
    }

    closedEyes.visible = lv === 2;
    openEyes.visible = lv >= 3;
    daisyFlower.visible = lv === 4;

    yellowUndershirt.visible = lv >= 7 && lv < 10;
    bloomers.visible = lv >= 8 && lv < 12;
    lavenderShirt.visible = lv >= 10;
    leftSleeve.visible = lv >= 10;
    rightSleeve.visible = lv >= 10;
    shirtButtons.visible = lv >= 11 && lv < 12;
    denimOveralls.visible = lv >= 12;
    earBow.visible = lv >= 13;
    leftLegObj.sock.visible = lv >= 14;
    rightLegObj.sock.visible = lv >= 14;
    leftLegObj.boot.visible = lv >= 16;
    rightLegObj.boot.visible = lv >= 17;
    sunhat.visible = lv >= 18;
    harvestBasket.visible = lv >= 19;
    wateringCan.visible = lv >= 20;
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
