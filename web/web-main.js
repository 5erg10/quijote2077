const storage = window.localStorage;
let textarea, responses, splashScreen, continueButton, warningMessage, currentPlace, currentSound, outerAudio;

const playList = {
  biblioteca: {
    soundUrl: 'localhost/musicaINteriores.mp3'
  }
};

function documentReady() {
  textarea = document.querySelector('#enterText input');
  responses = document.querySelector('#chatContainer');
  splashScreen = document.querySelector('#splashScreen');
  warningMessage = document.querySelector('#warningMessage');
  continueButton = document.querySelector('#continueButton');
  outerAudio = document.querySelector('#outerAudio').play();
  if(!getUID()) {
    continueButton.disabled = true;
  }
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
  document.querySelector('#enterText').addEventListener('click', setFocus);
  textarea.addEventListener("keyup", sendText);
  setInputWidth();
  setFocus();
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

  console.log('responsemio: ', response);
  
  // set bold
  text = text.replace(/\*([^*]+?)\*/g, '<b>$1</b>');
  currentPlace = ((text.match(/src="([^&]*)"/) || 'none')[1].match(/([^/]+?).$/) || 'none')[0].replace(/.png/,'');
  if( currentPlace ) {
    playMusic(currentPlace);
  }
  saveLastResponse(text);
  return text;
}

function playMusic(place) {
  currentSound = playList[place];
  console.log(currentSound);
}

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