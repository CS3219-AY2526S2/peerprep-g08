import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../socket";
import {
  Button,
  Tooltip,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";

import { joinRoom, endRoom } from "../services/api";
import { RoomLayoutProvider } from "../context/RoomLayoutProvider";
import SplitPaneLayout, { PanelToggleButtons } from "../components/SplitPane";
import QuestionPanel from "../components/QuestionPanel";
import EditorPanel from "../components/EditorPanel";
import ChatPanel from "../components/ChatPanel";
import PanelErrorBoundary from "../components/PanelErrorBoundary";
import CollabEditor from "../components/CollabEditor";
import { useUserProfile } from "../../user/hooks/useUserProfile";
import { useLogout } from "../../user/hooks/useLogout";

/**
 * Room page — three-panel split view.
 *
 * The matching service creates the room (POST /rooms/create) with { questionId }
 * before navigating users here. On mount we call POST /rooms/join which returns
 * { roomId, questionId } — no URL params needed.
 */
export default function Room() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // handles session ending modal
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  // handles modal from displaying other party ending session
  const [sessionEnded, setSessionEnded] = useState(false);

  const { data: user, isLoading, isError } = useUserProfile();
  const logout = useLogout();

  const language = "python";
  const [roomReady, setRoomReady] = useState(false);
  const [questionId, setQuestionId] = useState<string | null>(null);

  // Latest editor content snapshot, used as AI context for @AI chat requests.
  const [codeContext, setCodeContext] = useState("");

  useEffect(() => {
    if (!isLoading && (isError || !user)) {
      logout();
    }
  }, [isLoading, isError, user, logout]);

  // ── Join room & hydrate metadata ────────────────────────────────────────────
  useEffect(() => {
    if (!id || isLoading || !user) return;

    joinRoom(id, user)
      .then(({ data }) => {
        setQuestionId(data.questionId ?? null);
        setRoomReady(true);
      })
      .catch((error) => {
        const status = error.response?.status;
        const errorBody = error.response?.data?.error;
        if (status === 403 && errorBody === "User not allowed") {
          alert("You are not authorised to join this room.");
        } else if (status === 403) {
          alert("Room is full!");
        } else if (status === 410) {
          alert("Room has already ended.");
        } else {
          alert("Room does not exist!");
        }
        navigate("/");
      });
  }, [id, isLoading, navigate, user]);

  // ── End room ────────────────────────────────────────────────────────────────
  const handleConfirmEnd = async (onClose: () => void) => {
    try {
      await endRoom(id!);
    } catch {
      // Room may already be gone — navigate regardless
    }
    onClose();
    navigate("/");
  };

  // Autoleave when session ends
  const handleSessionEnd = () => {
    setSessionEnded(true);
  };
  useEffect(() => {
    socket.on("room_ended", handleSessionEnd);
    return () => {
      socket.off("room_ended", handleSessionEnd);
    };
  }, []);

  if (!roomReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-default-500">Joining room…</p>
        </div>
      </div>
    );
  }

  return (
    <RoomLayoutProvider>
      <div className="flex flex-col h-screen w-screen bg-background overflow-hidden">
        {/* ── Top bar ──────────────────────────────────────────────────── */}
        <header className="flex-none flex items-center justify-between px-4 py-2 border-b border-divider bg-content1 z-10">
          {/* Left: branding + room badge */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tracking-tight text-foreground select-none">
              PeerPrep
            </span>
            <Chip size="sm" variant="flat" className="font-mono text-xs">
              Room: {id}
            </Chip>
          </div>

          {/* Center: panel visibility toggles */}
          <PanelToggleButtons />

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            <Tooltip content="End session for everyone" placement="bottom">
              <Button
                size="sm"
                color="danger"
                variant="flat"
                onPress={onOpen}
                id="end-room-btn"
              >
                End Room
              </Button>
            </Tooltip>
          </div>
        </header>

        {/* ── Three-panel body ─────────────────────────────────────────── */}
        <main className="flex-1 overflow-hidden">
          <SplitPaneLayout
            questionPanel={
              <PanelErrorBoundary fallbackLabel="Question panel error">
                <QuestionPanel questionId={questionId} />
              </PanelErrorBoundary>
            }
            editorPanel={
              <PanelErrorBoundary fallbackLabel="Editor panel error">
                <EditorPanel language={language}>
                  <CollabEditor
                    roomId={id!}
                    language={language}
                    username={user.username}
                    onCodeChange={setCodeContext}
                  />
                </EditorPanel>
              </PanelErrorBoundary>
            }
            chatPanel={
              <PanelErrorBoundary fallbackLabel="Chat panel error">
                <ChatPanel
                  roomId={id!}
                  currentUsername={user.username}
                  currentUserId={user.id}
                  codeContext={codeContext}
                />
              </PanelErrorBoundary>
            }
          />
        </main>

        {/* ── End-room confirmation modal ──────────────────────────────── */}
        <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="center">
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader>End Room?</ModalHeader>
                <ModalBody>
                  <p className="text-sm text-default-600">
                    This will permanently close the room for all participants.
                  </p>
                </ModalBody>
                <ModalFooter>
                  <Button variant="flat" onPress={onClose}>
                    Cancel
                  </Button>
                  <Button
                    color="danger"
                    onPress={() => handleConfirmEnd(onClose)}
                    id="confirm-end-room-btn"
                  >
                    Confirm End
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        <Modal isOpen={sessionEnded} onOpenChange={() => {}} placement="center">
          <ModalContent>
            {() => (
              <>
                <ModalHeader>Room has been ended by other user</ModalHeader>
                <ModalBody>
                  <p className="text-sm text-default-600">Redirect to home.</p>
                </ModalBody>
                <ModalFooter>
                  <Button
                    color="danger"
                    onPress={() => navigate("/")}
                    id="go-home-btn"
                  >
                    Back to Home
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </div>
    </RoomLayoutProvider>
  );
}
