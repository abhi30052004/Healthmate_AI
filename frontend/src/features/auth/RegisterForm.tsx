import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, Mail, Lock, ShieldCheck, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { Input, PasswordInput } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { AnimatedCheck } from "../../components/motion/MotionHelpers";
import { authService, ApiError, type LoginResponse } from "../../services/authService";

export interface RegisterSuccessDetails {
  /** Present when the automatic sign-in after registration succeeded. */
  login: LoginResponse | null;
  profileName: string;
  managingFor: "self" | "parent" | "child" | "other";
}

export interface RegisterFormProps {
  onSuccess: (email: string, details?: RegisterSuccessDetails) => void;
  onNavigateLogin: () => void;
}

export function RegisterForm({ onSuccess, onNavigateLogin }: RegisterFormProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Account
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 2: First Profile
  const [managingFor, setManagingFor] = useState<"self" | "parent" | "child" | "other">("self");
  const [profileName, setProfileName] = useState("");

  // Step 3: Consent
  const [consentGranted, setConsentGranted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  // Password strength check
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const strengthScore = [hasMinLength, hasNumber, hasSpecial].filter(Boolean).length;

  const handleNextStep1 = () => {
    if (!name.trim()) {
      setError("Please provide your full name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please provide a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    if (!profileName) setProfileName(name.trim());
    setStep(2);
  };

  const handleNextStep2 = () => {
    if (!profileName.trim()) {
      setError("Please enter the patient profile display name.");
      return;
    }
    setError(null);
    setStep(3);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentGranted) {
      setError("You must acknowledge the clinical safety terms and data consent.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await authService.register({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      // Sign in straight away so the new user lands in their workspace.
      let login: LoginResponse | null = null;
      try {
        login = await authService.login({ email: email.trim(), password });
      } catch {
        login = null; // fall back to the manual sign-in screen
      }

      setIsDone(true);
      setTimeout(() => {
        onSuccess(email.trim(), {
          login,
          profileName: profileName.trim() || name.trim(),
          managingFor,
        });
      }, 1200);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message || "Registration failed. This email may already be in use.");
      } else {
        setError("Unable to connect to the server. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (isDone) {
    return (
      <div className="text-center py-6 space-y-4">
        <AnimatedCheck />
        <h3 className="text-xl font-display font-bold text-[var(--green-900)]">
          Account Created Successfully!
        </h3>
        <p className="text-xs text-[var(--muted)]">
          Opening your workspace...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 3-Step Progress Indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-[var(--muted)]">
          <span className={step >= 1 ? "text-[var(--green-800)]" : ""}>1. Account</span>
          <span className={step >= 2 ? "text-[var(--green-800)]" : ""}>2. First Profile</span>
          <span className={step >= 3 ? "text-[var(--green-800)]" : ""}>3. Consent</span>
        </div>
        <div className="h-1.5 w-full bg-[var(--border)] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[var(--green-600)]"
            animate={{ width: `${(step / 3) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3 rounded-lg bg-[var(--danger-bg)] border border-[var(--danger)] text-[var(--danger)] text-xs">
          {error}
        </div>
      )}

      {/* STEP 1: Account */}
      {step === 1 && (
        <div className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dr. Abhijit Bhunia"
          />

          <Input
            label="Email Address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
          />

          <div className="space-y-1.5">
            <PasswordInput
              label="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />

            {/* Password strength bar */}
            {password.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="h-1 w-full bg-[var(--border)] rounded-full overflow-hidden flex gap-1">
                  <div
                    className={`h-full flex-1 rounded-full ${
                      strengthScore >= 1 ? "bg-[var(--warning)]" : "bg-transparent"
                    }`}
                  />
                  <div
                    className={`h-full flex-1 rounded-full ${
                      strengthScore >= 2 ? "bg-[var(--green-500)]" : "bg-transparent"
                    }`}
                  />
                  <div
                    className={`h-full flex-1 rounded-full ${
                      strengthScore >= 3 ? "bg-[var(--green-600)]" : "bg-transparent"
                    }`}
                  />
                </div>
                <div className="flex gap-3 text-[10px] text-[var(--muted)]">
                  <span className={hasMinLength ? "text-[var(--green-600)] font-semibold" : ""}>
                    • 8+ chars
                  </span>
                  <span className={hasNumber ? "text-[var(--green-600)] font-semibold" : ""}>
                    • Has number
                  </span>
                  <span className={hasSpecial ? "text-[var(--green-600)] font-semibold" : ""}>
                    • Special symbol
                  </span>
                </div>
              </div>
            )}
          </div>

          <PasswordInput
            label="Confirm Password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
          />

          <Button
            type="button"
            variant="primary"
            onClick={handleNextStep1}
            className="w-full mt-2"
            iconRight={<ArrowRight size={15} />}
          >
            Continue to Patient Profile
          </Button>
        </div>
      )}

      {/* STEP 2: First Profile */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--text)]">
              Who are you organizing records for?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: "self", label: "Myself (Self)" },
                  { id: "parent", label: "My Parent" },
                  { id: "child", label: "My Child" },
                  { id: "other", label: "Other Dependent" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setManagingFor(opt.id)}
                  className={`p-3 rounded-lg text-left text-xs border font-medium transition-colors ${
                    managingFor === opt.id
                      ? "bg-[var(--green-50)] border-[var(--green-700)] text-[var(--green-900)] font-semibold shadow-1"
                      : "bg-white border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg)]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Profile Display Name"
            type="text"
            required
            autoFocus
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            hint="This name appears on doctor visit summaries and timelines."
          />

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              iconLeft={<ArrowLeft size={15} />}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleNextStep2}
              className="flex-1"
              iconRight={<ArrowRight size={15} />}
            >
              Review Consent
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Consent */}
      {step === 3 && (
        <form onSubmit={handleFinalSubmit} className="space-y-4">
          <div className="p-3.5 rounded-lg bg-[var(--green-50)] border border-[var(--green-100)] text-xs text-[var(--text)] space-y-2">
            <p className="font-semibold text-[var(--green-900)]">Privacy & Medical Responsibility:</p>
            <ul className="space-y-1.5 text-[var(--muted)] list-disc pl-4">
              <li>Your health records remain strictly confidential and isolated to authorized family members.</li>
              <li>HealthMate AI provides patient record navigation; it never diagnoses or prescribes medication.</li>
              <li>Always discuss treatment decisions directly with your qualified medical doctor.</li>
            </ul>
          </div>

          <div className="flex items-start gap-2.5 pt-2">
            <input
              id="consent-check"
              type="checkbox"
              required
              checked={consentGranted}
              onChange={(e) => setConsentGranted(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-[var(--green-800)] border-[var(--border)] focus:shadow-[var(--focus)] cursor-pointer"
            />
            <label htmlFor="consent-check" className="text-xs text-[var(--text)] cursor-pointer select-none leading-relaxed">
              I agree to the HealthMate AI privacy policy and acknowledge the clinical decision support limitations.
            </label>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(2)}
              iconLeft={<ArrowLeft size={15} />}
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="verified"
              loading={loading}
              disabled={!consentGranted}
              className="flex-1"
              iconRight={<Check size={16} />}
            >
              Create Account
            </Button>
          </div>
        </form>
      )}

      {/* Back to sign in */}
      <div className="text-center pt-2">
        <p className="text-xs text-[var(--muted)]">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onNavigateLogin}
            className="text-[var(--green-800)] font-semibold hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus)] rounded"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

