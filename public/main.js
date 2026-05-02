const socket = io({
    transports: ['websocket', 'polling']
});

// State
let myRole = null;
let currentGame = null;
let myBoard = null;
let isMyTurn = false;
let selectedCells = []; // For Battleship setup
let currentRound = 1;
let attacksAllowed = 1;
let currentAttacks = [];

// DOM Elements
const lobbyScreen = document.getElementById('lobby');
const waitingScreen = document.getElementById('waiting');
const gameScreen = document.getElementById('game-screen');
const gameContainer = document.getElementById('game-container');
const systemMsg = document.getElementById('system-msg');
const turnIndicator = document.getElementById('turn-indicator');
const roundInfo = document.getElementById('round-info');
const readyBtn = document.getElementById('ready-btn');
const controls = document.getElementById('controls');

socket.on('connect', () => {
    console.log('連線成功！ ID:', socket.id);
    systemMsg.innerText = "已連線至貓咪咖啡廳！請選擇遊戲。";
});

socket.on('connect_error', (error) => {
    systemMsg.innerText = "連線失敗，正在重新嘗試喵...";
});

// Join Logic
document.getElementById('join-btn').addEventListener('click', () => {
    const room = document.getElementById('room-id').value;
    const gameType = document.getElementById('game-type').value;
    if (!room) return alert('請輸入房間號碼！');
    
    currentGame = gameType;
    socket.emit('joinRoom', { room, gameType });
});

socket.on('joined', ({ role, room, gameType }) => {
    myRole = role;
    showScreen('waiting');
    const roleName = role === 'Calico' ? '三花貓' : '橘貓';
    document.getElementById('my-role-name').innerText = roleName;
    document.getElementById('my-role-name').className = 'role-' + role;
    document.getElementById('my-role-icon').innerText = role === 'Calico' ? '👵' : '👶';
    systemMsg.innerText = `正在房間 ${room} 等待對手喵...`;
});

socket.on('matchFound', () => {
    systemMsg.innerText = "對手貓咪出現了！準備開戰！";
    showScreen('game-screen');
});

// Bingo Logic
socket.on('gameStarted', (data) => {
    if (currentGame === 'bingo') {
        myBoard = data.boards[socket.id];
        renderBingoBoard();
        updateTurn(data.turn);
    }
});

socket.on('updateState', (data) => {
    if (currentGame === 'bingo') {
        updateBingoMarks(data.marks[socket.id]);
        const pName = data.lastPlayer === socket.id ? '你' : '對方';
        systemMsg.innerText = `${pName} 抓到了號碼 ${data.lastNumber}！`;
    }
});

socket.on('nextTurn', (data) => {
    updateTurn(data.turn);
});

// Battleship Logic
socket.on('waitingForSetup', (data) => {
    if (currentGame === 'battleship') {
        renderSetupBoard();
        systemMsg.innerText = data.text;
        controls.classList.remove('hidden');
    }
});

socket.on('playerReady', ({ role }) => {
    systemMsg.innerText = `${role} 已經藏好零食了...`;
});

socket.on('battleStarted', (data) => {
    currentRound = data.round;
    roundInfo.innerText = `第 ${currentRound} 回合`;
    systemMsg.innerText = "戰鬥開始！快找出對方的零食！";
    controls.classList.add('hidden');
    renderBattleBoard();
});

socket.on('roundResults', (data) => {
    const myMoves = data.results[socket.id];
    const oppMoves = Object.entries(data.results).find(([id]) => id !== socket.id)[1];

    currentRound = data.round;
    attacksAllowed = data.attacksAllowed;
    currentAttacks = [];

    roundInfo.innerText = `第 ${currentRound} 回合`;
    if (attacksAllowed > 1) {
        systemMsg.innerText = `獎勵回合！這回合你可以連續出擊 ${attacksAllowed} 次！`;
    }

    // Process my attack results
    myMoves.forEach(m => {
        const cell = document.querySelector(`.cell[data-r="${m.r}"][data-c="${m.c}"]`);
        if (m.hit) {
            cell.classList.add('hit');
            cell.innerText = '💥';
            if (m.sunkShipId) systemMsg.innerText = "太棒了！你擊沉了對方的一件寶物！";
        } else {
            cell.classList.add('miss');
            cell.innerText = '💨';
        }
    });

    alert(`回合結束！你擊中了 ${myMoves.filter(m=>m.hit).length} 個點，對方擊中了 ${oppMoves.filter(m=>m.hit).length} 個點。`);
    
    // Clear and redraw for next round if needed
    setTimeout(() => {
        renderBattleBoard();
    }, 1500);
});

