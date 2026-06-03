import { Check, History, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AREA_LABEL, IMPACT_LABEL, PRIORITY_LABEL, STATUS_LABEL, TURNO_LABEL,
  type Status,
} from "@/lib/domain";
import type { Task } from "./TaskCard";

export function TaskRow({
  index,
  task,
  isHerdada,
  canEdit,
  canChangeStatus,
  onChangeStatus,
  onEdit,
  onDelete,
  isVencidaVisual,
}: {
  index: number;
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
  const [open, setOpen] = useState(false);

  const isConcluida = status === "concluida";
  const isNaoConcluida = status === "nao_concluida";
  const isVencida = status === "vencida";
  const isEmAndamento = status === "em_andamento";

  const rowClasses = [
    "flex items-center gap-3 px-3 py-2 border-b last:border-b-0 transition-colors",
    isConcluida ? "bg-success/10 text-success" :
    isNaoConcluida ? "bg-warning/10" :
    isVencida ? "bg-destructive/10" :
    isEmAndamento ? "bg-info/5" :
    "hover:bg-muted/40",
  ].join(" ");

  return (
    <li className="list-none">
      <div className={rowClasses}>
        <span className="text-xs font-semibold text-muted-foreground w-6 shrink-0 tabular-nums">
          {index}.
        </span>

        <p className={`flex-1 text-sm leading-snug ${isConcluida ? "font-medium" : ""}`}>
          <span>{task.description}</span>
          <span className="text-muted-foreground"> — {AREA_LABEL[task.area]} — </span>
          <span className={isConcluida ? "font-semibold" : ""}>
            {STATUS_LABEL[status]}
          </span>
          {isConcluida && (
            <Check className="inline-block h-4 w-4 ml-1 text-success align-text-bottom" />
          )}
          {isHerdada && (
            <Badge variant="outline" className="ml-2 border-warning/40 text-warning-foreground bg-warning/10 gap-1 text-[10px] py-0">
              <History className="h-3 w-3" /> Herdada
            </Badge>
          )}
        </p>

        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Recolher" : "Expandir"}
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {canEdit && (
          <div className="flex gap-1 shrink-0">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit} aria-label="Editar">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onDelete} aria-label="Excluir">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {open && (
        <div className="px-3 py-3 bg-muted/30 border-b text-xs space-y-2">
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-1">
            <div><dt className="inline font-medium text-foreground/70">Resp.: </dt><dd className="inline">{task.responsavel || "—"}</dd></div>
            <div><dt className="inline font-medium text-foreground/70">Turno: </dt><dd className="inline">{TURNO_LABEL[task.turno]}</dd></div>
            <div><dt className="inline font-medium text-foreground/70">Prioridade: </dt><dd className="inline">{PRIORITY_LABEL[task.prioridade]}</dd></div>
            <div><dt className="inline font-medium text-foreground/70">Impacto: </dt><dd className="inline">{IMPACT_LABEL[task.impacto]}</dd></div>
          </dl>
          {task.observacao && (
            <div className="bg-background border rounded-md p-2">
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
          <p className="text-[10px] text-muted-foreground/70 pt-1">
            Atualizado em {format(new Date(task.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
          </p>
        </div>
      )}
    </li>
  );
}
