const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Room and Game State
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('A cat entered the lobby:', socket.id);

    socket.on('joinRoom', ({ room, gameType }) => {
        const roomName = `${gameType}_${room}`;
        let roomData = rooms.get(roomName);

        if (!roomData) {
            roomData = {
                gameType,
                players: [],
                gameState: null
            };
            rooms.set(roomName, roomData);
        }

        if (roomData.players.length >= 2) {
            socket.emit('error', 'This litter box is full! Try another room.');
            return;
        }

        const role = roomData.players.length === 0 ? 'Calico' : 'Orange';
        const player = {
            id: socket.id,
            role,
            ready: false
        };

        roomData.players.push(player);
        socket.join(roomName);
        socket.roomName = roomName;
        socket.role = role;

        console.log(`Player ${socket.id} joined ${roomName} as ${role}`);

        socket.emit('joined', { role, room, gameType });

        if (roomData.players.length === 2) {
            // Match success
            io.to(roomName).emit('matchFound', {
                players: roomData.players.map(p => ({ role: p.role, id: p.id }))
            });
            
            // Initialize game logic based on type
            initGame(roomName);
        }
    });

    socket.on('gameAction', (data) => {
        const roomData = rooms.get(socket.roomName);
        if (!roomData || !roomData.gameState) return;

        // Pass action to game-specific logic
        handleAction(socket.roomName, socket.id, data);
    });

    socket.on('disconnect', () => {
        const roomName = socket.roomName;
        if (roomName && rooms.has(roomName)) {
            const roomData = rooms.get(roomName);
            roomData.players = roomData.players.filter(p => p.id !== socket.id);
            if (roomData.players.length === 0) {
                rooms.delete(roomName);
            } else {
                io.to(roomName).emit('playerLeft', { role: socket.role });
            }
        }
        console.log('A cat left the lobby:', socket.id);
    });
});

function initGame(roomName) {
    const roomData = rooms.get(roomName);
    const { gameType } = roomData;
    
    // Lazy load game modules
    const GameModule = require(`./games/${gameType}`);
    roomData.gameState = new GameModule(roomData.players, (event, data) => {
        io.to(roomName).emit(event, data);
    });
    
    roomData.gameState.start();
}

function handleAction(roomName, playerId, data) {
    const roomData = rooms.get(roomName);
    roomData.gameState.handleAction(playerId, data);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`The cat cafe is open on port ${PORT}`);
});
