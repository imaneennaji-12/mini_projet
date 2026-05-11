import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = "http://127.0.0.1:5000";

export function useSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      auth: { token: localStorage.getItem("fs_token") },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ WebSocket connecté");
      setConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("❌ WebSocket déconnecté");
      setConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.error("Erreur WebSocket :", err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { socketRef, connected };
}
