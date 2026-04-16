import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Snippet,
} from "@heroui/react";
import { useState } from "react";
import { useNavigate } from "react-router";
import PageLayout from "../../../shared/components/PageLayout";
import { getErrorMessage } from "../../../utils/error-handler";

export default function GenerateOTP() {
  const [otp, setOtp] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/");
  };

  const handleGenerate = async () => {
    setMessage("");
    setError(false);
    setOtp(null);

    const token = localStorage.getItem("token");

    if (!token) {
      setError(true);
      setMessage("You must be logged in.");
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_USER_API_URL}/users/admin-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to generate OTP.");
      }

      setOtp(data.data.code);
      setMessage("Admin code generated successfully!");
    } catch (error) {
      console.error("Error:", error);
      setError(true);
      setMessage(getErrorMessage(error) || "Something went wrong");
    }
  };

  return (
    <PageLayout>
      <div className="min-h-screen flex flex-col justify-center items-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="flex flex-col items-center">
            <h3 className="text-xl font-bold">Generate Admin OTP</h3>
          </CardHeader>

          <CardBody className="px-6 flex flex-col gap-4">
            {message && !otp && (
              <div
                className={`text-sm text-center border ${
                  error ? "text-danger" : "text-success"
                }`}
              >
                {message}
              </div>
            )}

            {otp && (
              <div className="flex flex-col items-center justify-center gap-2">
                <p className="text-sm font-medium">Your Admin Code:</p>
                <Snippet symbol="" color="success" size="lg" variant="flat">
                  {otp}
                </Snippet>
              </div>
            )}

            <Button color="warning" className="w-full" onPress={handleGenerate}>
              {otp ? "Generate New Code" : "Generate Code"}
            </Button>
          </CardBody>

          <CardFooter className="px-6">
            <Button
              variant="flat"
              color="default"
              className="w-full"
              onPress={handleBack}
            >
              Back to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    </PageLayout>
  );
}
