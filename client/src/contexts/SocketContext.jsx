import React, { createContext, useContext } from 'react';
import io from 'socket.io-client';

// IMPORTANT: connect to the BACKEND, not the UI
const socket = io('https://realtime-web-controller.onrender.com', {
  transports: ['websocket'],
});

const SocketContext = createContext(socket);

// Custom hook to use the socket context
export const useSocket = () => {
  return useContext(SocketContext);
};

// Provider component to wrap the application
export const SocketProvider = ({ children }) => {
  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
