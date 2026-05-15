import * as THREE from "three";
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const app = document.querySelector("#app");

// Variáveis Globais
let controls;
let is3DView = false;
let isFreeLook = false;
let cameraAtiva;
const ghostLights = [];

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

// Cena
const scene = new THREE.Scene();

// Câmaras
const camera2D = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
const camera3D = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
cameraAtiva = camera2D;

controls = new OrbitControls(camera3D, renderer.domElement);
controls.enabled = false;
controls.enablePan = false;
controls.minDistance = 2;
controls.maxDistance = 25;
controls.maxPolarAngle = Math.PI / 2;
controls.minPolarAngle = 0;

// Luzes
const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// Labirinto
const mazeLayout = [
  "1111111111111111111111111",
  "1000000000001000000000001",
  "1011110111101011110111101",
  "1010000100001000000000101",
  "1010110101111110101101101",
  "1000100100000000100000001",
  "1110101111011101111010111",
  "1000101000000000001000001",
  "1011101001110111001011101",
  "1000001001000001001000001",
  "1011101001000001001011101",
  "1000101001111111001001001",
  "1011101000000000001010011",
  "1010000000100000100000001",
  "1010111110101111111110101",
  "1000000000000000000000001",
  "1111111111111111111111111",
];

const tileSize = 2;
const wallHeight = 2.5;
const mazeWidth = mazeLayout[0].length * tileSize;
const mazeDepth = mazeLayout.length * tileSize;
const xOffset = -mazeWidth / 2 + tileSize / 2;
const zOffset = -mazeDepth / 2 + tileSize / 2;

function updateCamera2DFraming() {
  const camera2DMargin = 8;
  const aspect = window.innerWidth / window.innerHeight;
  const baseWidth = mazeWidth + camera2DMargin;
  const baseHeight = mazeDepth + camera2DMargin;

  if (aspect >= baseWidth / baseHeight) {
    const halfHeight = baseHeight / 2;
    const halfWidth = halfHeight * aspect;
    camera2D.left = -halfWidth;
    camera2D.right = halfWidth;
    camera2D.top = halfHeight;
    camera2D.bottom = -halfHeight;
  } else {
    const halfWidth = baseWidth / 2;
    const halfHeight = halfWidth / aspect;
    camera2D.left = -halfWidth;
    camera2D.right = halfWidth;
    camera2D.top = halfHeight;
    camera2D.bottom = -halfHeight;
  }

  camera2D.position.set(0, 120, 0);
  camera2D.up.set(0, 0, -1);
  camera2D.lookAt(0, 0, 0);
  camera2D.updateProjectionMatrix();
}
updateCamera2DFraming();

const wallGeometry = new THREE.BoxGeometry(tileSize, wallHeight, tileSize);
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.45, metalness: 0.05 });
const wallsGroup = new THREE.Group();

for (let row = 0; row < mazeLayout.length; row += 1) {
  for (let col = 0; col < mazeLayout[row].length; col += 1) {
    if (mazeLayout[row][col] === "1") {
      const wall = new THREE.Mesh(wallGeometry, wallMaterial);
      wall.position.set(xOffset + col * tileSize, wallHeight / 2, zOffset + row * tileSize);
      wallsGroup.add(wall);
    }
  }
}
scene.add(wallsGroup);

const floorGeometry = new THREE.PlaneGeometry(mazeWidth + 2, mazeDepth + 2);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.95, metalness: 0 });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Pastilhas (Pellets)
const pelletGeometry = new THREE.SphereGeometry(0.24, 8, 8);
const pelletMaterial = new THREE.MeshStandardMaterial({ color: 0xffddaa, roughness: 0.5, metalness: 0.1 });
const pelletsGroup = new THREE.Group();

// --- NOVO: GRUPO DOS POWER PELLETS E CEREJA ---
const powerPelletsGroup = new THREE.Group();
const powerPelletGeo = new THREE.SphereGeometry(0.5, 16, 16);
const powerPelletMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6 });

