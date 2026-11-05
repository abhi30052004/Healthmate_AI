import React from "react";
import { FlipAuthCard } from "./auth/FlipAuthCard";

interface AuthCardProps {
  initialMode?: "login" | "register";
  onModeChange?: (mode: "login" | "register") => void;
}

export function AuthCard({ initialMode = "login", onModeChange }: AuthCardProps) {
  return <FlipAuthCard initialMode={initialMode} onModeChange={onModeChange} />;
}
