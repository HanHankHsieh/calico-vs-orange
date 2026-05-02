const socket = io({
    transports: ['websocket', 'polling']
});

// State
let myRole = null;
let currentGame = null;
let myBoard = null;
let isMyTurn = false;
let currentRound = 1;
let attacksAllowed = 1;
let currentAttacks = [];
let placementOrientation = 'H';
let myAttacksHistory = [];      // 我攻擊別人的紀錄
let opponentAttacksHistory = []; // 別人攻擊我的紀錄
let bingoHistory = [];           // 賓果號碼紀錄

// DOM Elements
const systemMsg = document.getElementById('system-msg');
const turnIndicator = document.getElementById('turn-indicator');
const roundInfo = document.getElementById('round-info');
const readyBtn = document.getElementById('ready-btn');
const controls = document.getElementById('controls');
const gameContainer = document.getElementById('game-container');

socket.on('connect', () => {
    systemMsg.innerText = "已連線至貓咪咖啡廳！請選擇遊戲。";
});

// Join Logic
document.getElementById('join-btn').addEventListener('click', () => {
    const room = document.getElementById('room-id').value;
    const gameType = document.getElementById('game-type').value;
    if (!room) return alert('請輸入房間號碼！');
    currentGame = gameType;
    socket.emit('joinRoom', { room, gameType });
});

socket.on('joined', ({ role, room }) => {
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
        bingoHistory = []; 
        renderBingoBoard();
        updateTurn(data.turn);
        systemMsg.innerText = "貓草賓果開始！連成三條線就贏了喵！";
    }
});

