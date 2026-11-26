import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type {
  CharacterId,
  CharacterOutfitSelection,
  GameScreenState,
  UpgradeId,
  VisitorSpecies,
  WeatherType,
} from '../game/types';
import {
  computeLightingCycle,
  getTimeOverrideFromUrl,
  type LightingState,
  type TimeOfDayTheme,
} from './lightingCycle';
import {
  createFlyingBird,
  createKaitlynChick,
  createKaraBunny,
  createLanternPergolaGroup,
  createMeadowIsland,
  createNetherlandsWindmillGroup,
  createOrchardGroup,
  createProgressiveHouseGroup,
  createVisitingCritter,
  createWishingWellGroup,
  type CharacterHandle,
  type FlyingBirdHandle,
  type UpgradeVisualHandle,
  type VisitingCritterHandle,
} from './models';
import { createProceduralTextures, type ProceduralTextureSet } from './textures';
import {
  getWeatherMoodModifiers,
  getWeatherOverrideFromUrl,
  pickRandomWeather,
} from './weatherSystem';

export interface SceneSnapshotInput {
  screenState: GameScreenState;
  upgrades: Record<UpgradeId, number>;
  karaOutfits: CharacterOutfitSelection;
  kaitlynOutfits: CharacterOutfitSelection;
}

const DEFAULT_PLAYING_CAM_POS = new THREE.Vector3(0, 6.9, 14.2);
const DEFAULT_PLAYING_LOOK = new THREE.Vector3(0, 1.0, -0.9);
const _spherical = new THREE.Spherical();
const _offset = new THREE.Vector3();

interface BurstParticle {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  scale: number;
  colorHex: number;
}

interface PrecipDrop {
  x: number;
  y: number;
  z: number;
  speed: number;
  phase: number;
}