// Função genérica para gerar posições válidas (cerejas, laranjas, etc)
function generateValidPositions(count = 3, excludePositions = []) {
  const validPositions = [];
  const selectedPositions = [];
  
  // Recolher todas as posições válidas
  for (let row = 0; row < mazeLayout.length; row += 1) {
    for (let col = 0; col < mazeLayout[row].length; col += 1) {
      const isWall = mazeLayout[row][col] === "1";
      const isGhostHouse = (row === 9 || row === 10) && (col >= 10 && col <= 14);
      const isGhostDoor = (row === 8 && col === 12);
      const isPowerPellet = (row === 1 && col === 1) || (row === 1 && col === 23) || (row === 15 && col === 1) || (row === 15 && col === 23);
      const isPacmanStart = (row === 12 && col === 12);
      const isExcluded = excludePositions.some(pos => pos.row === row && pos.col === col);
      
      if (!isWall && !isGhostHouse && !isGhostDoor && !isPowerPellet && !isPacmanStart && !isExcluded) {
        validPositions.push({ row, col });
      }
    }
  }
  
  // Selecionar 'count' posições aleatórias
  for (let i = 0; i < count && validPositions.length > 0; i++) {
    const randomIdx = Math.floor(Math.random() * validPositions.length);
    const selectedPos = validPositions[randomIdx];
    selectedPositions.push(selectedPos);
    validPositions.splice(randomIdx, 1);
  }
  
  return selectedPositions;
}

const cherryPositions = generateValidPositions(3);
const orangePositions = generateValidPositions(2, cherryPositions);
const bananaPositions = generateValidPositions(1, cherryPositions.concat(orangePositions));

for (let row = 0; row < mazeLayout.length; row += 1) {
  for (let col = 0; col < mazeLayout[row].length; col += 1) {
    const isGhostHouse = (row === 9 || row === 10) && (col >= 10 && col <= 14);
    const isGhostDoor = (row === 8 && col === 12);
    const isCherryTile = cherryPositions.some(pos => pos.row === row && pos.col === col);
    const isOrangeTile = orangePositions.some(pos => pos.row === row && pos.col === col);
    const isBananaTile = bananaPositions.some(pos => pos.row === row && pos.col === col);

    if (mazeLayout[row][col] === "0" && !isGhostHouse && !isGhostDoor && !isCherryTile && !isOrangeTile && !isBananaTile) {
      const worldPos = gridToWorld(row, col);
      // Os 4 cantos do labirinto recebem Power Pellets
      if ((row === 1 && col === 1) || (row === 1 && col === 23) || (row === 15 && col === 1) || (row === 15 && col === 23)) {
          const pp = new THREE.Mesh(powerPelletGeo, powerPelletMat);
          pp.userData.collectibleType = 'power';
          pp.position.set(worldPos.x, 0.6, worldPos.z);
          powerPelletsGroup.add(pp);
      } else {
          const pellet = new THREE.Mesh(pelletGeometry, pelletMaterial);
          pellet.userData.collectibleType = 'normal';
          pellet.position.set(worldPos.x, 0.6, worldPos.z);
          pelletsGroup.add(pellet);
      }
    }
  }
}
scene.add(pelletsGroup);
scene.add(powerPelletsGroup);

// --- NOVO: CEREJA 3D ---
function createCherryModel() {
  const cherry = new THREE.Group();
  
  // Fruto esquerdo (esfera vermelha)
  const fruitGeo = new THREE.SphereGeometry(0.32, 24, 24);
  const fruitMat = new THREE.MeshStandardMaterial({ 
    color: 0xdc2626, 
    roughness: 0.3, 
    metalness: 0.15,
    emissive: 0xb91c1c,
    emissiveIntensity: 0.2
  });
  const fruitLeft = new THREE.Mesh(fruitGeo, fruitMat);
  fruitLeft.position.set(-0.35, 0, 0);
  cherry.add(fruitLeft);
  
  // Fruto direito (esfera vermelha)
  const fruitRight = new THREE.Mesh(fruitGeo, fruitMat);
  fruitRight.position.set(0.35, 0, 0);
  cherry.add(fruitRight);
  
  // Talo esquerdo (curvo, converge para o centro)
  const stalk1Points = [
    new THREE.Vector3(-0.35, 0.35, 0),
    new THREE.Vector3(-0.35, 0.55, 0.05),
    new THREE.Vector3(-0.1, 0.78, 0.1)
  ];
  const stalk1Curve = new THREE.CatmullRomCurve3(stalk1Points);
  const stalk1Geo = new THREE.TubeGeometry(stalk1Curve, 8, 0.04, 4, false);
  const stalkMat = new THREE.MeshStandardMaterial({ 
    color: 0x7c3a2b,
    roughness: 0.7,
    metalness: 0.02
  });
  const stalk1 = new THREE.Mesh(stalk1Geo, stalkMat);
  cherry.add(stalk1);
  
  // Talo direito (curvo, converge para o centro)
  const stalk2Points = [
    new THREE.Vector3(0.35, 0.35, 0),
    new THREE.Vector3(0.35, 0.55, 0.05),
    new THREE.Vector3(0.1, 0.78, 0.1)
  ];
  const stalk2Curve = new THREE.CatmullRomCurve3(stalk2Points);
  const stalk2Geo = new THREE.TubeGeometry(stalk2Curve, 8, 0.04, 4, false);
  const stalk2 = new THREE.Mesh(stalk2Geo, stalkMat);
  cherry.add(stalk2);
  
  // Folha (verde e alongada, conectada aos talos)
  const leafShape = new THREE.Shape();
  leafShape.moveTo(-0.3, 0);
  leafShape.bezierCurveTo(-0.3, -0.15, 0, -0.25, 0.3, 0);
  leafShape.bezierCurveTo(0, 0.15, -0.3, 0.15, -0.3, 0);
  
  const leafGeo = new THREE.ShapeGeometry(leafShape);
  const leafMat = new THREE.MeshStandardMaterial({ 
    color: 0x22c55e,
    roughness: 0.5,
    metalness: 0.02,
    side: THREE.DoubleSide
  });
  const leaf = new THREE.Mesh(leafGeo, leafMat);
  leaf.position.set(0, 0.85, 0.08);
  leaf.rotation.x = Math.PI / 3.5;
  leaf.rotation.z = Math.PI / 12;
  cherry.add(leaf);
  
  return cherry;
}

