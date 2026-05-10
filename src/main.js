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
controls.maxPolarAngle = Math.PI / 2; 
controls.minPolarAngle = 0; // 0 é exatamente por cima, Math.PI/2 é de lado

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

 // Guardamos as referências das duas metades para as animar mais tarde
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

  const ghostMaterial = new THREE.MeshStandardMaterial({
    color: color,
    // Reduzimos o emissive para não ser tão néon (ou podes mesmo tirar estas duas linhas)
    emissive: color,
    emissiveIntensity: 0.1, 
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

  // --- NOVO: LUZ POR BAIXO DO FANTASMA ---
  // Cria uma luz da mesma cor do fantasma. 
  // O número 10 é a intensidade, e o 5 é a distância até onde a luz chega (podes ajustar ao teu gosto).
  const floorLight = new THREE.PointLight(color, 10, 5); 
  floorLight.position.set(0, 0.5, 0); // Colocada numa posição baixa, perto do chão
  
  ghost.add(shell, leftEye, rightEye, floorLight);

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
            
            // 1. Reset da posição da câmara para não ficar "colada" ao chão no início
            camera3D.position.set(pacman.position.x, pacman.position.y + 8, pacman.position.z + 12);
            
            // 2. Apontar o centro de rotação para o Pacman
            controls.target.copy(pacman.position);
            
            // 3. Forçar o OrbitControls a registar a nova posição
            controls.update();
        } else {
            controls.enabled = false;
        }
    }
});

// --- VARIÁVEIS DE MOVIMENTO ---
const pacmanSpeed = 5.0; // Velocidade do Pac-Man
const moveDir = new THREE.Vector3(0, 0, 0); // Direção atual
const nextDir = new THREE.Vector3(0, 0, 0); // Próxima direção que o jogador carregou

// --- CONTROLOS DO TECLADO ---
window.addEventListener('keydown', (event) => {
    // Se o menu estiver visível, não deixa o Pac-Man mover-se
    if (!document.getElementById('mainMenu').classList.contains('hidden')) return;

    // Convertemos a tecla para minúscula para aceitar o CAPS LOCK ligado sem problemas
    switch(event.key.toLowerCase()) {
        case 'w':
        case 'arrowup':    
            nextDir.set(0, 0, -1); 
            break;
        case 's':
        case 'arrowdown':  
            nextDir.set(0, 0, 1); 
            break;
        case 'a':
        case 'arrowleft':  
            nextDir.set(-1, 0, 0); 
            break;
        case 'd':
        case 'arrowright': 
            nextDir.set(1, 0, 0); 
            break;
    }
});

// --- SISTEMA DE COLISÃO ---
function checkCollision(newX, newZ) {
    const radius = tileSize * 0.35; // Um raio ligeiramente menor que o Pac-Man para não prender nas esquinas
    
    // Verificamos 5 pontos (centro e os 4 cantos da "caixa" de colisão do Pac-Man)
    const points = [
        { x: newX, z: newZ },
        { x: newX + radius, z: newZ },
        { x: newX - radius, z: newZ },
        { x: newX, z: newZ + radius },
        { x: newX, z: newZ - radius }
    ];

    for (let p of points) {
        // Converte a coordenada do mundo 3D para a grelha (matriz) do labirinto
        const col = Math.floor((p.x - xOffset + tileSize / 2) / tileSize);
        const row = Math.floor((p.z - zOffset + tileSize / 2) / tileSize);

        // 1. Saiu dos limites do mapa?
        if (row < 0 || row >= mazeLayout.length || col < 0 || col >= mazeLayout[0].length) return true;
        
        // 2. É uma Parede ("1")?
        if (mazeLayout[row][col] === "1") return true;
        
        // 3. É a casa dos Fantasmas ou a porta? (Linhas 8 a 10, Colunas 10 a 14)
        if (row >= 8 && row <= 10 && col >= 10 && col <= 14) return true;
    }
    
    return false; // Caminho livre!
}

const clock = new THREE.Clock();

let lastTime = 0; // Para calcularmos o tempo que passou entre frames (deltaTime)

