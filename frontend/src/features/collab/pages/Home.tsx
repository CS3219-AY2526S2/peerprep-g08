import { useEffect, useState } from "react";
import { createRoom, joinRoom } from "../services/api";
import { useNavigate } from "react-router-dom";
import { Button, Input, Card, CardBody } from "@heroui/react";
import { useLogout } from "../../user/hooks/useLogout";
import { useUserProfile } from "../../user/hooks/useUserProfile";

/**
 * Collab Home Page
 */
export default function Home() {
  const [roomIdInput, setRoomIdInput] = useState("");
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const {
    data: user,
    isLoading: isUserProfileLoading,
    isError,
  } = useUserProfile();
  const logout = useLogout();

  useEffect(() => {
    if (!isUserProfileLoading && (isError || !user)) {
      logout();
    }
  }, [isUserProfileLoading, isError, user, logout]);

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      const res = await createRoom();
      const newId = res.data.roomId;
      if (newId) {
        navigate(`/room/${newId}`);
      }
    } catch (error) {
      console.error("Create failed:", error);
      alert("Failed to create room.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!roomIdInput.trim()) return;
    setIsLoading(true);
    try {
      const res = await joinRoom(roomIdInput, user);
      if (res.data.success) {
        navigate(`/room/${roomIdInput}`);
      }
    } catch (error) {
      console.error("Join failed:", error);
      alert("Room does not exist!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] w-full p-6">
      <Card className="w-full max-w-sm shadow-xl border-divider">
        <CardBody className="flex flex-col gap-8 p-8 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Collaboration</h1>
            <p className="text-sm text-default-500">
              Start a new session or join an existing one by room ID.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <Button
              color="primary"
              size="lg"
              className="font-semibold shadow-md active:scale-95 transition-transform"
              onPress={handleCreate}
              isLoading={isLoading}
            >
              Create New Room
            </Button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-divider"></div>
              <span className="mx-4 text-xs font-semibold uppercase tracking-widest text-default-400">
                OR
              </span>
              <div className="flex-grow border-t border-divider"></div>
            </div>

            <div className="flex flex-col gap-2">
              <Input
                placeholder="Enter Room ID"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value)}
                variant="bordered"
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />
              <Button
                variant="flat"
                onPress={handleJoin}
                isLoading={isLoading}
                isDisabled={!roomIdInput.trim()}
                className="font-medium"
              >
                Join Room
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