// --- NOVO: LARANJA 3D ---
function createOrangeModel() {
  const orange = new THREE.Group();
  
  // Corpo principal (esfera laranja grande)
  const fruitGeo = new THREE.SphereGeometry(0.4, 28, 28);
  const fruitMat = new THREE.MeshStandardMaterial({ 
    color: 0xff9500, 
    roughness: 0.5, 
    metalness: 0.1,
    emissive: 0xff6b00,
    emissiveIntensity: 0.1
  });
  const fruit = new THREE.Mesh(fruitGeo, fruitMat);
  orange.add(fruit);
  
  // Talo (pequeno cilindro castanho)
  const stemGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.25, 8);
  const stemMat = new THREE.MeshStandardMaterial({ 
    color: 0x7c5c3d,
    roughness: 0.7,
    metalness: 0.02
  });
  const stem = new THREE.Mesh(stemGeo, stemMat);
  stem.position.y = 0.45;
  orange.add(stem);
  
  // Folha verde (alongada)
  const leafShape = new THREE.Shape();
  leafShape.moveTo(-0.25, 0);
  leafShape.bezierCurveTo(-0.25, -0.12, 0, -0.18, 0.25, 0);
  leafShape.bezierCurveTo(0, 0.1, -0.25, 0.1, -0.25, 0);
  
  const leafGeo = new THREE.ShapeGeometry(leafShape);
  const leafMat = new THREE.MeshStandardMaterial({ 
    color: 0x22c55e,
    roughness: 0.5,
    metalness: 0.02,
    side: THREE.DoubleSide
  });
  const leaf = new THREE.Mesh(leafGeo, leafMat);
  leaf.position.set(0.18, 0.55, 0.08);
  leaf.rotation.x = Math.PI / 3;
  leaf.rotation.z = Math.PI / 6;
  orange.add(leaf);
  
  return orange;
}

// --- NOVO: BANANA 3D ---
function createBananaModel() {
  const banana = new THREE.Group();
  
  // Corpo principal (alongado e ligeiramente curvo)
  const bananaGeo = new THREE.CylinderGeometry(0.15, 0.13, 0.7, 16, 8);
  const bananaMat = new THREE.MeshStandardMaterial({ 
    color: 0xffd60a, 
    roughness: 0.35, 
    metalness: 0.1,
    emissive: 0xffa500,
    emissiveIntensity: 0.1
  });
  const bananaBody = new THREE.Mesh(bananaGeo, bananaMat);
  bananaBody.rotation.z = Math.PI / 4; // Inclinação
  banana.add(bananaBody);
  
  // Ponta castanha (topo da banana)
  const tipGeo = new THREE.SphereGeometry(0.12, 16, 16);
  const tipMat = new THREE.MeshStandardMaterial({ 
    color: 0x6b4423,
    roughness: 0.6,
    metalness: 0.02
  });
  const tip = new THREE.Mesh(tipGeo, tipMat);
  tip.scale.set(1, 0.7, 1);
  tip.position.set(0.35, 0.45, 0);
  banana.add(tip);
  
  return banana;
}

// Criar 3 cerejas em posições aleatórias
const cherriesGroup = new THREE.Group();
for (let cherryPos of cherryPositions) {
  const cherryModel = createCherryModel();
  const cherryWorld = gridToWorld(cherryPos.row, cherryPos.col);
  cherryModel.position.set(cherryWorld.x, 0.5, cherryWorld.z);
  cherryModel.userData.collectibleType = 'cherry';
  cherriesGroup.add(cherryModel);
}
powerPelletsGroup.add(cherriesGroup);

