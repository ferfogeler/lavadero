"use client";
import { Suspense, useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Spinner } from "@/components/Spinner";

function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/empleado";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    if (res?.ok) {
      window.location.href = callbackUrl;
    } else {
      setError("Usuario o contraseña incorrectos");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="usuario"
          autoComplete="username"
          required
          className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          className="w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {error && <p className="text-red-600 text-sm text-center">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-3 font-semibold transition"
      >
        {loading ? <Spinner size="sm" /> : "Ingresar"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  const [cfg, setCfg] = useState<Record<string, string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("cfg_general");
        if (cached) return JSON.parse(cached);
      } catch { /* noop */ }
    }
    return {};
  });

  useEffect(() => {
    fetch("/api/configuracion/general")
      .then((r) => r.json())
      .then((data) => {
        setCfg(data);
        try { localStorage.setItem("cfg_general", JSON.stringify(data)); } catch { /* noop */ }
      });
  }, []);

  const nombre = cfg.nombre_negocio || "GarageUno";
  const logo   = cfg.logo_base64 || "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={nombre} className="h-20 w-auto object-contain mx-auto mb-3" />
          ) : (
            <div className="text-5xl mb-3">🏎️</div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{nombre}</h1>
          <p className="text-gray-500 text-sm mt-1">Panel de gestión</p>
        </div>
        <Suspense fallback={<Spinner />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
