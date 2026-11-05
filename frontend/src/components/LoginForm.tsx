import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

interface LoginFormProps {
  onSwitchToRegister: () => void;
  successMessage?: string | null;
  initialEmail?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm({
  onSwitchToRegister,
  successMessage,
  initialEmail = "",
}: LoginFormProps) {
  const { login, isLoading, sessionError, clearSessionError } = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronize initialEmail if provided after registration
  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  const validateClientSide = (): string | null => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      return "Please enter your email address.";
    }
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return "Please enter a valid email address (e.g., doctor@example.com).";
    }
    if (!password) {
      return "Please enter your password.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    clearSessionError();

    const validationErr = validateClientSide();
    if (validationErr) {
      setError(validationErr);
      return;
    }

    try {
      await login({ email: email.trim(), password });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred during login. Please try again.");
      }
    }
  };

  return (
    <div className="auth-form-card">
      <div className="auth-header">
        <h2>Welcome Back</h2>
        <p>Sign in to access your clinical records and health timeline</p>
      </div>

      {/* Success banner (e.g. account created) */}
      {successMessage && (
        <div className="alert alert-success" role="alert" id="login-success-alert">
          <svg className="alert-icon" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Session expiration warning banner */}
      {sessionError && !error && (
        <div className="alert alert-warning" role="alert" id="login-session-alert">
          <svg className="alert-icon" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{sessionError}</span>
        </div>
      )}

      {/* Login error banner (invalid credentials, network down, etc.) */}
      {error && (
        <div className="alert alert-error" role="alert" id="login-error-alert">
          <svg className="alert-icon" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="auth-form">
        <div className="form-group">
          <label htmlFor="login-email">Email Address</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="form-input"
            placeholder="doctor@hospital.org"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="login-password">Password</label>
          <div className="password-input-wrapper">
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              disabled={isLoading}
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              disabled={isLoading}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={isLoading}
          id="login-submit-btn"
        >
          {isLoading ? (
            <span className="spinner-text">
              <span className="spinner" />
              Signing In…
            </span>
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      <div className="auth-footer">
        <p>
          Don't have an account?{" "}
          <button
            type="button"
            className="link-button"
            onClick={onSwitchToRegister}
            disabled={isLoading}
          >
            Create an account
          </button>
        </p>
      </div>
    </div>
  );
}
