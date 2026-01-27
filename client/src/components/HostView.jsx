import React, { useEffect, useState, useMemo, useRef } from "react";
import { useSocket } from "../contexts/SocketContext.jsx";
import { Button } from "components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "components/ui/table";
import { Users, ClipboardCopy } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

function HostView() {
  const socket = useSocket();
  const iframeRef = useRef(null);

  const [lobbyId, setLobbyId] = useState("");
  const [players, setPlayers] = useState([]);
  const [unityReady, setUnityReady] = useState(false);

  /* --------------------------------------------------
   *  UNITY HANDSHAKE (iframe → React)
   * -------------------------------------------------- */
  useEffect(() => {
    const onMessage = (event) => {
      if (event.data?.type === "UNITY_READY") {
        console.log("✅ Unity handshake OK");
        setUnityReady(true);
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  /* --------------------------------------------------
   *  SOCKET → UNITY BRIDGE
   * -------------------------------------------------- */
  useEffect(() => {
    const forwardToUnity = (data) => {
      if (!window.unityInstance) {
        console.warn("⚠️ Unity instance not ready yet");
        return;
      }

      console.log("➡️ Forwarding to Unity:", data);

      window.unityInstance.SendMessage(
        "WebGLBridge",          // GameObject name
        "OnControllerEvent",   // Method name
        JSON.stringify(data)
      );
    };

    socket.on("unity-event", forwardToUnity);
    return () => socket.off("unity-event", forwardToUnity);
  }, [socket]);

  /* --------------------------------------------------
   *  LOBBY EVENTS
   * -------------------------------------------------- */
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

  const playersList = useMemo(() => players, [players]);

  /* --------------------------------------------------
   *  RENDER
   * -------------------------------------------------- */
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
              <div
                style={{
                  width: 960,
                  height: 600,
                  margin: "0 auto",
                  background: "black",
                }}
              >
                <iframe
                  ref={iframeRef}
                  src="/unity/index.html"
                  title="Unity Game"
                  width="960"
                  height="600"
                  style={{
                    border: "none",
                    pointerEvents: unityReady ? "auto" : "none",
                  }}
                />
              </div>

              {/* LOBBY INFO */}
              <div className="grid grid-cols-2 gap-6 mt-6 text-center">
                <div>
                  <p>Scan to join</p>
                  <QRCodeCanvas
                    value={`${window.location.origin}/?lobbyId=${lobbyId}`}
                    size={160}
                  />
                </div>

                <div>
                  <p>Lobby Code</p>
                  <h2 className="text-5xl font-bold tracking-widest">
                    {lobbyId}
                  </h2>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      navigator.clipboard.writeText(lobbyId)
                    }
                  >
                    <ClipboardCopy className="mr-2" />
                    Copy
                  </Button>
                </div>
              </div>

              {/* PLAYER LIST */}
              <div className="mt-8">
                <h3 className="text-xl font-bold flex justify-center items-center">
                  <Users className="mr-2" />
                  Players ({playersList.length})
                </h3>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">
                        Score
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {playersList.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.name}</TableCell>
                        <TableCell className="text-right">
                          {p.score}
                        </TableCell>
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
