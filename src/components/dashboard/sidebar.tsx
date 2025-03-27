"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store, LayoutDashboard, ShoppingCart, Users, Settings } from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Store, label: "Tiendas", href: "/dashboard/stores" },
  { icon: ShoppingCart, label: "Productos", href: "/dashboard/products" },
  { icon: Users, label: "Usuarios", href: "/dashboard/users" },
  { icon: Settings, label: "Configuración", href: "/dashboard/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex md:flex-col">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-indigo-600 flex items-center">
          <Store className="mr-2" />
          PosWeed
        </h1>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center p-2 rounded-md transition-colors ${
                    isActive
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t text-xs text-gray-500">
        <p>PosWeed v1.0.0</p>
      </div>
    </aside>
  );
} 