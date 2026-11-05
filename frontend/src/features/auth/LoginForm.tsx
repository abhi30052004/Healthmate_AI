import React, { useState } from "react";
import { motion, useAnimationControls } from "motion/react";
import { LogIn, AlertCircle, Check } from "lucide-react";
import { Input, PasswordInput } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { shake } from "../../components/motion/variants";
import { authService, ApiError, type LoginResponse } from "../../services/authService";

export interface LoginFormProps {
  onSuccess: (data: LoginResponse) => void;
  onNavigateRegister: () => void;
  onNavigateForgotPassword?: () => void;
  prefilledEmail?: string;
}

export function LoginForm({
  onSuccess,
  onNavigateRegister,
  onNavigateForgotPassword,
  prefilledEmail = "",
}: LoginFormProps) {
  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null);

  const controls = useAnimationControls();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter both your email and password.");
      controls.start(shake);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await authService.login({
        email: email.trim(),
        password,
      });

      setIsSuccess(true);
      setTimeout(() => {
        onSuccess(res);
      }, 500);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setError("Too many login attempts. Please wait 60 seconds before trying again.");
          setLockoutSeconds(60);
        } else {
          setError("Invalid email address or password.");
        }
      } else {
        setError("Unable to connect to service. Please try again.");
      }
      controls.start(shake);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      animate={controls}
      className="space-y-4"
      noValidate
      aria-label="Patient login form"
    >
      {/* Error live region */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-3 rounded-lg bg-[var(--danger-bg)] border border-[var(--danger)] text-[var(--danger)] text-xs flex items-center gap-2"
        >
          <AlertCircle size={15} className="shrink-0" aria-hidden="true" />
          <span>{error}</span>
          {lockoutSeconds !== null && <span className="font-bold">({lockoutSeconds}s)</span>}
        </div>
      )}

      {/* Email Input */}
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

      {/* Password Input */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label htmlFor="login-password" className="block text-sm font-medium text-[var(--text)]">
            Password <span className="text-[var(--danger)]">*</span>
          </label>
          {onNavigateForgotPassword && (
            <button
              type="button"
              onClick={onNavigateForgotPassword}
              className="text-xs text-[var(--green-700)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus)] rounded"
            >
              Forgot password?
            </button>
          )}
        </div>
        <PasswordInput
          id="login-password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••••"
        />
      </div>

      {/* Remember Device Switch */}
      <div className="flex items-center gap-2 pt-1">
        <input
          id="remember-device"
          type="checkbox"
          checked={rememberDevice}
          onChange={(e) => setRememberDevice(e.target.checked)}
          className="w-4 h-4 rounded text-[var(--green-800)] border-[var(--border)] focus:shadow-[var(--focus)] cursor-pointer"
        />
        <label htmlFor="remember-device" className="text-xs text-[var(--muted)] cursor-pointer select-none">
          Remember this device for 30 days
        </label>
      </div>

      {/* Primary Submit Button */}
      <Button
        type="submit"
        variant={isSuccess ? "verified" : "primary"}
        size="md"
        loading={loading}
        disabled={isSuccess || lockoutSeconds !== null}
        className="w-full mt-2"
        iconRight={isSuccess ? <Check size={16} /> : <LogIn size={16} />}
      >
        {isSuccess ? "Signed In Successfully" : "Sign In to Workspace"}
      </Button>

      {/* Register Switch Link */}
      <div className="text-center pt-2">
        <p className="text-xs text-[var(--muted)]">
          Don't have a personal health account?{" "}
          <button
            type="button"
            onClick={onNavigateRegister}
            className="text-[var(--green-800)] font-semibold hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus)] rounded"
          >
            Create free account
          </button>
        </p>
      </div>
    </motion.form>
  );
}