// Criar 2 laranjas em posições aleatórias
const orangesGroup = new THREE.Group();
for (let orangePos of orangePositions) {
  const orangeModel = createOrangeModel();
  const orangeWorld = gridToWorld(orangePos.row, orangePos.col);
  orangeModel.position.set(orangeWorld.x, 0.5, orangeWorld.z);
  orangeModel.userData.collectibleType = 'orange';
  orangesGroup.add(orangeModel);
}
powerPelletsGroup.add(orangesGroup);

// Criar 1 banana em posição aleatória
const bananasGroup = new THREE.Group();
for (let bananaPos of bananaPositions) {
  const bananaModel = createBananaModel();
  const bananaWorld = gridToWorld(bananaPos.row, bananaPos.col);
  bananaModel.position.set(bananaWorld.x, 0.5, bananaWorld.z);
  bananaModel.userData.collectibleType = 'banana';
  bananasGroup.add(bananaModel);
}
powerPelletsGroup.add(bananasGroup);

function gridToWorld(row, col) {
  return { x: xOffset + col * tileSize, z: zOffset + row * tileSize };
}

// Personagens
function createPacmanModel(size) {
  const pacman = new THREE.Group();
  const radius = size * 0.38;
  const textureLoader = new THREE.TextureLoader();
  const pacmanMaterial = new THREE.MeshStandardMaterial({ color: 0xffd60a, roughness: 0.35, metalness: 0.05 });

  const upperHemisphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), pacmanMaterial);
  upperHemisphere.rotation.x = -0.32;
  upperHemisphere.position.y = radius;

  const lowerHemisphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), pacmanMaterial);
  lowerHemisphere.rotation.x = 0.32;
  lowerHemisphere.position.y = radius;

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
  const eyeMaterial = new THREE.MeshBasicMaterial({ map: eyeTexture, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide });
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

  pacman.userData = { upperHemisphere, lowerHemisphere };
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

  const ghostMaterial = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.1, roughness: 0.4, metalness: 0.04 });

  const silhouette = new THREE.Shape();
  silhouette.moveTo(-halfWidth, 0);
  silhouette.lineTo(-halfWidth, sideTopY);
  silhouette.bezierCurveTo(-halfWidth * 0.95, totalHeight * 0.86, -halfWidth * 0.48, totalHeight * 1.03, 0, totalHeight);
  silhouette.bezierCurveTo(halfWidth * 0.48, totalHeight * 1.03, halfWidth * 0.95, totalHeight * 0.86, halfWidth, sideTopY);
  silhouette.lineTo(halfWidth, 0);
  silhouette.lineTo(scallopCenters[0] + scallopRadius, 0);

  for (let i = 0; i < scallopCenters.length; i += 1) {
    silhouette.absarc(scallopCenters[i], 0, scallopRadius, 0, Math.PI, true);
    if (i < scallopCenters.length - 1) silhouette.lineTo(scallopCenters[i + 1] + scallopRadius, 0);
  }
  silhouette.lineTo(-halfWidth, 0);

  const ghostGeometry = new THREE.ExtrudeGeometry(silhouette, { depth: bodyDepth, bevelEnabled: true, bevelThickness: size * 0.02, bevelSize: size * 0.016, bevelSegments: 2, curveSegments: 28 });
  ghostGeometry.translate(0, 0, -bodyDepth / 2);

  const shell = new THREE.Mesh(ghostGeometry, ghostMaterial);
  shell.position.y = scallopRadius;

  const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.35, metalness: 0 });
  const eyeGeometry = new THREE.SphereGeometry(bodyWidth * 0.085, 16, 12);

  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.scale.set(0.9, 1.45, 0.75);
  leftEye.position.set(-bodyWidth * 0.22, totalHeight * 0.76 + scallopRadius, bodyDepth / 2 + 0.01);

  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.scale.set(0.9, 1.45, 0.75);
  rightEye.position.set(bodyWidth * 0.22, totalHeight * 0.76 + scallopRadius, bodyDepth / 2 + 0.01);

  const floorLight = new THREE.PointLight(color, 10, 5); 
  floorLight.position.set(0, 0.5, 0);
  ghostLights.push(floorLight);
  
  ghost.add(shell, leftEye, rightEye, floorLight);
  return ghost;
}

const pacman = createPacmanModel(tileSize);
const pacmanWorld = gridToWorld(12, 12);
pacman.position.set(pacmanWorld.x, 0.5, pacmanWorld.z);
scene.add(pacman);

