class BingoGame {
    constructor(players, emit) {
        this.players = players;
        this.emit = emit;
        this.boards = {};
        this.marks = {}; 
        this.yarnBalls = {}; 
        this.yarnCount = {}; 
        this.turnIndex = 0;
        this.gameOver = false;
    }

    start() {
        this.players.forEach(p => {
            this.boards[p.id] = this.generateBoard();
            this.marks[p.id] = Array(5).fill().map(() => Array(5).fill(false));
            this.yarnBalls[p.id] = Array(5).fill().map(() => Array(5).fill(false));
            this.yarnCount[p.id] = 0;
        });

        this.emit('gameStarted', {
            boards: this.boards,
            turn: this.players[this.turnIndex].id
        });
    }

    generateBoard() {
        // 從 1-30 中隨機選取 25 個數字
        const pool = Array.from({ length: 30 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
        const selected = pool.slice(0, 25).sort(() => Math.random() - 0.5);
        const board = [];
        for (let i = 0; i < 5; i++) board.push(selected.slice(i * 5, i * 5 + 5));
        return board;
    }

    handleAction(playerId, data) {
        if (this.gameOver) return;
        if (playerId !== this.players[this.turnIndex].id) return;

        const { number, placeYarn } = data;
        
        // 1. 先處理毛線球 (只會放在發起攻擊者的盤面上對應的數字格)
        if (placeYarn && this.yarnCount[playerId] < 2) {
            this.boards[playerId].forEach((row, r) => {
                row.forEach((num, c) => {
                    if (num === number) {
                        this.yarnBalls[playerId][r][c] = true;
                        this.yarnCount[playerId]++;
                    }
                });
            });
        }

        // 2. 標記號碼 (只有當對手的盤面上也有這個數字時才會標記)
        this.players.forEach(p => {
            this.boards[p.id].forEach((row, r) => {
                row.forEach((num, c) => {
                    if (num === number) {
                        this.marks[p.id][r][c] = true;
                    }
                });
            });
        });

        // 3. 重新計算所有人的連線狀態 (這會動態取消被毛線球擋住的線)
        const playerStates = {};
        this.players.forEach(p => {
            playerStates[p.id] = this.calculateLines(p.id);
        });

        this.emit('updateState', {
            lastNumber: number,
            marks: this.marks,
            yarnBalls: this.yarnBalls,
            lastPlayer: playerId,
            yarnCount: this.yarnCount,
            playerStates: playerStates 
        });

        // 4. 檢查勝負
        const winners = this.players.filter(p => playerStates[p.id].count >= 3).map(p => p.role);

        if (winners.length > 0) {
            this.gameOver = true;
            this.emit('gameOver', { winners });
        } else {
            this.turnIndex = (this.turnIndex + 1) % this.players.length;
            this.emit('nextTurn', { turn: this.players[this.turnIndex].id });
        }
    }

    calculateLines(playerId) {
        const m = this.marks[playerId];
        const y = this.yarnBalls[playerId];
        const lines = [];
        // 關鍵邏輯：必須是被標記 (m) 且 沒有毛線球 (y) 才算有效格
        const isValid = (r, c) => m[r][c] && !y[r][c];

        // 橫向
        for (let r = 0; r < 5; r++) {
            if ([0,1,2,3,4].every(c => isValid(r, c))) lines.push({ type: 'row', index: r });
        }
        // 縱向
        for (let c = 0; c < 5; c++) {
            if ([0,1,2,3,4].every(r => isValid(r, c))) lines.push({ type: 'col', index: c });
        }
        // 對角線
        if ([0,1,2,3,4].every(i => isValid(i, i))) lines.push({ type: 'diag', index: 0 });
        if ([0,1,2,3,4].every(i => isValid(i, 4-i))) lines.push({ type: 'diag', index: 1 });

        return { count: lines.length, lines: lines };
    }
}

module.exports = BingoGame;
