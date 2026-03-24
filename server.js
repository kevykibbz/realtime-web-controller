const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Configure CORS based on environment
const corsOrigin = process.env.NODE_ENV === 'production' 
  ? true // Allow all origins in production (will be handled by the same domain)
  : ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"];

const io = socketIo(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"]
  }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'client/build')));


const lobbies = {};

function generateLobbyId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('create-lobby', () => {
    const newLobbyId = generateLobbyId();
    lobbies[newLobbyId] = {
      players: [],
    };
    socket.join(newLobbyId);
    socket.emit('lobby-created', newLobbyId);
    console.log(`Lobby ${newLobbyId} created`);
  });

  socket.on('join-lobby', (data) => {
    const lobbyId = data.lobbyId || data;
    const playerName = data.playerName || `Player ${lobbies[lobbyId]?.players.length + 1}`;
    
    if (lobbies[lobbyId]) {
      socket.join(lobbyId);
      const newPlayer = { id: socket.id, name: playerName, score: 0 };
      lobbies[lobbyId].players.push(newPlayer);
      
      // Confirm successful join to the controller with their new player data
      socket.emit('join-lobby-success', newPlayer);
      // Update the host with the new list of all players
      io.to(lobbyId).emit('player-joined', lobbies[lobbyId].players);

      console.log(`Player ${playerName} (${socket.id}) joined lobby ${lobbyId}`);
    } else {
      socket.emit('join-lobby-error', 'Lobby not found');
      console.log(`Player ${socket.id} failed to join lobby ${lobbyId}: not found`);
    }
  });

  socket.on('controller-input', (data) => {
    console.log('controller-input received:', data);
    const lobbyId = data.lobbyId || data;
    console.log('lobbyId:', lobbyId);
    if (lobbies[lobbyId]) {
      const player = lobbies[lobbyId].players.find(p => p.id === socket.id);
      console.log('player found:', player);
      if (player) {
        // Only increment on press, not on release
        if (data.action === "press") {
          player.score += 1;
          console.log('score incremented to:', player.score);
          io.to(lobbyId).emit('player-updated', lobbies[lobbyId].players);
        }
        
        // Broadcast controller input to Unity host with player ID
        io.to(lobbyId).emit('controller-input', {
          type: data.type || 'BUTTON',
          action: data.action,
          playerId: socket.id,
          playerName: player.name
        });
        console.log('Broadcasted controller-input to lobby:', lobbyId);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'client/build')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Frontend available at http://localhost:${PORT}`);
});
