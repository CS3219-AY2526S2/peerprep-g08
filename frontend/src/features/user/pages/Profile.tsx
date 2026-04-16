import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import OtpModal from "../components/OtpModal";
import PageLayout from "../../../shared/components/PageLayout";
import { addToast, Button, Card, CardBody, Chip } from "@heroui/react";
import { useUserProfile } from "../hooks/useUserProfile";
import { useUpgradeToAdmin } from "../hooks/useUpgradeToAdmin";
import { useLogout } from "../hooks/useLogout";
import { useDeleteUser } from "../hooks/useDeleteUser.ts";
import { useUploadProfilePicture } from "../hooks/useUploadProfilePicture";
import DeleteWarning from "../components/DeleteWarning.tsx";

export default function Profile() {
  const { data: user, isLoading: isProfileLoading } = useUserProfile();
  const { mutate, isPending: isUpgradePending } = useUpgradeToAdmin();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteWarningOpen, setIsDeleteWarningOpen] = useState(false);
  const { mutate: deleteAccount, isPending: isDeleting } = useDeleteUser();
  const { mutate: uploadPicture, isPending: isUploading } = useUploadProfilePicture();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const logout = useLogout();

  const handleUpgradeSubmit = (code: string) => {
    mutate(code, {
      onSuccess: () => {
        setIsModalOpen(false);
        addToast({
          title: "Upgrade Success!",
          description: "Successfully upgraded to admin!",
          color: "success",
          timeout: 3000,
          shouldShowTimeoutProgress: true,
        });
      },
      onError: (err) => {
        addToast({
          title: "Error",
          description: err.message,
          color: "danger",
          timeout: 3000,
          shouldShowTimeoutProgress: true,
        });
      },
    });
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadPicture({ userId: user.id, file }, {
      onSuccess: () => {
        addToast({ title: "Profile picture updated!", color: "success", timeout: 3000 });
      },
      onError: (err) => {
        addToast({ title: "Upload failed", description: err.message, color: "danger", timeout: 3000 });
      },
    });
    // Reset so the same file can be re-selected if needed
    e.target.value = "";
  };

  const handleDeleteAccount = () => {
    deleteAccount(user.id, {
      onSuccess: () => {
        addToast({
          title: "Account Deleted",
          description: "Your account has been permanently deleted.",
          color: "success",
          timeout: 3000,
        });

        logout(); // or navigate to landing page
      },
      onError: (err) => {
        addToast({
          title: "Error",
          description: err.message,
          color: "danger",
        });
      },
    });
  }

  if (isProfileLoading)
    return <p className="p-8 text-gray-500">Loading profile...</p>;

  return (
    <PageLayout>
      <div className="flex justify-center mt-10">
        <Card className="w-full max-w-md" shadow="md">
          <CardBody className="px-8 py-8 flex flex-col gap-4">
            {/* Profile picture */}
            <div className="flex flex-col items-center gap-2">
              <div
                className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                {user.profilePicture ? (
                  <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center text-3xl font-bold text-gray-400">
                    {user.username?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-medium">
                    {isUploading ? "Uploading..." : "Change"}
                  </span>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={handleFileChange}
                disabled={isUploading}
              />
              <p className="text-xs text-gray-400">JPG or PNG, max 2 MB</p>
            </div>

            <h2 className="text-2xl font-bold">{user.username}</h2>
            <p className="text-gray-500">{user.email}</p>
            <Chip color={user.isAdmin ? "success" : "default"} variant="flat">
              {user.isAdmin ? "Admin" : "User"}
            </Chip>

            <div className="flex flex-col gap-3 mt-4">
              {user.isAdmin ? (
                <Button
                  color="primary"
                  variant="flat"
                  onPress={() => navigate("/admin/manage-users")}
                >
                  View All Users
                </Button>
              ) : (
                <Button
                  color="warning"
                  variant="flat"
                  onPress={() => setIsModalOpen(true)}
                >
                  Upgrade Permissions
                </Button>
              )}
              <Button
                color="danger"
                variant="flat"
                onPress={() => {
                  logout();
                }}
              >
                Log Out
              </Button>
              <Button
                  color="danger"
                  onPress={() => setIsDeleteWarningOpen(true)}
              >
                 Delete Account
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      <OtpModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleUpgradeSubmit}
        isLoading={isUpgradePending}
      />
      <DeleteWarning
        isOpen={isDeleteWarningOpen}
        onClose={() => setIsDeleteWarningOpen(false)}
        onConfirm={handleDeleteAccount}
        isLoading={isDeleting}
      />
    </PageLayout>
  );
}
