import { useNavigate } from "react-router-dom";
import { Button, Spinner } from "@heroui/react";
import PageLayout from "../shared/components/PageLayout";
import { useUserProfile } from "../features/user/hooks/useUserProfile";
import { useLogout } from "../features/user/hooks/useLogout";
import { useEffect } from "react";

export default function Home() {
  const { data: user, isLoading, isError } = useUserProfile();
  const logout = useLogout();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && (isError || !user)) {
      logout();
    }
  }, [isLoading, isError, user, logout]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user && !isLoading) return null;

  return (
    <PageLayout>
      <div className="flex flex-col items-center justify-center mt-16 gap-20">
        <h1 className="text-3xl font-bold text-gray-800">
          Welcome to PeerPrep, {user?.username}!
        </h1>

        <div className="flex flex-col items-center text-center h-full max-w-xs gap-2">
          <Button
            color={user.isAdmin ? "success" : "danger"}
            className="w-full text-center"
            onPress={() => navigate("/profile")}
          >
            <p className="text-white">
              View Your {user.isAdmin ? "Admin" : "User"} Profile
            </p>
          </Button>

          <Button
            color="primary"
            className="w-full text-center"
            onPress={() => navigate("/matching")}
          >
            <p className="text-white">Find a Match</p>
          </Button>

          {/* <Button
            color="secondary"
            className="w-full text-center"
            onPress={() => navigate("/room")}
          >
            <p className="text-white">Enter Collaboration</p>
          </Button> */}
        </div>
      </div>
    </PageLayout>
  );
}
