import { useContext } from "react";
import { RoomLayoutContext } from "../context/RoomLayoutContext";

export function useRoomLayout() {
  const ctx = useContext(RoomLayoutContext);
  if (!ctx) throw new Error("useRoomLayout must be used inside RoomLayoutProvider");
  return ctx;
}
