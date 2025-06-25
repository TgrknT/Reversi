// reversi.js
// Oyun mantığı ve arayüz yönetimi (tek oyunculu ve genel fonksiyonlar)

const singleBtn = document.getElementById('singleBtn');
const multiBtn = document.getElementById('multiBtn');
const mainMenu = document.getElementById('mainMenu');
const difficultyMenu = document.getElementById('difficultyMenu');
const gameArea = document.getElementById('gameArea');
const boardDiv = document.getElementById('board');
const scoreBlack = document.getElementById('scoreBlack');
const scoreWhite = document.getElementById('scoreWhite');
const turnInfo = document.getElementById('turnPlayer');
const backToMenu = document.getElementById('backToMenu');
const winnerInfo = document.getElementById('winnerInfo');
const playAgainBtn = document.getElementById('playAgainBtn');
const gameEndBtns = document.getElementById('gameEndBtns');

let board = [];
let currentPlayer = 'B'; // 'B' = Siyah, 'W' = Beyaz
let botMode = null;
let botActive = false;
let gameEnded = false;
window.isMultiplayer = false; // Multiplayer kodu reversi-firebase.js'de

function resetBoard() {
    board = Array(8).fill(null).map(() => Array(8).fill(null));
    board[3][3] = 'W';
    board[3][4] = 'B';
    board[4][3] = 'B';
    board[4][4] = 'W';
    currentPlayer = 'B';
}

function renderBoard() {
    boardDiv.innerHTML = '';
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell' + (isValidMove(x, y, currentPlayer) ? '' : ' disabled');
            cell.dataset.x = x;
            cell.dataset.y = y;
            if (board[y][x] === 'B') {
                const disk = document.createElement('div');
                disk.className = 'disk black';
                cell.appendChild(disk);
            } else if (board[y][x] === 'W') {
                const disk = document.createElement('div');
                disk.className = 'disk white';
                cell.appendChild(disk);
            } else {
                let showDot = false;
                if (window.isMultiplayer) {
                    if (currentPlayer === playerColor && isValidMove(x, y, playerColor) && !gameEnded) showDot = true;
                } else {
                    if (isValidMove(x, y, currentPlayer) && !gameEnded && (botActive === false || currentPlayer === 'B')) showDot = true;
                }
                if (showDot) {
                    const dot = document.createElement('div');
                    dot.className = 'move-dot';
                    cell.appendChild(dot);
                }
            }
            cell.addEventListener('click', onCellClick);
            boardDiv.appendChild(cell);
        }
    }
    updateScores();
    checkGameEnd();
}

function updateScores() {
    let black = 0, white = 0;
    for (let row of board) {
        for (let c of row) {
            if (c === 'B') black++;
            if (c === 'W') white++;
        }
    }
    if (window.isMultiplayer) {
        turnInfo.textContent = currentPlayer === playerColor
            ? (playerColor === 'B' ? '● (Siyah) (Senin sıran)' : '○ (Beyaz) (Senin sıran)')
            : (currentPlayer === 'B' ? '● (Siyah)' : '○ (Beyaz)');
    } else {
        turnInfo.textContent = currentPlayer === 'B' ? '● (Siyah)' : '○ (Beyaz)';
    }
    scoreBlack.textContent = `● ${black}`;
    scoreWhite.textContent = `○ ${white}`;
}

function isValidMove(x, y, player) {
    if (board[y][x]) return false;
    const opponent = player === 'B' ? 'W' : 'B';
    let valid = false;
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            let nx = x + dx, ny = y + dy, found = false;
            while (nx >= 0 && nx < 8 && ny >= 0 && ny < 8 && board[ny][nx] === opponent) {
                nx += dx; ny += dy; found = true;
            }
            if (found && nx >= 0 && nx < 8 && ny >= 0 && ny < 8 && board[ny][nx] === player) {
                if (Math.abs(nx - x) > 1 || Math.abs(ny - y) > 1) valid = true;
            }
        }
    }
    return valid;
}

