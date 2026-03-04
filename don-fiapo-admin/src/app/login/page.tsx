"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Save session data from server response
        localStorage.setItem("don_admin_key", data.apiKey);
        localStorage.setItem("admin_session", JSON.stringify(data.user));

        router.push("/dashboard");
      } else {
        setError(data.error || "Falha na autenticação");
        setIsLoading(false);
      }
    } catch (err) {
      setError("Erro de conexão com o servidor");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md space-y-8 bg-neutral-900 p-8 rounded-xl border border-neutral-800 shadow-2xl shadow-black">
        <div className="text-center">
          <div className="inline-flex p-3 rounded-full bg-yellow-500/10 mb-4 ring-1 ring-yellow-500/50">
            <Image src="/logo.png" alt="Don Fiapo" width={48} height={48} className="rounded-full" />
          </div>
          <h1 className="text-2xl font-bold text-yellow-500">Don Fiapo Admin</h1>
          <p className="text-neutral-400 mt-2">Acesso Restrito. Pessoal Autorizado Apenas.</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/50 rounded-md text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-neutral-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-md p-3 focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all placeholder:text-neutral-700"
              placeholder="admin@donfiapo.io"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-neutral-300">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-md p-3 pr-10 focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all placeholder:text-neutral-700"
                placeholder="••••••••"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              "w-full bg-yellow-500 text-black font-bold py-3 rounded-md transition-all shadow-lg shadow-yellow-500/20",
              isLoading
                ? "opacity-70 cursor-not-allowed"
                : "hover:bg-yellow-400 hover:shadow-yellow-500/30"
            )}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Autenticando...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Lock className="w-5 h-5" />
                Entrar
              </span>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-neutral-600 flex items-center justify-center gap-1 mt-6">
          <Lock className="w-3 h-3" />
          Conexão Segura • Rede Don Fiapo
        </div>
      </div>
    </div>
  );
}
