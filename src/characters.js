import * as THREE from "three";

const app = document.querySelector("#app");
const backToMazeButton = document.querySelector("#backToMazeButton");
const previousCharacterButton = document.querySelector("#previousCharacterButton");
const nextCharacterButton = document.querySelector("#nextCharacterButton");
const characterNameLabel = document.querySelector("#characterNameLabel");
const animateButton = document.querySelector("#animateButton");

// Asset base
function getAssetBase() {
  if (import.meta.env?.BASE_URL) {
    return import.meta.env.BASE_URL;
  }

  return './public/';
}

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030712);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);

const orbit = {
  yaw: 0,
  pitch: 0.42,
  distance: 4.3,
  minDistance: 2.4,
  maxDistance: 7.2,
  minPitch: 0.15,
  maxPitch: Math.PI * 0.48,
  isDragging: false,
  lastX: 0,
  lastY: 0,
  target: new THREE.Vector3(0, 0.95, 0),
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function updateCameraFromOrbit() {
  const cosPitch = Math.cos(orbit.pitch);
  const x = orbit.target.x + orbit.distance * Math.sin(orbit.yaw) * cosPitch;
  const y = orbit.target.y + orbit.distance * Math.sin(orbit.pitch);
  const z = orbit.target.z + orbit.distance * Math.cos(orbit.yaw) * cosPitch;

  camera.position.set(x, y, z);
  camera.lookAt(orbit.target);
}

updateCameraFromOrbit();

renderer.domElement.style.touchAction = "none";
renderer.domElement.addEventListener("contextmenu", (event) => event.preventDefault());
renderer.domElement.addEventListener("pointerdown", (event) => {
  orbit.isDragging = true;
  orbit.lastX = event.clientX;
  orbit.lastY = event.clientY;
});

window.addEventListener("pointerup", () => {
  orbit.isDragging = false;
});

window.addEventListener("pointermove", (event) => {
  if (!orbit.isDragging) {
    return;
  }

  const dx = event.clientX - orbit.lastX;
  const dy = event.clientY - orbit.lastY;
  orbit.lastX = event.clientX;
  orbit.lastY = event.clientY;

  orbit.yaw -= dx * 0.008;
  orbit.pitch = clamp(orbit.pitch + dy * 0.006, orbit.minPitch, orbit.maxPitch);
});

renderer.domElement.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    orbit.distance = clamp(orbit.distance + event.deltaY * 0.006, orbit.minDistance, orbit.maxDistance);
  },
  { passive: false }
);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
keyLight.position.set(3.5, 5.5, 4.5);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.45);
rimLight.position.set(-4, 2.5, -4);
scene.add(rimLight);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(2.8, 40),
  new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.95,
    metalness: 0,
  })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const ring = new THREE.Mesh(
  new THREE.RingGeometry(2.95, 3.15, 48),
  new THREE.MeshStandardMaterial({
    color: 0x1d4ed8,
    roughness: 0.45,
    metalness: 0.06,
  })
);
ring.rotation.x = -Math.PI / 2;
scene.add(ring);

// Character builders
function createPacmanModel(size) {
  const pacman = new THREE.Group();
  const radius = size * 0.38;
  const baseLift = radius;

  const textureLoader = new THREE.TextureLoader();

  const pacmanMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd60a,
    roughness: 0.35,
    metalness: 0.05,
  });

  const upperHemisphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    pacmanMaterial
  );
  upperHemisphere.rotation.x = -0.32;
  upperHemisphere.position.y = baseLift;
  upperHemisphere.name = 'pacman_upper';

  const lowerHemisphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    pacmanMaterial
  );
  lowerHemisphere.rotation.x = 0.32;
  lowerHemisphere.position.y = baseLift;
  lowerHemisphere.name = 'pacman_lower';

  const mouthTexture = textureLoader.load('./img/pacman_fundo_para_a_boca.png');
  const mouthMaterial = new THREE.MeshBasicMaterial({ map: mouthTexture });
  const capGeometry = new THREE.CircleGeometry(radius, 32);

  const upperCap = new THREE.Mesh(capGeometry, mouthMaterial);
  upperCap.rotation.x = Math.PI / 2;
  upperHemisphere.add(upperCap);

  const lowerCap = new THREE.Mesh(capGeometry, mouthMaterial);
  lowerCap.rotation.x = -Math.PI / 2;
  lowerHemisphere.add(lowerCap);

  const eyeTexture = textureLoader.load('./img/pacman_olho.png');

  const eyeMaterial = new THREE.MeshBasicMaterial({
    map: eyeTexture,
    transparent: true,
    alphaTest: 0.1,
    side: THREE.DoubleSide,
  });

  const eyeSize = radius * 0.85;
  const eyeGeometry = new THREE.PlaneGeometry(eyeSize, eyeSize);

  function putOnSurface(x, y, z) {
    return new THREE.Vector3(x, y, z).normalize().multiplyScalar(radius * 1.005);
  }

  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.copy(putOnSurface(-0.8, 1.0, 1.8));
  leftEye.lookAt(leftEye.position.clone().multiplyScalar(2));
  upperHemisphere.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.copy(putOnSurface(0.8, 1.0, 1.8));
  rightEye.lookAt(rightEye.position.clone().multiplyScalar(2));
  upperHemisphere.add(rightEye);

  pacman.add(upperHemisphere, lowerHemisphere);
  return pacman;
}

