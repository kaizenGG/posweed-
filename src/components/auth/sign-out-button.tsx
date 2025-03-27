"use client";

import { signOut } from "next-auth/react";

interface SignOutButtonProps {
  children?: React.ReactNode;
}

export function SignOutButton({ children }: SignOutButtonProps) {
  const handleSignOut = () => {
    signOut({ callbackUrl: "/login-admin" });
  };

  return (
    <button 
      onClick={handleSignOut}
      className="focus:outline-none"
      aria-label="Cerrar sesión"
    >
      {children || "Cerrar sesión"}
    </button>
  );
} 