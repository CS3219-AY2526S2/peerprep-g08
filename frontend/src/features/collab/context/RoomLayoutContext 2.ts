import { createContext } from "react";

export interface RoomLayoutState {
  questionCollapsed: boolean;
  chatCollapsed: boolean;
  toggleQuestion: () => void;
  toggleChat: () => void;
}

export const RoomLayoutContext = createContext<RoomLayoutState | undefined>(undefined);
