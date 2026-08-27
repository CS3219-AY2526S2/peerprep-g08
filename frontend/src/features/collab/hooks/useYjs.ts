import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { useEffect, useState } from "react";

const YJS_SERVER_URL =
  import.meta.env.VITE_COLLAB_YJS_URL || "ws://localhost:3219/yjs";

interface YjsSession {
  ydoc: Y.Doc;
  wsProvider: WebsocketProvider;
}

function createYjsSession(roomId: string): YjsSession {
  const ydoc = new Y.Doc();
  const wsProvider = new WebsocketProvider(YJS_SERVER_URL, roomId, ydoc);

  return { ydoc, wsProvider };
}

function destroyYjsSession({ ydoc, wsProvider }: YjsSession) {
  wsProvider.destroy();
  ydoc.destroy();
}

export default function useYjs(roomId: string) {
  const [session] = useState(() => createYjsSession(roomId));

  useEffect(() => {
    return () => destroyYjsSession(session);
  }, [session]);

  return session;
}
