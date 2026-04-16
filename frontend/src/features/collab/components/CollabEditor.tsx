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

function hashUsernameToColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
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
    const model = editor.getModel();
    new MonacoBinding(
      yText,
      model!,
      new Set([editor]),
      wsProvider.awareness,
    );

    // Keep a debounced snapshot of code for AI context.
    // (We intentionally avoid emitting on every keystroke.)
    let codeSnapshotTimeout: ReturnType<typeof setTimeout> | null = null;
    const emitCodeSnapshot = () => {
      if (!onCodeChange) return;
      onCodeChange(yText.toString());
    };

    const handleYTextChange = () => {
      if (!onCodeChange) return;
      if (codeSnapshotTimeout) clearTimeout(codeSnapshotTimeout);
      codeSnapshotTimeout = setTimeout(() => {
        emitCodeSnapshot();
      }, 200);
    };

    if (onCodeChange) {
      emitCodeSnapshot();
      yText.observe(handleYTextChange);
    }
    wsProvider.awareness.setLocalStateField("user", {
      name: username,
      color: hashUsernameToColor(username),
    });

    // debounce awareness changes
    let awarenessTimeout: ReturnType<typeof setTimeout> | null = null;
    const otherCursors = editor.createDecorationsCollection([]);

    wsProvider.awareness.on("change", () => {
      otherCursors.set([]);
      if (awarenessTimeout) clearTimeout(awarenessTimeout);
      awarenessTimeout = setTimeout(() => {
        const cursors: monacoeditor.editor.IModelDeltaDecoration[] = [];

        wsProvider.awareness.getStates().forEach((state, clientId) => {
          if (clientId === wsProvider.awareness.clientID) return;
          if (!state.selection || !state.user) return;

          const anchor = Y.createAbsolutePositionFromRelativePosition(
            state.selection.anchor,
            ydoc,
          );
          const head = Y.createAbsolutePositionFromRelativePosition(
            state.selection.head,
            ydoc,
          );

          if (!anchor || !head) return;

          injectCursorStyle(clientId, state.user.color, state.user.name);

          // handle cursor location
          const headPos = model?.getPositionAt(head.index);
          cursors.push({
            range: new monaco.Range(
              headPos?.lineNumber,
              headPos?.column,
              headPos?.lineNumber,
              headPos?.column,
            ),
            options: { className: `yjs-cursor-${clientId}` },
          });

          if (anchor.index !== head.index) {
            const selectionStartIdx = Math.min(anchor.index, head.index);
            const selectionEndIdx = Math.max(anchor.index, head.index);
            const selectionStartPos = model?.getPositionAt(selectionStartIdx);
            const selectionEndPos = model?.getPositionAt(selectionEndIdx);
            cursors.push({
              range: new monaco.Range(
                selectionStartPos?.lineNumber,
                selectionStartPos?.column,
                selectionEndPos?.lineNumber,
                selectionEndPos?.column,
              ),
              options: { inlineClassName: `yjs-selection-${clientId}` },
            });
          }
        });
        otherCursors.set(cursors);
      }, 100);
    });

    // Focus editor on mount
    editor.focus();

    // Resize observer so editor fills its container when layout changes
    const ro = new ResizeObserver(() => editor.layout());
    const node = editor.getContainerDomNode();
    if (node.parentElement) ro.observe(node.parentElement);

    return () => {
      ro.disconnect();
      if (onCodeChange) {
        yText.unobserve(handleYTextChange);
      }
      if (codeSnapshotTimeout) clearTimeout(codeSnapshotTimeout);
    };
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
