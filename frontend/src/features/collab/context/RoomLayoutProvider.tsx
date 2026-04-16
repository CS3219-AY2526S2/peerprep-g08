import { useState, type ReactNode } from "react";
import { RoomLayoutContext } from "./RoomLayoutContext";

export function RoomLayoutProvider({ children }: { children: ReactNode }) {
  const [questionCollapsed, setQuestionCollapsed] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);

  const toggleQuestion = () => setQuestionCollapsed((prev) => !prev);
  const toggleChat = () => setChatCollapsed((prev) => !prev);

  return (
    <RoomLayoutContext.Provider
      value={{ questionCollapsed, chatCollapsed, toggleQuestion, toggleChat }}
    >
      {children}
    </RoomLayoutContext.Provider>
  );
}
