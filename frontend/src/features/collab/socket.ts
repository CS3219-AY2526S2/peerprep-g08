import { io } from "socket.io-client";
import { API_URL } from "./services/api.ts";

// API_URL may include a path prefix (e.g. http://localhost:3000/api/collab-service).
// Socket.IO requires the origin only as the URL; the path prefix must be passed
// separately via the `path` option so it isn't misinterpreted as a namespace.
const _url = new URL(API_URL);
const SOCKET_ORIGIN = _url.origin;
const SOCKET_PATH = _url.pathname.replace(/\/$/, "") + "/socket.io";

export const socket = io(SOCKET_ORIGIN, { path: SOCKET_PATH });