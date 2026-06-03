import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, Shield, UserPlus, UserMinus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listProfiles, addUserRole, removeUserRole } from "@/lib/tasks.functions";
import { ROLES, ROLE_LABEL, type Role } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/usuarios")({
  component: UsuariosPage,
});

function UsuariosPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listProfiles);
  const addFn = useServerFn(addUserRole);
  const removeFn = useServerFn(removeUserRole);

  const { data, isLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: () => listFn(),
  });

  const addMut = useMutation({
    mutationFn: (v: { userId: string; role: Role }) => addFn({ data: v }),
    onSuccess: () => {
      toast.success("Papel atribuído");
      qc.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMut = useMutation({
    mutationFn: (v: { userId: string; role: Role }) => removeFn({ data: v }),
    onSuccess: () => {
      toast.success("Papel removido");
      qc.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const profiles = data?.profiles ?? [];
  const roles = data?.roles ?? [];

  const rolesByUser: Record<string, Role[]> = {};
  for (const r of roles) {
    const uid = r.user_id as string;
    if (!rolesByUser[uid]) rolesByUser[uid] = [];
    rolesByUser[uid].push(r.role as Role);
  }

  function handleAddRole(userId: string, role: string) {
    if (!ROLES.includes(role as Role)) return;
    addMut.mutate({ userId, role: role as Role });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="text-sidebar-foreground hover:bg-sidebar-accent">
            <Link to="/dashboard">
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <h1 className="text-lg font-semibold tracking-tight">Gerenciar Usuários</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : profiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado.</p>
        ) : (
          <div className="space-y-4">
            {profiles.map((p) => {
              const uid = p.id as string;
              const userRoles = rolesByUser[uid] ?? [];
              const missing = ROLES.filter((r) => !userRoles.includes(r));
              return (
                <div
                  key={uid}
                  className="rounded-lg border bg-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <p className="font-medium">{p.display_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{uid}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {userRoles.length === 0 && (
                        <span className="text-xs text-muted-foreground">Sem papéis</span>
                      )}
                      {userRoles.map((r) => (
                        <Badge key={r} variant="secondary" className="gap-1">
                          {ROLE_LABEL[r]}
                          <button
                            type="button"
                            onClick={() => removeMut.mutate({ userId: uid, role: r })}
                            className="ml-0.5 hover:text-destructive"
                            title="Remover papel"
                          >
                            <UserMinus className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {missing.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Select onValueChange={(val) => handleAddRole(uid, val)}>
                        <SelectTrigger className="w-44 text-sm">
                          <UserPlus className="h-3.5 w-3.5 mr-1" />
                          <SelectValue placeholder="Adicionar papel" />
                        </SelectTrigger>
                        <SelectContent>
                          {missing.map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
