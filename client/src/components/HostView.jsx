import React, { useEffect, useState, useMemo, useRef } from "react";
import { useSocket } from "../contexts/SocketContext.jsx";
import { Button } from "components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "components/ui/card";
import { Input } from "components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from "components/ui/table";
import { Users, ClipboardCopy } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

function HostView() {
  const socket = useSocket();
  const iframeRef = useRef(null);

  const [lobbyId, setLobbyId] = useState("");
  const [players, setPlayers] = useState([]);
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [unityReady, setUnityReady] = useState(false);

  /* =========================
     UNITY HANDSHAKE
     ========================= */
  useEffect(() => {
    const onMessage = (event) => {
      if (event.data?.type === "UNITY_READY") {
        console.log("✅ Unity handshake received");
        setUnityReady(true);
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  /* =========================
     SOCKET → UNITY BRIDGE
     ========================= */
  useEffect(() => {
    const handleUnityEvent = (data) => {
      if (!unityReady || !iframeRef.current) return;

      iframeRef.current.contentWindow.postMessage(
        {
          type: "FROM_REACT",
          payload: data
        },
        "*"
      );
    };

    socket.on("unity-event", handleUnityEvent);
    return () => socket.off("unity-event", handleUnityEvent);
  }, [socket, unityReady]);

  /* =========================
     LOBBY STATE
     ========================= */
  useEffect(() => {
    socket.on("lobby-created", setLobbyId);
    socket.on("player-joined", setPlayers);
    socket.on("player-updated", setPlayers);

    return () => {
      socket.off("lobby-created");
      socket.off("player-joined");
      socket.off("player-updated");
    };
  }, [socket]);

  const createLobby = () => socket.emit("create-lobby");

  const copyToClipboard = () => {
    navigator.clipboard.writeText(lobbyId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const filteredPlayers = useMemo(() => {
    if (!searchTerm) return players;
    return players.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [players, searchTerm]);

  return (
    <div className="flex justify-center min-h-screen p-6">
      <Card className="w-full max-w-5xl">
        <CardHeader>
          <CardTitle className="text-3xl text-center">Host View</CardTitle>
        </CardHeader>

        <CardContent>
          {!lobbyId ? (
            <Button className="w-full" size="lg" onClick={createLobby}>
              Create Lobby
            </Button>
          ) : (
            <>
              {/* UNITY IFRAME */}
              <div className="w-full aspect-video bg-black rounded-lg overflow-hidden mb-6">
                <iframe
                  ref={iframeRef}
                  src="/unity/index.html"
                  title="Unity Game"
                  className="w-full h-full"
                  allow="fullscreen"
                />
              </div>

              {/* QR + CODE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
                <div>
                  <CardDescription>Scan with phone</CardDescription>
                  <QRCodeCanvas
                    value={`${window.location.origin}/?lobbyId=${lobbyId}`}
                    size={160}
                  />
                </div>

                <div>
                  <CardDescription>Lobby Code</CardDescription>
                  <h2 className="text-5xl font-bold tracking-widest">{lobbyId}</h2>
                  <Button variant="ghost" onClick={copyToClipboard}>
                    <ClipboardCopy className="mr-2" />
                    Copy
                  </Button>
                  {copied && <p className="text-green-500">Copied!</p>}
                </div>
              </div>

              {/* PLAYERS */}
              <div className="mt-8">
                <h3 className="text-xl font-bold mb-4 flex items-center justify-center">
                  <Users className="mr-2" /> Players ({players.length})
                </h3>

                <Input
                  placeholder="Search players..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-4"
                />

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlayers.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.name}</TableCell>
                        <TableCell className="text-right">{p.score}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default HostView;
