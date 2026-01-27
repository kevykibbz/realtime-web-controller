const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// CORS
const corsOrigin =
  process.env.NODE_ENV === 'production'
    ? true
    : [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
      ];

const io = socketIo(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
  },
});

// Serve React build
app.use(express.static(path.join(__dirname, 'client/build')));

// --------------------
// Lobby state
// --------------------
const lobbies = {};

function generateLobbyId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// --------------------
// Socket logic
// --------------------
io.on('connection', (socket) => {
  console.log('🔌 user connected:', socket.id);

  // ---- CREATE LOBBY (HOST)
  socket.on('create-lobby', () => {
    const lobbyId = generateLobbyId();

    lobbies[lobbyId] = {
      players: [],
    };

    socket.join(lobbyId);
    socket.emit('lobby-created', lobbyId);

    console.log(`🎮 Lobby ${lobbyId} created by host ${socket.id}`);
  });

  // ---- JOIN LOBBY (CONTROLLER)
  socket.on('join-lobby', (data) => {
    const lobbyId = data.lobbyId?.toUpperCase();
    const playerName =
      data.playerName ||
      `Player ${lobbies[lobbyId]?.players.length + 1}`;

    if (!lobbies[lobbyId]) {
      socket.emit('join-lobby-error', 'Lobby not found');
      console.log(`❌ Join failed: lobby ${lobbyId} not found`);
      return;
    }

    socket.join(lobbyId);

    const newPlayer = {
      id: socket.id,
      name: playerName,
      score: 0,
    };

    lobbies[lobbyId].players.push(newPlayer);

    socket.emit('join-lobby-success', newPlayer);
    io.to(lobbyId).emit('player-joined', lobbies[lobbyId].players);

    console.log(
      `👤 ${playerName} (${socket.id}) joined lobby ${lobbyId}`
    );
  });

  // ---- CONTROLLER INPUT (🔥 THIS IS THE FIX)
socket.on("controller-input", (data) => {
  console.log("[SERVER] controller-input received:", data);

  const { lobbyId, type, action } = data;
  if (!lobbies[lobbyId]) return;

  const player = lobbies[lobbyId].players.find(p => p.id === socket.id);
  if (!player) return;

  if (action === "press") {
    player.score += 1;
  }

  // 🔥 THIS IS THE MISSING LINK 🔥
  io.to(lobbyId).emit("unity-event", {
    type: "BUTTON",
    action,
    playerId: player.id,
  });

  io.to(lobbyId).emit("player-updated", lobbies[lobbyId].players);
});


  // ---- DISCONNECT
  socket.on('disconnect', () => {
    console.log('🔌 user disconnected:', socket.id);

    // Optional cleanup (not required for now)
    for (const lobbyId in lobbies) {
      lobbies[lobbyId].players = lobbies[lobbyId].players.filter(
        (p) => p.id !== socket.id
      );
    }
  });
});

// Catch-all → React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
