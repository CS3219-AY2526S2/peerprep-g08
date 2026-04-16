import { useState } from "react";

interface OtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (code: string) => void;
  isLoading?: boolean;
}

export default function OtpModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: OtpModalProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: Event | React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);

    if (!code.trim()) {
      setError("Please enter a code.");
      return;
    }

    try {
      await onSubmit(code.trim());
      setCode(""); // Clear on success
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit code.");
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white w-full max-w-sm p-10 border border-gray-200 rounded-xl shadow-lg transition-transform hover:-translate-y-1 hover:shadow-xl">
        <h3 className="mb-6 text-center font-semibold text-2xl text-gray-800">
          Enter Admin Code
        </h3>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col text-sm font-medium text-gray-700">
            OTP Code
            <input
              className="mt-2 px-3 py-2.5 border border-gray-300 rounded-lg text-sm transition-all focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter 8-character OTP code"
              disabled={isLoading}
              autoFocus
            />
          </label>
          {error && <p className="text-red-500 text-sm -mt-2">{error}</p>}
          <div className="flex justify-end gap-3 mt-2">
            <button
              type="button"
              className="flex-1 py-2.5 bg-gray-100 text-gray-800 rounded-lg font-semibold transition-all hover:bg-gray-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => {
                setError(null);
                setCode("");
                onClose();
              }}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg font-semibold transition-all hover:bg-orange-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
