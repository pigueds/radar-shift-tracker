import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AREA_LABEL, IMPACT_LABEL, PRIORITY_CLASS, PRIORITY_LABEL,
  STATUS_CLASS, STATUS_LABEL, TURNO_LABEL,
  type Status,
} from "@/lib/domain";
import type { Database } from "@/integrations/supabase/types";

export type Task = Database["public"]["Tables"]["tasks"]["Row"];

export function TaskCard({
  task,
  isHerdada,
  canEdit,
  canChangeStatus,
  onChangeStatus,
  onEdit,
  onDelete,
  isVencidaVisual,
}: {
  task: Task;
  isHerdada: boolean;
  canEdit: boolean;
  canChangeStatus: boolean;
  onChangeStatus: (s: Status) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isVencidaVisual: boolean;
}) {
  const status: Status = isVencidaVisual ? "vencida" : task.status;
  return (
    <Card
      className={[
        "border-l-4 transition-shadow hover:shadow-md",
        status === "vencida" ? "border-l-destructive bg-destructive/5" :
        status === "concluida" ? "border-l-success" :
        status === "em_andamento" ? "border-l-info" :
        status === "nao_concluida" ? "border-l-warning" :
        "border-l-muted-foreground/30",
      ].join(" ")}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <Badge className={PRIORITY_CLASS[task.prioridade]}>{PRIORITY_LABEL[task.prioridade]}</Badge>
            <Badge variant="outline" className={STATUS_CLASS[status]}>{STATUS_LABEL[status]}</Badge>
            {isHerdada && (
              <Badge variant="outline" className="border-warning/40 text-warning-foreground bg-warning/10 gap-1">
                <History className="h-3 w-3" /> Herdada de {format(new Date(task.task_date + "T00:00"), "dd/MM", { locale: ptBR })}
              </Badge>
            )}
          </div>
          {canEdit && (
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          )}
        </div>

        <p className="text-sm font-medium leading-snug">{task.description}</p>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <div><dt className="inline font-medium text-foreground/70">Área: </dt><dd className="inline">{AREA_LABEL[task.area]}</dd></div>
          <div><dt className="inline font-medium text-foreground/70">Turno: </dt><dd className="inline">{TURNO_LABEL[task.turno]}</dd></div>
          <div><dt className="inline font-medium text-foreground/70">Resp.: </dt><dd className="inline">{task.responsavel || "—"}</dd></div>
          <div><dt className="inline font-medium text-foreground/70">Impacto: </dt><dd className="inline">{IMPACT_LABEL[task.impacto]}</dd></div>
        </dl>

        {task.observacao && (
          <div className="text-xs bg-muted/60 border rounded-md p-2">
            <span className="font-medium">Obs.:</span> {task.observacao}
          </div>
        )}

        {canChangeStatus && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {(["pendente", "em_andamento", "concluida", "nao_concluida"] as Status[]).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={task.status === s ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => onChangeStatus(s)}
              >
                {STATUS_LABEL[s]}
              </Button>
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground/70 pt-1 border-t">
          Atualizado em {format(new Date(task.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
        </p>
      </CardContent>
    </Card>
  );
}
