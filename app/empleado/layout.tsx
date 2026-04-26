"use client";
import { SessionProvider } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

function Nav() {
  const path = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const links = [
    { href: "/empleado", label: "📅 Turnos" },
    { href: "/empleado/caja", label: "💰 Caja" },
    { href: "/empleado/clientes", label: "👥 Clientes" },
    ...(isAdmin ? [{ href: "/admin", label: "⚙️ Admin" }] : []),
  ];

  return (
    <nav className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          <span className="font-bold mr-4 shrink-0">🚿 Recepción</span>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                path === l.href ? "bg-blue-600" : "hover:bg-gray-700"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-gray-400 hover:text-white text-sm transition"
        >
          Salir →
        </button>
      </div>
    </nav>
  );
}

export default function EmpleadoLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </div>
    </SessionProvider>
  );
}