function getValidMoves(player) {
    const moves = [];
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            if (isValidMove(x, y, player)) moves.push({x, y});
        }
    }
    return moves;
}

function makeMove(x, y, player) {
    if (!isValidMove(x, y, player)) return false;
    const opponent = player === 'B' ? 'W' : 'B';
    board[y][x] = player;
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            let nx = x + dx, ny = y + dy, toFlip = [];
            while (nx >= 0 && nx < 8 && ny >= 0 && ny < 8 && board[ny][nx] === opponent) {
                toFlip.push([nx, ny]);
                nx += dx; ny += dy;
            }
            if (toFlip.length && nx >= 0 && nx < 8 && ny >= 0 && ny < 8 && board[ny][nx] === player) {
                for (const [fx, fy] of toFlip) board[fy][fx] = player;
            }
        }
    }
    return true;
}

function onCellClick(e) {
    if (window.isMultiplayer) {
        if (currentPlayer !== playerColor || gameEnded) return;
        const x = +e.currentTarget.dataset.x;
        const y = +e.currentTarget.dataset.y;
        if (!isValidMove(x, y, playerColor)) return;
        sendMoveMulti(x, y);
        return;
    }
    if (botActive && currentPlayer === 'W') return;
    if (gameEnded) return;
    const x = +e.currentTarget.dataset.x;
    const y = +e.currentTarget.dataset.y;
    if (makeMove(x, y, currentPlayer)) {
        currentPlayer = 'W';
        passIfNoMoveSingle();
    }
}

function passIfNoMoveSingle() {
    let loop = 0;
    while (!gameEnded) {
        let moves = getValidMoves(currentPlayer);
        if (moves.length > 0) {
            // Eğer botun sırasıysa, bot hemen oynasın
            if (botActive && currentPlayer === 'W') {
                const move = (botMode === 'kolay') ? botEasy() : (botMode === 'orta') ? botMedium() : botHard();
                if (move) {
                    makeMove(move.x, move.y, 'W');
                    currentPlayer = 'B';
                    continue; // Döngü devam etsin, insanın sırası gelene kadar
                }
            }
            break; // Hamle yapılabiliyorsa ve insanın sırasıysa döngüden çık
        }
        // Hamle yoksa sıra değiştir
        currentPlayer = currentPlayer === 'B' ? 'W' : 'B';
        if (++loop > 60) break; // Güvenlik limiti
    }
    renderBoard();
}

function botEasy() {
    const moves = getValidMoves('W');
    if (moves.length === 0) return null;
    return moves[Math.floor(Math.random() * moves.length)];
}
function botMedium() {
    const moves = getValidMoves('W');
    if (moves.length === 0) return null;
    let maxFlip = -1, bestMove = null;
    for (const move of moves) {
        const flipCount = countFlipped(move.x, move.y, 'W');
        if (flipCount > maxFlip) {
            maxFlip = flipCount;
            bestMove = move;
        }
    }
    return bestMove;
}
function botHard() {
    const moves = getValidMoves('W');
    if (moves.length === 0) return null;
    const corners = moves.filter(m => (m.x === 0 || m.x === 7) && (m.y === 0 || m.y === 7));
    if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
    return botMedium();
}
function countFlipped(x, y, player) {
    const opponent = player === 'B' ? 'W' : 'B';
    let total = 0;
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            let nx = x + dx, ny = y + dy, count = 0;
            while (nx >= 0 && nx < 8 && ny >= 0 && ny < 8 && board[ny][nx] === opponent) {
                nx += dx; ny += dy; count++;
            }
            if (count && nx >= 0 && nx < 8 && ny >= 0 && ny < 8 && board[ny][nx] === player) {
                total += count;
            }
        }
    }
    return total;
}

