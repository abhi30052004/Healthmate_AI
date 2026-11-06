import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, Mail, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "./AuthLayout";
import { Input, PasswordInput } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { ApiError, authService } from "../../services/authService";

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="p-3 rounded-lg bg-[var(--danger-bg)] border border-[var(--danger)] text-[var(--danger)] text-xs flex items-center gap-2"
    >
      <AlertCircle size={15} className="shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

const backToLogin = (
  <Link to="/login" className="text-xs text-[var(--green-800)] font-semibold hover:underline">
    Back to log in
  </Link>
);

/** Step 1: ask for a reset link by email. */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authService.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a link to choose a new one.">
      {sent ? (
        <div role="status" className="space-y-4 text-center" data-testid="reset-link-sent">
          <Mail className="mx-auto text-[var(--green-700)]" size={32} aria-hidden="true" />
          <p className="text-sm">
            If an account exists for <strong>{email.trim()}</strong>, a reset link is on its way. It works for 30 minutes
            and can be used once.
          </p>
          <p className="text-xs text-[var(--muted)]">Nothing arrived? Check spam, or try again in a minute.</p>
          {backToLogin}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate aria-label="Forgot password form">
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <Input
            label="Email Address"
            type="email"
            autoComplete="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
          />
          <Button type="submit" size="md" loading={loading} className="w-full" iconRight={<Mail size={16} />}>
            Email me a reset link
          </Button>
          <div className="text-center">{backToLogin}</div>
        </form>
      )}
    </AuthLayout>
  );
}

/** Step 2: the page the emailed link opens. */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[\d\W_]/.test(password)) {
      setError("Use at least 8 characters, with a letter and a number or symbol.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authService.resetPassword(token, password);
      toast.success("Password updated. Please log in with your new password.");
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Reset link incomplete">
        <div role="alert" className="space-y-4 text-center">
          <AlertCircle className="mx-auto text-[var(--warning)]" size={32} aria-hidden="true" />
          <p className="text-sm">This link is missing its token. Please use the link from your email, or request a new one.</p>
          <Link to="/forgot-password" className="text-xs text-[var(--green-800)] font-semibold hover:underline">
            Request a new link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="Pick something you don't use anywhere else.">
      <form onSubmit={submit} className="space-y-4" noValidate aria-label="Reset password form">
        {error && (
          <ErrorBanner>
            {error}{" "}
            {/invalid or has expired/i.test(error) && (
              <Link to="/forgot-password" className="underline font-semibold">
                Request a new link
              </Link>
            )}
          </ErrorBanner>
        )}
        <PasswordInput
          label="New password"
          autoComplete="new-password"
          required
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="At least 8 characters, with a letter and a number or symbol."
        />
        <PasswordInput
          label="Confirm new password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <Button type="submit" size="md" loading={loading} className="w-full" iconRight={<KeyRound size={16} />}>
          Update password
        </Button>
        <div className="text-center">{backToLogin}</div>
      </form>
    </AuthLayout>
  );
}
