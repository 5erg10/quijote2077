const storage = window.localStorage;

let textarea, responses, splashScreen, continueButton, warningMessage, currentPlace,
  currentTrack, outerAudio, audioController, weightStatBar, energyStatBar, weightInfillText,
  energyInfillText, statsBox, userData;

let audioActive = false;
let inputContent = '';
let isGameOver = false;

// Cache de descripciones de lugares (cargada desde el servidor)
let placesDescriptions = {};

const playList = {
  biblioteca: 'sounds/interiorCut2.mp3',
  habitacion: 'sounds/interiorCut2.mp3',
  zaguan: 'sounds/interiorCut2.mp3',
  cocina: 'sounds/interiorCut2.mp3',
  despensa: 'sounds/interiorCut2.mp3',
  comedor: 'sounds/interiorCut2.mp3',
  portalon: 'sounds/interiorCut2.mp3',
  argamasilla: 'sounds/nightShadecut.mp3',
  arco: 'sounds/nightShadecut.mp3',
  arboleda: 'sounds/nightShadecut.mp3',
  manzano: 'sounds/nightShadecut.mp3',
  pinar: 'sounds/nightShadecut.mp3',
  muro: 'sounds/nightShadecut.mp3',
  callejon: 'sounds/nightShadecut.mp3',
  posada: 'sounds/interiorCut2.mp3',
  recepcion: 'sounds/interiorCut2.mp3',
  escalera: 'sounds/interiorCut2.mp3',
  rellano: 'sounds/interiorCut2.mp3',
  bodega: 'sounds/interiorCut2.mp3',
  dormitorio: 'sounds/interiorCut2.mp3',
  calles: 'sounds/nightShadecut.mp3',
  campos: 'sounds/nightShadecut.mp3',
  acantilado: 'sounds/nightShadecut.mp3',
  bosque: 'sounds/nightShadecut.mp3',
  venta: 'sounds/nightShadecut.mp3',
  recibidor: 'sounds/interiorCut2.mp3',
  salon: 'sounds/interiorCut2.mp3',
  distribuidor: 'sounds/interiorCut2.mp3',
  alcoba: 'sounds/interiorCut2.mp3',
  patio: 'sounds/interiorCut2.mp3',
  prados: 'sounds/nightShadecut.mp3',
  cancela: 'sounds/nightShadecut.mp3'
};

function documentReady() {
  textarea = document.querySelector('#enterText input');
  responses = document.querySelector('#chatContainer');
  splashScreen = document.querySelector('#splashScreen');
  warningMessage = document.querySelector('#warningMessage');
  continueButton = document.querySelector('#continueButton');
  audioController = document.querySelector('#audioControllerButton');
  outerAudio = document.querySelector('#outerAudio');
  currentPlace = storage.getItem('currentPlace');
  energyStatBar = document.querySelector('#energyStatBar');
  weightStatBar = document.querySelector('#weightStatBar');
  energyInfillText = document.querySelector('#energyInfillText');
  weightInfillText = document.querySelector('#weightInfillText');
  statsBox = document.querySelector('#statsBox');
  statsBox.style.display = 'none';
  document.addEventListener('click', setFocus);
  if (!getUID()) continueButton.disabled = true;
  audioController.addEventListener('click', onOffAudio);
  // Precargar descripciones de lugares
  loadPlacesDescriptions();
}

async function loadPlacesDescriptions() {
  try {
    const res = await fetch('/places');
    if (res.ok) placesDescriptions = await res.json();
  } catch (e) {
    // Silencioso: el panel funcionará sin descripciones
  }
}

// --- CHARACTER MENU ---

function toggleCharacterMenu() {
  const menu = document.getElementById('characterMenu');
  const isHidden = menu.classList.contains('displayNONE');
  if (isHidden) {
    renderCharacterMenu();
    menu.classList.remove('displayNONE');
  } else {
    menu.classList.add('displayNONE');
    closePlaceDetail();
  }
}

