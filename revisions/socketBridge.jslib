mergeInto(LibraryManager.library, {
  InitSocket: function (gameObjectNamePtr) {
    const gameObjectName = UTF8ToString(gameObjectNamePtr);

    // Use current page's origin for socket connection (works in dev and production)
    const serverUrl = window.location.origin;
    console.log("Connecting to socket server at:", serverUrl);
    
    window.socket = io(serverUrl);

    socket.on("connect", () => {
      console.log("Unity connected to socket. Socket ID:", socket.id);
    });

    socket.on("controller-input", (data) => {
      console.log("Received controller-input:", data);
      // Unity C# expects method name "OnControllerEvent" with data structure {type, action, playerId}
      const unityData = {
        type: data.type || "BUTTON",
        action: data.action,
        playerId: data.playerId
      };
      SendMessage(gameObjectName, "OnControllerEvent", JSON.stringify(unityData));
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });
  },

  EmitEvent: function (eventNamePtr, jsonPtr) {
    const eventName = UTF8ToString(eventNamePtr);
    const json = UTF8ToString(jsonPtr);
    if (window.socket) {
      socket.emit(eventName, JSON.parse(json));
    } else {
      console.error("Socket not initialized");
    }
  }
});
