import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = "http://127.0.0.1:5000";

export function useSocket() {
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ WebSocket connecté");
    });

    socket.on("disconnect", () => {
      console.log("❌ WebSocket déconnecté");
    });

    socket.on("connect_error", (err) => {
      console.error("Erreur WebSocket :", err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return socketRef;
}