function renderCharacterMenu() {
  if (!userData) return;

  // Nombre
  document.getElementById('characterMenu__name').textContent =
    (userData.name || 'HIDALGO').toUpperCase();

  // Inventario
  const objList = document.getElementById('characterMenu__objects');
  objList.innerHTML = '';
  const objects = userData.objects || [];
  if (objects.length === 0) {
    objList.innerHTML = '<li><span class="characterMenu__emptyMsg">-- mochila vacía --</span></li>';
  } else {
    objects.forEach(obj => {
      const li = document.createElement('li');
      const origin = obj.originPLace || obj.originPlace || '';
      li.innerHTML = `<span class="objName">${obj.name.toUpperCase()}</span>${origin ? `<span class="objOrigin">recogido en: ${origin}</span>` : ''}`;
      objList.appendChild(li);
    });
  }

  // Lugares visitados
  const placesList = document.getElementById('characterMenu__places');
  placesList.innerHTML = '';
  const places = userData.placesKnown || [];
  if (places.length === 0) {
    placesList.innerHTML = '<li><span class="characterMenu__emptyMsg">-- ninguno aún --</span></li>';
  } else {
    const current = (userData.currentRoom && userData.currentRoom[0]) || '';
    places.forEach(place => {
      const li = document.createElement('li');
      li.textContent = place.toUpperCase();
      if (place === current) li.classList.add('currentPlace');
      li.addEventListener('click', (e) => {
        e.stopPropagation();
        showPlaceDetail(place);
      });
      placesList.appendChild(li);
    });
  }
}

function showPlaceDetail(placeName) {
  const popup = document.getElementById('placeDetailPopup');
  document.getElementById('placeDetailPopup__name').textContent = placeName.toUpperCase();
  const placeData = placesDescriptions[placeName];
  // Limpiar HTML de la descripción (quitar <br> etc)
  const rawDesc = placeData && placeData.description
    ? placeData.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    : '-- sin descripción --';
  document.getElementById('placeDetailPopup__desc').textContent = rawDesc;
  popup.classList.remove('displayNONE');
}

function closePlaceDetail() {
  document.getElementById('placeDetailPopup').classList.add('displayNONE');
}

// --- GAME FLOW ---

async function sendText({ keyCode, currentTarget }) {
  if (keyCode === 13) {
    const input = currentTarget.value.trim();
    if (!input) return;

    if (isGameOver) {
      if (input.toLowerCase().includes('reiniciar')) {
        handleRestart();
      }
      currentTarget.value = '';
      return;
    }

    // Cerrar el menú si está abierto
    document.getElementById('characterMenu').classList.add('displayNONE');
    closePlaceDetail();

    showLoading(currentTarget);
    setInputWidth();
    const result = await request(input);
    if (result) {
      responses.append(quixoteChat(result.text));
      if (result.showDifficulty) showDifficultySelector();
      if (result.gameOver) handleGameOver();
      setTimeout(() => {
        responses.scrollTo({ left: 0, top: responses.scrollHeight, behavior: 'smooth' });
        if (getUID() && !result.gameOver) getUserData();
        setFocus();
      }, 300);
    }
  }
}

function handleGameOver() {
  isGameOver = true;
  statsBox.style.display = 'none';
  pauseMusic();
  storage.removeItem('UID');
  storage.removeItem('currentPlace');
  storage.removeItem('last');
}

function handleRestart() {
  isGameOver = false;
  createUID();
  setTimeout(async () => {
    const result = await request('');
    if (result) responses.append(quixoteChat(result.text));
  }, 300);
}

function showDifficultySelector() {
  document.querySelector('#enterText').classList.add('displayNONE');
  document.querySelector('#enterDifficult').classList.remove('displayNONE');
}

function cancelContinue() {
  toogleElementOpacity(warningMessage, true);
}

function startFromWarning() {
  storage.removeItem('UID');
  toogleElementOpacity(warningMessage, true);
  restartGame();
}

function restartGame() {
  if (!getUID()) {
    createUID();
    startGame();
    setTimeout(async () => {
      const result = await request('');
      if (result) responses.append(quixoteChat(result.text));
    }, 500);
  } else {
    toogleElementOpacity(warningMessage, false);
  }
}

async function continueGame() {
  getUserData();
  loadLastResponse();
  startGame();
}

function startGame() {
  toogleElementOpacity(splashScreen, true);
  textarea.addEventListener('keyup', sendText);
  setInputWidth();
  setFocus();
  if (audioActive) outerAudio.play();
}

function showLoading(target) {
  if (target.value.trim()) responses.append(userChat(target.value));
  target.value = '';
  responses.scrollTop = responses.scrollHeight;
}

function getUID() {
  return storage.getItem('UID');
}

async function getUserData() {
  try {
    const userRequest = await fetch(`/userstate?uuid=${getUID()}`);
    if (userRequest.status === 204) return;
    userData = await userRequest.json();
    if (userData && userData.energy !== undefined) {
      energyInfillText.innerHTML = `Energia ${userData.energy}/100`;
      weightInfillText.innerHTML = `Peso ${100 - (userData.maxWeight || 0)}/100`;
      energyStatBar.style.width = `${userData.energy}%`;
      weightStatBar.style.width = `${100 - (userData.maxWeight || 0)}%`;
      statsBox.style.display = 'flex';
    }
  } catch (e) {
    console.error('getUserData error:', e);
  }
}

