import { io } from "socket.io-client";

const SOCKET_URL = "https://smart-parking-system-9fzt.onrender.com";
export const socket = io(SOCKET_URL);
