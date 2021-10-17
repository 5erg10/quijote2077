const storage = window.localStorage;
let textarea, responses, splashScreen, continueButton, warningMessage, currentPlace, currentTrack, outerAudio, audioController;
let audioActive = false;

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
  audioController = document.querySelector('#audioController');
  outerAudio = document.querySelector('#outerAudio');
  currentPlace = storage.getItem("currentPlace");
  document.addEventListener('click', setFocus);
  if(!getUID()) {
    continueButton.disabled = true;
  }
  audioController.addEventListener("click", onOffAudio);
}

async function sendText({keyCode, currentTarget}) {
  if (keyCode == 13) {
    const input = currentTarget.value;

    showLoading(currentTarget);
    setInputWidth();

    const text = await request(input);
    responses.append(quixoteChat(text));
    setTimeout(() => {
      responses.scrollTo({ left: 0, top: responses.scrollHeight, behavior: "smooth" });
    }, 500);
    
  }
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
  if(!getUID()) {
    startGame();
    createUID();
    setTimeout(() => {
      responses.append(quixoteChat("Hola?, hay alguien ahí?"));
    }, 2000);
  } else {
    toogleElementOpacity(warningMessage, false);
  }
}

function continueGame() {
  loadLastResponse();
  startGame();
}

function startGame() {
  toogleElementOpacity(splashScreen, true);
  textarea.addEventListener("keyup", sendText);
  setInputWidth();
  setFocus();
  if(audioActive) outerAudio.play(playList[currentPlace]);
}

function showLoading(target) {
  responses.append(userChat(target.value));
  target.value = '';
  responses.scrollTop = responses.scrollHeight;
}

function getUID() {
  return storage.getItem('UID');
}

function createUID() {
  storage.removeItem('UID');
  const uint32 = window.crypto.getRandomValues(new Uint32Array(1))[0];
  storage.setItem('UID', uint32.toString(16));
}

function toogleElementOpacity(element, open) {
  if(open) {
    element.classList.add("fadeOut");
    setTimeout(() => {
      element.classList.add("displayNONE");
    },200);
  } else {
    element.classList.remove("displayNONE");
    setTimeout(() => {
      element.classList.remove("fadeOut");
    },100);
  }
}

async function request(input) {
  const response = await fetch(`api/intent?text=${input}&id=${getUID()}`);
  let text = await response.text();
  
  // set bold
  text = text.replace(/\*([^*]+?)\*/g, '<b>$1</b>');
  currentPlace = ((text.match(/src="([^&]*)"/) || 'none')[1].match(/([^/]+?).$/) || 'none')[0].replace(/.png/,'');
  if( currentPlace !== "n" ) {
    storage.setItem("currentPlace", currentPlace);
    if(audioActive && playList[currentPlace] && currentTrack !== playList[currentPlace]) {
      currentTrack = playList[currentPlace];
      playMusic(currentTrack);
    }
  }
  saveLastResponse(text);
  return text;
}

function playMusic(soundTrack) {
  outerAudio.src = soundTrack || "sounds/nightShadecut.mp3";
  outerAudio.volume = 0.1;
  outerAudio.play();
}

function pauseMusic() {
  currentTrack = undefined;
  outerAudio.pause();
}

function onOffAudio() {
  if (!audioActive) {
    audioController.children[0].src = "images/sound-icon.png";
    audioController.children[1].innerHTML = "MUSIC ON";
    playMusic(playList[currentPlace]);
    audioActive = true;
  } else {
    audioController.children[0].src = "images/mute-icon.png";
    audioController.children[1].innerHTML = "MUSIC OFF";
    pauseMusic();
    audioActive = false;
  }
};

function saveLastResponse(text) {
  storage.setItem('last', text);
  storage.setItem('responseDate', Date.now());
}

function loadLastResponse() {
  responses.append(quixoteChat(storage.getItem('last')));
}

function quixoteChat(text) {
  const chat = document.createElement('div');
  const avatar = document.createElement('img');
  const p = document.createElement('p');

  chat.className="quixoteChat";
  avatar.className="quixoteAvatar";
  avatar.src="images/don-quixote-1.png";
  p.className="quixoteText";
  p.innerHTML = text;

  chat.appendChild(avatar);
  chat.appendChild(p);

  return chat;
}

function userChat(text) {
  const chat = document.createElement('div');
  const avatar = document.createElement('img');
  const p = document.createElement('p');

  chat.className="userChat";
  avatar.className="userAvatar";
  avatar.src="images/don-quixote.png";
  p.className="userText";
  p.innerHTML = text;

  chat.appendChild(p);
  chat.appendChild(avatar);

  return chat;
}

function setInputWidth() {  
  if (textarea.value.length === 0) {
    textarea.style.width = '3px';
    return true;
  }

  if (inputContent > textarea.value) {
    textarea.style.width = `${(textarea.value.length * 12) + 3}px`;
  }

  return true;
}

function setFakeInputWidth() {  
  inputContent = textarea.value;

  textarea.style.width = `${(inputContent.length * 12) + 15}px`;

  return true;
}

function setFocus() {
  textarea.focus()
}