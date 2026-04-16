import { useGenerateOtp } from "../hooks/useGenerateOtp.ts";
import { useUsers } from "../hooks/useUsers";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../../shared/components/PageLayout";
import {
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Button, Chip
} from "@heroui/react";

export default function UserManagement() {
  const { users, loading, error, removeUser, togglePrivilege } = useUsers();
  const { loadingOtp, generateAdminOtp } = useGenerateOtp();
  const navigate = useNavigate();

  if (loading) return <p className="p-8 text-gray-500">Loading users...</p>;
  if (error) return <p className="p-8 text-red-500">Error: {error}</p>;

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">User Management</h2>
          <div className="flex gap-3">
            <Button color="warning" className="text-white" onPress={generateAdminOtp} isLoading={loadingOtp}>
              Generate Admin OTP
            </Button>
            <Button variant="bordered" onPress={() => navigate("/profile")}>
              Back to Profile
            </Button>
          </div>
        </div>

        <Table aria-label="Users table">
          <TableHeader>
            <TableColumn>USERNAME</TableColumn>
            <TableColumn>EMAIL</TableColumn>
            <TableColumn>ROLE</TableColumn>
            <TableColumn>ACTIONS</TableColumn>
          </TableHeader>
          <TableBody emptyContent="No users found.">
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip color={user.isAdmin ? "success" : "default"} variant="flat" size="sm">
                    {user.isAdmin ? "Admin" : "User"}
                  </Chip>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="flat"
                      color="warning"
                      onPress={() => togglePrivilege(user.id, !user.isAdmin)}
                    >
                      {user.isAdmin ? "Revoke Admin" : "Make Admin"}
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      color="danger"
                      onPress={() => {
                        if (window.confirm("Are you sure you want to delete this user?")) {
                          removeUser(user.id);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PageLayout>
  );
}
