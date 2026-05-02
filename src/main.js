import * as THREE from "three";
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';
const app = document.querySelector("#app");


//Variáveis de controlo da camara
let controls;
let pacmanUltimaPosicao = new THREE.Vector3();

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true }); //antilias faz com que as arestas sejam mais lisas
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight); //Tamanho da janela
app.appendChild(renderer.domElement);

// Cena
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030712); //cor de fundo do ecrã

// Camara

let camera2D, camera3D, cameraAtiva;

// Tira o "const" que estava aqui e usa o camera2D
camera2D = new THREE.PerspectiveCamera(
  60, //FOV
  window.innerWidth / window.innerHeight, //Aspect ratio
  0.1, //Distancia minima
  400 //distancia maxima
);
// Altera "camera" para "camera2D"
camera2D.position.set(0, 24, 18); 
camera2D.lookAt(0, 0, 0); 

camera3D = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Configurar o OrbitControls na câmera 3D
controls = new OrbitControls(camera3D, renderer.domElement);
controls.enabled = false; // Desligado na visão 2D
controls.enablePan = false; // Impede o jogador de arrastar a câmera para longe do Pacman com o botão direito
controls.minDistance = 2; // Distância mínima do zoom
controls.maxDistance = 15; // Distância máxima do zoom

cameraAtiva = camera2D;
let is3DView = false;

// Luzes
const ambientLight = new THREE.AmbientLight(0xffffff, 0.55); //luz de ambiente ilumina tudo igualmente com luz branca
scene.add(ambientLight); //adicionar luz à cena

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9); //garante que os raios chegue todos paralelos
directionalLight.position.set(10, 20, 10); //Defie de onde vem a luz
scene.add(directionalLight); //adicionar à cena

// Layout manual para garantir um nível sempre jogável e consistente.
// 1 = parede, 0 = caminho.
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

camera2D.position.set(0, Math.max(26, mazeDepth * 1.1), mazeDepth * 0.8);
camera2D.lookAt(0, 0, 0);

const wallGeometry = new THREE.BoxGeometry(tileSize, wallHeight, tileSize);
const wallMaterial = new THREE.MeshStandardMaterial({
  color: 0x1d4ed8,
  roughness: 0.45,
  metalness: 0.05,
});

const wallsGroup = new THREE.Group();

for (let row = 0; row < mazeLayout.length; row += 1) {
  for (let col = 0; col < mazeLayout[row].length; col += 1) {
    if (mazeLayout[row][col] === "1") {
      const wall = new THREE.Mesh(wallGeometry, wallMaterial);
      wall.position.set(
        xOffset + col * tileSize,
        wallHeight / 2,
        zOffset + row * tileSize
      );
      wallsGroup.add(wall);
    }
  }
}

scene.add(wallsGroup);

const floorGeometry = new THREE.PlaneGeometry(mazeWidth + 2, mazeDepth + 2);
const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x111827,
  roughness: 0.95,
  metalness: 0,
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// --- CRIAÇÃO DAS PASTILHAS (PELLETS) ---
const pelletGeometry = new THREE.SphereGeometry(0.24, 8, 8); // Mantém o tamanho que escolheste!
const pelletMaterial = new THREE.MeshStandardMaterial({
  color: 0xffddaa,
  roughness: 0.5,
  metalness: 0.1,
});

const pelletsGroup = new THREE.Group();

// Percorrer o labirinto todo
for (let row = 0; row < mazeLayout.length; row += 1) {
  for (let col = 0; col < mazeLayout[row].length; col += 1) {
    
    // Identificar a zona interior da casa dos fantasmas (linhas 9 e 10, colunas 10 a 14)
    const isGhostHouse = (row === 9 || row === 10) && (col >= 10 && col <= 14);
    
    // Identificar o espaço da porta de saída (linha 8, coluna 12)
    const isGhostDoor = (row === 8 && col === 12);

    // Só cria a pastilha se for caminho ("0") E não for a casa E não for a porta
    if (mazeLayout[row][col] === "0" && !isGhostHouse && !isGhostDoor) {
      const pellet = new THREE.Mesh(pelletGeometry, pelletMaterial);
      
      const worldPos = gridToWorld(row, col);
      
      // Colocamos o Y a 0.6 para não ficar enterrada (ajusta se for preciso)
      pellet.position.set(worldPos.x, 0.6, worldPos.z);
      
      pelletsGroup.add(pellet);
    }
  }
}

scene.add(pelletsGroup);

function gridToWorld(row, col) {
  return {
    x: xOffset + col * tileSize,
    z: zOffset + row * tileSize,
  };
}