function checkGameEnd() {
    const blackMoves = getValidMoves('B');
    const whiteMoves = getValidMoves('W');
    if (blackMoves.length === 0 && whiteMoves.length === 0) {
        let black = 0, white = 0;
        for (let row of board) {
            for (let c of row) {
                if (c === 'B') black++;
                if (c === 'W') white++;
            }
        }
        let msg = '';
        if (black > white) msg = 'Kazanan: ● Siyah';
        else if (white > black) msg = 'Kazanan: ○ Beyaz';
        else msg = 'Berabere!';
        winnerInfo.style.display = '';
        winnerInfo.textContent = msg;
        gameEnded = true;
        gameEndBtns.classList.remove('hidden');
    } else {
        winnerInfo.style.display = 'none';
        winnerInfo.textContent = '';
        gameEnded = false;
        gameEndBtns.classList.add('hidden');
    }
}

function startGame(difficulty) {
    window.isMultiplayer = false;
    botMode = difficulty;
    botActive = true;
    resetBoard();
    mainMenu.classList.add('hidden');
    difficultyMenu.classList.add('hidden');
    gameArea.classList.remove('hidden');
    winnerInfo.style.display = 'none';
    winnerInfo.textContent = '';
    gameEnded = false;
    gameEndBtns.classList.add('hidden');
    renderBoard();
}

singleBtn.addEventListener('click', () => {
    mainMenu.classList.add('hidden');
    difficultyMenu.classList.remove('hidden');
});

multiBtn.addEventListener('click', () => {
    mainMenu.classList.add('hidden');
    document.getElementById('multiMenu').classList.remove('hidden');
});

difficultyMenu.addEventListener('click', (e) => {
    if (e.target.classList.contains('difficulty-btn')) {
        const diff = e.target.getAttribute('data-difficulty');
        startGame(diff);
    }
});

backToMenu.addEventListener('click', () => {
    gameArea.classList.add('hidden');
    mainMenu.classList.remove('hidden');
    document.getElementById('roomInfo').classList.add('hidden');
    window.isMultiplayer = false;
    // MultiListener'ı temizle
    if (typeof multiListener !== 'undefined' && multiListener) {
        if (typeof db !== 'undefined' && roomId) {
            db.ref('rooms/' + roomId).off('value', multiListener);
        }
        multiListener = null;
    }
});

playAgainBtn.addEventListener('click', () => {
    winnerInfo.style.display = 'none';
    winnerInfo.textContent = '';
    gameEndBtns.classList.add('hidden');
    resetBoard();
    renderBoard();
});

window.sendMoveMulti = function(x, y) {
    if (!window.isMultiplayer || currentPlayer !== playerColor || gameEnded) return;
    if (!isValidMove(x, y, playerColor)) return;
    let tempBoard = JSON.parse(JSON.stringify(board));
    (function makeMoveTemp(boardArr, x, y, player) {
        if (!isValidMove(x, y, player)) return false;
        const opponent = player === 'B' ? 'W' : 'B';
        boardArr[y][x] = player;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                let nx = x + dx, ny = y + dy, toFlip = [];
                while (nx >= 0 && nx < 8 && ny >= 0 && ny < 8 && boardArr[ny][nx] === opponent) {
                    toFlip.push([nx, ny]);
                    nx += dx; ny += dy;
                }
                if (toFlip.length && nx >= 0 && nx < 8 && ny >= 0 && ny < 8 && boardArr[ny][nx] === player) {
                    for (const [fx, fy] of toFlip) boardArr[fy][fx] = player;
                }
            }
        }
        return true;
    })(tempBoard, x, y, playerColor);
    const ref = db.ref('rooms/' + roomId);
    ref.update({
        board: JSON.stringify(tempBoard),
        currentTurn: playerColor === 'B' ? 'W' : 'B',
        lastMove: {
            row: y, col: x, player: playerId, boardState: JSON.stringify(tempBoard), currentTurn: playerColor === 'B' ? 'W' : 'B'
        }
    });
} 