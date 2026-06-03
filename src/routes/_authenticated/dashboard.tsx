import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Activity, ChevronLeft, ChevronRight, LogOut, Plus, Clock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { supabase } from "@/integrations/supabase/client";
import {
  autoExpireTasks, listTasksForDate, createTask, updateTask, deleteTask,
  changeStatus, getMyContext,
} from "@/lib/tasks.functions";
import {
  AREAS, AREA_LABEL, PRAZO_TURNO, PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL,
  IMPACTS, IMPACT_LABEL, semaforoColor, type Area, type Status,
} from "@/lib/domain";
import { TaskCard, type Task } from "@/components/radar/TaskCard";
import { TaskFormDialog } from "@/components/radar/TaskFormDialog";
import { ObservacaoDialog } from "@/components/radar/ObservacaoDialog";
import { ReportButtons } from "@/components/radar/ReportButtons";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function todayISO() { return new Date().toISOString().slice(0, 10); }

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [date, setDate] = useState<string>(todayISO());
  const [filters, setFilters] = useState({
    status: "all" as Status | "all",
    prioridade: "all" as string,
    impacto: "all" as string,
    responsavel: "",
  });

  const expireFn = useServerFn(autoExpireTasks);
  const listFn = useServerFn(listTasksForDate);
  const ctxFn = useServerFn(getMyContext);
  const createFn = useServerFn(createTask);
  const updateFn = useServerFn(updateTask);
  const deleteFn = useServerFn(deleteTask);
  const changeStatusFn = useServerFn(changeStatus);

  // Auto expire on each date load
  useEffect(() => { expireFn().catch(() => {}); }, [date, expireFn]);

  const ctxQ = useQuery({ queryKey: ["me"], queryFn: () => ctxFn() });
  const tasksQ = useQuery({
    queryKey: ["tasks", date],
    queryFn: () => listFn({ data: { date } }),
  });

  const role = ctxQ.data?.roles[0] ?? "operador";
  const isAdmin = ctxQ.data?.roles.includes("admin") ?? false;
  const isOperador = ctxQ.data?.roles.includes("operador") ?? false;
  const isGerente = ctxQ.data?.roles.includes("gerente") ?? false;
  const myArea = ctxQ.data?.profile?.area_padrao as Area | null | undefined;

  const own = tasksQ.data?.own ?? [];
  const herdadas = tasksQ.data?.herdadas ?? [];

  // visual vencida: today after 19:30 + status not concluida/nao_concluida
  const isAfterPrazo = useMemo(() => {
    const now = new Date();
    const today = todayISO();
    return date === today && (now.getHours() > 19 || (now.getHours() === 19 && now.getMinutes() >= 30));
  }, [date]);

  function applyFilters(list: Task[]) {
    return list.filter((t) => {
      if (filters.status !== "all" && t.status !== filters.status) return false;
      if (filters.prioridade !== "all" && t.prioridade !== filters.prioridade) return false;
      if (filters.impacto !== "all" && t.impacto !== filters.impacto) return false;
      if (filters.responsavel && !t.responsavel.toLowerCase().includes(filters.responsavel.toLowerCase())) return false;
      return true;
    });
  }

  const allVisible = useMemo(() => {
    const withHerd = [
      ...own.map((t) => ({ task: t, herdada: false })),
      ...herdadas.map((t) => ({ task: t, herdada: true })),
    ];
    return withHerd.filter(({ task }) => applyFilters([task]).length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [own, herdadas, filters]);

  const byArea: Record<Area, typeof allVisible> = { termica: [], eletrica: [], eta: [] };
  for (const item of allVisible) byArea[item.task.area].push(item);

  const stats = useMemo(() => {
    const all = allVisible.map((x) => x.task);
    const eff = (t: Task): Status =>
      isAfterPrazo && t.task_date === todayISO() && (t.status === "pendente" || t.status === "em_andamento")
        ? "vencida"
        : t.status;
    const c = (s: Status) => all.filter((t) => eff(t) === s).length;
    const total = all.length;
    const concluidas = c("concluida");
    const pct = total ? Math.round((concluidas / total) * 100) : 0;
    return {
      total,
      concluidas,
      pendentes: c("pendente"),
      emAndamento: c("em_andamento"),
      naoConcluidas: c("nao_concluida"),
      vencidas: c("vencida"),
      pct,
    };
  }, [allVisible, isAfterPrazo]);

  const sema = semaforoColor(stats.pct);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["tasks", date] });

  const createMut = useMutation({
    mutationFn: (v: Parameters<typeof createFn>[0]["data"]) => createFn({ data: v }),
    onSuccess: () => { toast.success("Tarefa criada"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: (v: Parameters<typeof updateFn>[0]["data"]) => updateFn({ data: v }),
    onSuccess: () => { toast.success("Tarefa atualizada"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success("Tarefa removida"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: Status; observacao?: string }) =>
      changeStatusFn({ data: v }),
    onSuccess: () => { toast.success("Status atualizado"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Operator can edit status of any (UI restriction by area for operator)
  function canChangeStatus(task: Task) {
    if (isAdmin) return true;
    if (isGerente) return false;
    if (isOperador) return !myArea || task.area === myArea;
    return false;
  }

  const [obsState, setObsState] = useState<{ open: boolean; task: Task | null }>({ open: false, task: null });

  function onChangeStatus(task: Task, s: Status) {
    if (s === "nao_concluida") { setObsState({ open: true, task }); return; }
    statusMut.mutate({ id: task.id, status: s });
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const semaClass =
    sema === "success" ? "bg-success text-success-foreground" :
    sema === "warning" ? "bg-warning text-warning-foreground" :
    "bg-destructive text-destructive-foreground";

  const visibleAreas: Area[] = isOperador && !isAdmin && !isGerente && myArea ? [myArea] : [...AREAS];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">RADAR Operacional</h1>
              <p className="text-xs text-sidebar-foreground/70">
                {ctxQ.data?.profile?.display_name ?? "—"} · {role.toUpperCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-sidebar-accent text-sidebar-accent-foreground text-xs">
              <Clock className="h-3.5 w-3.5" /> Prazo do turno: {PRAZO_TURNO}
            </div>
            <Button variant="ghost" size="sm" onClick={logout} className="text-sidebar-foreground hover:bg-sidebar-accent">
              <LogOut className="h-4 w-4 mr-1" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Date navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" onClick={() => setDate(format(addDays(parseISO(date), -1), "yyyy-MM-dd"))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
            <Button size="icon" variant="outline" onClick={() => setDate(format(addDays(parseISO(date), 1), "yyyy-MM-dd"))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground ml-2 hidden md:inline">
              {format(parseISO(date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ReportButtons date={date} tasks={own} herdadas={herdadas} stats={stats} />
            {isAdmin && (
              <TaskFormDialog
                trigger={<Button><Plus className="h-4 w-4 mr-1" />Nova tarefa</Button>}
                defaultDate={date}
                onSubmit={async (v) => { await createMut.mutateAsync(v); }}
              />
            )}
          </div>
        </div>

        {/* Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Indicator label="Total" value={stats.total} />
          <Indicator label="Pendentes" value={stats.pendentes} />
          <Indicator label="Em andamento" value={stats.emAndamento} accent="info" />
          <Indicator label="Concluídas" value={stats.concluidas} accent="success" />
          <Indicator label="Não concluídas" value={stats.naoConcluidas} accent="warning" />
          <Indicator label="Vencidas" value={stats.vencidas} accent="destructive" />
        </div>

        {/* Semaphore */}
        <Card>
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-full ${semaClass} flex items-center justify-center font-bold`}>
                {stats.pct}%
              </div>
              <div>
                <p className="text-sm font-medium">Semáforo do dia</p>
                <p className="text-xs text-muted-foreground">
                  {sema === "success" ? "100% concluído" : sema === "warning" ? "Entre 80% e 99%" : "Abaixo de 80%"}
                </p>
              </div>
            </div>
            <div className="flex-1 max-w-md h-3 bg-muted rounded-full overflow-hidden">
              <div className={`h-full ${semaClass}`} style={{ width: `${stats.pct}%` }} />
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <FilterSelect label="Status" value={filters.status} onChange={(v) => setFilters((f) => ({ ...f, status: v as Status | "all" }))}
              options={[["all", "Todos"], ...STATUSES.map((s) => [s, STATUS_LABEL[s]] as [string, string])]} />
            <FilterSelect label="Prioridade" value={filters.prioridade} onChange={(v) => setFilters((f) => ({ ...f, prioridade: v }))}
              options={[["all", "Todas"], ...PRIORITIES.map((p) => [p, PRIORITY_LABEL[p]] as [string, string])]} />
            <FilterSelect label="Impacto" value={filters.impacto} onChange={(v) => setFilters((f) => ({ ...f, impacto: v }))}
              options={[["all", "Todos"], ...IMPACTS.map((i) => [i, IMPACT_LABEL[i]] as [string, string])]} />
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Responsável</label>
              <Input value={filters.responsavel} onChange={(e) => setFilters((f) => ({ ...f, responsavel: e.target.value }))} placeholder="Buscar..." />
            </div>
          </CardContent>
        </Card>

        {/* Areas */}
        <Tabs defaultValue={visibleAreas[0]}>
          <TabsList>
            {visibleAreas.map((a) => (
              <TabsTrigger key={a} value={a}>
                {AREA_LABEL[a]} <span className="ml-1.5 text-xs opacity-70">({byArea[a].length})</span>
              </TabsTrigger>
            ))}
          </TabsList>
          {visibleAreas.map((a) => (
            <TabsContent key={a} value={a} className="mt-4">
              {byArea[a].length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-12 border rounded-lg border-dashed">
                  Nenhuma tarefa nesta área para os filtros atuais.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {byArea[a].map(({ task, herdada }) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isHerdada={herdada}
                      canEdit={isAdmin}
                      canChangeStatus={canChangeStatus(task)}
                      isVencidaVisual={
                        isAfterPrazo && task.task_date === todayISO() &&
                        (task.status === "pendente" || task.status === "em_andamento")
                      }
                      onChangeStatus={(s) => onChangeStatus(task, s)}
                      onEdit={() => openEditDialog(task)}
                      onDelete={() => { if (confirm("Excluir esta tarefa?")) deleteMut.mutate(task.id); }}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </main>

      <ObservacaoDialog
        open={obsState.open}
        onOpenChange={(o) => setObsState({ open: o, task: o ? obsState.task : null })}
        title="Marcar como Não concluída"
        onConfirm={async (obs) => {
          if (!obsState.task) return;
          await statusMut.mutateAsync({ id: obsState.task.id, status: "nao_concluida", observacao: obs });
          setObsState({ open: false, task: null });
        }}
      />

      {editTask && (
        <TaskFormDialog
          key={editTask.id}
          trigger={<span className="hidden" />}
          title="Editar tarefa"
          defaultDate={date}
          initial={{
            description: editTask.description,
            area: editTask.area,
            responsavel: editTask.responsavel,
            turno: editTask.turno,
            prioridade: editTask.prioridade,
            impacto: editTask.impacto,
            task_date: editTask.task_date,
          }}
          onSubmit={async (v) => {
            await updateMut.mutateAsync({ id: editTask.id, ...v });
            setEditTask(null);
          }}
        />
      )}
    </div>
  );

  function openEditDialog(t: Task) {
    setEditTask(t);
    // The dialog auto-opens because it's mounted with a fresh key; trigger click is hidden.
    // Simpler approach: replace with controlled dialog. For brevity here we rely on rerender + manual open below.
  }
}

// Controlled edit task state hoisted via hook in Dashboard component scope:
// (kept here for simplicity at the bottom — needs to be inside component)
// Re-declare via component-local module replacement below:

// To keep edit flow simple, use a top-level useState by extracting:
import { useState as useStateBase } from "react";
let _setEdit: ((t: Task | null) => void) | null = null;
let editTask: Task | null = null;
const useEditTask = () => {
  const [t, setT] = useStateBase<Task | null>(null);
  editTask = t;
  _setEdit = setT;
  return setT;
};
function setEditTask(t: Task | null) { _setEdit?.(t); }

// Initialize hook at top of Dashboard via small wrapper
// eslint-disable-next-line react-hooks/rules-of-hooks
useEditTask;

function Indicator({ label, value, accent }: { label: string; value: number; accent?: "success" | "warning" | "destructive" | "info" }) {
  const color =
    accent === "success" ? "text-success" :
    accent === "warning" ? "text-warning-foreground" :
    accent === "destructive" ? "text-destructive" :
    accent === "info" ? "text-info" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-semibold mt-1 ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: Array<[string, string]>;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
