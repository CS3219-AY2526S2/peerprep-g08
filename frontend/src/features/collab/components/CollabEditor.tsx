import { useEffect, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { editor } from "monaco-editor";
import type * as monacoeditor from "monaco-editor";
import { MonacoBinding } from "y-monaco";
import useYjs from "../hooks/useYjs";
import * as Y from "yjs";

interface CollabEditorProps {
  roomId: string;
  language?: string;
  readOnly?: boolean;
  username: string;
  /**
   * Called with a debounced snapshot of the current editor content.
   * Used to provide server-side AI with code context.
   */
  onCodeChange?: (code: string) => void;
}

interface AwarenessState {
  selection?: {
    anchor: Y.RelativePosition;
    head: Y.RelativePosition;
  };
  user?: {
    color: string;
    name: string;
  };
}

function hashUsernameToColor(username: string): string {
  const hash = Array.from(username).reduce(
    (currentHash, character) =>
      character.charCodeAt(0) + ((currentHash << 5) - currentHash),
    0,
  );
  return `hsl(${Math.abs(hash) % 360}, 70%, 50%)`;
}

function injectCursorStyle(clientId: number, color: string, name: string) {
  const existingStyle = document.querySelector(
    `style[data-yjs-cursor="${clientId}"]`,
  );
  if (existingStyle) return;

  const style = document.createElement("style");
  style.dataset.yjsCursor = String(clientId);
  style.textContent = `
        .yjs-cursor-${clientId} {
            border-left: 2px solid ${color};
            margin-left: -1px;
            position: relative;
        }
        .yjs-cursor-${clientId}::before {
            content: "${name}";
            position: absolute;
            top: -18px;
            left: -1px;
            background: ${color};
            color: #fff;
            font-size: 10px;
            padding: 1px 4px;
            border-radius: 3px;
            white-space: nowrap;
            pointer-events: none;
            z-index: 100;
        }
        .yjs-selection-${clientId} {
            background: ${color} !important;
        }
    `;
  document.head.appendChild(style);
}

export default function CollabEditor({
  roomId,
  language = "javascript",
  readOnly = false,
  username,
  onCodeChange,
}: CollabEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const { ydoc, wsProvider } = useYjs(roomId);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    const yText = ydoc.getText("content");
    const model = editor.getModel()!;
    new MonacoBinding(
      yText,
      model,
      new Set([editor]),
      wsProvider.awareness,
    );

    // Keep a debounced snapshot of code for AI context.
    // (We intentionally avoid emitting on every keystroke.)
    let codeSnapshotTimeout: ReturnType<typeof setTimeout> | undefined;
    const emitCodeSnapshot = () => {
      onCodeChange!(yText.toString());
    };

    const handleYTextChange = () => {
      clearTimeout(codeSnapshotTimeout);
      codeSnapshotTimeout = setTimeout(emitCodeSnapshot, 200);
    };

    if (onCodeChange) {
      emitCodeSnapshot();
      yText.observe(handleYTextChange);
    }
    wsProvider.awareness.setLocalStateField("user", {
      name: username,
      color: hashUsernameToColor(username),
    });

    let awarenessTimeout: ReturnType<typeof setTimeout> | undefined;
    const otherCursors = editor.createDecorationsCollection([]);

    const processUserCursor = (
      state: AwarenessState,
      clientId: number,
    ): monacoeditor.editor.IModelDeltaDecoration[] => {
      const isRenderable = [
        clientId !== wsProvider.awareness.clientID,
        state.selection,
        state.user,
      ].every(Boolean);

      if (!isRenderable) return [];

      const selection = state.selection!;
      const user = state.user!;

      const anchor = Y.createAbsolutePositionFromRelativePosition(
        selection.anchor,
        ydoc,
      );
      const head = Y.createAbsolutePositionFromRelativePosition(
        selection.head,
        ydoc,
      );

      if (![anchor, head].every(Boolean)) return [];

      const resolvedAnchor = anchor!;
      const resolvedHead = head!;
      injectCursorStyle(clientId, user.color, user.name);

      const headPosition = model.getPositionAt(resolvedHead.index);
      const selectionStart = model.getPositionAt(
        Math.min(resolvedAnchor.index, resolvedHead.index),
      );
      const selectionEnd = model.getPositionAt(
        Math.max(resolvedAnchor.index, resolvedHead.index),
      );
      const decorations: monacoeditor.editor.IModelDeltaDecoration[] = [
        {
          range: new monaco.Range(
            headPosition.lineNumber,
            headPosition.column,
            headPosition.lineNumber,
            headPosition.column,
          ),
          options: { className: `yjs-cursor-${clientId}` },
        },
        {
          range: new monaco.Range(
            selectionStart.lineNumber,
            selectionStart.column,
            selectionEnd.lineNumber,
            selectionEnd.column,
          ),
          options: { inlineClassName: `yjs-selection-${clientId}` },
        },
      ];

      const decorationCount = 1 + Number(
        resolvedAnchor.index !== resolvedHead.index,
      );
      return decorations.slice(0, decorationCount);
    };

    const handleAwarenessChange = () => {
      otherCursors.set([]);

      clearTimeout(awarenessTimeout);
      awarenessTimeout = setTimeout(() => {
        const cursors = Array.from(wsProvider.awareness.getStates()).flatMap(
          ([clientId, state]) =>
            processUserCursor(state as AwarenessState, clientId),
        );
        otherCursors.set(cursors);
      }, 100);
    };

    wsProvider.awareness.on("change", handleAwarenessChange);

    // Focus editor on mount
    editor.focus();

    // Resize observer so editor fills its container when layout changes
    const ro = new ResizeObserver(() => editor.layout());
    const node = editor.getContainerDomNode();
    ro.observe(node.parentElement!);

    editor.onDidDispose(() => {
      ro.disconnect();
      yText.unobserve(handleYTextChange);
      wsProvider.awareness.off("change", handleAwarenessChange);
      clearTimeout(codeSnapshotTimeout);
      clearTimeout(awarenessTimeout);
    });
  };

  // Sync language changes without remounting
  useEffect(() => {
    const model = editorRef.current?.getModel();
    if (model) {
      editor.setModelLanguage(model, language);
    }
  }, [language]);

  return (
    <Editor
      height="100%"
      width="100%"
      language={language}
      theme="vs-dark"
      onMount={handleMount}
      options={{
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontLigatures: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        readOnly,
        automaticLayout: false, // handled manually via ResizeObserver
        tabSize: 2,
        wordWrap: "on",
        lineNumbers: "on",
        renderLineHighlight: "gutter",
        smoothScrolling: true,
        cursorBlinking: "smooth",
        padding: { top: 12, bottom: 12 },
      }}
    />
  );
}
