class BingoGame {
    constructor(players, emit) {
        this.players = players; // [{id, role}, ...]
        this.emit = emit; // callback to send socket events
        this.boards = {}; // playerId -> 5x5 array
        this.marks = {}; // playerId -> 5x5 boolean array
        this.turnIndex = 0; // Index of player whose turn it is
        this.gameOver = false;
    }

    start() {
        this.players.forEach(p => {
            this.boards[p.id] = this.generateBoard();
            this.marks[p.id] = Array(5).fill().map(() => Array(5).fill(false));
        });

        this.emit('gameStarted', {
            boards: this.boards,
            turn: this.players[this.turnIndex].id
        });
    }

    generateBoard() {
        const nums = Array.from({ length: 25 }, (_, i) => i + 1);
        for (let i = nums.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [nums[i], nums[j]] = [nums[j], nums[i]];
        }
        const board = [];
        for (let i = 0; i < 5; i++) {
            board.push(nums.slice(i * 5, i * 5 + 5));
        }
        return board;
    }

    handleAction(playerId, data) {
        if (this.gameOver) return;
        if (playerId !== this.players[this.turnIndex].id) return;

        const { number } = data;
        
        // Mark number for all players
        this.players.forEach(p => {
            for (let r = 0; r < 5; r++) {
                for (let c = 0; c < 5; c++) {
                    if (this.boards[p.id][r][c] === number) {
                        this.marks[p.id][r][c] = true;
                    }
                }
            }
        });

        const winners = this.checkWinners();
        
        this.emit('updateState', {
            lastNumber: number,
            marks: this.marks,
            lastPlayer: playerId
        });

        if (winners.length > 0) {
            this.gameOver = true;
            this.emit('gameOver', { winners });
        } else {
            this.turnIndex = (this.turnIndex + 1) % this.players.length;
            this.emit('nextTurn', { turn: this.players[this.turnIndex].id });
        }
    }

    checkWinners() {
        const winners = [];
        this.players.forEach(p => {
            const marks = this.marks[p.id];
            let lines = 0;

            // Rows
            for (let r = 0; r < 5; r++) {
                if (marks[r].every(c => c)) lines++;
            }
            // Cols
            for (let c = 0; c < 5; c++) {
                if (marks.every(r => r[c])) lines++;
            }
            // Diagonals
            if (Array.from({ length: 5 }, (_, i) => marks[i][i]).every(v => v)) lines++;
            if (Array.from({ length: 5 }, (_, i) => marks[i][4 - i]).every(v => v)) lines++;

            if (lines >= 3) {
                winners.push(p.role);
            }
        });
        return winners;
    }
}

module.exports = BingoGame;
