import { useState, useEffect, useCallback } from "react";
import type { User } from "../types/User";
import * as userService from "../services/userService";
import { getErrorMessage } from "../../../utils/error-handler";

export function useUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await userService.getAllUsers();
            setUsers(data);
        } catch (err) {
            setError(getErrorMessage(err) || "Failed to load users");
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch users when the hook mounts
    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const removeUser = async (id: string) => {
        try {
            await userService.deleteUser(id);
            // Update local state to remove the user without re-fetching
            setUsers((prev) => prev.filter((user) => user.id !== id));
        } catch (err) {
            alert(getErrorMessage(err) || "Failed to delete user");
        }
    };

    const togglePrivilege = async (id: string, isAdmin: boolean) => {
        try {
            const updatedUser = await userService.updateUserPrivilege(id, isAdmin);
            // Update local state with the new privilege
            setUsers((prev) =>
                prev.map((user) => (user.id === id ? { ...user, isAdmin: updatedUser.isAdmin } : user))
            );
        } catch (err) {
            alert(getErrorMessage(err) || "Failed to update privilege");
        }
    };

    return {
        users,
        loading,
        error,
        removeUser,
        togglePrivilege,
        refreshUsers: fetchUsers, // In case we need a manual refresh button later
    };
}
