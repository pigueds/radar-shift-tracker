import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  AREAS,
  IMPACTS,
  PRIORITIES,
  STATUSES,
  TURNOS,
  ROLES,
  type Status,
} from "./domain";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const taskInputSchema = z.object({
  task_date: dateSchema,
  area: z.enum(AREAS),
  description: z.string().min(1).max(500),
  responsavel: z.string().max(120).default(""),
  turno: z.enum(TURNOS).default("integral"),
  prioridade: z.enum(PRIORITIES).default("media"),
  impacto: z.enum(IMPACTS).default("rotina_operacional"),
});

// Auto-expire: any task whose date < today (in UTC date) OR date == today and now past 19:30 local
// and status in (pendente, em_andamento) becomes vencida.
export const autoExpireTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    // Past days: mark as vencida
    await supabase
      .from("tasks")
      .update({ status: "vencida" as Status })
      .lt("task_date", today)
      .in("status", ["pendente", "em_andamento"]);

    // Today after 19:30 local
    const hh = now.getHours();
    const mm = now.getMinutes();
    if (hh > 19 || (hh === 19 && mm >= 30)) {
      await supabase
        .from("tasks")
        .update({ status: "vencida" as Status })
        .eq("task_date", today)
        .in("status", ["pendente", "em_andamento"]);
    }
    return { ok: true };
  });

export const listTasksForDate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { date: string }) => z.object({ date: dateSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    // Active tasks: tasks scheduled for the date,
    // PLUS unresolved tasks from previous dates (herdadas)
    const { data: own, error: e1 } = await supabase
      .from("tasks")
      .select("*")
      .eq("task_date", data.date)
      .order("prioridade", { ascending: true })
      .order("created_at", { ascending: true });
    if (e1) throw new Error(e1.message);

    const { data: herdadas, error: e2 } = await supabase
      .from("tasks")
      .select("*")
      .lt("task_date", data.date)
      .in("status", ["pendente", "em_andamento", "nao_concluida", "vencida"])
      .order("task_date", { ascending: true });
    if (e2) throw new Error(e2.message);

    return { own: own ?? [], herdadas: herdadas ?? [] };
  });

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => taskInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("tasks").insert({
      ...data,
      status: "pendente" as Status,
      observacao: "",
      created_by: userId,
      updated_by: userId,
      original_date: data.task_date,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid() }).merge(taskInputSchema.partial()).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { id, ...rest } = data;
    const { error } = await supabase
      .from("tasks")
      .update({ ...rest, updated_by: userId })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("tasks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const changeStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(STATUSES),
        observacao: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.status === "nao_concluida" && !(data.observacao && data.observacao.trim())) {
      throw new Error("Observação obrigatória para tarefa não concluída.");
    }
    const patch = {
      status: data.status,
      updated_by: userId,
      ...(typeof data.observacao === "string" ? { observacao: data.observacao } : {}),
    };
    const { error } = await supabase.from("tasks").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
});

export const addUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), role: z.enum(ROLES) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId: callerId } = context;
    const { data: callerRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    if (!callerRoles?.some((r) => r.role === "admin")) {
      throw new Error("Apenas administradores podem gerenciar papéis.");
    }
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role })
      .select();
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), role: z.enum(ROLES) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId: callerId } = context;
    const { data: callerRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    if (!callerRoles?.some((r) => r.role === "admin")) {
      throw new Error("Apenas administradores podem gerenciar papéis.");
    }
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", data.role);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, display_name, area_padrao"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    return { profiles: profiles ?? [], roles: roles ?? [] };
  });

export const getMyContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    return {
      userId,
      profile,
      roles: (roles ?? []).map((r) => r.role) as Array<"admin" | "operador" | "gerente">,
    };
  });
