import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "../types/User";

/**
 * A custom hook that fetches the current user's profile data from the auth API.
 * * @description
 * This hook uses TanStack Query to fetch and cache user profile information.
 * It only executes if a JWT token is present in localStorage.
 * The data is considered stale after 5 minutes by default.
 * * @returns {UseQueryResult<User, Error>}
 * An object containing:
 * - `data`: The user profile object (or null if not loaded)
 * - `isLoading`: Boolean indicating if the initial fetch is in progress
 * - `isError`: Boolean indicating if the fetch failed
 * - `error`: The error object containing the API error message
 */
export const useUserProfile = () => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) return null;

      const response = await fetch(
        `${import.meta.env.VITE_USER_API_URL}/auth/me`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.status != 200) {
        localStorage.removeItem("token");
        queryClient.setQueryData<User | null>(["userProfile"], null);
        throw new Error("Session expired, please log in again.");
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to fetch profile");
      }

      return result.data;
    },
    enabled: !!localStorage.getItem("token"),
    retry: false,
  });
};
