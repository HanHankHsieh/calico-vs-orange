class BattleshipGame {
    constructor(players, emit) {
        this.players = players;
        this.emit = emit;
        this.boards = {}; // playerId -> grid of item IDs
        this.hits = {}; // playerId -> count of hits on their items
        this.totalItems = 1 + 2 + 3; // total cells to hit
        this.ready = {}; // playerId -> boolean
        this.gameOver = false;
    }

    start() {
        this.players.forEach(p => {
            this.ready[p.id] = false;
            this.hits[p.id] = 0;
        });
        this.emit('waitingForSetup', {});
    }

    handleAction(playerId, data) {
        if (this.gameOver) return;

        if (data.type === 'setup') {
            this.boards[playerId] = data.board; // 5x5 array with item IDs or null
            this.ready[playerId] = true;
            
            if (this.players.every(p => this.ready[p.id])) {
                this.emit('battleStarted', {});
            } else {
                this.emit('playerReady', { role: this.players.find(p => p.id === playerId).role });
            }
        } else if (data.type === 'pounce') {
            const { r, c } = data;
            const opponent = this.players.find(p => p.id !== playerId);
            const targetBoard = this.boards[opponent.id];
            
            const isHit = targetBoard[r][c] !== null;
            if (isHit) {
                this.hits[opponent.id]++;
            }

            this.emit('pounceResult', {
                playerId,
                r,
                c,
                isHit,
                role: this.players.find(p => p.id === playerId).role
            });

            if (this.hits[opponent.id] === this.totalItems) {
                this.gameOver = true;
                this.emit('gameOver', { winners: [this.players.find(p => p.id === playerId).role] });
            }
        }
    }
}

module.exports = BattleshipGame;
