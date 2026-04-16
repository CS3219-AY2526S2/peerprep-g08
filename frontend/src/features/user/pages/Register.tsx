import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Input, Button, Card, CardBody, CardHeader, Form } from "@heroui/react";
import { registerUser, verifyOtp, sendOtp } from "../api/auth";
import EmailOtpModal from "../components/EmailOtpModal";
import { getErrorMessage } from "../../../utils/error-handler";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");
    setIsRegistering(true);
    try {
      await registerUser({ username, email, password, code });
      // On success, show the OTP modal instead of logging in
      setIsOtpModalOpen(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error) || "Something went wrong");
      setIsRegistering(false);
    }
  };

  const handleOtpSubmit = async (otp: string) => {
    setIsVerifying(true);
    try {
      await verifyOtp(email, otp);
      setIsOtpModalOpen(false);
      // Redirect to login after successful verification
      navigate("/login", {
        state: { message: "Email verified successfully! You can now log in." }
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    await sendOtp(email);
  };

  return (
    <div
      className="min-h-screen flex justify-center items-center"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(255, 140, 0, 0.15), transparent 40%), radial-gradient(circle at bottom right, rgba(255, 165, 0, 0.12), transparent 40%), #ffffff",
      }}
    >
      <Card className="w-full max-w-[420px]" shadow="lg">
        <CardHeader className="flex justify-center pt-6 pb-0">
          <h3 className="text-xl font-semibold">Create PeerPrep Account</h3>
        </CardHeader>
        <CardBody className="px-8 py-6">
          <Form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Input
              label="Username"
              type="text"
              value={username}
              onValueChange={setUsername}
              placeholder="Username"
              variant="bordered"
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onValueChange={setEmail}
              placeholder="m@example.com"
              variant="bordered"
            />
            <Input
              label="Create Password"
              type="password"
              value={password}
              onValueChange={setPassword}
              placeholder="Enter Password"
              variant="bordered"
            />
            <Input
              label="Admin OTP (optional)"
              type="text"
              value={code}
              onValueChange={setCode}
              placeholder="Enter OTP"
              variant="bordered"
            />

            {errorMessage && (
              <div className="text-center text-sm text-red-500">
                {errorMessage}
              </div>
            )}

            <Button
              type="submit"
              color="warning"
              className="w-full mt-2 text-white font-semibold"
              isDisabled={isRegistering}
              isLoading={isRegistering}
            >
              {isRegistering ? "Registering..." : "Register"}
            </Button>
            <p className="text-center text-sm text-gray-500">
              Have an account?{" "}
              <Link to="/login" className="text-orange-500 hover:underline">
                Log in
              </Link>
            </p>
          </Form>
        </CardBody>
      </Card>
      <EmailOtpModal
        isOpen={isOtpModalOpen}
        onClose={() => {
          setIsOtpModalOpen(false);
          setIsRegistering(false);
        }}
        onSubmit={handleOtpSubmit}
        onResend={handleResendOtp}
        isLoading={isVerifying}
        email={email}
      />
    </div>
  );
}
