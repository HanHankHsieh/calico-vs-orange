const socket = io({
    transports: ['websocket', 'polling']
});

socket.on('connect', () => {
    console.log('Successfully connected to the cat cafe server! ID:', socket.id);
    systemMsg.innerText = "Connected to the Cat Cafe! Pick a game.";
});

socket.on('connect_error', (error) => {
    console.error('Connection Error:', error);
    systemMsg.innerText = "Meow-dday! Connection failed. Retrying...";
});

socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
    systemMsg.innerText = "The cat ran away (Disconnected).";
});

// State
let myRole = null;
let currentGame = null;
let myBoard = null;
let isMyTurn = false;
let selectedCells = []; // For Battleship setup

// DOM Elements
const lobbyScreen = document.getElementById('lobby');
const waitingScreen = document.getElementById('waiting');
const gameScreen = document.getElementById('game-screen');
const gameContainer = document.getElementById('game-container');
const systemMsg = document.getElementById('system-msg');
const turnIndicator = document.getElementById('turn-indicator');
const readyBtn = document.getElementById('ready-btn');
const controls = document.getElementById('controls');

// Join Logic
document.getElementById('join-btn').addEventListener('click', () => {
    const room = document.getElementById('room-id').value;
    const gameType = document.getElementById('game-type').value;
    if (!room) return alert('Enter a room number!');
    
    currentGame = gameType;
    socket.emit('joinRoom', { room, gameType });
});

socket.on('joined', ({ role, room, gameType }) => {
    myRole = role;
    showScreen('waiting');
    document.getElementById('my-role-name').innerText = role + " Cat";
    document.getElementById('my-role-name').className = 'role-' + role;
    document.getElementById('my-role-icon').innerText = role === 'Calico' ? '👵' : '👶';
    systemMsg.innerText = `Waiting for a rival in room ${room}...`;
});

socket.on('matchFound', ({ players }) => {
    systemMsg.innerText = "A rival cat has appeared! Prepare for battle!";
    showScreen('game-screen');
});

socket.on('error', (msg) => alert(msg));

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
        const myMarks = data.marks[socket.id];
        updateBingoMarks(myMarks);
        systemMsg.innerText = `The ${data.lastPlayer === socket.id ? 'other cat' : 'other cat'} swiped number ${data.lastNumber}!`;
    }
});

socket.on('nextTurn', (data) => {
    updateTurn(data.turn);
});

// Battleship Logic
socket.on('waitingForSetup', () => {
    if (currentGame === 'battleship') {
        renderSetupBoard();
        systemMsg.innerText = "Hide your treats! (Select 6 spots)";
        controls.classList.remove('hidden');
    }
});

socket.on('playerReady', ({ role }) => {
    systemMsg.innerText = `The ${role} Cat is ready...`;
});

socket.on('battleStarted', () => {
    systemMsg.innerText = "The battle begins! Pounce on the opponent's territory!";
    controls.classList.add('hidden');
    renderBattleBoard();
});

socket.on('pounceResult', (data) => {
    if (data.playerId === socket.id) {
        systemMsg.innerText = data.isHit ? "💥 A HIT! You found a treat!" : "💨 MISS! Just dust bunnies.";
        // Show the latest result on the grid
        markPounce(data.r, data.c, data.isHit);
    } else {
        systemMsg.innerText = `The opponent pounced on [${data.r}, ${data.c}] and ${data.isHit ? 'found your treat!' : 'missed'}.`;
    }
});

socket.on('gameOver', ({ winners }) => {
    document.getElementById('overlay').classList.remove('hidden');
    const winStr = winners.includes(myRole) ? "You Win! Meow-velous!" : "You Lost... Time for a nap.";
    document.getElementById('winner-text').innerText = winStr;
});

// UI Helpers
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function updateTurn(turnId) {
    isMyTurn = turnId === socket.id;
    turnIndicator.innerText = isMyTurn ? "YOUR TURN - Pounce!" : "Opponent's Turn...";
    turnIndicator.className = isMyTurn ? "turn-active" : "";
}

function renderBingoBoard() {
    gameContainer.innerHTML = '<div class="grid" id="bingo-grid"></div>';
    const grid = document.getElementById('bingo-grid');
    myBoard.forEach((row, r) => {
        row.forEach((num, c) => {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.innerText = num;
            cell.onclick = () => {
                if (isMyTurn) {
                    socket.emit('gameAction', { number: num });
                }
            };
            grid.appendChild(cell);
        });
    });
}

function updateBingoMarks(marks) {
    const cells = document.querySelectorAll('.cell');
    myBoard.forEach((row, r) => {
        row.forEach((num, c) => {
            if (marks[r][c]) {
                cells[r * 5 + c].classList.add('marked');
            }
        });
    });
}

function renderSetupBoard() {
    gameContainer.innerHTML = '<h3>Place Your Treats</h3><div class="grid" id="setup-grid"></div>';
    const grid = document.getElementById('setup-grid');
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.r = r;
            cell.dataset.c = c;
            cell.onclick = () => {
                if (selectedCells.length < 6 || cell.classList.contains('item')) {
                    cell.classList.toggle('item');
                    const pos = `${r},${c}`;
                    if (selectedCells.includes(pos)) {
                        selectedCells = selectedCells.filter(p => p !== pos);
                    } else {
                        selectedCells.push(pos);
                    }
                }
            };
            grid.appendChild(cell);
        }
    }
    
    readyBtn.onclick = () => {
        if (selectedCells.length !== 6) return alert("You must hide exactly 6 treats!");
        const board = Array(5).fill().map(() => Array(5).fill(null));
        selectedCells.forEach(pos => {
            const [r, c] = pos.split(',').map(Number);
            board[r][c] = 'treat';
        });
        socket.emit('gameAction', { type: 'setup', board });
        readyBtn.disabled = true;
        readyBtn.innerText = "Waiting...";
    };
}

function renderBattleBoard() {
    gameContainer.innerHTML = '<h3>Opponent\'s Territory</h3><div class="grid" id="battle-grid"></div>';
    const grid = document.getElementById('battle-grid');
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.onclick = () => {
                socket.emit('gameAction', { type: 'pounce', r, c });
            };
            grid.appendChild(cell);
        }
    }
}

function markPounce(r, c, isHit) {
    // Clear previous markers (Memory mode)
    document.querySelectorAll('#battle-grid .cell').forEach(cell => {
        cell.classList.remove('hit', 'miss');
        cell.innerText = '';
    });
    
    const index = r * 5 + c;
    const cell = document.querySelectorAll('#battle-grid .cell')[index];
    cell.classList.add(isHit ? 'hit' : 'miss');
    cell.innerText = isHit ? '💥' : '💨';
}
