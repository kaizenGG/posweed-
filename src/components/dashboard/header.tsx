"use client";

import { useState } from "react";
import { Menu, Bell, ChevronDown, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import { UserRole } from "@prisma/client";

interface HeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: UserRole;
  };
}

export default function Header({ user }: HeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  return (
    <header className="bg-white border-b border-gray-200 py-4 px-6 flex items-center justify-between">
      <div className="flex items-center md:hidden">
        <button
          type="button"
          className="text-gray-500 hover:text-gray-600 focus:outline-none"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      <div className="ml-auto flex items-center">
        <button
          type="button"
          className="p-1 rounded-full text-gray-500 hover:text-gray-600 focus:outline-none mr-4"
        >
          <span className="sr-only">Ver notificaciones</span>
          <Bell className="h-6 w-6" />
        </button>

        <div className="relative">
          <button
            type="button"
            className="flex items-center space-x-3 focus:outline-none"
            onClick={toggleUserMenu}
          >
            <div className="flex-shrink-0">
              {user.image ? (
                <Image
                  className="h-8 w-8 rounded-full"
                  src={user.image}
                  alt={user.name || ""}
                  width={32}
                  height={32}
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                  {user.name ? user.name.charAt(0) : "U"}
                </div>
              )}
            </div>
            <div className="hidden md:flex md:items-center md:space-x-2">
              <div className="text-sm font-medium text-gray-700">
                {user.name || "Usuario"}
              </div>
              <div className="text-xs text-gray-500">
                {user.role === "ADMIN" ? "Administrador" : "Usuario"}
              </div>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </div>
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 py-1 bg-white rounded-md shadow-lg z-10 border border-gray-200">
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
} 