function createUID() {
  storage.removeItem('UID');
  const uint32 = window.crypto.getRandomValues(new Uint32Array(1))[0];
  storage.setItem('UID', uint32.toString(16));
}

function selecDificult(level) {
  sendText({ keyCode: 13, currentTarget: { value: level } });
  setTimeout(() => {
    document.querySelector('#enterText').classList.remove('displayNONE');
    document.querySelector('#enterDifficult').classList.add('displayNONE');
  }, 1000);
}

function toogleElementOpacity(element, open) {
  if (open) {
    element.classList.add('fadeOut');
    setTimeout(() => element.classList.add('displayNONE'), 200);
  } else {
    element.classList.remove('displayNONE');
    setTimeout(() => element.classList.remove('fadeOut'), 100);
  }
}

async function request(input) {
  try {
    const res = await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: input, id: getUID() })
    });
    const data = await res.json();
    let text = data.text || '';
    const intent = data.intent || '';
    text = text.replace(/\*([^*]+?)\*/g, '<b>$1</b>');
    const imgMatch = text.match(/src="([^&"]*)"/); 
    if (imgMatch) {
      const imgPath = imgMatch[1];
      const placeFromImg = (imgPath.match(/([^/]+?)\.[^.]+$/) || [])[1];
      if (placeFromImg && placeFromImg !== 'blackDeath') {
        currentPlace = placeFromImg;
        storage.setItem('currentPlace', currentPlace);
        if (audioActive && playList[currentPlace] && currentTrack !== playList[currentPlace]) {
          currentTrack = playList[currentPlace];
          playMusic(currentTrack);
        }
      }
    }
    saveLastResponse(text);
    return { text, intent, showDifficulty: data.showDifficulty || false, gameOver: data.gameOver || false };
  } catch (e) {
    console.error('request error:', e);
    return { text: 'Ha ocurrido un error. Por favor, intenta de nuevo.', intent: 'error' };
  }
}

function playMusic(soundTrack) {
  outerAudio.src = soundTrack || 'sounds/nightShadecut.mp3';
  outerAudio.volume = 0.1;
  outerAudio.play();
}

function pauseMusic() {
  currentTrack = undefined;
  outerAudio.pause();
}

function onOffAudio() {
  if (!audioActive) {
    audioController.children[0].src = 'images/sound-icon.png';
    audioController.children[1].innerHTML = 'MUSIC ON';
    playMusic(playList[currentPlace]);
    audioActive = true;
  } else {
    audioController.children[0].src = 'images/mute-icon.png';
    audioController.children[1].innerHTML = 'MUSIC OFF';
    pauseMusic();
    audioActive = false;
  }
}

function saveLastResponse(text) {
  storage.setItem('last', text);
  storage.setItem('responseDate', Date.now());
}

function loadLastResponse() {
  const last = storage.getItem('last');
  if (last) responses.append(quixoteChat(last));
}

function quixoteChat(text) {
  const chat = document.createElement('div');
  const avatar = document.createElement('img');
  const p = document.createElement('p');
  chat.className = 'quixoteChat';
  avatar.className = 'quixoteAvatar';
  avatar.src = 'images/don-quixote-1.png';
  p.className = 'quixoteText';
  p.innerHTML = text;
  chat.appendChild(avatar);
  chat.appendChild(p);
  return chat;
}

function userChat(text) {
  const chat = document.createElement('div');
  const avatar = document.createElement('img');
  const p = document.createElement('p');
  chat.className = 'userChat';
  avatar.className = 'userAvatar';
  avatar.src = 'images/don-quixote.png';
  p.className = 'userText';
  p.innerHTML = text;
  chat.appendChild(p);
  chat.appendChild(avatar);
  return chat;
}

function setInputWidth() {
  if (!textarea.value || textarea.value.length === 0) {
    textarea.style.width = '3px';
    return;
  }
  if (inputContent > textarea.value) {
    textarea.style.width = `${(textarea.value.length * 12) + 3}px`;
  }
}

function setFakeInputWidth() {
  inputContent = textarea.value;
  textarea.style.width = `${(inputContent.length * 12) + 15}px`;
}

function setFocus() {
  textarea.focus();
}