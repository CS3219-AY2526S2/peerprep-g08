import axios, { AxiosError } from "axios";

export const loginUser = async (email: string, password: string) => {
  try {
    const response = await axios.post(
      `${import.meta.env.VITE_USER_API_URL}/auth/login`,
      { email, password },
    );
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message: string }>;
    if (axiosError.response?.data) {
      throw new Error(axiosError.response.data.message || "Login failed");
    }
    throw new Error(axiosError.message || "An unexpected error occurred");
  }
};

export const registerUser = async (userData: {
  username: string;
  email: string;
  password: string;
  code?: string;
}) => {
  try {
    const response = await axios.post(
      `${import.meta.env.VITE_USER_API_URL}/users`,
      userData,
    );

    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message: string }>;
    if (axiosError.response?.data) {
      throw new Error(axiosError.response.data.message || "Registration failed");
    }
    throw new Error(axiosError.message || "An unexpected error occurred");
  }
};

export const getCurrentUser = async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No authentication token found");
  }

  try {
    const response = await axios.get(
      `${import.meta.env.VITE_USER_API_URL}/auth/me`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message: string }>;
    if (axiosError.response?.data) {
      throw new Error(axiosError.response.data.message || "Failed to fetch user data");
    }
    throw new Error(axiosError.message || "An unexpected error occurred");
  }
};

export const sendOtp = async (email: string) => {
  try {
    const response = await axios.post(
      `${import.meta.env.VITE_USER_API_URL}/auth/send-otp`,
      { email },
    );
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message: string }>;
    if (axiosError.response?.data) {
      throw new Error(axiosError.response.data.message || "Failed to send OTP");
    }
    throw new Error(axiosError.message || "An unexpected error occurred");
  }
};

export const verifyOtp = async (email: string, otp: string) => {
  try {
    const response = await axios.post(
      `${import.meta.env.VITE_USER_API_URL}/auth/verify-otp`,
      { email, otp },
    );
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message: string }>;
    if (axiosError.response?.data) {
      throw new Error(axiosError.response.data.message || "OTP verification failed");
    }
    throw new Error(axiosError.message || "An unexpected error occurred");
  }
};

export const sendPasswordResetOtp = async (email: string) => {
  try {
    const response = await axios.post(
      `${import.meta.env.VITE_USER_API_URL}/auth/forgot-password`,
      { email },
    );
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message: string }>;
    if (axiosError.response?.data) {
      throw new Error(axiosError.response.data.message || "Failed to send reset code");
    }
    throw new Error(axiosError.message || "An unexpected error occurred");
  }
};

export const uploadProfilePicture = async (userId: string, file: File) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  const formData = new FormData();
  formData.append("profilePicture", file);

  try {
    const response = await axios.patch(
      `${import.meta.env.VITE_USER_API_URL}/users/${userId}/profile-picture`,
      formData,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message: string }>;
    if (axiosError.response?.data) {
      throw new Error(axiosError.response.data.message || "Failed to upload profile picture");
    }
    throw new Error(axiosError.message || "An unexpected error occurred");
  }
};

export const resetPassword = async (email: string, otp: string, newPassword: string) => {
  try {
    const response = await axios.post(
      `${import.meta.env.VITE_USER_API_URL}/auth/reset-password`,
      { email, otp, newPassword },
    );
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message: string }>;
    if (axiosError.response?.data) {
      throw new Error(axiosError.response.data.message || "Failed to reset password");
    }
    throw new Error(axiosError.message || "An unexpected error occurred");
  }
};