socket.on('gameOver', ({ winners }) => {
    document.getElementById('overlay').classList.remove('hidden');
    const isWin = winners.includes(myRole);
    document.getElementById('winner-text').innerText = isWin ? "你贏了！真是隻聰明的貓咪！" : "你輸了... 去睡午覺吧。";
});

// UI Helpers
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function updateTurn(turnId) {
    isMyTurn = turnId === socket.id;
    turnIndicator.innerText = isMyTurn ? "輪到你了 - 快出擊！" : "對方正在思考喵...";
    turnIndicator.className = isMyTurn ? "turn-active" : "";
}

// BINGO Rendering
function renderBingoBoard() {
    gameContainer.innerHTML = '<div class="grid" id="bingo-grid"></div>';
    const grid = document.getElementById('bingo-grid');
    myBoard.forEach((row, r) => {
        row.forEach((num, c) => {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.innerText = num;
            cell.onclick = () => { if (isMyTurn) socket.emit('gameAction', { number: num }); };
            grid.appendChild(cell);
        });
    });
}

function updateBingoMarks(marks) {
    const cells = document.querySelectorAll('.cell');
    marks.forEach((row, r) => {
        row.forEach((marked, c) => {
            if (marked) cells[r * 5 + c].classList.add('marked');
        });
    });
}

// BATTLESHIP Rendering
function renderSetupBoard() {
    gameContainer.innerHTML = '<h3>放置你的零食 (點選格子)</h3><div id="ship-selector">目前放置：1x1(未), 1x2(未), 1x3(未)</div><div class="grid" id="setup-grid"></div>';
    const grid = document.getElementById('setup-grid');
    let boardState = Array(5).fill().map(() => Array(5).fill(null));
    let currentShip = 3; // Start with 1x3

    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.onclick = () => {
                if (currentShip < 1) return;
                // Simple logic: click to place currentShip size horizontally if possible
                if (c + currentShip <= 5) {
                    let canPlace = true;
                    for (let i=0; i<currentShip; i++) if(boardState[r][c+i]) canPlace = false;
                    
                    if (canPlace) {
                        for (let i=0; i<currentShip; i++) {
                            boardState[r][c+i] = currentShip;
                            const target = grid.children[r * 5 + (c+i)];
                            target.classList.add('item');
                            target.innerText = '🍖';
                        }
                        currentShip--;
                        updateShipStatus(currentShip);
                    }
                } else {
                    alert("空間不足，換個位置喵！");
                }
            };
            grid.appendChild(cell);
        }
    }
    
    function updateShipStatus(remaining) {
        const txt = `接下來放置：${remaining > 0 ? '1x' + remaining : '完成！'}`;
        document.getElementById('ship-selector').innerText = txt;
    }

    readyBtn.onclick = () => {
        if (currentShip > 0) return alert("還沒放完所有零食喵！");
        socket.emit('gameAction', { type: 'setup', board: boardState });
        readyBtn.disabled = true;
        readyBtn.innerText = "等待對手中...";
    };
}

function renderBattleBoard() {
    gameContainer.innerHTML = `<h3>攻擊對方的領土 (剩餘次數: ${attacksAllowed - currentAttacks.length})</h3><div class="grid" id="battle-grid"></div>`;
    const grid = document.getElementById('battle-grid');
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.r = r;
            cell.dataset.c = c;
            cell.onclick = () => {
                if (currentAttacks.some(a => a.r === r && a.c === c)) return;
                if (currentAttacks.length < attacksAllowed) {
                    currentAttacks.push({ r, c });
                    cell.classList.add('marked');
                    cell.innerText = '🎯';
                    
                    if (currentAttacks.length === attacksAllowed) {
                        setTimeout(() => {
                            socket.emit('gameAction', { type: 'pounce', moves: currentAttacks });
                            systemMsg.innerText = "出擊！等待對手結果喵...";
                            grid.style.pointerEvents = 'none';
                        }, 500);
                    }
                }
            };
            grid.appendChild(cell);
        }
    }
}
