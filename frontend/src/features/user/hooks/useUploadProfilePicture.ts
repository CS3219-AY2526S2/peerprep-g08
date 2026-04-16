import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadProfilePicture } from "../api/auth";

export const useUploadProfilePicture = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, file }: { userId: string; file: File }) =>
      uploadProfilePicture(userId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
  });
};
