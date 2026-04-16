import axios from "axios";
import type { User } from "../../user/types/User";

export const API_URL = `${import.meta.env.VITE_COLLAB_API_URL}` as string;

export const api = axios.create({
  baseURL: API_URL,
});

export interface RoomData {
  roomId: string;
  /** Populated by the matching service; null until matching is implemented. */
  questionId: string | null;
}

export const createRoom = () => api.post<RoomData>("/rooms/create");

/** Join a room and get its metadata (including questionId) in one call. */
export const joinRoom = (roomId: string, user: User) =>
  api.post<RoomData & { success: boolean }>("/rooms/join", { roomId, user });

/** Fetch room metadata without joining (useful for reconnects). */
export const getRoomById = (roomId: string) =>
  api.get<RoomData>(`/rooms/${roomId}`);

export const endRoom = (roomId: string) => api.delete(`/rooms/${roomId}`);
