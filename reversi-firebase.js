// reversi-firebase.js
// Çok oyunculu (multiplayer), Firebase ve AJAX ile ilgili kodlar

// Firebase Config
const firebaseConfig = {
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: ""
};

console.log('Firebase başlatılıyor...');
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
console.log('Firebase başlatıldı, db:', db);

// Benzersiz oyuncu ID'si (UUID)
const playerId = localStorage.getItem('reversiPlayerId') || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
localStorage.setItem('reversiPlayerId', playerId);
console.log('Player ID:', playerId);

// Multiplayer değişkenler
let roomId = null;
let playerColor = null; // 'B' veya 'W'
let multiListener = null;
let isRoomCreator = false;

// Multiplayer arayüz elemanları
const multiMenu = document.getElementById('multiMenu');
const roomIdInput = document.getElementById('roomIdInput');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const backToMainBtn = document.getElementById('backToMainBtn');
const roomInfo = document.getElementById('roomInfo');
const roomIdShow = document.getElementById('roomIdShow');
const copyRoomLink = document.getElementById('copyRoomLink');
const waitingInfo = document.getElementById('waitingInfo');

// Oda kodu üretici
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
}

window.createGame = function(roomIdVal) {
    const ref = db.ref('rooms/' + roomIdVal);
    ref.set({
        players: { [playerId]: { color: 'B' } },
        board: JSON.stringify(getInitialBoard()),
        currentTurn: 'B',
        status: 'waiting',
        lastMove: null,
        passCount: 0
    }).then(() => {
        isRoomCreator = true;
        roomId = roomIdVal;
        playerColor = 'B';
        window.isMultiplayer = true;
        // Disconnect olursa oyuncuyu sil
        const playerRef = db.ref('rooms/' + roomId + '/players/' + playerId);
        playerRef.onDisconnect().remove();
        showRoomInfo(roomId);
        listenRoom();
    });
}

window.joinGame = function(roomIdVal) {
    const ref = db.ref('rooms/' + roomIdVal);
    ref.once('value').then(snap => {
        const val = snap.val();
        if (!val) {
            alert('Oda bulunamadı!');
            return;
        }
        if (val.status === 'playing') {
            alert('Oda dolu!');
            return;
        }
        ref.child('players').once('value').then(playersSnap => {
            const players = playersSnap.val() || {};
            if (Object.keys(players).length < 2) {
                let color = 'B';
                if (Object.values(players).some(p => p.color === 'B')) {
                    color = 'W';
                }
                ref.child('players/' + playerId).set({ color }).then(() => {
                    // Disconnect olursa oyuncuyu sil
                    const playerRef = db.ref('rooms/' + roomIdVal + '/players/' + playerId);
                    playerRef.onDisconnect().remove();
                    roomId = roomIdVal;
                    playerColor = color;
                    window.isMultiplayer = true;
                    isRoomCreator = false;
                    showRoomInfo(roomId);
                    listenRoom();
                });
            } else {
                alert('Oda dolu!');
            }
        });
    });
}

