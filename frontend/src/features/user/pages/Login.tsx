import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Input, Button, Card, CardBody, CardHeader, Form } from "@heroui/react";
import { loginUser, verifyOtp, sendOtp } from "../api/auth";
import EmailOtpModal from "../components/EmailOtpModal";
import ForgotPasswordModal from "../components/ForgotPasswordModal";
import { getErrorMessage } from "../../../utils/error-handler";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear state so it doesn't persist on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const data = await loginUser(email, password);
      localStorage.setItem("token", data.data.accessToken);
      navigate("/");
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      if (errorMsg.includes("not verified")) {
        // Trigger resend OTP and show modal
        await sendOtp(email);
        setIsOtpModalOpen(true);
      } else {
        setErrorMessage(errorMsg || "Something went wrong");
      }
    }
  };

  const handleOtpSubmit = async (otp: string) => {
    setIsVerifying(true);
    try {
      await verifyOtp(email, otp);
      setIsOtpModalOpen(false);
      setSuccessMessage("Email verified successfully! You can now log in.");
    } finally {
      setIsVerifying(false);
    }
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
          <h3 className="text-xl font-semibold">Login to PeerPrep</h3>
        </CardHeader>
        <CardBody className="px-8 py-6">
          <Form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Input
              errorMessage="Please enter a valid email"
              label="Email"
              name="email"
              type="email"
              value={email}
              onValueChange={setEmail}
              placeholder="m@example.com"
              variant="bordered"
            />
            <div className="flex flex-col gap-1 w-full">
              <Input
                label="Password"
                type="password"
                value={password}
                onValueChange={setPassword}
                placeholder="Enter Password"
                variant="bordered"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(true)}
                  className="text-xs text-orange-500 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            {successMessage && (
              <div className="text-center text-sm text-green-600 font-medium">
                {successMessage}
              </div>
            )}

            {errorMessage && (
              <div className="text-center text-sm text-red-500">
                {errorMessage}
              </div>
            )}

            <Button
              type="submit"
              color="warning"
              className="w-full mt-2 text-white font-semibold"
            >
              Log In
            </Button>

            <p className="text-center text-sm text-gray-500">
              Don't have an account?{" "}
              <Link to="/register" className="text-orange-500 hover:underline">
                Register
              </Link>
            </p>
          </Form>
        </CardBody>
      </Card>
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        onSuccess={() => setSuccessMessage("Password reset successfully. You may now log in.")}
      />
      <EmailOtpModal
        isOpen={isOtpModalOpen}
        onClose={() => setIsOtpModalOpen(false)}
        onSubmit={handleOtpSubmit}
        onResend={() => sendOtp(email)}
        isLoading={isVerifying}
        email={email}
      />
    </div>
  );
}
