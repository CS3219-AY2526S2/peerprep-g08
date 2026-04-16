import { useMutation } from "@tanstack/react-query";
import { deleteUser } from "../services/userService.ts";

export function useDeleteUser() {
    return useMutation({
        mutationFn: (id: string) => deleteUser(id),
    });
}