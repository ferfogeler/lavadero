"use client";
import { SessionProvider } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

function AdminNav() {
  const path = usePathname();
  const links = [
    { href: "/admin", label: "📅 Turnos" },
    { href: "/admin/caja", label: "💰 Caja" },
    { href: "/admin/configuracion/lavado", label: "⚙️ Precios" },
    { href: "/admin/conceptos", label: "🏷️ Conceptos" },
    { href: "/admin/configuracion/general", label: "🔧 General" },
    { href: "/admin/arqueo", label: "📊 Arqueo" },
    { href: "/admin/mensual", label: "📋 Mensual" },
  ];
  return (
    <nav className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-1 overflow-x-auto">
          <span className="font-bold mr-3 shrink-0">🚿 Admin</span>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                path === l.href ? "bg-blue-600" : "hover:bg-gray-700"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-gray-400 hover:text-white text-sm transition shrink-0 ml-2"
        >
          Salir →
        </button>
      </div>
    </nav>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-gray-50">
        <AdminNav />
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </div>
    </SessionProvider>
  );
}