function createGhostModel(color, size) {
  const ghost = new THREE.Group();
  const bodyWidth = size * 0.68;
  const halfWidth = bodyWidth / 2;
  const totalHeight = size * 0.95;
  const sideTopY = totalHeight * 0.62;
  const bodyDepth = size * 0.58;
  const scallopRadius = bodyWidth * 0.15;
  const scallopCenters = [bodyWidth * 0.28, 0, -bodyWidth * 0.28];
  const glowColor = new THREE.Color(color);

  const ghostMaterial = new THREE.MeshStandardMaterial({
    color: glowColor,
    roughness: 0.4,
    metalness: 0.04,
    emissive: glowColor.clone(),
    emissiveIntensity: 0.38,
  });

  const silhouette = new THREE.Shape();
  silhouette.moveTo(-halfWidth, 0);
  silhouette.lineTo(-halfWidth, sideTopY);
  silhouette.bezierCurveTo(
    -halfWidth * 0.95,
    totalHeight * 0.86,
    -halfWidth * 0.48,
    totalHeight * 1.03,
    0,
    totalHeight
  );
  silhouette.bezierCurveTo(
    halfWidth * 0.48,
    totalHeight * 1.03,
    halfWidth * 0.95,
    totalHeight * 0.86,
    halfWidth,
    sideTopY
  );
  silhouette.lineTo(halfWidth, 0);
  silhouette.lineTo(scallopCenters[0] + scallopRadius, 0);

  for (let i = 0; i < scallopCenters.length; i += 1) {
    const centerX = scallopCenters[i];
    silhouette.absarc(centerX, 0, scallopRadius, 0, Math.PI, true);

    if (i < scallopCenters.length - 1) {
      silhouette.lineTo(scallopCenters[i + 1] + scallopRadius, 0);
    }
  }

  silhouette.lineTo(-halfWidth, 0);

  const ghostGeometry = new THREE.ExtrudeGeometry(silhouette, {
    depth: bodyDepth,
    bevelEnabled: true,
    bevelThickness: size * 0.02,
    bevelSize: size * 0.016,
    bevelSegments: 2,
    curveSegments: 28,
  });
  ghostGeometry.translate(0, 0, -bodyDepth / 2);

  const shell = new THREE.Mesh(ghostGeometry, ghostMaterial);
  // Raise body so the lower scallops are clearly visible above the floor.
  shell.position.y = scallopRadius;

  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0x020617,
    roughness: 0.35,
    metalness: 0,
  });
  const eyeGeometry = new THREE.SphereGeometry(bodyWidth * 0.085, 16, 12);

  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.scale.set(0.9, 1.45, 0.75);
  leftEye.position.set(-bodyWidth * 0.22, totalHeight * 0.76 + scallopRadius, bodyDepth / 2 + 0.01);

  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.scale.set(0.9, 1.45, 0.75);
  rightEye.position.set(bodyWidth * 0.22, totalHeight * 0.76 + scallopRadius, bodyDepth / 2 + 0.01);

  const glowLight = new THREE.PointLight(color, 0.45, size * 5, 2);
  glowLight.position.set(0, totalHeight * 0.38 + scallopRadius, 0);

  ghost.add(shell, leftEye, rightEye, glowLight);

  return ghost;
}

// Character viewer state
const tileSize = 2;
const characterDefinitions = [
  { name: "Pacman", build: () => createPacmanModel(tileSize) },
  { name: "Blinky", build: () => createGhostModel(0xef4444, tileSize) },
  { name: "Inky", build: () => createGhostModel(0x38bdf8, tileSize) },
  { name: "Clyde", build: () => createGhostModel(0xf97316, tileSize) },
  { name: "Pinky", build: () => createGhostModel(0xe879f9, tileSize) },
];

let characterIndex = 0;
let activeCharacter = null;
let animationsEnabled = false;

