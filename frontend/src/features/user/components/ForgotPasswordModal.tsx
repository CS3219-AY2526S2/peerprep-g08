import { useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input } from "@heroui/react";
import { sendPasswordResetOtp, resetPassword } from "../api/auth";
import { getErrorMessage } from "../../../utils/error-handler";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "email" | "reset";

export default function ForgotPasswordModal({ isOpen, onClose, onSuccess }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleClose = () => {
    setStep("email");
    setEmail("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    onClose();
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetOtp(email.trim());
      setStep("reset");
    } catch (err) {
      setError(getErrorMessage(err) || "Failed to send reset code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError(null);
    try {
      await sendPasswordResetOtp(email.trim());
    } catch (err) {
      setError(getErrorMessage(err) || "Failed to resend reset code.");
    } finally {
      setIsResending(false);
    }
  };

  const handleResetPassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!otp.trim() || otp.length < 6) {
      setError("Please enter the 6-digit code sent to your email.");
      return;
    }
    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsLoading(true);
    try {
      await resetPassword(email.trim(), otp.trim(), newPassword);
      handleClose();
      onSuccess();
    } catch (err) {
      setError(getErrorMessage(err) || "Failed to reset password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} placement="center">
      <ModalContent>
        {step === "email" ? (
          <form onSubmit={handleSendOtp}>
            <ModalHeader>Forgot Password</ModalHeader>
            <ModalBody>
              <p className="text-sm text-gray-500 mb-2">
                Enter the email address linked to your account and we'll send you a reset code.
              </p>
              <Input
                label="Email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onValueChange={setEmail}
                variant="bordered"
                autoFocus
                errorMessage={error}
                isInvalid={!!error}
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button color="warning" type="submit" isLoading={isLoading} className="text-white font-semibold">
                Send Code
              </Button>
            </ModalFooter>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            <ModalHeader>Reset Password</ModalHeader>
            <ModalBody className="flex flex-col gap-3">
              <p className="text-sm text-gray-500">
                We sent a 6-digit code to <span className="font-semibold">{email}</span>. Enter it below along with your new password.
              </p>
              <Input
                label="OTP Code"
                placeholder="Enter 6-digit code"
                value={otp}
                onValueChange={setOtp}
                variant="bordered"
                maxLength={6}
                autoFocus
              />
              <Input
                label="New Password"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onValueChange={setNewPassword}
                variant="bordered"
              />
              <Input
                label="Confirm Password"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onValueChange={setConfirmPassword}
                variant="bordered"
                errorMessage={error}
                isInvalid={!!error}
              />
              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending || isLoading}
                  className="text-xs text-orange-500 hover:underline disabled:opacity-50"
                >
                  {isResending ? "Resending..." : "Didn't receive a code? Resend"}
                </button>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={handleClose} disabled={isLoading || isResending}>
                Cancel
              </Button>
              <Button color="warning" type="submit" isLoading={isLoading} disabled={isResending} className="text-white font-semibold">
                Reset Password
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
}
