import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * A custom mutation hook for upgrading the current user to Admin status.
 * * @description
 * This hook sends a PATCH request with a verification code to the upgrade endpoint.
 * On success, it triggers a background refetch to ensure the UI and client state stays
 * in sync with the server's database state.
 * * @returns {UseMutationResult} An object containing:
 * - `mutate`: The function to trigger the upgrade (accepts `code: string`, the OTP)
 * - `isPending`: Boolean indicating if the upgrade request is currently in flight
 * - `error`: The error object containing the API's failure message
 * - `isSuccess`: Boolean indicating if the upgrade was successful
 */
export const useUpgradeToAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${import.meta.env.VITE_USER_API_URL}/users/upgrade`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to upgrade permissions");
      }

      return result.data;
    },
    onSuccess: () => {
      // refetch updated user profile from db
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
  });
};
