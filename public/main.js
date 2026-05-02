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
    // 更新歷史紀錄
    myAttacksHistory = data.history[socket.id] || [];
    
    // 找出對手的 ID 並取得他的攻擊紀錄 (也就是對我方的轟炸)
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

function updateScoreboard(scores) {
    const oppScore = Object.entries(scores).find(([id]) => id !== socket.id)[1];
    systemMsg.innerText = `得分 - 你擊沉: ${scores[socket.id]} | 對手擊沉: ${oppScore}`;
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

    // 渲染「我的領土」：顯示自己的船 + 對手的攻擊紀錄
    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            
            // 顯示我的船
            if (myBoard[r][c]) {
                cell.classList.add('item');
                cell.innerText = '🍖';
            }

            // 標記對手炸我的位置
            const oppHit = opponentAttacksHistory.find(h => h.r === r && h.c === c);
            if (oppHit) {
                cell.classList.add(oppHit.hit ? 'hit' : 'miss');
                cell.innerText = oppHit.hit ? '💥' : '💨';
                // 如果是被炸中的船，顏色要更深
                if (oppHit.hit) cell.style.boxShadow = "inset 0 0 10px red";
            }
            
            myGrid.appendChild(cell);
        }
    }

    // 渲染「對手領土」：顯示我的攻擊紀錄 + 選擇新目標
    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.r = r;
            cell.dataset.c = c;

            const myHit = myAttacksHistory.find(h => h.r === r && h.c === c);
            if (myHit) {
                cell.classList.add(myHit.hit ? 'hit' : 'miss');
                cell.innerText = myHit.hit ? '💥' : '💨';
            } else if (currentAttacks.some(a => a.r === r && a.c === c)) {
                cell.classList.add('marked');
                cell.innerText = '🎯';
            }

            cell.onclick = () => {
                if (myAttacksHistory.some(h => h.r === r && h.c === c)) return;
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
