import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import io, { Socket } from "socket.io-client";
import PageLayout from "../../../shared/components/PageLayout";
import {
  Card,
  Checkbox,
  CheckboxGroup,
  Radio,
  RadioGroup,
  Button,
  Spinner,
  Alert,
} from "@heroui/react";
import { useUserProfile } from "../../user/hooks/useUserProfile";
import { getErrorMessage } from "../../../utils/error-handler";

const SOCKET_URL =
  import.meta.env.VITE_MATCHING_API_GATEWAY_URL ||
  "http://localhost:3000";

export default function MatchingPage() {
  const navigate = useNavigate();
  const { data: user } = useUserProfile();
  // State for form inputs
  const [difficulty, setDifficulty] = useState("easy");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  // State for matching
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState("Searching for a match...");
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem("token");
    const newSocket = io(SOCKET_URL, {
      path: "/api/matching-service/socket.io",
      auth: { token: `Bearer ${token}` },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    newSocket.on("connect", () => {
      console.log("Connected to matching service");
      setError(null);
    });

    newSocket.on("connect_error", (err: Error) => {
      console.error("Socket connection error:", err.message);
      const isAuthError =
        err.message.includes("Authentication") ||
        err.message.includes("token") ||
        err.message.includes("expired");
      setError(
        isAuthError
          ? `Authentication failed: ${err.message}. Please log out and log in again.`
          : `Failed to connect to matching service: ${err.message}`
      );
    });

    newSocket.on(
      "match-found",
      (data: { roomUrl?: { roomId: string }; partnerUserId: string }) => {
        console.log("Match found!", data);
        setIsSearching(false);
        // Navigate to collaboration room with the matched partner
        navigate(`/room/${data.roomUrl?.roomId}`, {
          state: { partnerUserId: data.partnerUserId },
        });
      },
    );

    newSocket.on("criteria-relaxed", (data: { level: number; message: string }) => {
      console.log("Criteria relaxed:", data.message);
      setSearchStatus(data.message);
    });

    newSocket.on("match-timeout", (data: { message: string }) => {
      console.log("Match timeout:", data.message);
      setIsSearching(false);
      setError("No match found within 2 minutes. Please try again.");
    });

    newSocket.on("match-error", (data: { message: string }) => {
      console.error("Match error:", data.message);
      setIsSearching(false);
      setError(data.message);
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from matching service");
      setError("Connection lost to matching service");
    });

    newSocket.on("error", (err: unknown) => {
      console.error("Socket error:", err);
      setError(`Connection error to matching service: ${getErrorMessage(err)}`);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [navigate]);

  const handleFindMatch = async () => {
    if (!selectedLanguages.length || !selectedTopics.length) {
      setError("Please select at least one language and one topic");
      return;
    }

    setError(null);
    setIsSearching(true);
    setSearchStatus("Searching for a match...");

    // Emit the find-match event
    if (!socket) {
      setError("Not connected to matching service. Please refresh.");
      setIsSearching(false);
      return;
    }
    socket.emit("find-match", {
      userId: user?.id,
      username: user?.username,
      languages: selectedLanguages,
      difficulty,
      topics: selectedTopics,
    });
  };

  const handleCancel = () => {
    setIsSearching(false);
    socket?.emit("cancel-match");
  };

  return (
    <PageLayout>
      <div className="flex flex-col items-center justify-center h-full">
        <h1 className="text-3xl font-bold mb-4">Find Your Coding Partner</h1>

        {error && (
          <Alert
            color="danger"
            title="Error"
            className="mb-4 w-full max-w-md"
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        <Card className="w-full max-w-md p-6">
          <p className="text-gray-600 mb-4">
            Choose your criteria to find a perfect match for pair programming!
          </p>

          {/* Difficulty level selections */}
          <RadioGroup
            orientation="horizontal"
            label="Difficulty Level"
            value={difficulty}
            onValueChange={setDifficulty}
            className="mt-4"
          >
            <Radio value="easy">Easy</Radio>
            <Radio value="medium">Medium</Radio>
            <Radio value="hard">Hard</Radio>
          </RadioGroup>

          {/* Topic selections */}
          <CheckboxGroup
            orientation="horizontal"
            label="Topics (Select at least 1)"
            value={selectedTopics}
            onValueChange={setSelectedTopics}
            className="mt-4"
          >
            <Checkbox value="arrays">Arrays</Checkbox>
            <Checkbox value="strings">Strings</Checkbox>
            <Checkbox value="stacks">Stacks</Checkbox>
            <Checkbox value="queues">Queues</Checkbox>
            <Checkbox value="trees">Trees</Checkbox>
            <Checkbox value="graphs">Graphs</Checkbox>
          </CheckboxGroup>

          {/* Language selections */}
          <CheckboxGroup
            orientation="horizontal"
            label="Languages (Select at least 1)"
            value={selectedLanguages}
            onValueChange={setSelectedLanguages}
            className="mt-4"
          >
            <Checkbox value="javascript">JavaScript</Checkbox>
            <Checkbox value="python">Python</Checkbox>
            <Checkbox value="java">Java</Checkbox>
          </CheckboxGroup>

          {/* Submit button */}
          {!isSearching ? (
            <Button
              className="mt-6 w-full"
              color="primary"
              size="lg"
              onPress={handleFindMatch}
            >
              Find Match
            </Button>
          ) : (
            <>
              <div className="flex justify-center items-center gap-2 mt-6">
                <Spinner size="sm" />
                <span>{searchStatus}</span>
              </div>
              <Button
                className="mt-4 w-full"
                variant="bordered"
                onPress={handleCancel}
              >
                Cancel Search
              </Button>
            </>
          )}
        </Card>

        {isSearching && (
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Finding a partner with similar interests...</p>
            <p className="mt-2">The search will timeout after 2 minutes</p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