function listenRoom() {
    roomInfo.classList.remove('hidden');
    waitingInfo.textContent = 'Diğer oyuncu bekleniyor...';
    multiMenu.classList.add('hidden');
    mainMenu.classList.add('hidden');
    difficultyMenu.classList.add('hidden');
    if (multiListener) db.ref('rooms/' + roomId).off('value', multiListener);
    multiListener = db.ref('rooms/' + roomId).on('value', snap => {
        const val = snap.val();
        if (!val) return;

        // --- Oyun bittiğinde her durumda yönlendir ---
        if (val.status === 'ended') {
            window.location.href = 'ended.html?room=' + roomId;
            return;
        }
        // ---------------------------------------------------------

        // PlayerColor'u Firebase'den al
        if (val.players && val.players[playerId]) {
            playerColor = val.players[playerId].color;
        }
        
        // --- OTOMATİK STATUS GÜNCELLEME ---
        if (
            val.status === 'waiting' &&
            val.players &&
            Object.keys(val.players).length === 2 &&
            isRoomCreator // Sadece oda kurucusu yapsın
        ) {
            db.ref('rooms/' + roomId).update({ status: 'playing' });
            return; // Status değişince tekrar tetiklenecek
        }
        // ----------------------------------

        if (val.status === 'playing') {
            waitingInfo.textContent = '';
            roomInfo.classList.remove('hidden');
            gameArea.classList.remove('hidden');
            mainMenu.classList.add('hidden');
            difficultyMenu.classList.add('hidden');
            multiMenu.classList.add('hidden');
            winnerInfo.style.display = 'none';
            winnerInfo.textContent = '';
            gameEnded = false;
            gameEndBtns.classList.add('hidden');
            window.isMultiplayer = true;
            board = JSON.parse(val.board);
            currentPlayer = val.currentTurn;
            renderBoard();

            // --- PASS KONTROLÜ ---
            const validMoves = getValidMoves(currentPlayer);
            if (!gameEnded && validMoves.length === 0) {
                if (typeof val.passCount !== 'number') val.passCount = 0;
                if (val.passCount >= 1) {
                    // İki oyuncu üst üste pass yaptı, oyun biter
                    db.ref('rooms/' + roomId).update({
                        status: 'ended',
                        winnerMsg: 'Oyun bitti (her iki oyuncu da pas geçti)',
                        passCount: 2
                    });
                } else {
                    // Pass: Sıra değişsin, passCount +1
                    db.ref('rooms/' + roomId).update({
                        currentTurn: currentPlayer === 'B' ? 'W' : 'B',
                        passCount: 1
                    });
                }
            } else if (validMoves.length > 0 && val.passCount !== 0) {
                // Hamle yapılabiliyorsa, passCount sıfırlanır
                db.ref('rooms/' + roomId).update({
                    passCount: 0
                });
            }
            // ---------------------

            // Oda otomatik kapanışı: oyuncu sayısı 1 veya 0 ise oda kapatılır
            if (val.players && Object.keys(val.players).length < 2 && val.status !== 'ended') {
                db.ref('rooms/' + roomId).update({
                    status: 'ended',
                    winnerMsg: 'Oda kapatıldı (oyuncu ayrıldı)'
                });
            }
        }
        if (val.status === 'waiting') {
            waitingInfo.textContent = 'Diğer oyuncu bekleniyor...';
        }
        if (val.status === 'ended') {
            winnerInfo.style.display = '';
            winnerInfo.textContent = val.winnerMsg || 'Oyun bitti.';
            gameArea.classList.add('hidden');
            gameEndBtns.classList.remove('hidden');
            // Odayı sil (players yoksa)
            if (!val.players || Object.keys(val.players).length === 0) {
                db.ref('rooms/' + roomId).remove();
            }
        }
    });
}

function showRoomInfo(roomIdVal) {
    roomIdShow.textContent = roomIdVal;
    roomInfo.classList.remove('hidden');
    copyRoomLink.onclick = function() {
        navigator.clipboard.writeText(roomIdVal);
        copyRoomLink.textContent = 'Kopyalandı!';
        setTimeout(() => copyRoomLink.textContent = 'Kopyala', 1200);
    };
}

function startMultiplayerGame() {
    gameArea.classList.remove('hidden');
    mainMenu.classList.add('hidden');
    difficultyMenu.classList.add('hidden');
    multiMenu.classList.add('hidden');
    roomInfo.classList.remove('hidden');
    winnerInfo.style.display = 'none';
    winnerInfo.textContent = '';
    gameEnded = false;
    gameEndBtns.classList.add('hidden');
    renderBoard();
}

function endRoom(winnerMsg) {
    if (!roomId) return;
    db.ref('rooms/' + roomId).update({ status: 'ended', winnerMsg });
}

function getInitialBoard() {
    const b = Array(8).fill(null).map(() => Array(8).fill(null));
    b[3][3] = 'W';
    b[3][4] = 'B';
    b[4][3] = 'B';
    b[4][4] = 'W';
    return b;
}

window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
        mainMenu.classList.add('hidden');
        multiMenu.classList.add('hidden');
        joinGame(roomParam);
    }
});

backToMainBtn.addEventListener('click', () => {
    multiMenu.classList.add('hidden');
    mainMenu.classList.remove('hidden');
    window.isMultiplayer = false;
    if (multiListener) {
        db.ref('rooms/' + roomId).off('value', multiListener);
        multiListener = null;
    }
});
createRoomBtn.addEventListener('click', () => {
    console.log('Oda oluştur butonuna tıklandı');
    let val = roomIdInput.value.trim();
    if (!val) val = generateRoomCode();
    console.log('Oluşturulacak oda kodu:', val);
    createGame(val);
});
joinRoomBtn.addEventListener('click', () => {
    let val = roomIdInput.value.trim();
    if (!val) { alert('Oda kodu girin!'); return; }
    joinGame(val);
});

function passIfNoMoveMulti() {
    let loop = 0;
    while (!gameEnded) {
        let moves = getValidMoves(currentPlayer);
        if (moves.length > 0) break;
        currentPlayer = currentPlayer === 'B' ? 'W' : 'B';
        if (++loop > 10) break;
    }
    renderBoard();
} 