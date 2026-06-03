export const AREAS = ["termica", "eletrica", "eta"] as const;
export type Area = (typeof AREAS)[number];
export const AREA_LABEL: Record<Area, string> = {
  termica: "Térmica",
  eletrica: "Elétrica",
  eta: "ETA",
};

export const PRIORITIES = ["critica", "alta", "media", "baixa"] as const;
export type Priority = (typeof PRIORITIES)[number];
export const PRIORITY_LABEL: Record<Priority, string> = {
  critica: "Crítica",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};
export const PRIORITY_CLASS: Record<Priority, string> = {
  critica: "bg-destructive text-destructive-foreground",
  alta: "bg-warning text-warning-foreground",
  media: "bg-info text-info-foreground",
  baixa: "bg-muted text-muted-foreground",
};

export const IMPACTS = [
  "seguranca",
  "meio_ambiente",
  "confiabilidade",
  "producao",
  "eficiencia_energetica",
  "rotina_operacional",
] as const;
export type Impact = (typeof IMPACTS)[number];
export const IMPACT_LABEL: Record<Impact, string> = {
  seguranca: "Segurança",
  meio_ambiente: "Meio ambiente",
  confiabilidade: "Confiabilidade",
  producao: "Produção",
  eficiencia_energetica: "Eficiência energética",
  rotina_operacional: "Rotina operacional",
};

export const STATUSES = [
  "pendente",
  "em_andamento",
  "concluida",
  "nao_concluida",
  "vencida",
] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_LABEL: Record<Status, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  nao_concluida: "Não concluída",
  vencida: "Vencida",
};
export const STATUS_CLASS: Record<Status, string> = {
  pendente: "bg-muted text-foreground border-border",
  em_andamento: "bg-info/15 text-info border-info/30",
  concluida: "bg-success/15 text-success border-success/30",
  nao_concluida: "bg-warning/15 text-warning-foreground border-warning/40",
  vencida: "bg-destructive/15 text-destructive border-destructive/40",
};

export const TURNOS = ["manha", "tarde", "noite", "integral"] as const;
export type Turno = (typeof TURNOS)[number];
export const TURNO_LABEL: Record<Turno, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
  integral: "Integral",
};

export const ROLES = ["admin", "operador", "gerente"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  operador: "Operador",
  gerente: "Gerente",
};

export const PRAZO_TURNO = "19:30";

export function semaforoColor(pct: number): "success" | "warning" | "destructive" {
  if (pct >= 100) return "success";
  if (pct >= 80) return "warning";
  return "destructive";
}
