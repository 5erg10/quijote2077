const storage = window.localStorage;

let textarea, responses, splashScreen, continueButton, warningMessage, currentPlace,
  currentTrack, outerAudio, audioController, weightStatBar, energyStatBar, weightInfillText,
  energyInfillText, statsBox, userDatabaseData, userName, loadingLabel;

let audioActive = false;
let inputContent = '';
let isGameOver = false;

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
  textarea = document.querySelector('#chatInput');
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
  loadingLabel = document.querySelector('#inputLoading');
  loadingLabel.style.display = 'none';
  statsBox = document.querySelector('#statsBox');
  statsBox.style.display = 'none';
  document.addEventListener('click', setFocus);
  if (!getUID()) continueButton.disabled = true;
  audioController.addEventListener('click', onOffAudio);
  loadPlacesDescriptions();

  document.addEventListener('click', (e) => {
    const menu = document.getElementById('characterMenu');
    const popup = document.getElementById('placeDetailPopup');
    const icon = document.getElementById('characterMenuIcon');
    if (!menu.classList.contains('displayNONE') &&
        !menu.contains(e.target) &&
        !icon.contains(e.target)) {
      closeCharacterMenu();
    }
    if (!popup.classList.contains('displayNONE') &&
        !popup.contains(e.target) &&
        !menu.contains(e.target)) {
      closePlaceDetail();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCharacterMenu();
  });
}

function startGame() {
  toogleElementOpacity(splashScreen, true);
  textarea.addEventListener('keyup', (event) => {
    const inputText = textarea.value.trim();
     if (event.keyCode === 13 && !!inputText) {
      showLoading(true);
      if (!userName) {
        userName = inputText;
        showDifficultySelector();
        return;
      }
      addUserMessageToChat(inputText);
      sendText(inputText);
     }
  });
  addQuixoteMessageToChat('Hola aventurero! No sé si eres un valiente o un inconsciente al entrar aqui, pero en fin... ¿Quieres embarcarte en esta aventura? Si me dices tu nombre lo tomare como un si.');
  setFocus();
  if (audioActive) outerAudio.play();
}

function showDifficultySelector() {
  addQuixoteMessageToChat(`¡${userName}! Buen nombre para un hidalgo. Ahora elige tu nivel de dificultad: <b>facil</b>, <b>medio</b> o <b>dificil</b>.`);
  document.querySelector('#enterText').classList.add('displayNONE');
  document.querySelector('#enterDifficult').classList.remove('displayNONE');
  showLoading(false);
}

async function selecDifficult(level) {
  try {
    showLoading(true);
    createUID();
    await fetch('/user', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: storage.getItem('UID'),
        userName,
        level
      })
    });
    
    document.querySelector('#enterText').classList.remove('displayNONE');
    document.querySelector('#enterDifficult').classList.add('displayNONE');
    initGame();

  } catch(err) {
    addQuixoteMessageToChat('Hubo un error al iniciar la aplicacion.')
  }
}

async function initGame() {
   try {
    textarea.value = '';
    closeCharacterMenu();
    const res = await fetch(`/api/initGame?userId=${storage.getItem('UID')}`);
    const data = await res.json();
    console.log('init mnessage: ', data)
    if (data) processQuijoteChat(data);
  } catch (e) {
    console.error('request error:', e);
    return {
      messages: [{ text: 'Ha ocurrido un error. Por favor, intenta de nuevo.', intent: 'error' }],
      gameOver: false
    };
  }
}

async function sendText(text) {
  
  textarea.value = '';
  
  closeCharacterMenu();

  if (isGameOver) {
    if (text.toLowerCase().includes('reiniciar')) {
      isGameOver = false;
      responses.innerHTML = '';
      startGame();
    }
    showLoading(false);
    return;
  }

  const result = await requestUserTextResponse(text);

  if (result) processQuijoteChat(result);
}

function processQuijoteChat(response) {
  const messages = response.messages || [];
  messages.forEach(msg => {
    const responseText = msg.text || '';
    updateMusicFromText(responseText);
    addQuixoteMessageToChat(responseText);
  });

  if (response.gameOver) handleGameOver();

  setTimeout(() => {
    if (getUID() && !response.gameOver) getUserData();
    setFocus();
  }, 200);

  const lastMsg = messages[messages.length - 1];
  if (lastMsg) saveLastResponse(lastMsg.text || '');
  
  showLoading(false);
}

function addUserMessageToChat(text) {
  responses.append(userChat(text));
  textarea.value = '';
  setTimeout(() => responses.scrollTo({ left: 0, top: responses.scrollHeight, behavior: 'smooth' }), 200);
}

function addQuixoteMessageToChat(text) {
  responses.append(quixoteChat(text));
  setTimeout(() => responses.scrollTo({ left: 0, top: responses.scrollHeight, behavior: 'smooth' }), 200);
}