function animate() {
  requestAnimationFrame(animate); 

  const t = clock.getElapsedTime();
  const dt = t - lastTime; // Diferença de tempo exata
  lastTime = t;

  directionalLight.position.x = 10 * Math.cos(t * 0.3);
  directionalLight.position.z = 10 * Math.sin(t * 0.3);

  // --- LÓGICA DO PAC-MAN (Só corre se o menu estiver escondido) ---
  if (document.getElementById('mainMenu').classList.contains('hidden')) {
      
      // 1. Tentar virar para a nova direção (facilita curvar nas esquinas)
      if (nextDir.lengthSq() > 0) {
          const targetX = pacman.position.x + nextDir.x * pacmanSpeed * dt;
          const targetZ = pacman.position.z + nextDir.z * pacmanSpeed * dt;
          
          if (!checkCollision(targetX, targetZ)) {
              moveDir.copy(nextDir); // Assume a nova direção
              nextDir.set(0,0,0);    // Limpa o input
          }
      }

      // 2. Mover na direção atual
      let isMoving = false;
      if (moveDir.lengthSq() > 0) {
          const targetX = pacman.position.x + moveDir.x * pacmanSpeed * dt;
          const targetZ = pacman.position.z + moveDir.z * pacmanSpeed * dt;
          
          if (!checkCollision(targetX, targetZ)) {
              pacman.position.x = targetX;
              pacman.position.z = targetZ;
              isMoving = true;

              // Rodar o corpo do Pac-Man para apontar para onde anda
              const targetAngle = Math.atan2(moveDir.x, moveDir.z);
              pacman.rotation.y = targetAngle; 
          }
      }

      // 3. Animação da Boca
      if (isMoving) {
          // Oscila usando uma onda seno (abre e fecha rapidamente baseada no tempo)
          const angle = (Math.sin(t * 15) + 1) * 0.25; 
          pacman.userData.upperHemisphere.rotation.x = -angle;
          pacman.userData.lowerHemisphere.rotation.x = angle;
      } else {
          // Se estiver parado contra uma parede, a boca fica meio aberta
          pacman.userData.upperHemisphere.rotation.x = -0.2;
          pacman.userData.lowerHemisphere.rotation.x = 0.2;
      }
  }

  // --- LÓGICA DA CÂMARA 3D ---
  if (is3DView) {
    controls.target.lerp(pacman.position, 0.1); 
    controls.target.y += 0.5; 
    controls.update();
  }

  renderer.render(scene, cameraAtiva);
}

animate();

// --- LÓGICA DO MENU PRINCIPAL ---
const mainMenu = document.getElementById('mainMenu');
const playButton = document.getElementById('playButton');
const charactersMenuButton = document.getElementById('charactersMenuButton');
// Elemento do novo botão
const backToMenuButton = document.getElementById('backToMenuButton');

// Quando se clica em "Jogar"
playButton.addEventListener('click', () => {
    mainMenu.classList.add('hidden'); // Esconde o menu
    backToMenuButton.classList.remove('hidden'); // Mostra o botão "Voltar ao Menu"
});

// Quando se clica em "Voltar ao Menu" (dentro do jogo)
backToMenuButton.addEventListener('click', () => {
    mainMenu.classList.remove('hidden'); // Mostra o menu principal novamente
    backToMenuButton.classList.add('hidden'); // Esconde o botão de voltar
});

// Quando o jogador clica em "Jogar", escondemos o menu
playButton.addEventListener('click', () => {
    mainMenu.classList.add('hidden');
});

// Quando o jogador clica em "Personagens", vai para a página respetiva
charactersMenuButton.addEventListener('click', () => {
    window.location.href = './characters.html';
});

// --- LÓGICA DOS NOVOS BOTÕES ---
const instructionsButton = document.getElementById('instructionsButton');
const exitButton = document.getElementById('exitButton');

// Elementos do Modal (a nova janela)
const instructionsModal = document.getElementById('instructionsModal');
const closeInstructionsButton = document.getElementById('closeInstructionsButton');

// Quando se clica em "Instruções", tira a classe 'hidden' para mostrar a janela
instructionsButton.addEventListener('click', () => {
    instructionsModal.classList.remove('hidden');
});

// Quando se clica em "Fechar", volta a adicionar a classe 'hidden' para a esconder
closeInstructionsButton.addEventListener('click', () => {
    instructionsModal.classList.add('hidden');
});

// Lógica do botão Sair (esta mantém-se igual)
exitButton.addEventListener('click', () => {
    if (confirm("Tens a certeza que queres sair do jogo?")) {
        window.location.href = "about:blank"; 
    }
});
