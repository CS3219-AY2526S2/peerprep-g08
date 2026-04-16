import { useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input } from "@heroui/react";
import { getErrorMessage } from "../../../utils/error-handler";

interface EmailOtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (otp: string) => Promise<void>;
  onResend?: () => Promise<void>;
  isLoading?: boolean;
  email: string;
}

export default function EmailOtpModal({
  isOpen,
  onClose,
  onSubmit,
  onResend,
  isLoading = false,
  email,
}: EmailOtpModalProps) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!otp.trim() || otp.length < 6) {
      setError("Please enter a valid 6-digit code.");
      return;
    }

    try {
      await onSubmit(otp.trim());
      setOtp(""); // Clear on success
    } catch (err) {
      setError(getErrorMessage(err) || "Failed to verify OTP.");
    }
  };

  const handleResend = async () => {
    if (!onResend) return;
    setIsResending(true);
    setError(null);
    try {
      await onResend();
      // Maybe show a success indicator?
    } catch (err) {
      setError(getErrorMessage(err) || "Failed to resend OTP.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} placement="center">
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader className="flex flex-col gap-1">Verify Your Email</ModalHeader>
          <ModalBody>
            <p className="text-sm text-gray-500 mb-2">
              We've sent a 6-digit verification code to <span className="font-semibold">{email}</span>.
            </p>
            <Input
              label="OTP Code"
              placeholder="Enter 6-digit code"
              value={otp}
              onValueChange={setOtp}
              variant="bordered"
              maxLength={6}
              errorMessage={error}
              isInvalid={!!error}
              autoFocus
            />
            {onResend && (
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
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onClose} disabled={isLoading || isResending}>
              Cancel
            </Button>
            <Button color="warning" type="submit" isLoading={isLoading} disabled={isResending} className="text-white font-semibold">
              Verify
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