const ghostCells = [
  { row: 9, col: 11, color: 0xef4444 },
  { row: 9, col: 13, color: 0x38bdf8 },
  { row: 10, col: 11, color: 0xf97316 },
  { row: 10, col: 13, color: 0xe879f9 },
];

// --- NOVO: ARRAY DE DADOS DOS FANTASMAS ---
const ghostsData = [];
const ghostBaseSpeed = 4.5;

for (const gc of ghostCells) {
  const ghost = createGhostModel(gc.color, tileSize);
  const gw = gridToWorld(gc.row, gc.col);
  ghost.position.set(gw.x, 0.5, gw.z);
  scene.add(ghost);
  
  // Guardar os dados de cada fantasma para a IA
  ghostsData.push({
      mesh: ghost,
      baseColor: gc.color,
      moveDir: new THREE.Vector3(Math.random() > 0.5 ? 1 : -1, 0, 0),
      speed: ghostBaseSpeed,
      isFrightened: false,
      frightenedTimer: 0
  });
}

// Resize
window.addEventListener("resize", () => {
  updateCamera2DFraming();
  camera3D.aspect = window.innerWidth / window.innerHeight;
  camera3D.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Movimento
const pacmanSpeed = 5.0;
const moveDir = new THREE.Vector3(0, 0, 0);
const nextDir = new THREE.Vector3(0, 0, 0);

window.addEventListener('keydown', (event) => {
    const mainMenu = document.getElementById('mainMenu');
    
    // Controlos do Menu e Atalhos
    if (event.key === 'Escape' || event.key === 'Enter') {
        if (!mainMenu.classList.contains('hidden') && event.key === 'Enter') {
            mainMenu.classList.add('hidden');
            document.getElementById('backToMenuButton').classList.remove('hidden');
        } else if (mainMenu.classList.contains('hidden') && event.key === 'Escape') {
            returnToMainMenu();
        }
        return;
    }

    // Se o menu estiver visível, não processa movimentos nem câmara
    if (!mainMenu.classList.contains('hidden')) return;

    // Alternar Câmara (V)
    if (event.key.toLowerCase() === 'v') {
        is3DView = !is3DView;
        cameraAtiva = is3DView ? camera3D : camera2D;
        
        if (is3DView) {
            // Posiciona a câmara imediatamente atrás para não iniciar dentro do chão
            const offset = new THREE.Vector3(0, 12, -16).applyAxisAngle(new THREE.Vector3(0, 1, 0), pacman.rotation.y);
            camera3D.position.copy(pacman.position).add(offset);
            camera3D.lookAt(pacman.position.x, pacman.position.y, pacman.position.z);
            controls.enabled = isFreeLook;
        } else {
            controls.enabled = false;
        }
        return;
    }

    // Toggle Câmara Livre (L)
    if (event.key.toLowerCase() === 'l' && is3DView) {
        isFreeLook = !isFreeLook;
        const toggleFreeLook = document.getElementById('toggle-freelook');
        if (toggleFreeLook) toggleFreeLook.checked = isFreeLook;
        controls.enabled = isFreeLook;
        return;
    }

    // Lógica de Movimento
    let forward, back, left, right;
    if (is3DView) {
        let angle = Math.round(pacman.rotation.y / (Math.PI/2)) * (Math.PI/2);
        let fx = Math.round(Math.sin(angle));
        let fz = Math.round(Math.cos(angle));

        forward = new THREE.Vector3(fx, 0, fz);
        back = new THREE.Vector3(-fx, 0, -fz);
        left = new THREE.Vector3(fz, 0, -fx);
        right = new THREE.Vector3(-fz, 0, fx);
    } else {
        forward = new THREE.Vector3(0, 0, -1);
        back = new THREE.Vector3(0, 0, 1);
        left = new THREE.Vector3(-1, 0, 0);
        right = new THREE.Vector3(1, 0, 0);
    }

    switch(event.key.toLowerCase()) {
        case 'w': case 'arrowup':    nextDir.copy(forward); break;
        case 's': case 'arrowdown':  nextDir.copy(back); break;
        case 'a': case 'arrowleft':  nextDir.copy(left); break;
        case 'd': case 'arrowright': nextDir.copy(right); break;
    }
});

function checkCollision(newX, newZ) {
    const radius = tileSize * 0.35; 
    const points = [
        { x: newX, z: newZ },
        { x: newX + radius, z: newZ },
        { x: newX - radius, z: newZ },
        { x: newX, z: newZ + radius },
        { x: newX, z: newZ - radius }
    ];

    for (let p of points) {
        const col = Math.floor((p.x - xOffset + tileSize / 2) / tileSize);
        const row = Math.floor((p.z - zOffset + tileSize / 2) / tileSize);

        if (row < 0 || row >= mazeLayout.length || col < 0 || col >= mazeLayout[0].length) return true;
        if (mazeLayout[row][col] === "1") return true;
        if (row >= 8 && row <= 10 && col >= 10 && col <= 14) return true;
    }
    return false;
}
// --- NOVO: COLISÃO DOS FANTASMAS ---
function checkGhostCollision(newX, newZ) {
    const radius = tileSize * 0.35; 
    const points = [
        { x: newX, z: newZ }, { x: newX + radius, z: newZ }, { x: newX - radius, z: newZ },
        { x: newX, z: newZ + radius }, { x: newX, z: newZ - radius }
    ];
    for (let p of points) {
        const col = Math.floor((p.x - xOffset + tileSize / 2) / tileSize);
        const row = Math.floor((p.z - zOffset + tileSize / 2) / tileSize);
        if (row < 0 || row >= mazeLayout.length || col < 0 || col >= mazeLayout[0].length) return true;
        // Fantasmas só colidem com as paredes ("1"), podem passar na porta!
        if (mazeLayout[row][col] === "1") return true; 
    }
    return false;
}


const clock = new THREE.Clock();
let lastTime = 0;

function animate() {
  requestAnimationFrame(animate); 

  const t = clock.getElapsedTime();
  const dt = Math.min(t - lastTime, 0.1);
  lastTime = t;

  directionalLight.position.x = 10 * Math.cos(t * 0.3);
  directionalLight.position.z = 10 * Math.sin(t * 0.3);

  // SÓ PROCESSA O MOVIMENTO SE O JOGO ESTIVER ATIVO
  const mainMenu = document.getElementById('mainMenu');
  if (mainMenu && mainMenu.classList.contains('hidden')) {
      
      if (nextDir.lengthSq() > 0) {
          const targetX = pacman.position.x + nextDir.x * pacmanSpeed * dt;
          const targetZ = pacman.position.z + nextDir.z * pacmanSpeed * dt;
          
          if (!checkCollision(targetX, targetZ)) {
              if (nextDir.x !== 0) {
                  const row = Math.round((pacman.position.z - zOffset) / tileSize);
                  pacman.position.z = zOffset + row * tileSize;
              } else if (nextDir.z !== 0) {
                  const col = Math.round((pacman.position.x - xOffset) / tileSize);
                  pacman.position.x = xOffset + col * tileSize;
              }
              moveDir.copy(nextDir);
              nextDir.set(0,0,0);
          }
      }

      let isMoving = false;
      if (moveDir.lengthSq() > 0) {
          const targetX = pacman.position.x + moveDir.x * pacmanSpeed * dt;
          const targetZ = pacman.position.z + moveDir.z * pacmanSpeed * dt;
          
          if (!checkCollision(targetX, targetZ)) {
              pacman.position.x = targetX;
              pacman.position.z = targetZ;
              isMoving = true;

              if (moveDir.x !== 0) {
                  const row = Math.round((pacman.position.z - zOffset) / tileSize);
                  pacman.position.z = THREE.MathUtils.lerp(pacman.position.z, zOffset + row * tileSize, 0.3);
              } else if (moveDir.z !== 0) {
                  const col = Math.round((pacman.position.x - xOffset) / tileSize);
                  pacman.position.x = THREE.MathUtils.lerp(pacman.position.x, xOffset + col * tileSize, 0.3);
              }

              const targetAngle = Math.atan2(moveDir.x, moveDir.z);
              pacman.rotation.y = targetAngle; 
          } else {
              moveDir.set(0,0,0); 
          }
      }

      if (isMoving && pacman.userData.upperHemisphere) {
          const angle = (Math.sin(t * 15) + 1) * 0.25; 
          pacman.userData.upperHemisphere.rotation.x = -angle;
          pacman.userData.lowerHemisphere.rotation.x = angle;
      }

      for (let i = pelletsGroup.children.length - 1; i >= 0; i--) {
          const pellet = pelletsGroup.children[i];
          if (pellet.position.distanceTo(pacman.position) < 0.8) {
              pelletsGroup.remove(pellet);
          }
      }

      // --- NOVO: COMER POWER PELLETS E CEREJA ---
      for (let i = powerPelletsGroup.children.length - 1; i >= 0; i--) {
          const pp = powerPelletsGroup.children[i];
          if (pp.position.distanceTo(pacman.position) < 1.0) {
              powerPelletsGroup.remove(pp);
              if ((pp.userData.collectibleType || 'power') === 'power') {
                  // Fantasmas ficam com medo!
                  ghostsData.forEach(ghost => {
                      ghost.isFrightened = true;
                      ghost.frightenedTimer = 8.0; // 8 segundos de poder
                      ghost.speed = ghostBaseSpeed * 0.5; // Ficam mais lentos
                      ghost.mesh.children[0].material.color.setHex(0x1e3a8a); // Ficam azuis
                      ghost.mesh.children[0].material.emissive.setHex(0x3b82f6);
                  });
              }
          }
      }

    // --- NOVO: MOVIMENTO E IA DOS FANTASMAS ---
      ghostsData.forEach(ghost => {
          // 1. Lidar com o medo (Piscar e perder a cor)
          if (ghost.isFrightened) {
              ghost.frightenedTimer -= dt;
              
              if (ghost.frightenedTimer < 2.0 && Math.floor(t * 10) % 2 === 0) {
                  ghost.mesh.children[0].material.color.setHex(0xffffff);
              } else {
                  ghost.mesh.children[0].material.color.setHex(0x1e3a8a);
              }

              if (ghost.frightenedTimer <= 0) {
                  ghost.isFrightened = false;
                  ghost.speed = ghostBaseSpeed;
                  ghost.mesh.children[0].material.color.setHex(ghost.baseColor);
                  ghost.mesh.children[0].material.emissive.setHex(ghost.baseColor);
              }
          }

          // 2. LÓGICA PARA SAIR DA CASA DOS FANTASMAS
          const currentRow = Math.round((ghost.mesh.position.z - zOffset) / tileSize);
          const currentCol = Math.round((ghost.mesh.position.x - xOffset) / tileSize);
          const isGhostHouse = (currentRow === 9 || currentRow === 10) && (currentCol >= 10 && currentCol <= 14);

          // Se estiverem na casa, forçamos um caminho guiado para a porta!
          if (isGhostHouse) {
              // Se já chegaram (ou estão muito perto) da coluna da porta (12), sobem!
              if (Math.abs(ghost.mesh.position.x - (xOffset + 12 * tileSize)) < 0.2) {
                  ghost.mesh.position.x = xOffset + 12 * tileSize; // Alinha-o perfeitamente
                  ghost.moveDir.set(0, 0, -1); // Vai para CIMA
              } 
              // Se estão à esquerda da porta, vão para a DIREITA
              else if (ghost.mesh.position.x < xOffset + 12 * tileSize) {
                  ghost.moveDir.set(1, 0, 0);
              } 
              // Se estão à direita da porta, vão para a ESQUERDA
              else {
                  ghost.moveDir.set(-1, 0, 0);
              }
          }

          // 3. Movimento Normal do Fantasma pelo Labirinto
          let ghostTargetX = ghost.mesh.position.x + ghost.moveDir.x * ghost.speed * dt;
          let ghostTargetZ = ghost.mesh.position.z + ghost.moveDir.z * ghost.speed * dt;

          // Só verificamos se ele deve virar caso NÃO esteja na casa
          if (checkGhostCollision(ghostTargetX, ghostTargetZ) && !isGhostHouse) {
              ghost.mesh.position.x = xOffset + currentCol * tileSize;
              ghost.mesh.position.z = zOffset + currentRow * tileSize;

              const dirs = [
                  new THREE.Vector3(1,0,0), new THREE.Vector3(-1,0,0),
                  new THREE.Vector3(0,0,1), new THREE.Vector3(0,0,-1)
              ];
              
              const validDirs = dirs.filter(d => !checkGhostCollision(ghost.mesh.position.x + d.x * tileSize * 0.5, ghost.mesh.position.z + d.z * tileSize * 0.5));
              
              const backDir = ghost.moveDir.clone().negate();
              let possibleDirs = validDirs.filter(d => !d.equals(backDir));
              if (possibleDirs.length === 0) possibleDirs = validDirs; 
              
              if (possibleDirs.length > 0) {
                  ghost.moveDir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
              }
          } else {
              ghost.mesh.position.x = ghostTargetX;
              ghost.mesh.position.z = ghostTargetZ;

              // Mantém-nos alinhados com o corredor (desativado dentro de casa para não interferir com a saída)
              if (ghost.moveDir.x !== 0 && !isGhostHouse) {
                  ghost.mesh.position.z = THREE.MathUtils.lerp(ghost.mesh.position.z, zOffset + currentRow * tileSize, 0.3);
              } else if (ghost.moveDir.z !== 0 && !isGhostHouse) {
                  ghost.mesh.position.x = THREE.MathUtils.lerp(ghost.mesh.position.x, xOffset + currentCol * tileSize, 0.3);
              }
          }

          // --- CORREÇÃO DE ROTAÇÃO: Faz os olhos olharem para onde estão a andar ---
          if (ghost.moveDir.lengthSq() > 0) {
              ghost.mesh.rotation.y = Math.atan2(ghost.moveDir.x, ghost.moveDir.z);
          }

          // 4. Colisão com o Pac-Man
          if (ghost.mesh.position.distanceTo(pacman.position) < 1.3) {
              if (ghost.isFrightened) {
                  ghost.isFrightened = false;
                  ghost.speed = ghostBaseSpeed;
                  ghost.mesh.children[0].material.color.setHex(ghost.baseColor);
                  ghost.mesh.children[0].material.emissive.setHex(ghost.baseColor);
                  
                  // Manda de volta para o meio da casa
                  const basePos = gridToWorld(9, 12);
                  ghost.mesh.position.set(basePos.x, 0.5, basePos.z);
                  ghost.moveDir.set(0, 0, -1); // Força-o a sair novamente
              } else {
                  returnToMainMenu();
                  const startPos = gridToWorld(12, 12);
                  pacman.position.set(startPos.x, 0.5, startPos.z);
                  nextDir.set(0,0,0); moveDir.set(0,0,0);
              }
          }
      });
  }

  // CÂMARA 3D
  if (is3DView) {
      if (isFreeLook && controls) {
          controls.enabled = true;
          controls.target.copy(pacman.position);
          controls.update();
      } else {
          if (controls) controls.enabled = false;
          const cameraOffset = new THREE.Vector3(0, 12, -16); 
          cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), pacman.rotation.y);
          
          const targetPos = pacman.position.clone().add(cameraOffset);
          camera3D.position.lerp(targetPos, 0.1);
          camera3D.lookAt(pacman.position.x, pacman.position.y, pacman.position.z);
      }
  }

  renderer.render(scene, cameraAtiva); 
}

