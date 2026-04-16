import { Card, CardHeader, CardBody, Divider } from "@heroui/react";
import Chat from "./Chat";

interface ChatPanelProps {
  roomId: string;
  currentUsername: string;
  currentUserId: string;
  codeContext: string;
}

export default function ChatPanel({
  roomId,
  currentUsername,
  currentUserId,
  codeContext,
}: ChatPanelProps) {
  return (
    <Card
      className="flex flex-col h-full rounded-none border-none shadow-none bg-content1"
      aria-label="Chat panel"
    >
      <CardHeader className="flex-none px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-widest text-default-400 select-none">
            Room Chat
          </span>
        </div>
      </CardHeader>
      <Divider className="flex-none" />
      <CardBody className="flex-1 overflow-hidden p-4">
        <Chat
          roomId={roomId}
          currentUsername={currentUsername}
          currentUserId={currentUserId}
          codeContext={codeContext}
        />
      </CardBody>
    </Card>
  );
}