function showCharacter(index) {
  characterIndex = (index + characterDefinitions.length) % characterDefinitions.length;

  if (activeCharacter) {
    scene.remove(activeCharacter);
  }

  const selected = characterDefinitions[characterIndex];
  activeCharacter = selected.build();
  scene.add(activeCharacter);
  const bbox = new THREE.Box3().setFromObject(activeCharacter);
  const minY = bbox.min.y;
  const desiredFloorY = 0.03;
  const baseY = desiredFloorY - minY;
  activeCharacter.position.y = baseY;
  activeCharacter.userData.baseY = baseY;
  activeCharacter.userData.animPhase = Math.random() * Math.PI * 2;
  activeCharacter.userData.animType = selected.name === 'Pacman' ? 'pacman' : 'ghost';
  activeCharacter.traverse((c) => {
    if (c.type === 'PointLight' || c.isLight) {
      c.userData = c.userData || {};
      c.userData.baseIntensity = c.intensity;
    }
  });

  characterNameLabel.textContent = selected.name;
  orbit.yaw = 0;
  orbit.pitch = 0.42;
  orbit.distance = 4.3;
  orbit.target.set(0, 0.95, 0);
  updateCameraFromOrbit();
}

showCharacter(0);

previousCharacterButton.addEventListener("click", () => {
  showCharacter(characterIndex - 1);
});

nextCharacterButton.addEventListener("click", () => {
  showCharacter(characterIndex + 1);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    showCharacter(characterIndex - 1);
  }

  if (event.key === "ArrowRight") {
    showCharacter(characterIndex + 1);
  }

  if (event.key === "Escape") {
    window.location.href = "./index.html";
  }
});

backToMazeButton.addEventListener("click", () => {
  window.location.href = "./index.html";
});

animateButton.addEventListener('click', () => {
  animationsEnabled = !animationsEnabled;
  animateButton.textContent = animationsEnabled ? 'Parar' : 'Animar';
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  const t = clock.getElapsedTime();
  keyLight.position.x = 3.5 + Math.cos(t * 0.8) * 0.35;

  if (activeCharacter) {
    const t = clock.getElapsedTime();
    if (animationsEnabled) {
      activeCharacter.rotation.y += 0.02;
      const phase = activeCharacter.userData.animPhase || 0;
      if (activeCharacter.userData.animType === 'pacman') {
        const mouthSpeed = 6.0;
        const mouthAmount = 0.6;
        const mouthOpen = Math.max(0, Math.sin(t * mouthSpeed + phase));
        const upper = activeCharacter.getObjectByName('pacman_upper');
        const lower = activeCharacter.getObjectByName('pacman_lower');
        if (upper) upper.rotation.x = -0.32 - mouthOpen * mouthAmount;
        if (lower) lower.rotation.x = 0.32 + mouthOpen * mouthAmount;
        activeCharacter.position.y = activeCharacter.userData.baseY + Math.sin(t * 2.2 + phase) * 0.03;
        activeCharacter.traverse((c) => {
          if (c.type === 'PointLight' || c.isLight) {
            c.intensity = (c.userData?.baseIntensity ?? c.intensity) + Math.sin(t * 3 + phase) * 0.18;
          }
          if (c.material && 'emissiveIntensity' in c.material) {
            c.material.emissiveIntensity = 0.38 + Math.sin(t * 3 + phase) * 0.18;
          }
        });
      } else {
        const speed = 2.6;
        const amount = 0.18;
        activeCharacter.position.y = activeCharacter.userData.baseY + Math.sin(t * speed + phase) * amount;
        activeCharacter.traverse((c) => {
          if (c.type === 'PointLight' || c.isLight) {
            c.intensity = (c.userData?.baseIntensity ?? c.intensity) + Math.sin(t * 3 + phase) * 0.35;
          }
          if (c.material && 'emissiveIntensity' in c.material) {
            c.material.emissiveIntensity = 0.38 + Math.sin(t * 3 + phase) * 0.35;
          }
        });
      }
    } else {
      activeCharacter.rotation.y += 0.004;
      activeCharacter.position.y = activeCharacter.userData?.baseY || 0.03;
      activeCharacter.traverse((c) => {
        if (c.type === 'PointLight' || c.isLight) {
          if (c.userData && typeof c.userData.baseIntensity !== 'undefined') c.intensity = c.userData.baseIntensity;
        }
        if (c.material && 'emissiveIntensity' in c.material) {
          c.material.emissiveIntensity = Math.max(c.material.emissiveIntensity, 0.38);
        }
        if (c.name === 'pacman_upper') c.rotation.x = -0.32;
        if (c.name === 'pacman_lower') c.rotation.x = 0.32;
      });
    }
  }

  updateCameraFromOrbit();
  renderer.render(scene, camera);
}

animate();

// Audio
const assetBase = getAssetBase();
const charMusic = new Audio(`${assetBase}audio/characters_theme.mp3`); 
charMusic.loop = true;
charMusic.volume = 0.4;
charMusic.preload = 'auto';

function startCharacterMusic() {
  if (charMusic.paused) {
    charMusic.currentTime = 0;
    charMusic.muted = true;
    charMusic.play().then(() => {
      charMusic.muted = false;
      charMusic.volume = 0.4;
    }).catch(() => {});
  }
}

startCharacterMusic();
document.addEventListener('pointerdown', startCharacterMusic, { once: true });