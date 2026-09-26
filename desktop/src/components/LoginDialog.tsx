import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

type LoginDialogProps = {
  open: boolean;
  onClose: () => void;
};

export default function LoginDialog({ open, onClose }: LoginDialogProps) {
  const { login, verifyTwoFactor } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [isEmailOtp, setIsEmailOtp] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPassword("");
      setCode("");
      setError(null);
      setRequiresTwoFactor(false);
    }
  }, [open]);

  if (!open) return null;

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await login(username, password);
      if (response.requires2fa) {
        setIsEmailOtp(
          response.type2fa.some((type) => type.toLowerCase().includes("email")),
        );
        setRequiresTwoFactor(true);
        return;
      }
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await verifyTwoFactor(code, isEmailOtp);
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Two-factor verification failed",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <h2 className="text-xl font-bold">
          {requiresTwoFactor ? "Two-factor authentication" : "Sign in to VRChat"}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          {requiresTwoFactor
            ? `Enter the ${isEmailOtp ? "email" : "authenticator"} verification code.`
            : "Sign in to view friends in instances and send self-invites."}
        </p>

        {requiresTwoFactor ? (
          <form className="mt-5 space-y-4" onSubmit={handleVerify}>
            <input
              autoFocus
              autoComplete="one-time-code"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-blue-500"
              onChange={(event) => setCode(event.target.value)}
              placeholder="Verification code"
              value={code}
            />
            <DialogActions
              disabled={isSubmitting || !code}
              isSubmitting={isSubmitting}
              onClose={onClose}
              submitLabel="Verify"
            />
          </form>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={handleLogin}>
            <input
              autoFocus
              autoComplete="username"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-blue-500"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Username or email"
              value={username}
            />
            <input
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:border-blue-500"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              type="password"
              value={password}
            />
            <DialogActions
              disabled={isSubmitting || !username || !password}
              isSubmitting={isSubmitting}
              onClose={onClose}
              submitLabel="Sign in"
            />
          </form>
        )}

        {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
      </div>
    </div>
  );
}

function DialogActions({
  disabled,
  isSubmitting,
  onClose,
  submitLabel,
}: {
  disabled: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  submitLabel: string;
}) {
  return (
    <div className="flex justify-end gap-3">
      <button
        className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
        onClick={onClose}
        type="button"
      >
        Cancel
      </button>
      <button
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        type="submit"
      >
        {isSubmitting ? "Please wait..." : submitLabel}
      </button>
    </div>
  );
}