const _vec3 = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _baseSky = new THREE.Color();
const _baseFog = new THREE.Color();
const _tintColor = new THREE.Color();
const _cloudTarget = new THREE.Color();

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class MeadowSceneController {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private textures: ProceduralTextureSet;
  private isSoftwareGl: boolean;

  private skyColor: THREE.Color;
  private fog: THREE.FogExp2;
  private hemi: THREE.HemisphereLight;
  private sun: THREE.DirectionalLight;
  private rim: THREE.DirectionalLight;
  private nightStars: THREE.Points;
  private nightStarsMat: THREE.PointsMaterial;
  private timeOverride: TimeOfDayTheme | null;
  private cachedLighting: LightingState;
  private lastLightingSyncMs = -99999;
  private currentGlowFactor = 0.25;

  // Weather system
  private weatherOverride: WeatherType | null;
  private weather: WeatherType;
  private weatherSwitchTimer = 18;
  private currentRainAlpha = 0;
  private currentSnowAlpha = 0;
  private currentSkyBlend = 0;
  private currentSunMult = 1;
  private currentHemiMult = 1;
  private currentWindStrength = 1;
  private rainMesh: THREE.InstancedMesh;
  private rainMat: THREE.MeshBasicMaterial;
  private rainDrops: PrecipDrop[] = [];
  private rainSplashMesh: THREE.InstancedMesh;
  private rainSplashMat: THREE.MeshBasicMaterial;
  private snowMesh: THREE.InstancedMesh;
  private snowMat: THREE.MeshBasicMaterial;
  private snowFlakes: PrecipDrop[] = [];

  // Characters & landmarks
  private kara: CharacterHandle;
  private kaitlyn: CharacterHandle;
  private upgradeHandles: Record<Exclude<UpgradeId, 'kara' | 'kaitlyn'>, UpgradeVisualHandle>;
  private clouds: THREE.Group[] = [];
  private cloudMat: THREE.MeshStandardMaterial;

  // Clickable streak-triggered visiting animal (rabbit / squirrel)
  private visitorCritter: VisitingCritterHandle;
  private visitorActive = false;
  private visitorSpecies: VisitorSpecies = 'rabbit';
  private visitorCelebrateTimer = 0;
  private lastVisitorUiEmitMs = 0;
  private onVisitorClick?: (species: VisitorSpecies) => void;
  private onVisitorScreenPos?: (pos: { x: number; y: number } | null) => void;

  // Clickable flock of flying birds
  private flockGroup: THREE.Group;
  private birds: FlyingBirdHandle[] = [];
  private birdHitboxes: THREE.Mesh[] = [];
  private flockActive = true;
  private flockProgress = 0.36;
  private flockDir: 1 | -1 = 1;
  private flockAltitude = 3.1;
  private flockZ = -4.2;
  private flockCooldown = 0;
  private birdChirpTimer = 0;
  private chirpedBirdIndex = -1;
  private hoveringInteractive = false;

  // Celebration particles & ambient fireflies
  private particleMesh: THREE.InstancedMesh;
  private particles: BurstParticle[] = [];
  private particleCursor = 0;

  private fireflyMesh: THREE.InstancedMesh;
  private fireflyMat: THREE.MeshBasicMaterial;
  private fireflyCount = 24;

  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2(-99, -99);
  private pointerDownPos: { x: number; y: number } | null = null;
  private lastRaycastMs = 0;

  private controls: OrbitControls;
  private resettingView = false;
  private glideSphericalActive = false;
  private glideTargetRadius = 15.8;
  private glideTargetTheta = 0;
  private glideTargetPhi = 1.15;

  private screenState: GameScreenState = 'title';
  private cheerTimer = 0;
  private wobbleTimer = 0;
  private cameraShakeTrauma = 0;

  private onBirdClick: () => void;
  private lastTickMs = typeof performance !== 'undefined' ? performance.now() : 0;
  private elapsed = 0;
  private frameId = 0;
  private disposed = false;
  private resizeObserver: ResizeObserver;
  private currentLookAt = new THREE.Vector3(-2.4, 1.5, -1.2);

  constructor(
    container: HTMLElement,
    initial: SceneSnapshotInput,
    onBirdClick: () => void,
    onVisitorClick?: (species: VisitorSpecies) => void,
    onVisitorScreenPos?: (pos: { x: number; y: number } | null) => void
  ) {
    this.container = container;
    this.onBirdClick = onBirdClick;
    this.onVisitorClick = onVisitorClick;
    this.onVisitorScreenPos = onVisitorScreenPos;
    this.isSoftwareGl = detectSoftwareGl();
    this.timeOverride = getTimeOverrideFromUrl();
    this.weatherOverride = getWeatherOverrideFromUrl();
    this.weather = this.weatherOverride ?? 'clear';

    const initMood = getWeatherMoodModifiers(this.weather);
    this.currentRainAlpha = initMood.rainOpacity;
    this.currentSnowAlpha = initMood.snowOpacity;
    this.currentSkyBlend = initMood.skyBlend;
    this.currentSunMult = initMood.sunMultiplier;
    this.currentHemiMult = initMood.hemiMultiplier;
    this.currentWindStrength = initMood.windStrength;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = Math.max(320, container.clientWidth || window.innerWidth);
    const height = Math.max(240, container.clientHeight || window.innerHeight);
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.skyColor = new THREE.Color(0xbfe8ff);
    this.scene.background = this.skyColor;
    this.fog = new THREE.FogExp2(0xbfe8ff, initMood.fogDensity);
    this.scene.fog = this.fog;

    this.camera = new THREE.PerspectiveCamera(44, width / height, 0.2, 140);
    if (initial.screenState === 'title') {
      this.camera.position.set(8.2, 5.8, 12.2);
      this.currentLookAt.set(-2.6, 1.5, -1.2);
    } else {
      this.camera.position.copy(DEFAULT_PLAYING_CAM_POS);
      this.currentLookAt.copy(DEFAULT_PLAYING_LOOK);
    }
    this.camera.lookAt(this.currentLookAt);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.enableZoom = true;
    this.controls.enableRotate = true;
    this.controls.rotateSpeed = 0.72;
    this.controls.zoomSpeed = 0.9;
    this.controls.minDistance = 5.5;
    this.controls.maxDistance = 24;
    this.controls.minPolarAngle = 0.28;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.08;
    this.controls.target.copy(this.currentLookAt);
    this.controls.enabled = initial.screenState !== 'title';
    this.controls.update();
    this.controls.addEventListener('start', this.handleControlsStart);

    // Studio environment reflection
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Real-time outdoor lighting rig (1 shadow caster max)
    this.hemi = new THREE.HemisphereLight(0xdbeafe, 0x4d7c0f, 0.65);
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xfff1d6, 1.5);
    this.sun.position.set(12, 18, 10);
    this.sun.castShadow = !this.isSoftwareGl;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.near = 2;
    this.sun.shadow.camera.far = 48;
    const d = 15;
    this.sun.shadow.camera.left = -d;
    this.sun.shadow.camera.right = d;
    this.sun.shadow.camera.top = d;
    this.sun.shadow.camera.bottom = -d;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun);

    this.rim = new THREE.DirectionalLight(0x93c5fd, 0.45);
    this.rim.position.set(-12, 8, -10);
    this.scene.add(this.rim);

    // Night sky starfield dome
    const starPositions = new Float32Array(180 * 3);
    for (let i = 0; i < 180; i++) {
      const theta = ((i * 137.5) % 360) * (Math.PI / 180);
      const phi = 0.14 + (((i * 29) % 100) / 100) * 1.15;
      const rad = 60 + (i % 7) * 1.5;
      starPositions[i * 3] = Math.cos(theta) * Math.cos(phi) * rad;
      starPositions[i * 3 + 1] = Math.sin(phi) * rad + 2;
      starPositions[i * 3 + 2] = Math.sin(theta) * Math.cos(phi) * rad;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    this.nightStarsMat = new THREE.PointsMaterial({
      color: 0xfef9c3,
      size: 0.65,
      transparent: true,
      opacity: 0,
      fog: false,
      depthWrite: false,
    });
    this.nightStars = new THREE.Points(starGeo, this.nightStarsMat);
    this.scene.add(this.nightStars);

    // Procedural textures & world assembly
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);

    const island = createMeadowIsland(this.textures);
    this.scene.add(island);

    // Kara (Bunny) and Kaitlyn (Chick) side-by-side at center meadow (no 3D answer stones blocking them!)
    this.kara = createKaraBunny(this.textures);
    this.kara.group.position.set(-0.95, 0, 0.35);
    this.kara.group.rotation.y = 0.14;
    this.scene.add(this.kara.group);

    this.kaitlyn = createKaitlynChick(this.textures);
    this.kaitlyn.group.position.set(1.05, 0, 0.35);
    this.kaitlyn.group.rotation.y = -0.14;
    this.scene.add(this.kaitlyn.group);

    // Upgradable 3D Meadow Landmarks, Progressive House, Sky Spinner Windmill, Apple Orchard & Wishing Well
    const cottage = createProgressiveHouseGroup(this.textures);
    cottage.group.position.set(-2.4, 0, -4.4);
    cottage.group.rotation.y = 0.26;
    this.scene.add(cottage.group);

    const windmill = createNetherlandsWindmillGroup(this.textures);
    windmill.group.position.set(-8.6, 0, -4.3);
    windmill.group.rotation.y = 0.45;
    windmill.group.scale.setScalar(0.78);
    this.scene.add(windmill.group);

    const orchard = createOrchardGroup(this.textures);
    orchard.group.position.set(-6.0, 0, -1.2);
    this.scene.add(orchard.group);

    const lanterns = createLanternPergolaGroup(this.textures);
    lanterns.group.position.set(5.6, 0, -0.6);
    lanterns.group.rotation.y = -0.65;
    this.scene.add(lanterns.group);

    const well = createWishingWellGroup(this.textures);
    well.group.position.set(2.8, 0, -4.4);
    well.group.rotation.y = -0.22;
    this.scene.add(well.group);

    this.upgradeHandles = {
      orchard,
      windmill,
      lanterns,
      well,
      cottage,
    };

    // Visiting streak critter (rabbit or squirrel)
    this.visitorCritter = createVisitingCritter(this.textures);
    this.visitorCritter.group.position.set(2.85, 0, 1.65);
    this.visitorCritter.group.rotation.y = -0.45;
    this.visitorCritter.group.visible = false;
    this.scene.add(this.visitorCritter.group);

    // Soft drifting sky clouds
    this.cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0,
    });
    const cloudCoords: Array<[number, number, number, number]> = [
      [-14, 10.5, -18, 1.2],
      [8, 12.2, -22, 1.45],
      [19, 9.8, -14, 1.0],
      [-20, 11.0, -8, 1.1],
    ];
    for (const [cx, cy, cz, cs] of cloudCoords) {
      const cg = new THREE.Group();
      for (const [ox, oy, r] of [
        [-0.9, 0, 0.8],
        [0, 0.3, 1.05],
        [0.95, 0.05, 0.78],
      ]) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), this.cloudMat);
        puff.position.set(ox, oy, 0);
        cg.add(puff);
      }
      cg.position.set(cx, cy, cz);
      cg.scale.setScalar(cs);
      this.scene.add(cg);
      this.clouds.push(cg);
    }

    // Clickable flock of 5 flying songbirds across the meadow sky
    this.flockGroup = new THREE.Group();
    this.flockGroup.name = 'FlyingBirdFlock';
    const birdPalette = [0x38bdf8, 0xfbbf24, 0xf472b6, 0x34d399, 0xa78bfa];
    const formationOffsets: Array<[number, number, number]> = [
      [0, 0.2, 0],
      [-1.05, 0.38, -0.75],
      [-1.1, -0.1, 0.82],
      [-2.15, 0.52, -1.35],
      [-2.2, 0.05, 1.38],
    ];
    for (let i = 0; i < 5; i++) {
      const b = createFlyingBird(i, birdPalette[i]);
      const [ox, oy, oz] = formationOffsets[i];
      b.group.position.set(ox, oy, oz);
      this.flockGroup.add(b.group);
      this.birds.push(b);
      this.birdHitboxes.push(b.hitbox);
    }
    this.scene.add(this.flockGroup);

    // Pooled weather precipitation: Raindrops + Puddle splashes + Snowflakes
    const rainCount = 220;
    const rainGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.62, 4);
    this.rainMat = new THREE.MeshBasicMaterial({
      color: 0xdbeafe,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    });
    this.rainMesh = new THREE.InstancedMesh(rainGeo, this.rainMat, rainCount);
    this.rainMesh.frustumCulled = false;
    this.rainMesh.visible = this.currentRainAlpha > 0.01;
    this.scene.add(this.rainMesh);
    for (let i = 0; i < rainCount; i++) {
      this.rainDrops.push({
        x: ((i * 73) % 260) / 10 - 13,
        y: ((i * 37) % 140) / 10,
        z: ((i * 53) % 190) / 10 - 11,
        speed: 14 + (i % 5) * 1.8,
        phase: i * 0.7,
      });
    }

    const splashCount = 28;
    const splashGeo = new THREE.RingGeometry(0.06, 0.14, 10);
    splashGeo.rotateX(-Math.PI / 2);
    this.rainSplashMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    this.rainSplashMesh = new THREE.InstancedMesh(splashGeo, this.rainSplashMat, splashCount);
    this.rainSplashMesh.frustumCulled = false;
    this.rainSplashMesh.visible = this.currentRainAlpha > 0.01;
    this.scene.add(this.rainSplashMesh);

    const snowCount = 190;
    const snowGeo = new THREE.OctahedronGeometry(0.115, 0);
    this.snowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    this.snowMesh = new THREE.InstancedMesh(snowGeo, this.snowMat, snowCount);
    this.snowMesh.frustumCulled = false;
    this.snowMesh.visible = this.currentSnowAlpha > 0.01;
    this.scene.add(this.snowMesh);
    for (let i = 0; i < snowCount; i++) {
      this.snowFlakes.push({
        x: ((i * 67) % 260) / 10 - 13,
        y: ((i * 41) % 140) / 10,
        z: ((i * 59) % 190) / 10 - 11,
        speed: 1.55 + (i % 6) * 0.28,
        phase: i * 0.55,
      });
    }

    // Pooled celebration particle ring buffer (48 stars/confetti)
    const pGeo = new THREE.OctahedronGeometry(0.18, 0);
    const pMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.4,
    });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, 48);
    this.particleMesh.frustumCulled = false;
    this.scene.add(this.particleMesh);
    for (let i = 0; i < 48; i++) {
      this.particles.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        scale: 0,
        colorHex: 0xfacc15,
      });
      _dummy.position.set(0, -50, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);
      this.particleMesh.setColorAt(i, _color.setHex(0xfacc15));
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;

    // Ambient floating pollen/fireflies
    const fGeo = new THREE.SphereGeometry(0.075, 8, 8);
    this.fireflyMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    this.fireflyMesh = new THREE.InstancedMesh(fGeo, this.fireflyMat, this.fireflyCount);
    this.fireflyMesh.frustumCulled = false;
    this.scene.add(this.fireflyMesh);

    // Raycaster configured for layer 1 bird hitboxes only
    this.raycaster.layers.set(1);

    this.cachedLighting = computeLightingCycle(new Date(), this.timeOverride);
    this.applyAtmosphereAndLighting(0, true);
    this.syncState(initial);
    this.updateBirdFlock(0);
    this.updateWeatherParticles(0);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    const dom = this.renderer.domElement;
    dom.addEventListener('pointermove', this.handlePointerMove);
    dom.addEventListener('pointerdown', this.handlePointerDown);
    dom.addEventListener('pointerup', this.handlePointerUp);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    this.startLoop();
  }

  getWeather(): WeatherType {
    return this.weather;
  }

  private applyAtmosphereAndLighting(dt: number, immediate: boolean = false): void {
    const nowMs = performance.now();
    if (immediate || nowMs - this.lastLightingSyncMs >= 500) {
      this.lastLightingSyncMs = nowMs;
      this.cachedLighting = computeLightingCycle(new Date(), this.timeOverride);
    }

    const lighting = this.cachedLighting;
    const mood = getWeatherMoodModifiers(this.weather);

    const dampLambda = immediate ? 100 : 1.4;
    this.currentSkyBlend = THREE.MathUtils.damp(this.currentSkyBlend, mood.skyBlend, dampLambda, dt);
    this.currentSunMult = THREE.MathUtils.damp(this.currentSunMult, mood.sunMultiplier, dampLambda, dt);
    this.currentHemiMult = THREE.MathUtils.damp(this.currentHemiMult, mood.hemiMultiplier, dampLambda, dt);
    this.currentWindStrength = THREE.MathUtils.damp(this.currentWindStrength, mood.windStrength, dampLambda, dt);
    this.currentRainAlpha = THREE.MathUtils.damp(this.currentRainAlpha, mood.rainOpacity, dampLambda * 1.4, dt);
    this.currentSnowAlpha = THREE.MathUtils.damp(this.currentSnowAlpha, mood.snowOpacity, dampLambda * 1.4, dt);
    this.fog.density = THREE.MathUtils.damp(this.fog.density, mood.fogDensity, dampLambda, dt);

    _baseSky.setHex(lighting.skyHex);
    _tintColor.setHex(mood.skyTintHex);
    this.skyColor.copy(_baseSky).lerp(_tintColor, this.currentSkyBlend);

    _baseFog.setHex(lighting.fogHex);
    _tintColor.setHex(mood.fogTintHex);
    this.fog.color.copy(_baseFog).lerp(_tintColor, this.currentSkyBlend);

    this.sun.color.setHex(lighting.sunHex);
    this.sun.intensity = lighting.sunIntensity * this.currentSunMult;
    this.sun.position.set(
      lighting.sunPosition[0],
      lighting.sunPosition[1],
      lighting.sunPosition[2]
    );

    this.hemi.color.setHex(lighting.hemiSkyHex);
    this.hemi.groundColor.setHex(lighting.hemiGroundHex);
    this.hemi.intensity = lighting.hemiIntensity * this.currentHemiMult;

    this.rim.color.setHex(lighting.rimHex);
    this.rim.intensity = lighting.rimIntensity;

    const weatherStarMask = Math.max(0, 1 - this.currentSkyBlend * 1.35);
    this.nightStarsMat.opacity = lighting.nightStarsOpacity * weatherStarMask;
    this.currentGlowFactor = lighting.ambientGlowFactor;

    if (lighting.theme === 'night') {
      _cloudTarget.setHex(0x475569);
      this.fireflyMat.color.setHex(0xfde047);
    } else if (lighting.theme === 'sunset') {
      _cloudTarget.setHex(0xfed7aa);
      this.fireflyMat.color.setHex(0xfef08a);
    } else {
      _cloudTarget.setHex(0xffffff);
      this.fireflyMat.color.setHex(0xfef08a);
    }
    _tintColor.setHex(mood.cloudColorHex);
    _cloudTarget.lerp(_tintColor, this.currentSkyBlend * 0.85);
    this.cloudMat.color.copy(_cloudTarget);

    this.upgradeHandles.cottage.setAmbientGlow?.(lighting.ambientGlowFactor);
    this.upgradeHandles.lanterns.setAmbientGlow?.(lighting.ambientGlowFactor);
    this.upgradeHandles.well.setAmbientGlow?.(lighting.ambientGlowFactor);
    this.upgradeHandles.windmill.setAmbientGlow?.(lighting.ambientGlowFactor);
    this.upgradeHandles.orchard.setAmbientGlow?.(lighting.ambientGlowFactor);
  }

  syncState(input: SceneSnapshotInput): void {
    const prevScreen = this.screenState;
    this.screenState = input.screenState;
    const activePlayControls = input.screenState !== 'title';
    this.controls.enabled = activePlayControls;
    if (prevScreen === 'title' && activePlayControls) {
      this.glideSphericalActive = false;
      this.resettingView = true;
    }

    this.kara.setLevel(input.upgrades.kara ?? 0);
    this.kaitlyn.setLevel(input.upgrades.kaitlyn ?? 0);

    (
      Object.keys(this.upgradeHandles) as Array<Exclude<UpgradeId, 'kara' | 'kaitlyn'>>
    ).forEach((id) => {
      this.upgradeHandles[id].setLevel(input.upgrades[id] ?? 0);
    });
  }

  private handleControlsStart = (): void => {
    this.resettingView = false;
    this.glideSphericalActive = false;
  };

  rotateCamera(deltaAzimuthRad: number): void {
    if (this.screenState === 'title') return;
    this.resettingView = false;
    _offset.copy(this.camera.position).sub(this.controls.target);
    _spherical.setFromVector3(_offset);
    if (!this.glideSphericalActive) {
      this.glideTargetRadius = THREE.MathUtils.clamp(_spherical.radius, 5.5, 24);
      this.glideTargetTheta = _spherical.theta;
      this.glideTargetPhi = THREE.MathUtils.clamp(_spherical.phi, 0.28, Math.PI / 2 - 0.08);
    }
    this.glideTargetTheta += deltaAzimuthRad;
    this.glideSphericalActive = true;
  }

  zoomCamera(scaleFactor: number): void {
    if (this.screenState === 'title') return;
    this.resettingView = false;
    _offset.copy(this.camera.position).sub(this.controls.target);
    _spherical.setFromVector3(_offset);
    if (!this.glideSphericalActive) {
      this.glideTargetRadius = THREE.MathUtils.clamp(_spherical.radius, 5.5, 24);
      this.glideTargetTheta = _spherical.theta;
      this.glideTargetPhi = THREE.MathUtils.clamp(_spherical.phi, 0.28, Math.PI / 2 - 0.08);
    }
    this.glideTargetRadius = THREE.MathUtils.clamp(
      this.glideTargetRadius * scaleFactor,
      5.5,
      24
    );
    this.glideSphericalActive = true;
  }

  resetCameraView(): void {
    if (this.screenState === 'title') return;
    this.glideSphericalActive = false;
    this.resettingView = true;
  }

  spawnVisitingAnimal(species: VisitorSpecies): void {
    this.visitorSpecies = species;
    this.visitorCritter.setSpecies(species);
    const side = species === 'rabbit' ? 1 : -1;
    this.visitorCritter.group.position.set(side * 2.85, 0, 1.75);
    this.visitorCritter.group.rotation.y = side * -0.45;
    this.visitorCritter.group.visible = true;
    this.visitorActive = true;
    this.visitorCelebrateTimer = 0.55;
    this.spawnBurst(side * 2.85, 0.75, 1.75, 14);
    this.emitVisitorScreenPos(true);
  }

  dismissVisitingAnimal(): void {
    this.visitorActive = false;
    this.visitorCritter.group.visible = false;
    this.onVisitorScreenPos?.(null);
  }

  private emitVisitorScreenPos(force = false): void {
    if (!this.visitorActive || !this.onVisitorScreenPos) return;
    const now = performance.now();
    if (!force && now - this.lastVisitorUiEmitMs < 70) return;
    this.lastVisitorUiEmitMs = now;
    _vec3.copy(this.visitorCritter.group.position);
    _vec3.y += 1.05;
    _vec3.project(this.camera);
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((_vec3.x + 1) * 0.5) * rect.width;
    const y = ((-_vec3.y + 1) * 0.5) * rect.height;
    this.onVisitorScreenPos({ x, y });
  }

  triggerCorrectFeedback(): void {
    this.cheerTimer = 0.95;
    this.cameraShakeTrauma = 0.28;
    this.spawnBurst(this.kara.group.position.x, 1.65, this.kara.group.position.z, 12);
    if (this.kaitlyn.group.visible) {
      this.spawnBurst(this.kaitlyn.group.position.x, 1.65, this.kaitlyn.group.position.z, 12);
    }
  }

  triggerWrongFeedback(): void {
    this.wobbleTimer = 0.55;
  }

  triggerUpgradeBurst(upgradeId: UpgradeId): void {
    if (upgradeId === 'kara') {
      this.spawnBurst(this.kara.group.position.x, 1.5, this.kara.group.position.z, 24);
      this.cheerTimer = 0.8;
      return;
    }
    if (upgradeId === 'kaitlyn') {
      this.spawnBurst(this.kaitlyn.group.position.x, 1.5, this.kaitlyn.group.position.z, 24);
      this.cheerTimer = 0.8;
      return;
    }
    const target = this.upgradeHandles[upgradeId].group.position;
    if (target.lengthSq() < 0.01) {
      this.spawnBurst(0, 1.8, 0, 24);
    } else {
      this.spawnBurst(target.x, 1.8, target.z, 24);
    }
    this.cheerTimer = 0.75;
  }

  triggerOutfitBurst(character: CharacterId): void {
    const target = character === 'kara' ? this.kara.group.position : this.kaitlyn.group.position;
    this.spawnBurst(target.x, 1.5, target.z, 22);
    this.cheerTimer = 0.85;
  }

  triggerRoundCompleteConfetti(): void {
    this.cheerTimer = 1.4;
    this.cameraShakeTrauma = 0.35;
    this.spawnBurst(-3.5, 2.2, 1.5, 16);
    this.spawnBurst(0, 2.6, 0.5, 16);
    this.spawnBurst(3.5, 2.2, 1.5, 16);
  }

  private spawnBurst(x: number, y: number, z: number, count: number): void {
    const palette = [0xfacc15, 0x4ade80, 0x38bdf8, 0xf472b6, 0xfb923c];
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % this.particles.length;
      const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.4;
      const speed = 2.0 + (i % 5) * 0.7;
      p.active = true;
      p.life = 0;
      p.maxLife = 0.7 + (i % 4) * 0.14;
      p.pos.set(x, y, z);
      p.vel.set(Math.cos(angle) * speed, 3.6 + (i % 4) * 0.85, Math.sin(angle) * speed);
      p.scale = 0.75 + (i % 3) * 0.25;
      p.colorHex = palette[i % palette.length];
    }
  }

  private getInteractiveHitboxes(): THREE.Object3D[] {
    const list: THREE.Object3D[] = [];
    if (this.flockActive) list.push(...this.birdHitboxes);
    if (this.visitorActive) list.push(this.visitorCritter.hitbox);
    return list;
  }

  private handlePointerMove = (e: PointerEvent): void => {
    const now = performance.now();
    if (now - this.lastRaycastMs < 40) return;
    this.lastRaycastMs = now;

    const targets = this.getInteractiveHitboxes();
    if (targets.length === 0) {
      if (this.hoveringInteractive) {
        this.hoveringInteractive = false;
        this.renderer.domElement.style.cursor = 'default';
      }
      return;
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObjects(targets, false);
    const nextHover = hits.length > 0;
    if (nextHover !== this.hoveringInteractive) {
      this.hoveringInteractive = nextHover;
      this.renderer.domElement.style.cursor = nextHover ? 'pointer' : 'default';
    }
  };

  private handlePointerDown = (e: PointerEvent): void => {
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
  };

  private handlePointerUp = (e: PointerEvent): void => {
    if (this.pointerDownPos) {
      const dx = e.clientX - this.pointerDownPos.x;
      const dy = e.clientY - this.pointerDownPos.y;
      this.pointerDownPos = null;
      if (dx * dx + dy * dy > 36) {
        return; // Pointer dragged to rotate OrbitControls, not a click
      }
    }
    const targets = this.getInteractiveHitboxes();
    if (targets.length === 0) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObjects(targets, false);
    if (hits.length > 0) {
      const hitObj = hits[0].object;
      if (hitObj === this.visitorCritter.hitbox && this.visitorActive) {
        const pos = this.visitorCritter.group.position;
        this.spawnBurst(pos.x, 1.0, pos.z, 20);
        this.onVisitorClick?.(this.visitorSpecies);
        this.dismissVisitingAnimal();
        return;
      }
      if (typeof hitObj.userData.birdIndex === 'number') {
        const birdIdx = hitObj.userData.birdIndex as number;
        this.birdChirpTimer = 1.35;
        this.chirpedBirdIndex = birdIdx;
        this.birds[birdIdx].group.getWorldPosition(_vec3);
        this.spawnBurst(_vec3.x, _vec3.y, _vec3.z, 16);
        this.onBirdClick();
      }
    }
  };

  private handleResize(): void {
    if (this.disposed) return;
    const width = Math.max(320, this.container.clientWidth || window.innerWidth);
    const height = Math.max(240, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.render(this.scene, this.camera);
  }

  private startLoop(): void {
    this.lastTickMs = performance.now();
    const tick = () => {
      if (this.disposed) return;
      const nowMs = performance.now();
      const rawDt = Math.max(0.001, (nowMs - this.lastTickMs) / 1000);
      this.lastTickMs = nowMs;
      const dt = Math.min(rawDt, 0.05);
      const camDt = Math.min(rawDt, 0.25);
      this.elapsed += dt;

      this.updateScene(dt, camDt);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.renderer.render(this.scene, this.camera);
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    if (this.disposed) return;
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private animateCharacter(
    char: CharacterHandle,
    phaseOffset: number,
    dt: number,
    cheering: boolean,
    cheerProgress: number,
    wobbling: boolean
  ): void {
    if (cheering) {
      const jump = Math.abs(Math.sin((cheerProgress + phaseOffset * 0.12) * Math.PI * 2)) * 1.02;
      char.bodyGroup.position.y = jump;
      char.bodyGroup.rotation.y = cheerProgress * Math.PI * 2;
      const stretch = 1 + Math.sin(cheerProgress * Math.PI * 4) * 0.16;
      char.bodyGroup.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
      char.leftArm.rotation.z = -0.95;
      char.rightArm.rotation.z = 0.95;
    } else if (wobbling) {
      char.bodyGroup.rotation.z = Math.sin(this.elapsed * 26 + phaseOffset) * 0.16;
      char.bodyGroup.position.y = 0;
    } else {
      const bob = Math.sin(this.elapsed * 2.6 + phaseOffset) * 0.055;
      char.bodyGroup.position.y = Math.max(0, bob);
      char.bodyGroup.rotation.y = THREE.MathUtils.damp(char.bodyGroup.rotation.y, 0, 8, dt);
      char.bodyGroup.rotation.z = THREE.MathUtils.damp(char.bodyGroup.rotation.z, 0, 8, dt);
      char.bodyGroup.scale.set(
        THREE.MathUtils.damp(char.bodyGroup.scale.x, 1, 8, dt),
        THREE.MathUtils.damp(char.bodyGroup.scale.y, 1, 8, dt),
        THREE.MathUtils.damp(char.bodyGroup.scale.z, 1, 8, dt)
      );
      char.leftArm.rotation.z = -0.26 - Math.sin(this.elapsed * 3 + phaseOffset) * 0.07;
      char.rightArm.rotation.z = 0.26 + Math.sin(this.elapsed * 3 + phaseOffset) * 0.07;
    }
  }

  private updateBirdFlock(dt: number): void {
    if (this.birdChirpTimer > 0) {
      this.birdChirpTimer = Math.max(0, this.birdChirpTimer - dt);
      if (this.birdChirpTimer === 0) this.chirpedBirdIndex = -1;
    }

    if (!this.flockActive) {
      this.flockCooldown -= dt;
      this.flockGroup.visible = false;
      if (this.flockCooldown <= 0) {
        this.flockActive = true;
        this.flockProgress = 0;
        this.flockDir = Math.random() < 0.5 ? 1 : -1;
        this.flockAltitude = 2.9 + Math.random() * 1.1;
        this.flockZ = -6.2 + Math.random() * 4.2;
      }
      return;
    }

    this.flockGroup.visible = true;
    this.flockProgress += dt * 0.085;
    if (this.flockProgress >= 1) {
      this.flockActive = false;
      this.flockCooldown = 6 + Math.random() * 5;
      return;
    }

    const x = THREE.MathUtils.lerp(-14.5 * this.flockDir, 14.5 * this.flockDir, this.flockProgress);
    const arcY = this.flockAltitude + Math.sin(this.flockProgress * Math.PI) * 1.15;
    const arcZ = this.flockZ + Math.sin(this.flockProgress * Math.PI * 2) * 1.1;
    this.flockGroup.position.set(x, arcY, arcZ);
    this.flockGroup.rotation.y = this.flockDir === 1 ? 0 : Math.PI;

    const chirping = this.birdChirpTimer > 0;
    const chirpPct = chirping ? 1 - this.birdChirpTimer / 1.35 : 0;

    for (let i = 0; i < this.birds.length; i++) {
      const b = this.birds[i];
      const flapSpeed = chirping ? 28 : 15;
      const flap = Math.sin(this.elapsed * flapSpeed + i * 1.1) * (chirping ? 0.95 : 0.68);
      b.leftWing.rotation.x = flap;
      b.rightWing.rotation.x = -flap;

      if (chirping) {
        const isMain = i === this.chirpedBirdIndex;
        const hopAmp = isMain ? 0.65 : 0.35;
        b.body.position.y = Math.abs(Math.sin(chirpPct * Math.PI * 4 + i * 0.5)) * hopAmp;
        b.body.rotation.z = isMain
          ? chirpPct * Math.PI * 2
          : Math.sin(this.elapsed * 18 + i) * 0.25;
        b.body.scale.setScalar(isMain ? 1.2 : 1.08);
      } else {
        b.body.position.y = Math.sin(this.elapsed * 4.5 + i * 1.4) * 0.14;
        b.body.rotation.z = Math.sin(this.elapsed * 3.5 + i) * 0.08;
        b.body.scale.setScalar(1.0);
      }
    }
  }

  private updateWeatherParticles(dt: number): void {
    // Random periodic weather shifts (unless pinned via URL ?weather=...)
    if (!this.weatherOverride) {
      this.weatherSwitchTimer -= dt;
      if (this.weatherSwitchTimer <= 0) {
        this.weather = pickRandomWeather(Math.random, this.weather);
        this.weatherSwitchTimer = 22 + Math.random() * 12;
      }
    }

    const showRain = this.currentRainAlpha > 0.015;
    this.rainMesh.visible = showRain;
    this.rainSplashMesh.visible = showRain;
    if (showRain) {
      this.rainMat.opacity = this.currentRainAlpha * 0.72;
      this.rainSplashMat.opacity = this.currentRainAlpha * 0.55;
      for (let i = 0; i < this.rainDrops.length; i++) {
        const drop = this.rainDrops[i];
        drop.y -= drop.speed * dt;
        drop.x += 1.45 * dt;
        if (drop.y < 0.15) {
          drop.y = 13.5 + (i % 5) * 0.3;
          drop.x = ((i * 73) % 260) / 10 - 13;
        }
        _dummy.position.set(drop.x, drop.y, drop.z);
        _dummy.rotation.set(0, 0, -0.14);
        _dummy.scale.setScalar(1);
        _dummy.updateMatrix();
        this.rainMesh.setMatrixAt(i, _dummy.matrix);
      }
      this.rainMesh.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < 28; i++) {
        const cycle = (this.elapsed * 2.6 + i * 0.37) % 1;
        const sx = ((i * 89) % 180) / 10 - 9;
        const sz = ((i * 61) % 140) / 10 - 7.5;
        _dummy.position.set(sx, 0.035, sz);
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.setScalar(0.35 + cycle * 1.45);
        _dummy.updateMatrix();
        this.rainSplashMesh.setMatrixAt(i, _dummy.matrix);
      }
      this.rainSplashMesh.instanceMatrix.needsUpdate = true;
    }

    const showSnow = this.currentSnowAlpha > 0.015;
    this.snowMesh.visible = showSnow;
    if (showSnow) {
      this.snowMat.opacity = this.currentSnowAlpha * 0.9;
      for (let i = 0; i < this.snowFlakes.length; i++) {
        const flake = this.snowFlakes[i];
        flake.y -= flake.speed * dt;
        flake.x += Math.sin(this.elapsed * 1.2 + flake.phase) * 0.65 * dt;
        flake.z += Math.cos(this.elapsed * 0.9 + flake.phase) * 0.4 * dt;
        if (flake.y < 0.05) {
          flake.y = 13.5 + (i % 4) * 0.4;
          flake.x = ((i * 67) % 260) / 10 - 13;
        }
        _dummy.position.set(flake.x, flake.y, flake.z);
        _dummy.rotation.set(this.elapsed + i, this.elapsed * 0.8, 0);
        _dummy.scale.setScalar(0.75 + (i % 3) * 0.25);
        _dummy.updateMatrix();
        this.snowMesh.setMatrixAt(i, _dummy.matrix);
      }
      this.snowMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private updateScene(dt: number, camDt: number = dt): void {
    // 0. Real-time day / sunset / night cycle + weather atmosphere mood
    this.applyAtmosphereAndLighting(dt, false);

    // 1. Camera choreography: Title Scenic Tour vs Interactive OrbitControls (rotate + zoom)
    if (this.screenState === 'title') {
      const orbitAngle = Math.sin(this.elapsed * 0.22) * 0.28 + 0.55;
      _targetCamPos.set(Math.sin(orbitAngle) * 14.2, 5.8, Math.cos(orbitAngle) * 14.2);
      _targetLook.set(-2.6, 1.5, -1.2);
      const camLambda = 4.5;
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _targetCamPos.x, camLambda, camDt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _targetCamPos.y, camLambda, camDt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _targetCamPos.z, camLambda, camDt);

      this.currentLookAt.x = THREE.MathUtils.damp(this.currentLookAt.x, _targetLook.x, camLambda, camDt);
      this.currentLookAt.y = THREE.MathUtils.damp(this.currentLookAt.y, _targetLook.y, camLambda, camDt);
      this.currentLookAt.z = THREE.MathUtils.damp(this.currentLookAt.z, _targetLook.z, camLambda, camDt);
      this.controls.target.copy(this.currentLookAt);
      this.camera.lookAt(this.currentLookAt);
    } else {
      if (this.resettingView) {
        const camLambda = 6.5;
        this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, DEFAULT_PLAYING_CAM_POS.x, camLambda, camDt);
        this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, DEFAULT_PLAYING_CAM_POS.y, camLambda, camDt);
        this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, DEFAULT_PLAYING_CAM_POS.z, camLambda, camDt);
        this.controls.target.x = THREE.MathUtils.damp(this.controls.target.x, DEFAULT_PLAYING_LOOK.x, camLambda, camDt);
        this.controls.target.y = THREE.MathUtils.damp(this.controls.target.y, DEFAULT_PLAYING_LOOK.y, camLambda, camDt);
        this.controls.target.z = THREE.MathUtils.damp(this.controls.target.z, DEFAULT_PLAYING_LOOK.z, camLambda, camDt);

        if (
          this.camera.position.distanceToSquared(DEFAULT_PLAYING_CAM_POS) < 0.004 &&
          this.controls.target.distanceToSquared(DEFAULT_PLAYING_LOOK) < 0.004
        ) {
          this.camera.position.copy(DEFAULT_PLAYING_CAM_POS);
          this.controls.target.copy(DEFAULT_PLAYING_LOOK);
          this.resettingView = false;
        }
      } else if (this.glideSphericalActive) {
        const glideLambda = 8.5;
        _offset.copy(this.camera.position).sub(this.controls.target);
        _spherical.setFromVector3(_offset);
        _spherical.radius = THREE.MathUtils.damp(_spherical.radius, this.glideTargetRadius, glideLambda, camDt);
        _spherical.theta = THREE.MathUtils.damp(_spherical.theta, this.glideTargetTheta, glideLambda, camDt);
        _spherical.phi = THREE.MathUtils.damp(_spherical.phi, this.glideTargetPhi, glideLambda, camDt);
        _offset.setFromSpherical(_spherical);
        this.camera.position.copy(this.controls.target).add(_offset);

        if (
          Math.abs(_spherical.radius - this.glideTargetRadius) < 0.02 &&
          Math.abs(_spherical.theta - this.glideTargetTheta) < 0.004
        ) {
          _spherical.radius = this.glideTargetRadius;
          _spherical.theta = this.glideTargetTheta;
          _spherical.phi = this.glideTargetPhi;
          _offset.setFromSpherical(_spherical);
          this.camera.position.copy(this.controls.target).add(_offset);
          this.glideSphericalActive = false;
        }
      }

      if (this.cameraShakeTrauma > 0) {
        const shake = this.cameraShakeTrauma * this.cameraShakeTrauma * 0.14;
        this.controls.target.y = DEFAULT_PLAYING_LOOK.y + Math.sin(this.elapsed * 42) * shake;
        this.cameraShakeTrauma = Math.max(0, this.cameraShakeTrauma - dt * 1.4);
        if (this.cameraShakeTrauma === 0) {
          this.controls.target.y = DEFAULT_PLAYING_LOOK.y;
        }
      }

      this.controls.update();
      this.currentLookAt.copy(this.controls.target);
    }

    // 2. Kara (bunny) & Kaitlyn (chick) kinematics
    const cheering = this.cheerTimer > 0;
    const cheerProgress = cheering ? 1 - this.cheerTimer / 0.95 : 0;
    const wobbling = !cheering && this.wobbleTimer > 0;
    if (this.cheerTimer > 0) {
      this.cheerTimer = Math.max(0, this.cheerTimer - dt);
    } else if (this.wobbleTimer > 0) {
      this.wobbleTimer = Math.max(0, this.wobbleTimer - dt);
    }
    this.animateCharacter(this.kara, 0, dt, cheering, cheerProgress, wobbling);
    this.animateCharacter(this.kaitlyn, 1.3, dt, cheering, cheerProgress, wobbling);

    // 3. Upgradable garden animations & visiting critter bounce
    (
      Object.keys(this.upgradeHandles) as Array<Exclude<UpgradeId, 'kara' | 'kaitlyn'>>
    ).forEach((id) => {
      this.upgradeHandles[id].update(this.elapsed, dt);
    });

    if (this.visitorActive) {
      if (this.visitorCelebrateTimer > 0) {
        this.visitorCelebrateTimer = Math.max(0, this.visitorCelebrateTimer - dt);
      }
      this.visitorCritter.body.position.y = Math.abs(Math.sin(this.elapsed * 4.2)) * 0.22;
      this.visitorCritter.body.rotation.z = Math.sin(this.elapsed * 3.1) * 0.08;
      this.emitVisitorScreenPos(false);
    }

    // 4. Clickable flying bird flock & drifting clouds
    this.updateBirdFlock(dt);
    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i];
      c.position.x += dt * (0.35 + i * 0.08) * this.currentWindStrength;
      if (c.position.x > 26) c.position.x = -26;
    }
    this.nightStars.rotation.y = this.elapsed * 0.01;

    // 5. Weather precipitation (raindrops, puddle ripples, snowflakes)
    this.updateWeatherParticles(dt);

    // 6. Pooled celebratory particles (zero GC)
    let pDirty = false;
    for (let i = 0; i < this.particles.length; i++) {
      const pt = this.particles[i];
      if (!pt.active) continue;
      pDirty = true;
      pt.life += dt;
      if (pt.life >= pt.maxLife) {
        pt.active = false;
        _dummy.position.set(0, -50, 0);
        _dummy.scale.setScalar(0.001);
        _dummy.updateMatrix();
        this.particleMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }
      pt.vel.y -= 9.5 * dt;
      pt.pos.addScaledVector(pt.vel, dt);
      const t = 1 - pt.life / pt.maxLife;
      _dummy.position.copy(pt.pos);
      _dummy.rotation.set(this.elapsed * 4 + i, this.elapsed * 3, 0);
      _dummy.scale.setScalar(pt.scale * t);
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);
      this.particleMesh.setColorAt(i, _color.setHex(pt.colorHex));
    }
    if (pDirty) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    }

    // 7. Ambient floating pollen/fireflies (dimmed during heavy rain)
    const fireflyVisibleFactor = Math.max(0.15, 1 - this.currentRainAlpha);
    const fireflySizeBoost = (1 + this.currentGlowFactor * 0.45) * fireflyVisibleFactor;
    for (let i = 0; i < this.fireflyCount; i++) {
      const angle = this.elapsed * (0.28 + (i % 5) * 0.04) + i * 1.1;
      const rad = 2.5 + (i % 7) * 1.15;
      _vec3.set(
        Math.cos(angle) * rad,
        0.65 + ((i * 0.43) % 2.4) + Math.sin(this.elapsed * 1.8 + i) * 0.25,
        Math.sin(angle) * rad - 0.5
      );
      _dummy.position.copy(_vec3);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.setScalar((0.65 + Math.sin(this.elapsed * 3 + i) * 0.28) * fireflySizeBoost);
      _dummy.updateMatrix();
      this.fireflyMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.fireflyMesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.resizeObserver.disconnect();
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointermove', this.handlePointerMove);
    dom.removeEventListener('pointerdown', this.handlePointerDown);
    dom.removeEventListener('pointerup', this.handlePointerUp);
    this.controls.removeEventListener('start', this.handleControlsStart);
    this.controls.dispose();

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh || (obj as THREE.Points).isPoints) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });
    this.textures.dispose();
    this.renderer.dispose();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}
