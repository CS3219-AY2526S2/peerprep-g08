import { useState } from "react";

interface GenerateOtpResponse {
    message: string;
    data: {
        code: string;
    };
}

export function useGenerateOtp() {
    const [loadingOtp, setLoadingOtp] = useState<boolean>(false);

    const generateAdminOtp = async () => {
        try {
            setLoadingOtp(true);

            const token = localStorage.getItem("token");

            const res = await fetch(`${import.meta.env.VITE_USER_API_URL}/users/admin-code`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            const data: GenerateOtpResponse = await res.json();

            if (!res.ok) {
                throw new Error(data.message);
            }

            // Show OTP in alert
            alert(`Admin OTP: ${data.data.code}`);
        } catch (err) {
            if (err instanceof Error) {
                alert(`Error: ${err.message}`);
            } else {
                alert("Unknown error occurred");
            }
        } finally {
            setLoadingOtp(false);
        }
    };

    return {
        loadingOtp,
        generateAdminOtp,
    };
}