async function requestUserTextResponse(text) {
  try {
    const res = await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, id: getUID(), userName })
    });
    const data = await res.json();
    return {
      messages: data.messages || [],
      gameOver: data.gameOver || false
    };
  } catch (e) {
    console.error('request error:', e);
    return {
      messages: [{ text: 'Ha ocurrido un error. Por favor, intenta de nuevo.', intent: 'error' }],
      gameOver: false
    };
  }
}

async function loadPlacesDescriptions() {
  try {
    const res = await fetch('/places');
    if (res.ok) placesDescriptions = await res.json();
  } catch (e) {}
}

function closeCharacterMenu() {
  document.getElementById('characterMenu').classList.add('displayNONE');
  closePlaceDetail();
}

function toggleCharacterMenu() {
  if (!userDatabaseData) return;
  const menu = document.getElementById('characterMenu');
  if (menu.classList.contains('displayNONE')) {
    renderCharacterMenu();
    menu.classList.remove('displayNONE');
  } else {
    closeCharacterMenu();
  }
}

function renderCharacterMenu() {
  if (!userDatabaseData) return;

  document.getElementById('characterMenu__name').textContent =
    (userDatabaseData.name || 'HIDALGO').toUpperCase();

  const objList = document.getElementById('characterMenu__objects');
  objList.innerHTML = '';
  const objects = userDatabaseData.objects || [];
  if (objects.length === 0) {
    objList.innerHTML = '<li><span class="characterMenu__emptyMsg">-- mochila vacía --</span></li>';
  } else {
    objects.forEach(obj => {
      const li = document.createElement('li');
      const origin = obj.originPLace || obj.originPlace || '';
      li.innerHTML = `<span class="objName">${obj.name.charAt(0).toUpperCase() + obj.name.slice(1)}${origin ? `<span class="objOrigin">(Recogido en ${origin.toUpperCase()})</span>` : ''}</span>`;
      objList.appendChild(li);
    });
  }

  const placesList = document.getElementById('characterMenu__places');
  placesList.innerHTML = '';
  const places = userDatabaseData.placesKnown || [];
  if (places.length === 0) {
    placesList.innerHTML = '<li><span class="characterMenu__emptyMsg">-- ninguno aún --</span></li>';
  } else {
    const current = (userDatabaseData.currentRoom && userDatabaseData.currentRoom[0]) || '';
    places.forEach(place => {
      const li = document.createElement('li');
      li.textContent = `${place === current ? 'Estas en ' : ''}${place.charAt(0).toUpperCase() + place.slice(1)}`;
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
  const rawDesc = placeData && placeData.description
    ? placeData.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    : '-- sin descripción --';
  document.getElementById('placeDetailPopup__desc').textContent = rawDesc;
  popup.classList.remove('displayNONE');
}

function closePlaceDetail() {
  document.getElementById('placeDetailPopup').classList.add('displayNONE');
}

function updateMusicFromText(text) {
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
}

function handleGameOver() {
  isGameOver = true;
  statsBox.style.display = 'none';
  pauseMusic();
  storage.removeItem('UID');
  storage.removeItem('currentPlace');
  storage.removeItem('last');
  storage.removeItem('responseDate');
  userDatabaseData = null;
  userName = undefined;
}

function cancelContinue() {
  toogleElementOpacity(warningMessage, true);
}

function startFromWarning() {
  storage.removeItem('UID');
  storage.removeItem('currentPlace');
  storage.removeItem('last');
  storage.removeItem('responseDate');
  toogleElementOpacity(warningMessage, true);
  restartGame();
}

function restartGame() {
  if (!getUID()) {
    startGame();
  } else {
    toogleElementOpacity(warningMessage, false);
  }
}

async function continueGame() {
  getUserData();
  loadLastResponse();
  startGame();
}

function getUID() {
  return storage.getItem('UID');
}

async function getUserData() {
  try {
    const userRequest = await fetch(`/user?uuid=${getUID()}`);
    if (userRequest.status === 204) return;
    userDatabaseData = await userRequest.json();
    if (userDatabaseData && userDatabaseData.energy !== undefined) {
      energyInfillText.innerHTML = `Energia ${userDatabaseData.energy}/100`;
      weightInfillText.innerHTML = `Peso ${100 - (userDatabaseData.maxWeight || 0)}/100`;
      energyStatBar.style.width = `${userDatabaseData.energy}%`;
      weightStatBar.style.width = `${100 - (userDatabaseData.maxWeight || 0)}%`;
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

function toogleElementOpacity(element, open) {
  if (open) {
    element.classList.add('fadeOut');
    setTimeout(() => element.classList.add('displayNONE'), 200);
  } else {
    element.classList.remove('displayNONE');
    setTimeout(() => element.classList.remove('fadeOut'), 100);
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
  if (last) addQuixoteMessageToChat(last);
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

function setFocus() {
  textarea.focus();
}

function showLoading(show) {
  loadingLabel.style.display = show ? '' : 'none';
}
