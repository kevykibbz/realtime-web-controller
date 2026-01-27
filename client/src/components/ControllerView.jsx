import React, { useEffect, useState, useCallback } from "react";
import { useSocket } from "../contexts/SocketContext.jsx";
import { Button } from "components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "components/ui/card";
import { Input } from "components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "components/ui/dialog";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { User, AlertCircle, Users } from "lucide-react";



function ControllerView() {
  const socket = useSocket();
  const location = useLocation();
  const [lobbyId, setLobbyId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [player, setPlayer] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState("");
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [onlinePlayers, setOnlinePlayers] = useState(0);

  // Memoized function to join a lobby
  const joinLobby = useCallback(
    (id, name) => {
      if (id && id.trim() && name && name.trim()) {
        setIsConnecting(true);
        setError("");
        socket.emit("join-lobby", { lobbyId: id.trim().toUpperCase(), playerName: name.trim() });
      }
    },
    [socket],
  );

  // Effect for handling auto-join from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const lobbyIdFromUrl = params.get("lobbyId");
    if (lobbyIdFromUrl) {
      const upperLobbyId = lobbyIdFromUrl.toUpperCase();
      setLobbyId(upperLobbyId);
    }
  }, [location.search]);

  // Effect for handling socket events
  useEffect(() => {
    const onJoinSuccess = (newPlayer) => {
      setPlayer(newPlayer);
      setIsConnecting(false);
      setError("");
    };

    const onJoinError = (errorMessage) => {
      setError(errorMessage);
      setIsConnecting(false);
      setShowErrorDialog(true);
    };

    const onPlayerUpdate = (updatedPlayers) => {
      setOnlinePlayers(updatedPlayers.length);
      setPlayer(prevPlayer => {
        if (prevPlayer) {
          const self = updatedPlayers.find(p => p.id === prevPlayer.id);
          if (self) {
            return self;
          }
        }
        return prevPlayer;
      });
    };

    const onPlayerJoined = (updatedPlayers) => {
      setOnlinePlayers(updatedPlayers.length);
    };

    socket.on("join-lobby-success", onJoinSuccess);
    socket.on("join-lobby-error", onJoinError);
    socket.on("player-updated", onPlayerUpdate);
    socket.on("player-joined", onPlayerJoined);

    return () => {
      socket.off("join-lobby-success", onJoinSuccess);
      socket.off("join-lobby-error", onJoinError);
      socket.off("player-updated", onPlayerUpdate);
      socket.off("player-joined", onPlayerJoined);
    };
  }, [socket]);

  const handleManualJoin = () => {
    joinLobby(lobbyId, playerName);
  };

const handleButtonPress = () => {
  const payload = {
    lobbyId,
    type: "BUTTON",
    action: "press",
  };

  console.log("[CONTROLLER] emitting controller-input", payload);
  socket.emit("controller-input", payload);
};


const handleButtonRelease = () => {
  if (!lobbyId || !player) return;

  socket.emit("controller-input", {
    lobbyId,
    type: "BUTTON",
    action: "release",
    playerId: player.id
  });

  console.log("Sent BUTTON release");
};





  // Render controller view if joined successfully
  if (player) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="flex flex-col items-center justify-center min-h-screen bg-gray-900"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 20 }}
        >
          <Card className="w-full max-w-md text-center bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-300">Lobby: {lobbyId}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col justify-center items-center h-64">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 15 }}
                className="absolute top-4 right-4 text-white text-2xl font-bold"
              >
                Score: {player.score}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25, type: "spring", stiffness: 300, damping: 15 }}
                className="absolute top-4 left-4 text-white text-lg font-bold flex items-center"
              >
                <Users className="w-5 h-5 mr-2" />
                {Math.max(0, onlinePlayers - 1)} online
              </motion.div>
              <motion.div
                whileTap={{ scale: 0.85 }}
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Button
                  className="w-48 h-48 rounded-full text-2xl font-bold select-none bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                  onMouseDown={handleButtonPress}
                  onMouseUp={handleButtonRelease}
                  onTouchStart={handleButtonPress}
                  onTouchEnd={handleButtonRelease}
                >
                  Press Me
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    );
  }
  // Render join form
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="flex flex-col items-center justify-center min-h-screen"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 20 }}
      >
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-center">Join Lobby</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="relative"
              >
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Enter Your Name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="text-center pl-10"
                  disabled={isConnecting}
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="relative"
              >
                <AlertCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Enter Lobby ID"
                  value={lobbyId}
                  onChange={(e) => setLobbyId(e.target.value.toUpperCase())}
                  className="text-center uppercase pl-10"
                  disabled={isConnecting}
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  onClick={handleManualJoin} 
                  disabled={isConnecting || !playerName.trim() || !lobbyId.trim()}
                  className="w-full"
                >
                  {isConnecting ? "Joining..." : "Join"}
                </Button>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Error Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-500">Error</DialogTitle>
            <DialogDescription>
              {error}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowErrorDialog(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

export default ControllerView;
