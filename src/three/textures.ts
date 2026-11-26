import * as THREE from 'three';

export interface ProceduralTextureSet {
  grassMap: THREE.CanvasTexture;
  grassBump: THREE.CanvasTexture;
  woodMap: THREE.CanvasTexture;
  stoneMap: THREE.CanvasTexture;
  stoneBump: THREE.CanvasTexture;
  shingleMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  dispose: () => void;
}

function configureTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  repeatX: number,
  repeatY: number,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.max(1, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  // 1. Grass color + bump
  const grassCanvas = document.createElement('canvas');
  grassCanvas.width = 256;
  grassCanvas.height = 256;
  const gctx = grassCanvas.getContext('2d')!;
  gctx.fillStyle = '#47a63f';
  gctx.fillRect(0, 0, 256, 256);

  const grassBumpCanvas = document.createElement('canvas');
  grassBumpCanvas.width = 256;
  grassBumpCanvas.height = 256;
  const gbctx = grassBumpCanvas.getContext('2d')!;
  gbctx.fillStyle = '#808080';
  gbctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 900; i++) {
    const x = (Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1 * 256;
    const y = (Math.sin(i * 78.233) * 23421.631 % 1 + 1) % 1 * 256;
    const r = 3 + (i % 7);
    gctx.fillStyle = i % 3 === 0 ? '#55b84b' : i % 3 === 1 ? '#3c9635' : '#65c458';
    gctx.beginPath();
    gctx.arc(x, y, r, 0, Math.PI * 2);
    gctx.fill();

    gbctx.fillStyle = i % 2 === 0 ? '#9c9c9c' : '#686868';
    gbctx.beginPath();
    gbctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
    gbctx.fill();
  }

  // 2. Warm wood planks
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 256;
  woodCanvas.height = 256;
  const wctx = woodCanvas.getContext('2d')!;
  wctx.fillStyle = '#a46431';
  wctx.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 4; row++) {
    const y = row * 64;
    wctx.fillStyle = row % 2 === 0 ? '#b26f39' : '#965928';
    wctx.fillRect(0, y, 256, 62);
    wctx.fillStyle = '#6f3e17';
    wctx.fillRect(0, y + 61, 256, 3);
    for (let g = 0; g < 16; g++) {
      wctx.fillStyle = 'rgba(72, 36, 10, 0.16)';
      wctx.fillRect(0, y + g * 4, 256, 1.5);
    }
  }

  // 3. Stone cobble + bump
  const stoneCanvas = document.createElement('canvas');
  stoneCanvas.width = 256;
  stoneCanvas.height = 256;
  const sctx = stoneCanvas.getContext('2d')!;
  sctx.fillStyle = '#b4a38d';
  sctx.fillRect(0, 0, 256, 256);

  const stoneBumpCanvas = document.createElement('canvas');
  stoneBumpCanvas.width = 256;
  stoneBumpCanvas.height = 256;
  const sbctx = stoneBumpCanvas.getContext('2d')!;
  sbctx.fillStyle = '#555555';
  sbctx.fillRect(0, 0, 256, 256);

  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const cx = c * 42 + (r % 2) * 20 + 12;
      const cy = r * 42 + 12;
      sctx.fillStyle = (r + c) % 3 === 0 ? '#cec0ab' : (r + c) % 3 === 1 ? '#bfb09a' : '#a89882';
      sctx.beginPath();
      sctx.roundRect(cx % 230, cy % 230, 34, 30, 10);
      sctx.fill();

      sbctx.fillStyle = '#bcbcbc';
      sbctx.beginPath();
      sbctx.roundRect(cx % 230, cy % 230, 34, 30, 10);
      sbctx.fill();
    }
  }

  // 4. Shingle roof texture
  const shingleCanvas = document.createElement('canvas');
  shingleCanvas.width = 256;
  shingleCanvas.height = 256;
  const shctx = shingleCanvas.getContext('2d')!;
  shctx.fillStyle = '#c4512c';
  shctx.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 8; r++) {
    const y = r * 32;
    for (let c = 0; c < 8; c++) {
      const x = c * 32 + (r % 2) * 16;
      shctx.fillStyle = (r + c) % 2 === 0 ? '#cf5b34' : '#b24623';
      shctx.beginPath();
      shctx.roundRect(x - 16, y, 30, 30, 8);
      shctx.fill();
    }
  }

  // 5. Soft radial contact shadow disc
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const shdCtx = shadowCanvas.getContext('2d')!;
  const grad = shdCtx.createRadialGradient(64, 64, 8, 64, 64, 62);
  grad.addColorStop(0, 'rgba(30, 45, 25, 0.55)');
  grad.addColorStop(0.6, 'rgba(30, 45, 25, 0.22)');
  grad.addColorStop(1, 'rgba(30, 45, 25, 0)');
  shdCtx.fillStyle = grad;
  shdCtx.fillRect(0, 0, 128, 128);
  const contactShadowMap = new THREE.CanvasTexture(shadowCanvas);
  contactShadowMap.colorSpace = THREE.SRGBColorSpace;
  contactShadowMap.needsUpdate = true;

  const grassMap = configureTexture(grassCanvas, true, 5, 5, maxAnisotropy);
  const grassBump = configureTexture(grassBumpCanvas, false, 5, 5, maxAnisotropy);
  const woodMap = configureTexture(woodCanvas, true, 2, 2, maxAnisotropy);
  const stoneMap = configureTexture(stoneCanvas, true, 2, 2, maxAnisotropy);
  const stoneBump = configureTexture(stoneBumpCanvas, false, 2, 2, maxAnisotropy);
  const shingleMap = configureTexture(shingleCanvas, true, 3, 3, maxAnisotropy);

  return {
    grassMap,
    grassBump,
    woodMap,
    stoneMap,
    stoneBump,
    shingleMap,
    contactShadowMap,
    dispose: () => {
      grassMap.dispose();
      grassBump.dispose();
      woodMap.dispose();
      stoneMap.dispose();
      stoneBump.dispose();
      shingleMap.dispose();
      contactShadowMap.dispose();
    },
  };
}

export function drawPedestalNumberCanvas(
  canvas: HTMLCanvasElement,
  valueText: string,
  keyBadge: string,
  highlightState: 'idle' | 'hover' | 'correct' | 'wrong'
): void {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // Warm parchment plaque background
  let bg = '#fff8e7';
  let border = '#9a642c';
  let textCol = '#3f2208';
  if (highlightState === 'hover') {
    bg = '#fef08a';
    border = '#d97706';
  } else if (highlightState === 'correct') {
    bg = '#bbf7d0';
    border = '#15803d';
    textCol = '#14532d';
  } else if (highlightState === 'wrong') {
    bg = '#fecaca';
    border = '#b91c1c';
    textCol = '#7f1d1d';
  }

  ctx.fillStyle = border;
  ctx.beginPath();
  ctx.roundRect(8, 8, w - 16, h - 16, 36);
  ctx.fill();

  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(18, 18, w - 36, h - 36, 28);
  ctx.fill();

  // Key badge in top-left corner
  ctx.fillStyle = '#e7d2b0';
  ctx.beginPath();
  ctx.arc(54, 54, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6b4218';
  ctx.font = 'bold 24px Nunito, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(keyBadge, 54, 55);

  // Main answer numeral
  ctx.fillStyle = textCol;
  const fontSize = valueText.length >= 3 ? 96 : 118;
  ctx.font = `900 ${fontSize}px Fredoka, Nunito, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(valueText, w / 2, h / 2 + 10);
}
