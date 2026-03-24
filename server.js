console.log(" RUNNING SERVER FILE:", __filename);

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;

/* ============================
   SOCKET.IO SETUP
============================ */

// Load configuration from environment variables
const PING_TIMEOUT = parseInt(process.env.SOCKET_PING_TIMEOUT) || 60000;
const PING_INTERVAL = parseInt(process.env.SOCKET_PING_INTERVAL) || 25000;
const UPGRADE_TIMEOUT = parseInt(process.env.SOCKET_UPGRADE_TIMEOUT) || 30000;
const CORS_ORIGIN = process.env.CORS_ORIGIN === 'true' ? true : process.env.CORS_ORIGIN || true;

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: PING_TIMEOUT,
  pingInterval: PING_INTERVAL,
  upgradeTimeout: UPGRADE_TIMEOUT,
  allowUpgrades: true,
});

console.log(`[CONFIG] Socket.IO ping interval: ${PING_INTERVAL}ms, timeout: ${PING_TIMEOUT}ms`);

// KEEPALIVE: Prevent Render from closing idle connections
setInterval(() => {
  io.sockets.sockets.forEach((socket) => {
    if (socket.connected) {
      socket.emit('ping');
    }
  });
}, PING_INTERVAL);

/* ============================
   STATIC FRONTEND (PRODUCTION ONLY)
============================ */

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, "client/build")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "client/build", "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.json({ status: 'Server running', message: 'Use Vite dev server on port 3000 for frontend' });
  });
}

/* ============================
   LOBBY STATE
============================ */

const lobbies = {};

function generateLobbyId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/* ============================
   SOCKET HANDLERS
============================ */

io.on("connection", (socket) => {
  console.log("[SERVER] socket connected:", socket.id);
  console.log("[SERVER] connection from origin:", socket.handshake.headers.origin);
  console.log("[SERVER] transport:", socket.conn.transport.name);

  /* -------- CREATE LOBBY -------- */
  socket.on("create-lobby", () => {
    const lobbyId = generateLobbyId();

    lobbies[lobbyId] = { players: [] };
    socket.join(lobbyId);

    socket.emit("lobby-created", lobbyId);
    console.log("[SERVER] lobby created:", lobbyId);
  });

  /* -------- HOST REJOIN LOBBY (NEW) -------- */
  socket.on("join-lobby-room", (lobbyId) => {
    if (!lobbies[lobbyId]) {
      console.warn("[SERVER] join-lobby-room failed:", lobbyId);
      return;
    }

    socket.join(lobbyId);
    console.log("[SERVER] host joined lobby room:", lobbyId);
  });

  /* -------- JOIN LOBBY (CONTROLLER) -------- */
  socket.on("join-lobby", (data) => {
    const { lobbyId, playerName } = data;

    console.log("[SERVER] join-lobby:", lobbyId, playerName);

    if (!lobbies[lobbyId]) {
      socket.emit("join-lobby-error", "Lobby not found");
      return;
    }

    socket.join(lobbyId);

    const newPlayer = {
      id: socket.id,
      name: playerName || "Player",
      score: 0,
    };

    lobbies[lobbyId].players.push(newPlayer);

    socket.emit("join-lobby-success", newPlayer);
    io.to(lobbyId).emit("player-joined", lobbies[lobbyId].players);
  });

  /* -------- CONTROLLER INPUT -------- */
	socket.on("controller-input", (data) => {
	  const { lobbyId, type, action } = data;
	  if (!lobbies[lobbyId]) return;

	  const player = lobbies[lobbyId].players.find(
		(p) => p.id === socket.id
	  );

	  if (player && action === "press") {
		player.score += 1;
		io.to(lobbyId).emit("player-updated", lobbies[lobbyId].players);
	  }

	  io.to(lobbyId).emit("unity-event", {
		type: type || "BUTTON",
		action,
		playerId: socket.id,
	  });

	  console.log("[SERVER] unity-event emitted:", lobbyId, action);
	});


  /* -------- DISCONNECT -------- */
  socket.on("disconnect", () => {
    console.log("[SERVER] socket disconnected:", socket.id);

    for (const lobbyId in lobbies) {
      const lobby = lobbies[lobbyId];
      lobby.players = lobby.players.filter(
        (p) => p.id !== socket.id
      );

      io.to(lobbyId).emit("player-updated", lobby.players);
    }
  });
});

/* ============================
   START SERVER
============================ */

server.listen(PORT, () => {
  console.log("SERVER STARTED ON PORT", PORT);
});