socket.on('updateState', (data) => {
    if (currentGame === 'bingo') {
        const isMe = data.lastPlayer === socket.id;
        updateBingoMarks(data.marks[socket.id]);
        bingoHistory.push({ num: data.lastNumber, isMe });
        renderBingoHistory();
        const pName = isMe ? '你' : '對方';
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

socket.on('battleStarted', (data) => {
    myBoard = data.boards[socket.id];
    currentRound = data.round;
    roundInfo.innerText = `第 ${currentRound} 回合`;
    systemMsg.innerText = "戰鬥開始！快找出對方的零食！";
    controls.classList.add('hidden');
    renderBattleLayout();
});

socket.on('roundResults', (data) => {
    myAttacksHistory = data.history[socket.id] || [];
    const opponentId = Object.keys(data.history).find(id => id !== socket.id);
    opponentAttacksHistory = data.history[opponentId] || [];
    currentRound = data.round;
    attacksAllowed = data.attacksAllowed;
    currentAttacks = [];
    roundInfo.innerText = `第 ${currentRound} 回合`;
    updateScoreboard(data.scores);
    renderBattleLayout();
    if (attacksAllowed > 1) {
        systemMsg.innerText = `獎勵回合！這回合你可以連續出擊 ${attacksAllowed} 次！`;
    }
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
    turnIndicator.innerText = isMyTurn ? "輪到你了 - 快選號碼！" : "對方正在思考喵...";
    turnIndicator.className = isMyTurn ? "turn-active" : "";
}

function updateScoreboard(scores) {
    const oppScore = Object.entries(scores).find(([id]) => id !== socket.id)[1];
    systemMsg.innerText = `得分 - 你擊沉: ${scores[socket.id]} | 對手擊沉: ${oppScore}`;
}

// BINGO Rendering
function renderBingoBoard() {
    gameContainer.innerHTML = `
        <div class="grid" id="bingo-grid" style="grid-template-columns: repeat(5, 1fr);"></div>
        <div id="bingo-history-container">
            <h4>🐾 號碼紀錄</h4>
            <div id="bingo-history" class="history-list"></div>
        </div>
    `;
    const grid = document.getElementById('bingo-grid');
    myBoard.forEach((row, r) => {
        row.forEach((num, c) => {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.innerText = num;
            cell.onclick = () => { 
                if (isMyTurn && !cell.classList.contains('marked')) {
                    socket.emit('gameAction', { number: num }); 
                }
            };
            grid.appendChild(cell);
        });
    });
}

function updateBingoMarks(marks) {
    const cells = document.querySelectorAll('#bingo-grid .cell');
    marks.forEach((row, r) => {
        row.forEach((marked, c) => {
            if (marked) cells[r * 5 + c].classList.add('marked');
        });
    });
}

function renderBingoHistory() {
    const histEl = document.getElementById('bingo-history');
    if (!histEl) return;
    histEl.innerHTML = bingoHistory.map(h => `
        <span class="history-item ${h.isMe ? 'mine' : 'theirs'}">
            ${h.isMe ? '我' : '敵'}: ${h.num}
        </span>
    `).reverse().join('');
}

// BATTLESHIP Rendering
function renderSetupBoard() {
    gameContainer.innerHTML = `
        <div class="scoreboard">
            <div>當前方向: <span id="orientation-text">橫向 (H)</span></div>
            <button id="orientation-btn">切換方向 (H/V)</button>
        </div>
        <h3>放置你的零食 (點選格子)</h3>
        <div id="ship-selector">接下來放置：1x3</div>
        <div class="grid" id="setup-grid"></div>
    `;
    
    document.getElementById('orientation-btn').onclick = () => {
        placementOrientation = placementOrientation === 'H' ? 'V' : 'H';
        document.getElementById('orientation-text').innerText = placementOrientation === 'H' ? '橫向 (H)' : '縱向 (V)';
    };

    const grid = document.getElementById('setup-grid');
    let boardState = Array(6).fill().map(() => Array(6).fill(null));
    let currentShipSize = 3;

    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.onclick = () => {
                if (currentShipSize < 1) return;
                let canPlace = true;
                if (placementOrientation === 'H') {
                    if (c + currentShipSize > 6) canPlace = false;
                    else for (let i=0; i<currentShipSize; i++) if(boardState[r][c+i]) canPlace = false;
                    if (canPlace) {
                        for (let i=0; i<currentShipSize; i++) {
                            boardState[r][c+i] = currentShipSize;
                            grid.children[r * 6 + (c+i)].classList.add('item');
                            grid.children[r * 6 + (c+i)].innerText = '🍖';
                        }
                        currentShipSize--;
                    }
                } else {
                    if (r + currentShipSize > 6) canPlace = false;
                    else for (let i=0; i<currentShipSize; i++) if(boardState[r+i][c]) canPlace = false;
                    if (canPlace) {
                        for (let i=0; i<currentShipSize; i++) {
                            boardState[r+i][c] = currentShipSize;
                            grid.children[(r+i) * 6 + c].classList.add('item');
                            grid.children[(r+i) * 6 + c].innerText = '🍖';
                        }
                        currentShipSize--;
                    }
                }
                document.getElementById('ship-selector').innerText = currentShipSize > 0 ? `接下來放置：1x${currentShipSize}` : "全部放完了喵！";
                if (!canPlace) alert("位置重疊或超出範圍喵！");
            };
            grid.appendChild(cell);
        }
    }

    readyBtn.onclick = () => {
        if (currentShipSize > 0) return alert("還沒放完喵！");
        socket.emit('gameAction', { type: 'setup', board: boardState });
        readyBtn.disabled = true;
        readyBtn.innerText = "等待對手中...";
    };
}

function renderBattleLayout() {
    gameContainer.innerHTML = `
        <div class="boards-container">
            <div class="board-wrapper">
                <h4>我的領土 (防禦中)</h4>
                <div class="grid" id="my-territory-grid"></div>
            </div>
            <div class="board-wrapper">
                <h4>對手領土 (雷達)</h4>
                <div class="grid" id="radar-grid"></div>
            </div>
        </div>
    `;

    const myGrid = document.getElementById('my-territory-grid');
    const radarGrid = document.getElementById('radar-grid');

    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            if (myBoard[r][c]) {
                cell.classList.add('item');
                cell.innerText = '🍖';
            }
            const oppHit = opponentAttacksHistory.find(h => 
                (h.r === r && h.c === c) || 
                (h.revealedCoords && h.revealedCoords.some(rc => rc.r === r && rc.c === c))
            );
            if (oppHit) {
                cell.classList.add(oppHit.hit ? 'hit' : 'miss');
                cell.innerText = oppHit.hit ? '💥' : '💨';
                if (oppHit.hit) cell.style.boxShadow = "inset 0 0 10px red";
            }
            myGrid.appendChild(cell);
        }
    }

    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.r = r;
            cell.dataset.c = c;
            const myHit = myAttacksHistory.find(h => 
                (h.r === r && h.c === c) || 
                (h.revealedCoords && h.revealedCoords.some(rc => rc.r === r && rc.c === c))
            );
            if (myHit) {
                cell.classList.add(myHit.hit ? 'hit' : 'miss');
                cell.innerText = myHit.hit ? '💥' : '💨';
            } else if (currentAttacks.some(a => a.r === r && a.c === c)) {
                cell.classList.add('marked');
                cell.innerText = '🎯';
            }
            cell.onclick = () => {
                const isAlreadyHit = myAttacksHistory.some(h => 
                    (h.r === r && h.c === c) || 
                    (h.revealedCoords && h.revealedCoords.some(rc => rc.r === r && rc.c === c))
                );
                if (isAlreadyHit) return;
                if (currentAttacks.some(a => a.r === r && a.c === c)) return;
                if (currentAttacks.length < attacksAllowed) {
                    currentAttacks.push({ r, c });
                    cell.classList.add('marked');
                    cell.innerText = '🎯';
                    if (currentAttacks.length === attacksAllowed) {
                        setTimeout(() => {
                            socket.emit('gameAction', { type: 'pounce', moves: currentAttacks });
                            radarGrid.style.pointerEvents = 'none';
                        }, 500);
                    }
                }
            };
            radarGrid.appendChild(cell);
        }
    }
}
