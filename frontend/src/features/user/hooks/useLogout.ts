import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

export const useLogout = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const logout = async () => {
    localStorage.removeItem("token");
    queryClient.clear();
    navigate("/login", { replace: true });
  };

  return logout;
};
