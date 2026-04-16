import { type ReactNode } from "react";
import { Card, CardHeader, CardBody } from "@heroui/react";

interface EditorPanelProps {
  /** Drop Monaco Editor (or any other editor) here as a child. */
  children?: ReactNode;
  language?: string;
}

/**
 * Container for the code editor.
 */
export default function EditorPanel({
  children,
  language = "javascript",
}: EditorPanelProps) {
  return (
    <Card
      className="flex flex-col h-full rounded-none border-none shadow-none bg-content1"
      aria-label="Code editor panel"
    >
      {/* ── Toolbar ── */}
      <CardHeader className="flex flex-row items-center justify-between px-4 py-2 flex-none border-b border-divider gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-default-400 select-none">
            Code Editor
          </span>
          <div className="h-4 w-px bg-divider mx-1" />
          <span className="text-[10px] text-default-400 font-mono hidden sm:inline">
            peer-to-peer logic enabled
          </span>
          <div className="h-4 w-px bg-divider mx-1" />
          <span className="text-[10px] text-default-400 font-mono hidden sm:inline">
            Language: {language}
          </span>
        </div>
      </CardHeader>

      {/* ── Editor mount ── */}
      <CardBody className="flex-1 overflow-hidden p-0 bg-background/50">
        {children ? (
          <div data-editor="mount" className="w-full h-full">
            {children}
          </div>
        ) : (
          <div
            data-editor="placeholder"
            className="flex flex-col items-center justify-center w-full h-full gap-4 text-center select-none"
          >
            <span className="text-5xl opacity-20">{"</>"}</span>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-default-400">
                Disconnected
              </p>
              <p className="text-xs text-default-300">
                Awaiting Monaco connection...
              </p>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
