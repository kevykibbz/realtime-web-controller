import React, { createContext, useContext } from 'react';
import io from 'socket.io-client';

// SMART URL DETECTION
// If running on localhost, connect to localhost server
// Otherwise, use production URL
const isLocalhost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' ||
                    window.location.hostname === '';

const SOCKET_URL = isLocalhost
  ? (import.meta.env.VITE_SOCKET_URL_DEVELOPMENT || 'http://localhost:3001')
  : (import.meta.env.VITE_SOCKET_URL_PRODUCTION || 'https://realtime-web-controller.onrender.com');

const RECONNECTION_ATTEMPTS = parseInt(import.meta.env.VITE_SOCKET_RECONNECTION_ATTEMPTS) || 5;
const RECONNECTION_DELAY = parseInt(import.meta.env.VITE_SOCKET_RECONNECTION_DELAY) || 1000;
const SOCKET_TIMEOUT = parseInt(import.meta.env.VITE_SOCKET_TIMEOUT) || 20000;

console.log('🔌 Connecting Socket.IO to:', SOCKET_URL);
console.log(`[CONFIG] Reconnection attempts: ${RECONNECTION_ATTEMPTS}, delay: ${RECONNECTION_DELAY}ms, timeout: ${SOCKET_TIMEOUT}ms`);

const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: RECONNECTION_DELAY,
  reconnectionAttempts: RECONNECTION_ATTEMPTS,
  timeout: SOCKET_TIMEOUT,
});

// CONNECTION LOGGING
socket.on('connect', () => {
  console.log('Socket.IO connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.warn('Socket.IO disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('Socket.IO connection error:', error.message);
});

socket.on('ping', () => {
  console.log('Ping received from server (keepalive)');
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
