import type { WeatherType } from '../game/types';

export interface WeatherMoodModifiers {
  weather: WeatherType;
  skyTintHex: number;
  skyBlend: number;
  fogTintHex: number;
  fogDensity: number;
  sunMultiplier: number;
  hemiMultiplier: number;
  cloudColorHex: number;
  windStrength: number;
  rainOpacity: number;
  snowOpacity: number;
}

const WEATHER_MOODS: Record<WeatherType, WeatherMoodModifiers> = {
  clear: {
    weather: 'clear',
    skyTintHex: 0xbfe8ff,
    skyBlend: 0,
    fogTintHex: 0xbfe8ff,
    fogDensity: 0.011,
    sunMultiplier: 1.0,
    hemiMultiplier: 1.0,
    cloudColorHex: 0xffffff,
    windStrength: 1.0,
    rainOpacity: 0,
    snowOpacity: 0,
  },
  rain: {
    weather: 'rain',
    skyTintHex: 0x64748b,
    skyBlend: 0.56,
    fogTintHex: 0x7c8da3,
    fogDensity: 0.019,
    sunMultiplier: 0.52,
    hemiMultiplier: 0.78,
    cloudColorHex: 0x94a3b8,
    windStrength: 1.85,
    rainOpacity: 0.72,
    snowOpacity: 0,
  },
  snow: {
    weather: 'snow',
    skyTintHex: 0xe2e8f0,
    skyBlend: 0.48,
    fogTintHex: 0xdbeafe,
    fogDensity: 0.017,
    sunMultiplier: 0.76,
    hemiMultiplier: 0.96,
    cloudColorHex: 0xf1f5f9,
    windStrength: 1.2,
    rainOpacity: 0,
    snowOpacity: 0.9,
  },
};

export function getWeatherOverrideFromUrl(): WeatherType | null {
  if (typeof window === 'undefined') return null;
  const val = new URLSearchParams(window.location.search).get('weather');
  if (val === 'clear' || val === 'rain' || val === 'snow') return val;
  return null;
}

export function getWeatherMoodModifiers(weather: WeatherType): WeatherMoodModifiers {
  return WEATHER_MOODS[weather];
}

export function pickRandomWeather(
  rng: () => number = Math.random,
  previous?: WeatherType
): WeatherType {
  const r = rng();
  let candidate: WeatherType;
  if (r < 0.44) candidate = 'clear';
  else if (r < 0.74) candidate = 'rain';
  else candidate = 'snow';

  // Encourage noticeable variety when cycling weather
  if (previous && candidate === previous) {
    const r2 = rng();
    if (previous === 'clear') return r2 < 0.52 ? 'rain' : 'snow';
    if (previous === 'rain') return r2 < 0.6 ? 'clear' : 'snow';
    return r2 < 0.6 ? 'clear' : 'rain';
  }
  return candidate;
}
