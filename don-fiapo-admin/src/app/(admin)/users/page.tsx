"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  Search,
  Shield,
  CheckCircle2,
  Loader2,
  Trash2,
  Edit2
} from "lucide-react";
import { getSession, hasPermission, USER_ROLES } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

export default function UsersPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "marketing",
    password: ""
  });

  const fetchUsers = async () => {
    const key = localStorage.getItem("don_admin_key") || "";
    try {
      const res = await fetch("/api/admin/users", {
        headers: { "x-admin-key": key },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } else if (res.status === 401) {
        router.push("/login");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => {
      const name = (user?.name || "").toLowerCase();
      const email = (user?.email || "").toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [users, searchTerm]);

  useEffect(() => {
    const currentSession = getSession();
    if (!currentSession) {
      router.push("/login");
      return;
    }
    if (!hasPermission(currentSession, "users") && !hasPermission(currentSession, "all")) {
      router.push("/dashboard?error=unauthorized");
      return;
    }
    setSession(currentSession);
    fetchUsers();
  }, [router]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const key = localStorage.getItem("don_admin_key") || "";
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": key,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setFormData({ name: "", email: "", role: "marketing", password: "" });
        fetchUsers();
        alert("Usuário adicionado com sucesso!");
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || "Falha ao adicionar usuário.");
      }
    } catch (error) {
      alert("Erro de conexão.");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleUserStatus = async (user: any) => {
    const newStatus = user.status === "active" ? "suspended" : "active";
    try {
      const key = localStorage.getItem("don_admin_key") || "";
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": key,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchUsers();
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este administrador?")) return;
    try {
      const key = localStorage.getItem("don_admin_key") || "";
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        headers: { "x-admin-key": key },
      });
      if (res.ok) fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  if (!session) return null;

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestão de Usuários</h1>
          <p className="text-neutral-400 mt-2">
            Controle de acessos e cargos da equipe administrativa
          </p>
        </div>
        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Novo Administrador
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl">
          <p className="text-neutral-400 text-sm mb-1">Total de Admins</p>
          <p className="text-3xl font-bold text-white">{users.length}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl">
          <p className="text-neutral-400 text-sm mb-1">Usuários Ativos</p>
          <p className="text-3xl font-bold text-green-500">{users.filter(u => u.status === "active").length}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl">
          <p className="text-neutral-400 text-sm mb-1">Suspensos</p>
          <p className="text-3xl font-bold text-red-500">{users.filter(u => u.status === "suspended").length}</p>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Equipe Administrativa</h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-yellow-500 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/50">
                <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">Usuário</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">Cargo</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">Status</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-neutral-400">Desde</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-neutral-400">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-yellow-500 mx-auto" />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-neutral-500 text-sm">
                    Nenhum administrador encontrado.
                  </td>
                </tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-yellow-500 font-bold">
                        {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-white">{user.name || "Sem nome"}</p>
                        <p className="text-xs text-neutral-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-neutral-300">
                        {USER_ROLES.find(r => r.id === user.role)?.name || user.role}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <button
                      onClick={() => toggleUserStatus(user)}
                      className={cn(
                        "px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider border",
                        user.status === "active"
                          ? "bg-green-500/10 text-green-400 border-green-500/50"
                          : "bg-red-500/10 text-red-400 border-red-500/50"
                      )}
                    >
                      {user.status === "active" ? "Ativo" : "Suspenso"}
                    </button>
                  </td>
                  <td className="py-4 px-6 text-neutral-400 text-sm">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-neutral-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD USER MODAL */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="bg-neutral-950 border-neutral-800 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Novo Administrador</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Adicione um novo membro à equipe e atribua um cargo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddUser}>
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  placeholder="Ex: João Silva"
                  className="bg-neutral-900 border-neutral-800"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email Corporativo</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="joao@donfiapo.io"
                  className="bg-neutral-900 border-neutral-800"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Cargo / Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(val) => setFormData({ ...formData, role: val })}
                >
                  <SelectTrigger className="bg-neutral-900 border-neutral-800">
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map(role => (
                      <SelectItem key={role.id} value={role.id}>
                        <div className="flex flex-col">
                          <span className="font-bold">{role.name}</span>
                          <span className="text-[10px] text-neutral-500 leading-tight">{role.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Senha Inicial</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 10 caracteres"
                  className="bg-neutral-900 border-neutral-800"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  minLength={10}
                  required
                />
                <p className="text-[11px] text-neutral-500">A senha é armazenada com hash no backend.</p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="submit"
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Confirmar Cadastro
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
