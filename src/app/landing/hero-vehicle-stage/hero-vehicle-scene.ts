import type { Group, Mesh, Object3D } from 'three';

export interface HeroSceneOptions {
  canvas: HTMLCanvasElement;
  modelUrl: string;
  reducedMotion: boolean;
  onProgress: (fraction: number) => void;
  onLoaded: () => void;
  onIdentified: () => void;
  onError: () => void;
}

export interface HeroScene {
  /** Liga/desliga o loop de render (usado quando o palco sai da tela). */
  setActive(active: boolean): void;
  resize(): void;
  dispose(): void;
}

// Comprimento da picape na cena (a escala real do GLB é minúscula e é normalizada).
const CAR_LENGTH = 5;
// Giro do modelo para que a frente aponte para +X.
const FRONT_YAW = Math.PI;
const SWEEP_SECONDS = 2.2;

const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Cena three.js do palco: carrega a Raptor R, revela o veículo com uma varredura
 * de "scanner" e depois deixa a câmera oscilando devagar. O three.js é importado
 * dinamicamente para ficar num chunk separado do bundle inicial.
 */
export async function createHeroScene(opts: HeroSceneOptions): Promise<HeroScene> {
  const [THREE, { GLTFLoader }, { MeshoptDecoder }, { RoomEnvironment }] = await Promise.all([
    import('three'),
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/libs/meshopt_decoder.module.js'),
    import('three/examples/jsm/environments/RoomEnvironment.js')
  ]);

  const { canvas, reducedMotion } = opts;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // O carro é estático: a sombra é calculada uma vez (após o load) em vez de a cada frame.
  renderer.shadowMap.autoUpdate = false;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  scene.environmentIntensity = 0.9;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  // Enquadramento só na frente da picape (a frente aponta para -X).
  const target = new THREE.Vector3(-CAR_LENGTH / 2 + 1.4, 0.95, 0);

  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(1.5, 8, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -4.5;
  key.shadow.camera.right = 4.5;
  key.shadow.camera.top = 4.5;
  key.shadow.camera.bottom = -4.5;
  key.shadow.bias = -0.0004;
  key.shadow.radius = 5;
  scene.add(key);

  // Piso: só recebe sombra (o fundo da página aparece por trás) + brilho azul suave.
  const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.2 }));
  shadowFloor.rotation.x = -Math.PI / 2;
  shadowFloor.receiveShadow = true;
  scene.add(shadowFloor);

  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = glowCanvas.height = 256;
  const gctx = glowCanvas.getContext('2d')!;
  const grad = gctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(46,125,209,.30)');
  grad.addColorStop(1, 'rgba(46,125,209,0)');
  gctx.fillStyle = grad;
  gctx.fillRect(0, 0, 256, 256);
  const glowTexture = new THREE.CanvasTexture(glowCanvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(6.6, 3.2),
    new THREE.MeshBasicMaterial({ map: glowTexture, transparent: true, depthWrite: false })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.005;
  scene.add(glow);

  // Barra do scanner que acompanha a borda da revelação.
  const barCanvas = document.createElement('canvas');
  barCanvas.width = 4;
  barCanvas.height = 128;
  const bctx = barCanvas.getContext('2d')!;
  const bgrad = bctx.createLinearGradient(0, 0, 0, 128);
  bgrad.addColorStop(0, 'rgba(127,179,228,0)');
  bgrad.addColorStop(0.5, 'rgba(127,179,228,.95)');
  bgrad.addColorStop(1, 'rgba(127,179,228,0)');
  bctx.fillStyle = bgrad;
  bctx.fillRect(0, 0, 4, 128);
  const barTexture = new THREE.CanvasTexture(barCanvas);
  barTexture.colorSpace = THREE.SRGBColorSpace;
  const bar = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 2.6),
    new THREE.MeshBasicMaterial({ map: barTexture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  bar.rotation.y = Math.PI / 2;
  bar.position.y = 1.05;
  scene.add(bar);

  // Revelação por plano de corte: mantém tudo com x <= constant.
  const clip = new THREE.Plane(new THREE.Vector3(-1, 0, 0), -CAR_LENGTH);
  const revealDone = () => {
    renderer.clippingPlanes = [];
    bar.visible = false;
  };

  let car: Group | null = null;
  let disposed = false;
  let active = true;
  let raf = 0;
  let elapsed = 0;
  let last = performance.now();
  let identified = false;
  let sweepStart = -1;
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };

  const onPointer = (e: PointerEvent) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  };
  if (!reducedMotion) window.addEventListener('pointermove', onPointer, { passive: true });

  const onContextLost = (e: Event) => {
    e.preventDefault();
    stop();
    opts.onError();
  };
  canvas.addEventListener('webglcontextlost', onContextLost);

  // Distância que enquadra a picape em qualquer proporção de tela.
  const fitDistance = () => {
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const byHeight = 1.3 / tan;
    const byWidth = 1.7 / (tan * camera.aspect);
    return Math.max(byHeight, byWidth);
  };

  const placeCamera = (azimuth: number, elevation: number, distance: number) => {
    camera.position.set(
      target.x + distance * Math.cos(elevation) * Math.sin(azimuth),
      target.y + distance * Math.sin(elevation),
      target.z + distance * Math.cos(elevation) * Math.cos(azimuth)
    );
    camera.lookAt(target);
  };

  const frame = (now: number) => {
    raf = 0;
    if (disposed || !active) return;
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    elapsed += dt;
    adaptQuality(dt);
    renderFrame();
    raf = requestAnimationFrame(frame);
  };

  // Resolução adaptativa: em máquinas fracas (frame > ~30 ms) baixa o pixel ratio aos poucos
  // até o movimento ficar fluido, em vez de deixar o veículo "travado".
  let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  let slowTime = 0;
  let slowFrames = 0;
  const adaptQuality = (dt: number) => {
    slowTime += dt;
    slowFrames++;
    if (slowTime < 1) return;
    const avg = slowTime / slowFrames;
    slowTime = 0;
    slowFrames = 0;
    if (avg > 0.03 && pixelRatio > 0.6) {
      pixelRatio = Math.max(0.6, pixelRatio * 0.8);
      resize();
    }
  };

  const renderFrame = () => {
    const dist = fitDistance();
    // Pose final: de frente para a picape, levemente girada e elevada.
    const restAz = THREE.MathUtils.degToRad(-78);
    const restEl = THREE.MathUtils.degToRad(7);

    if (car && !identified) {
      if (sweepStart < 0) sweepStart = elapsed;
      const t = (elapsed - sweepStart) / SWEEP_SECONDS;
      const p = ease(t);
      const x = lerp(-CAR_LENGTH / 2 - 0.2, -CAR_LENGTH / 2 + 3.4, p);
      clip.constant = x + 0.06;
      bar.position.x = x;
      (bar.material as { opacity: number }).opacity = Math.sin(Math.min(1, t) * Math.PI) * 0.9 + 0.1;
      placeCamera(lerp(THREE.MathUtils.degToRad(-30), restAz, p), lerp(0.03, restEl, p), dist * lerp(0.82, 1, p));
      if (t >= 1) {
        identified = true;
        revealDone();
        opts.onIdentified();
      }
    } else {
      pointer.sx += (pointer.x - pointer.sx) * 0.05;
      pointer.sy += (pointer.y - pointer.sy) * 0.05;
      const sway = reducedMotion ? 0 : Math.sin(elapsed * 0.35) * 0.1;
      placeCamera(restAz + sway + pointer.sx * 0.12, restEl - pointer.sy * 0.03, dist);
    }
    renderer.render(scene, camera);
  };

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (!raf) renderFrame();
  };

  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const start = () => {
    if (raf || disposed || !active) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  const dispose = () => {
    disposed = true;
    stop();
    window.removeEventListener('pointermove', onPointer);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    scene.traverse((o: Object3D) => {
      const mesh = o as Mesh;
      mesh.geometry?.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      for (const m of materials) {
        for (const v of Object.values(m)) {
          if (v && (v as { isTexture?: boolean }).isTexture) (v as { dispose(): void }).dispose();
        }
        m.dispose();
      }
    });
    glowTexture.dispose();
    barTexture.dispose();
    envTexture.dispose();
    pmrem.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  };

  resize();

  // Carrega e normaliza o modelo (o GLB original tem ~2 cm; aqui vira ~5 m).
  try {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(opts.modelUrl, (e) => {
      if (e.lengthComputable && e.total) opts.onProgress(e.loaded / e.total);
    });
    if (disposed) return { setActive() {}, resize() {}, dispose };

    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = CAR_LENGTH / Math.max(size.x, size.z);
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    model.traverse((o: Object3D) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      // Vidro com transmissão força um segundo passe de render da cena inteira a cada frame;
      // um vidro translúcido comum fica quase igual e custa bem menos.
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of materials) {
        const phys = m as import('three').MeshPhysicalMaterial;
        if (phys.transmission > 0) {
          phys.transmission = 0;
          phys.transparent = true;
          phys.opacity = 0.28;
          phys.depthWrite = false;
          phys.needsUpdate = true;
        }
      }
    });

    car = new THREE.Group();
    car.add(model);
    // O comprimento do GLB fica em Z; gira para alinhar ao eixo X da cena.
    car.rotation.y = (size.z >= size.x ? Math.PI / 2 : 0) + FRONT_YAW;
    scene.add(car);
    renderer.shadowMap.needsUpdate = true;
  } catch {
    if (!disposed) opts.onError();
    return { setActive() {}, resize() {}, dispose };
  }

  opts.onLoaded();

  if (reducedMotion) {
    // Sem animação: já mostra a pose final e avisa que identificou.
    identified = true;
    revealDone();
    renderFrame();
    opts.onIdentified();
  } else {
    renderer.clippingPlanes = [clip];
    start();
  }

  return {
    setActive(value: boolean) {
      active = value;
      if (value && !reducedMotion) start();
      else stop();
    },
    resize,
    dispose
  };
}
