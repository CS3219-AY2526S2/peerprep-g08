import type { User } from "../types/User";

const API_URL = import.meta.env.VITE_USER_API_URL;

function authHeaders() {
    const token = localStorage.getItem("token");
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
}

export async function getAllUsers(): Promise<User[]> {
    const res = await fetch(`${API_URL}/users`, {
        headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to fetch users");
    return data.data;
}

export async function getUserProfile(): Promise<User> {
    const res = await fetch(`${API_URL}/auth/me`, {
        headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to fetch profile");
    return data.data;
}

export async function deleteUser(id: string): Promise<void> {
    const res = await fetch(`${API_URL}/users/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to delete user");
}

export async function updateUserPrivilege(id: string, isAdmin: boolean): Promise<User> {
    const res = await fetch(`${API_URL}/users/${id}/privilege`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ isAdmin }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to update privilege");
    return data.data;
}