animate();

// --- LÓGICA DO MENU E DEFINIÇÕES ---
const playButton = document.getElementById('playButton');
const charactersMenuButton = document.getElementById('charactersMenuButton');
const backToMenuButton = document.getElementById('backToMenuButton');

const instructionsButton = document.getElementById('instructionsButton');
const instructionsModal = document.getElementById('instructionsModal');
const closeInstructionsButton = document.getElementById('closeInstructionsButton');
const exitButton = document.getElementById('exitButton');

const settingsButton = document.getElementById('settingsButton');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsButton = document.getElementById('closeSettingsButton');

const toggleAmbient = document.getElementById('toggle-ambient');
const toggleDirectional = document.getElementById('toggle-directional');
const togglePoint = document.getElementById('toggle-point');
const toggleFreeLook = document.getElementById('toggle-freelook');

function returnToMainMenu() {
    const mainMenu = document.getElementById('mainMenu');
    if (mainMenu) mainMenu.classList.remove('hidden');
    if (backToMenuButton) backToMenuButton.classList.add('hidden');
    is3DView = false;
    cameraAtiva = camera2D;
    if (controls) controls.enabled = false;
}

if (playButton) playButton.onclick = () => {
    const mainMenu = document.getElementById('mainMenu');
    if (mainMenu) mainMenu.classList.add('hidden');
    if (backToMenuButton) backToMenuButton.classList.remove('hidden');
};
if (backToMenuButton) backToMenuButton.onclick = returnToMainMenu;
if (charactersMenuButton) charactersMenuButton.onclick = () => window.location.href = './characters.html';
if (exitButton) exitButton.onclick = () => { if(confirm("Tens a certeza que queres sair do jogo?")) window.location.href = "about:blank"; };

if (instructionsButton) instructionsButton.onclick = () => instructionsModal.classList.remove('hidden');
if (closeInstructionsButton) closeInstructionsButton.onclick = () => instructionsModal.classList.add('hidden');

if (settingsButton) settingsButton.onclick = () => settingsModal.classList.remove('hidden');
if (closeSettingsButton) closeSettingsButton.onclick = () => settingsModal.classList.add('hidden');

if (toggleAmbient) toggleAmbient.onchange = (e) => { if (ambientLight) ambientLight.visible = e.target.checked; };
if (toggleDirectional) toggleDirectional.onchange = (e) => { if (directionalLight) directionalLight.visible = e.target.checked; };
if (togglePoint) {
    togglePoint.onchange = (e) => ghostLights.forEach(l => l.visible = e.target.checked);
    ghostLights.forEach(l => l.visible = togglePoint.checked); // Sincroniza o arranque
}
if (toggleFreeLook) {
    toggleFreeLook.onchange = (e) => {
        isFreeLook = e.target.checked;
        if (is3DView && controls) controls.enabled = isFreeLook;
    };
}