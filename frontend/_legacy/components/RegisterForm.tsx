import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

interface RegisterFormProps {
  onSwitchToLogin: (registeredEmail?: string) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const { register, isLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateClientSide = (): string | null => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return "Please enter your full name.";
    }
    if (trimmedName.length > 255) {
      return "Name cannot exceed 255 characters.";
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return "Please enter your email address.";
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return "Please enter a valid email address (e.g., doctor@example.com).";
    }

    if (!password) {
      return "Please enter a password.";
    }
    if (password.length < 8) {
      return "Password must be at least 8 characters long.";
    }
    if (password.length > 128) {
      return "Password must not exceed 128 characters.";
    }
    if (!/[a-zA-Z]/.test(password)) {
      return "Password must contain at least one letter.";
    }
    if (!/[0-9]/.test(password) && !/[^a-zA-Z0-9]/.test(password)) {
      return "Password must contain at least one digit or special character.";
    }

    if (!confirmPassword) {
      return "Please confirm your password.";
    }
    if (password !== confirmPassword) {
      return "Passwords do not match.";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationErr = validateClientSide();
    if (validationErr) {
      setError(validationErr);
      return;
    }

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      // Switch to login with email pre-populated and success feedback
      onSwitchToLogin(email.trim());
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Registration failed. Please check your information and try again.");
      }
    }
  };

  return (
    <div className="auth-form-card">
      <div className="auth-header">
        <h2>Create Account</h2>
        <p>Register for HealthMate AI to explore and track health records</p>
      </div>

      {error && (
        <div className="alert alert-error" role="alert" id="register-error-alert">
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
          <label htmlFor="reg-name">Full Name</label>
          <input
            id="reg-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            className="form-input"
            placeholder="Dr. Jane Doe"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="reg-email">Email Address</label>
          <input
            id="reg-email"
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
          <label htmlFor="reg-password">Password</label>
          <div className="password-input-wrapper">
            <input
              id="reg-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
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
          <span className="form-hint">
            Minimum 8 characters with at least one letter and one number or symbol.
          </span>
        </div>

        <div className="form-group">
          <label htmlFor="reg-confirm-password">Confirm Password</label>
          <div className="password-input-wrapper">
            <input
              id="reg-confirm-password"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              className="form-input"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (error) setError(null);
              }}
              disabled={isLoading}
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={
                showConfirmPassword ? "Hide confirm password" : "Show confirm password"
              }
              disabled={isLoading}
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={isLoading}
          id="register-submit-btn"
        >
          {isLoading ? (
            <span className="spinner-text">
              <span className="spinner" />
              Creating Account…
            </span>
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      <div className="auth-footer">
        <p>
          Already have an account?{" "}
          <button
            type="button"
            className="link-button"
            onClick={() => onSwitchToLogin()}
            disabled={isLoading}
          >
            Sign in instead
          </button>
        </p>
      </div>
    </div>
  );
}
