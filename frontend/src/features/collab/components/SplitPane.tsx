import { type ReactNode } from "react";
import { Button, Tooltip } from "@heroui/react";
import { useRoomLayout } from "../hooks/useRoomLayout";

interface PanelProps {
  children: ReactNode;
  /** Visible panel width class when not collapsed, e.g. "w-[30%]" */
  widthClass: string;
  isCollapsed: boolean;
  collapseLabel: string;
  onToggle: () => void;
  side?: "left" | "right";
  "data-panel"?: string;
}

function Panel({
  children,
  widthClass,
  isCollapsed,
  collapseLabel,
  onToggle,
  side = "left",
  "data-panel": dataPanel,
}: PanelProps) {
  return (
    <div
      data-panel={dataPanel}
      className={[
        "relative flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out",
        isCollapsed ? "w-0 min-w-0 opacity-0" : `${widthClass} opacity-100`,
      ].join(" ")}
    >
      {/* Inner wrapper prevents children from reflowing when width animates */}
      <div className="flex flex-col h-full min-w-[--panel-min]" style={{ "--panel-min": "0px" } as React.CSSProperties}>
        {children}
      </div>

      {/* Collapse toggle sits on the outer edge */}
      {!isCollapsed && (
        <Tooltip
          content={collapseLabel}
          placement={side === "left" ? "right" : "left"}
          delay={500}
        >
          <button
            onClick={onToggle}
            aria-label={collapseLabel}
            className={[
              "absolute top-1/2 -translate-y-1/2 z-10",
              "w-4 h-10 rounded flex items-center justify-center",
              "bg-default-200/80 hover:bg-default-300 text-default-600 hover:text-default-900",
              "transition-colors duration-150 text-xs font-bold",
              side === "left" ? "right-0 translate-x-1/2" : "left-0 -translate-x-1/2",
            ].join(" ")}
          >
            {side === "left" ? "‹" : "›"}
          </button>
        </Tooltip>
      )}
    </div>
  );
}

interface ExpandButtonProps {
  label: string;
  side: "left" | "right";
  onToggle: () => void;
}

function ExpandButton({ label, side, onToggle }: ExpandButtonProps) {
  return (
    <Tooltip content={label} placement={side === "left" ? "right" : "left"} delay={0}>
      <button
        onClick={onToggle}
        aria-label={label}
        className={[
          "flex-none self-center z-10",
          "w-5 h-16 rounded flex items-center justify-center",
          "bg-default-200/80 hover:bg-default-300 text-default-600 hover:text-default-900",
          "transition-colors duration-150 text-xs font-bold",
          side === "left" ? "mr-px" : "ml-px",
        ].join(" ")}
      >
        {side === "left" ? "›" : "‹"}
      </button>
    </Tooltip>
  );
}

interface SplitPaneLayoutProps {
  questionPanel: ReactNode;
  editorPanel: ReactNode;
  chatPanel: ReactNode;
}

/**
 * Three-panel split view:  [Question] | [Editor] | [Chat]
 * Left and right panels are collapsible via context.
 */
export default function SplitPaneLayout({
  questionPanel,
  editorPanel,
  chatPanel,
}: SplitPaneLayoutProps) {
  const { questionCollapsed, chatCollapsed, toggleQuestion, toggleChat } =
    useRoomLayout();

  return (
    <div className="flex flex-row h-full w-full overflow-hidden bg-background">
      {/* ── Left: Question ── */}
      {questionCollapsed ? (
        <ExpandButton label="Show Question" side="left" onToggle={toggleQuestion} />
      ) : (
        <Panel
          widthClass="w-[28%] min-w-[280px] max-w-[520px]"
          isCollapsed={questionCollapsed}
          collapseLabel="Collapse question"
          onToggle={toggleQuestion}
          side="left"
          data-panel="question"
        >
          {questionPanel}
        </Panel>
      )}

      {/* Divider */}
      <div className="w-px flex-none bg-divider" />

      {/* ── Middle: Editor ── */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden" data-panel="editor">
        {editorPanel}
      </div>

      {/* Divider */}
      <div className="w-px flex-none bg-divider" />

      {/* ── Right: Chat ── */}
      {chatCollapsed ? (
        <ExpandButton label="Show Chat" side="right" onToggle={toggleChat} />
      ) : (
        <Panel
          widthClass="w-[26%] min-w-[260px] max-w-[440px]"
          isCollapsed={chatCollapsed}
          collapseLabel="Collapse chat"
          onToggle={toggleChat}
          side="right"
          data-panel="chat"
        >
          {chatPanel}
        </Panel>
      )}
    </div>
  );
}

// Re-export the toggle button so the Room page header can use it
export function PanelToggleButtons() {
  const { questionCollapsed, chatCollapsed, toggleQuestion, toggleChat } =
    useRoomLayout();

  return (
    <div className="flex items-center gap-1">
      <Tooltip content={questionCollapsed ? "Show question" : "Hide question"}>
        <Button
          size="sm"
          variant="flat"
          isIconOnly
          onPress={toggleQuestion}
          aria-label="Toggle question panel"
          className="text-default-600"
        >
          {questionCollapsed ? "❰" : "❱"}
        </Button>
      </Tooltip>
      <Tooltip content={chatCollapsed ? "Show chat" : "Hide chat"}>
        <Button
          size="sm"
          variant="flat"
          isIconOnly
          onPress={toggleChat}
          aria-label="Toggle chat panel"
          className="text-default-600"
        >
          {chatCollapsed ? "❱" : "❰"}
        </Button>
      </Tooltip>
    </div>
  );
}
