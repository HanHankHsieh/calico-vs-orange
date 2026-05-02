class BattleshipGame {
    constructor(players, emit) {
        this.players = players;
        this.emit = emit;
        this.gridSize = 6;
        this.boards = {}; // playerId -> 6x6 grid
        this.ships = {}; // playerId -> { shipId: { size: X, sunk: false } }
        this.ready = {};
        this.history = {}; // playerId -> [{r, c, hit, revealedCoords: []}]
        this.roundActions = {}; // playerId -> moves
        this.roundCount = 1;
        this.gameOver = false;
    }

    start() {
        this.players.forEach(p => {
            this.ready[p.id] = false;
            this.history[p.id] = [];
            this.roundActions[p.id] = null;
        });
        this.emit('waitingForSetup', { text: "請部署你的艦隊！(6x6 區域)" });
    }

    handleAction(playerId, data) {
        if (this.gameOver) return;

        if (data.type === 'setup') {
            this.boards[playerId] = data.board;
            this.ships[playerId] = {
                '1': { size: 1, sunk: false },
                '2': { size: 2, sunk: false },
                '3': { size: 3, sunk: false }
            };
            this.ready[playerId] = true;
            
            if (this.players.every(p => this.ready[p.id])) {
                this.emit('battleStarted', { 
                    round: this.roundCount,
                    boards: this.boards
                });
            } else {
                const role = this.players.find(p => p.id === playerId).role === 'Calico' ? '三花貓' : '橘貓';
                this.emit('playerReady', { role });
            }
        } else if (data.type === 'pounce') {
            this.roundActions[playerId] = data.moves;
            if (this.players.every(p => this.roundActions[p.id] !== null)) {
                this.processRound();
            }
        }
    }

    processRound() {
        const results = {};
        const p1 = this.players[0];
        const p2 = this.players[1];

        results[p1.id] = this.executeMoves(p1.id, p2.id, this.roundActions[p1.id]);
        results[p2.id] = this.executeMoves(p2.id, p1.id, this.roundActions[p2.id]);

        // Update history
        results[p1.id].forEach(m => this.history[p1.id].push(m));
        results[p2.id].forEach(m => this.history[p2.id].push(m));

        this.roundCount++;
        const bonusTurns = [5, 10, 15, 20];
        const attacksAllowed = bonusTurns.includes(this.roundCount) ? 2 : 1;

        const scores = {};
        this.players.forEach(p => {
            const oppId = this.players.find(other => other.id !== p.id).id;
            scores[p.id] = Object.values(this.ships[oppId]).filter(s => s.sunk).length;
        });

        this.emit('roundResults', {
            results,
            history: this.history,
            scores,
            round: this.roundCount,
            attacksAllowed
        });

        this.players.forEach(p => this.roundActions[p.id] = null);

        const p1SunkAll = Object.values(this.ships[p2.id]).every(s => s.sunk);
        const p2SunkAll = Object.values(this.ships[p1.id]).every(s => s.sunk);

        if (p1SunkAll || p2SunkAll) {
            this.gameOver = true;
            let winners = [];
            if (p1SunkAll) winners.push('Calico');
            if (p2SunkAll) winners.push('Orange');
            this.emit('gameOver', { winners });
        }
    }

    executeMoves(attackerId, defenderId, moves) {
        const moveResults = [];
        const defenderBoard = this.boards[defenderId];
        const defenderShips = this.ships[defenderId];

        moves.forEach(move => {
            const shipId = defenderBoard[move.r][move.c];
            let hit = false;
            let revealedCoords = [];

            if (shipId && !defenderShips[shipId].sunk) {
                hit = true;
                defenderShips[shipId].sunk = true;
                // Find ALL coordinates of this ship to reveal them
                for (let r = 0; r < 6; r++) {
                    for (let c = 0; c < 6; c++) {
                        if (defenderBoard[r][c] == shipId) {
                            revealedCoords.push({ r, c });
                        }
                    }
                }
            } else if (shipId && defenderShips[shipId].sunk) {
                // Already sunk, treat as hit but no new reveal
                hit = true;
            }

            moveResults.push({ r: move.r, c: move.c, hit, revealedCoords });
        });

        return moveResults;
    }
}

module.exports = BattleshipGame;
