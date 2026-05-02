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
        const nums = Array.from({ length: 25 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
        const board = [];
        for (let i = 0; i < 5; i++) board.push(nums.slice(i * 5, i * 5 + 5));
        return board;
    }

    handleAction(playerId, data) {
        if (this.gameOver) return;
        if (playerId !== this.players[this.turnIndex].id) return;

        const { number, placeYarn } = data;
        
        if (placeYarn && this.yarnCount[playerId] < 2) {
            this.boards[playerId].forEach((row, r) => {
                row.forEach((num, c) => {
                    if (num === number && !this.yarnBalls[playerId][r][c]) {
                        this.yarnBalls[playerId][r][c] = true;
                        this.yarnCount[playerId]++;
                    }
                });
            });
        }

        this.players.forEach(p => {
            this.boards[p.id].forEach((row, r) => {
                row.forEach((num, c) => {
                    if (num === number) this.marks[p.id][r][c] = true;
                });
            });
        });

        const playerStates = {};
        this.players.forEach(p => {
            playerStates[p.id] = this.checkLines(p.id);
        });

        this.emit('updateState', {
            lastNumber: number,
            marks: this.marks,
            yarnBalls: this.yarnBalls,
            lastPlayer: playerId,
            yarnCount: this.yarnCount,
            playerStates: playerStates // Contains line counts and line coordinates
        });

        const winners = this.players.filter(p => playerStates[p.id].count >= 3).map(p => p.role);

        if (winners.length > 0) {
            this.gameOver = true;
            this.emit('gameOver', { winners });
        } else {
            this.turnIndex = (this.turnIndex + 1) % this.players.length;
            this.emit('nextTurn', { turn: this.players[this.turnIndex].id });
        }
    }

    checkLines(playerId) {
        const m = this.marks[playerId];
        const y = this.yarnBalls[playerId];
        const lines = [];
        const isValid = (r, c) => m[r][c] && !y[r][c];

        // Rows
        for (let r = 0; r < 5; r++) {
            if ([0,1,2,3,4].every(c => isValid(r, c))) {
                lines.push({ type: 'row', index: r });
            }
        }
        // Cols
        for (let c = 0; c < 5; c++) {
            if ([0,1,2,3,4].every(r => isValid(r, c))) {
                lines.push({ type: 'col', index: c });
            }
        }
        // Diagonals
        if ([0,1,2,3,4].every(i => isValid(i, i))) {
            lines.push({ type: 'diag', index: 0 });
        }
        if ([0,1,2,3,4].every(i => isValid(i, 4-i))) {
            lines.push({ type: 'diag', index: 1 });
        }

        return { count: lines.length, lines: lines };
    }
}

module.exports = BingoGame;
