import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { useEffect, useRef } from "react";

export default function useYjs(roomId: string) {
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  if (!ydocRef.current) {
    ydocRef.current = new Y.Doc();
  }
  if (!providerRef.current) {
    providerRef.current = new WebsocketProvider(
      "ws://localhost:3219/yjs",
      roomId,
      ydocRef.current,
    );
  }

  useEffect(() => {
    return () => {
      providerRef.current?.destroy();
      providerRef.current = null;
      ydocRef.current?.destroy();
      ydocRef.current = null;
    };
  }, [roomId]);

  return { ydoc: ydocRef.current, wsProvider: providerRef.current };
}