function createPacmanModel(size) {
  const pacman = new THREE.Group();
  const radius = size * 0.38;
  const baseLift = radius;

  // Carregador de texturas do Three.js
  const textureLoader = new THREE.TextureLoader();

  const pacmanMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd60a,
    roughness: 0.35,
    metalness: 0.05,
  });

  // Metade superior
  const upperHemisphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    pacmanMaterial
  );
  // Rodar no eixo X para a boca abrir virada para a frente (+Z)
  upperHemisphere.rotation.x = -0.32;
  upperHemisphere.position.y = baseLift;

  // Metade inferior
  const lowerHemisphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    pacmanMaterial
  );
  // Rodar no eixo X simetricamente
  lowerHemisphere.rotation.x = 0.32;
  lowerHemisphere.position.y = baseLift;

  // --- CORREÇÃO DA BOCA ---
  // Criar o fundo da boca (duas tampas circulares) para não ser transparente, usando a textura
  const mouthTexture = textureLoader.load('./img/pacman_fundo_para_a_boca.png');
  const mouthMaterial = new THREE.MeshBasicMaterial({ map: mouthTexture });
  const capGeometry = new THREE.CircleGeometry(radius, 32);

  // Tampa para a parte de cima da boca (virada para baixo)
  const upperCap = new THREE.Mesh(capGeometry, mouthMaterial);
  upperCap.rotation.x = Math.PI / 2; 
  upperHemisphere.add(upperCap);

  // Tampa para a parte de baixo da boca (virada para cima)
  const lowerCap = new THREE.Mesh(capGeometry, mouthMaterial);
  lowerCap.rotation.x = -Math.PI / 2;
  lowerHemisphere.add(lowerCap);

// --- CORREÇÃO DOS OLHOS ---
  const eyeTexture = textureLoader.load('./img/pacman_olho.png');
  
  // Adicionamos alphaTest para cortar o fundo transparente e DoubleSide para se ver de trás
  const eyeMaterial = new THREE.MeshBasicMaterial({ 
    map: eyeTexture, 
    transparent: true,
    alphaTest: 0.1, 
    side: THREE.DoubleSide 
  });
  
  const eyeSize = radius * 0.85; // Aumenta este multiplicador ao teu gosto
  const eyeGeometry = new THREE.PlaneGeometry(eyeSize, eyeSize);

  // Função auxiliar para colar os olhos exatamente na superfície
  function putOnSurface(x, y, z) {
    // Reduzi o multiplicador para 1.005 para ficar quase colado à esfera
    return new THREE.Vector3(x, y, z).normalize().multiplyScalar(radius * 1.005);
  }

  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  // Ajustei os vetores para ficarem mais naturais no rosto
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

  const ghostMaterial = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.4,
    metalness: 0.04,
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

  ghost.add(shell, leftEye, rightEye);

  return ghost;
}

const entityBaseY = 0.5;

const pacman = createPacmanModel(tileSize);
const pacmanCell = { row: 12, col: 12 };
const pacmanWorld = gridToWorld(pacmanCell.row, pacmanCell.col);
pacman.position.set(pacmanWorld.x, entityBaseY, pacmanWorld.z);
scene.add(pacman);

const ghostCells = [
  { row: 9, col: 11, color: 0xef4444 },
  { row: 9, col: 13, color: 0x38bdf8 },
  { row: 10, col: 11, color: 0xf97316 },
  { row: 10, col: 13, color: 0xe879f9 },
];

for (const ghostConfig of ghostCells) {
  const ghost = createGhostModel(ghostConfig.color, tileSize);
  const ghostWorld = gridToWorld(ghostConfig.row, ghostConfig.col);
  ghost.position.set(ghostWorld.x, entityBaseY, ghostWorld.z);
  scene.add(ghost);
}

const viewToggleButton = document.createElement("button");
viewToggleButton.className = "view-toggle-button";
viewToggleButton.textContent = "Ver Personagens";
document.body.appendChild(viewToggleButton);

viewToggleButton.addEventListener("click", () => {
  window.location.href = "./characters.html";
});

window.addEventListener("resize", () => {
  camera2D.aspect = window.innerWidth / window.innerHeight;
  camera2D.updateProjectionMatrix();

  camera3D.aspect = window.innerWidth / window.innerHeight;
  camera3D.updateProjectionMatrix();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('keydown', (event) => {
    if (event.key === 'v' || event.key === 'V') {
        is3DView = !is3DView;
        cameraAtiva = is3DView ? camera3D : camera2D;

        if (is3DView) {
            controls.enabled = true;
            
            // Coloca a câmera inicialmente atrás do Pacman
            const offsetInicial = new THREE.Vector3(0, 3, 5).applyMatrix4(pacman.matrixWorld);
            camera3D.position.copy(offsetInicial);
            
            // Define o alvo dos controlos e atualiza
            controls.target.copy(pacman.position);
            controls.update();

            // Guarda a posição do Pacman neste instante
            pacmanUltimaPosicao.copy(pacman.position);
        } else {
            controls.enabled = false;
        }
    }
});

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const t = clock.getElapsedTime();
  directionalLight.position.x = 10 * Math.cos(t * 0.3);
  directionalLight.position.z = 10 * Math.sin(t * 0.3);

  // APAGA a linha: renderer.render(scene, camera); que estava aqui

  if (is3DView) {
    // 1. Descobrir o quanto o Pacman se moveu desde o último frame
    const diferencaMovimento = new THREE.Vector3().copy(pacman.position).sub(pacmanUltimaPosicao);

    // 2. Mover a câmera exatamente essa mesma distância
    // Isso mantém a distância e o ângulo criados pelo rato intactos!
    camera3D.position.add(diferencaMovimento);

    // 3. Atualizar o alvo do OrbitControls para seguir o Pacman
    controls.target.copy(pacman.position);
    controls.target.y += 0.5; // Focar um pouco acima do chão (na cabeça do Pacman)

    // 4. Atualizar os controlos
    controls.update();

    // 5. Guardar a posição atual do Pacman para usar no próximo frame
    pacmanUltimaPosicao.copy(pacman.position);
}
  
  // Mantém apenas o render com a cameraAtiva no final
  renderer.render(scene, cameraAtiva);
}

animate();
