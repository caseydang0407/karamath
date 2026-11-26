export type TimeOfDayTheme = 'day' | 'sunset' | 'night';

export interface LightingState {
  theme: TimeOfDayTheme;
  hourFloat: number;
  skyHex: number;
  fogHex: number;
  sunHex: number;
  sunIntensity: number;
  sunPosition: [number, number, number];
  hemiSkyHex: number;
  hemiGroundHex: number;
  hemiIntensity: number;
  rimHex: number;
  rimIntensity: number;
  ambientGlowFactor: number; // 0 in bright day, up to 1 at night for windows & lanterns
  nightStarsOpacity: number; // 0 in day, up to 1 at night
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function lerpHexColor(hexA: number, hexB: number, t: number): number {
  const k = clamp01(t);
  const ar = (hexA >> 16) & 0xff;
  const ag = (hexA >> 8) & 0xff;
  const ab = hexA & 0xff;
  const br = (hexB >> 16) & 0xff;
  const bg = (hexB >> 8) & 0xff;
  const bb = hexB & 0xff;
  const r = Math.round(lerp(ar, br, k));
  const g = Math.round(lerp(ag, bg, k));
  const b = Math.round(lerp(ab, bb, k));
  return (r << 16) | (g << 8) | b;
}

interface PaletteStop {
  sky: number;
  fog: number;
  sun: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  rim: number;
  rimIntensity: number;
  ambientGlowFactor: number;
  nightStarsOpacity: number;
}

const DAY_PALETTE: PaletteStop = {
  sky: 0xbfe8ff,
  fog: 0xbfe8ff,
  sun: 0xfff1d6,
  sunIntensity: 1.5,
  hemiSky: 0xdbeafe,
  hemiGround: 0x4d7c0f,
  hemiIntensity: 0.65,
  rim: 0x93c5fd,
  rimIntensity: 0.45,
  ambientGlowFactor: 0.25,
  nightStarsOpacity: 0,
};

const SUNSET_PALETTE: PaletteStop = {
  sky: 0xffa876,
  fog: 0xfdba74,
  sun: 0xff8a47,
  sunIntensity: 1.32,
  hemiSky: 0xfecdd3,
  hemiGround: 0x654321,
  hemiIntensity: 0.56,
  rim: 0xc084fc,
  rimIntensity: 0.52,
  ambientGlowFactor: 0.72,
  nightStarsOpacity: 0.25,
};

const NIGHT_PALETTE: PaletteStop = {
  sky: 0x172554,
  fog: 0x1e293b,
  sun: 0xbfdbfe,
  sunIntensity: 0.62,
  hemiSky: 0x475569,
  hemiGround: 0x1e3a2f,
  hemiIntensity: 0.48,
  rim: 0x818cf8,
  rimIntensity: 0.42,
  ambientGlowFactor: 1.0,
  nightStarsOpacity: 0.92,
};

function blendPalette(a: PaletteStop, b: PaletteStop, t: number): PaletteStop {
  return {
    sky: lerpHexColor(a.sky, b.sky, t),
    fog: lerpHexColor(a.fog, b.fog, t),
    sun: lerpHexColor(a.sun, b.sun, t),
    sunIntensity: lerp(a.sunIntensity, b.sunIntensity, t),
    hemiSky: lerpHexColor(a.hemiSky, b.hemiSky, t),
    hemiGround: lerpHexColor(a.hemiGround, b.hemiGround, t),
    hemiIntensity: lerp(a.hemiIntensity, b.hemiIntensity, t),
    rim: lerpHexColor(a.rim, b.rim, t),
    rimIntensity: lerp(a.rimIntensity, b.rimIntensity, t),
    ambientGlowFactor: lerp(a.ambientGlowFactor, b.ambientGlowFactor, t),
    nightStarsOpacity: lerp(a.nightStarsOpacity, b.nightStarsOpacity, t),
  };
}

export function getTimeOverrideFromUrl(): TimeOfDayTheme | null {
  if (typeof window === 'undefined') return null;
  const val = new URLSearchParams(window.location.search).get('time');
  if (val === 'day' || val === 'sunset' || val === 'night') return val;
  return null;
}

export function computeLightingCycle(
  now: Date = new Date(),
  overrideTheme: TimeOfDayTheme | null = null
): LightingState {
  let hourFloat = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  if (overrideTheme === 'day') hourFloat = 12.5;
  else if (overrideTheme === 'sunset') hourFloat = 18.0;
  else if (overrideTheme === 'night') hourFloat = 22.0;

  let theme: TimeOfDayTheme = 'day';
  let palette: PaletteStop = DAY_PALETTE;

  if (hourFloat >= 5.5 && hourFloat < 7.25) {
    // Dawn transition: Night -> Sunset glow -> Day
    if (hourFloat < 6.35) {
      const t = smoothstep(5.5, 6.35, hourFloat);
      palette = blendPalette(NIGHT_PALETTE, SUNSET_PALETTE, t);
      theme = t < 0.5 ? 'night' : 'sunset';
    } else {
      const t = smoothstep(6.35, 7.25, hourFloat);
      palette = blendPalette(SUNSET_PALETTE, DAY_PALETTE, t);
      theme = t < 0.5 ? 'sunset' : 'day';
    }
  } else if (hourFloat >= 7.25 && hourFloat < 16.75) {
    theme = 'day';
    palette = DAY_PALETTE;
  } else if (hourFloat >= 16.75 && hourFloat < 19.75) {
    // Golden sunset transition: Day -> Sunset -> Night
    if (hourFloat < 18.25) {
      const t = smoothstep(16.75, 18.0, hourFloat);
      palette = blendPalette(DAY_PALETTE, SUNSET_PALETTE, t);
      theme = t < 0.35 ? 'day' : 'sunset';
    } else {
      const t = smoothstep(18.25, 19.75, hourFloat);
      palette = blendPalette(SUNSET_PALETTE, NIGHT_PALETTE, t);
      theme = t < 0.55 ? 'sunset' : 'night';
    }
  } else {
    theme = 'night';
    palette = NIGHT_PALETTE;
  }

  // Sun / Moon arc across sky
  let sunPosition: [number, number, number];
  if (hourFloat >= 6 && hourFloat <= 19.5) {
    const dayArc = clamp01((hourFloat - 6) / 13.5);
    const angle = dayArc * Math.PI;
    sunPosition = [
      Math.cos(angle) * -16,
      Math.max(5.5, Math.sin(angle) * 20),
      10,
    ];
  } else {
    // Soft moon position
    sunPosition = [-10, 15, -8];
  }

  return {
    theme,
    hourFloat,
    skyHex: palette.sky,
    fogHex: palette.fog,
    sunHex: palette.sun,
    sunIntensity: palette.sunIntensity,
    sunPosition,
    hemiSkyHex: palette.hemiSky,
    hemiGroundHex: palette.hemiGround,
    hemiIntensity: palette.hemiIntensity,
    rimHex: palette.rim,
    rimIntensity: palette.rimIntensity,
    ambientGlowFactor: palette.ambientGlowFactor,
    nightStarsOpacity: palette.nightStarsOpacity,
  };
}
