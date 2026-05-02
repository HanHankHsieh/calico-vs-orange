class BattleshipGame {
    constructor(players, emit) {
        this.players = players;
        this.emit = emit;
        this.boards = {}; // playerId -> 5x5 grid of ship IDs (1, 2, 3) or null
        this.ships = {}; // playerId -> { shipId: { hits: 0, size: X, sunk: false } }
        this.ready = {};
        this.roundActions = {}; // playerId -> [{r, c}]
        this.roundCount = 1;
        this.gameOver = false;
    }

    start() {
        this.players.forEach(p => {
            this.ready[p.id] = false;
            this.roundActions[p.id] = null;
        });
        this.emit('waitingForSetup', { text: "請藏好你的零食與玩具！(1x1, 1x2, 1x3 三種尺寸)" });
    }

    handleAction(playerId, data) {
        if (this.gameOver) return;

        if (data.type === 'setup') {
            this.boards[playerId] = data.board;
            this.ships[playerId] = {
                '1': { size: 1, hits: 0, sunk: false },
                '2': { size: 2, hits: 0, sunk: false },
                '3': { size: 3, hits: 0, sunk: false }
            };
            this.ready[playerId] = true;
            
            if (this.players.every(p => this.ready[p.id])) {
                this.emit('battleStarted', { round: this.roundCount });
            } else {
                const role = this.players.find(p => p.id === playerId).role === 'Calico' ? '三花貓' : '橘貓';
                this.emit('playerReady', { role });
            }
        } else if (data.type === 'pounce') {
            // data.moves = [{r, c}, ...]
            this.roundActions[playerId] = data.moves;

            // Check if both players have submitted moves
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

        this.roundCount++;
        const bonusTurns = [5, 10, 15, 20];
        const attacksAllowed = bonusTurns.includes(this.roundCount) ? 2 : 1;

        this.emit('roundResults', {
            results,
            round: this.roundCount,
            attacksAllowed
        });

        // Reset actions
        this.players.forEach(p => this.roundActions[p.id] = null);

        // Check for winner
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
            let sunkShipId = null;

            if (shipId) {
                hit = true;
                defenderShips[shipId].hits++;
                if (defenderShips[shipId].hits >= defenderShips[shipId].size) {
                    defenderShips[shipId].sunk = true;
                    sunkShipId = shipId;
                }
            }
            moveResults.push({ r: move.r, c: move.c, hit, sunkShipId });
        });

        return moveResults;
    }
}

module.exports = BattleshipGame;
