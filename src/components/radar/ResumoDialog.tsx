import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Copy, FileText, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AREAS, AREA_LABEL, STATUS_LABEL, type Area, type Status } from "@/lib/domain";
import type { Task } from "./TaskCard";

export function ResumoDialog({
  date,
  tasks,
  isAfterPrazo,
}: {
  date: string;
  tasks: Task[];
  isAfterPrazo: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const todayISO = new Date().toISOString().slice(0, 10);

  function effectiveStatus(t: Task): Status {
    if (isAfterPrazo && t.task_date === todayISO && (t.status === "pendente" || t.status === "em_andamento")) {
      return "vencida";
    }
    return t.status;
  }

  const human = format(new Date(date + "T00:00"), "dd/MM/yyyy", { locale: ptBR });

  const byArea = useMemo(() => {
    const map: Record<Area, Task[]> = { termica: [], eletrica: [], eta: [] };
    for (const t of tasks) map[t.area].push(t);
    return map;
  }, [tasks]);

  // Plain text version (for clipboard)
  const plainText = useMemo(() => {
    const lines: string[] = [];
    lines.push(`Ocorrências Relevantes TEU/UT de ${human}`);
    lines.push("");
    for (const a of AREAS) {
      lines.push(AREA_LABEL[a].toUpperCase());
      lines.push("");
      const arr = byArea[a];
      if (arr.length === 0) {
        lines.push("Sem ocorrências.");
      } else {
        for (const t of arr) {
          const st = STATUS_LABEL[effectiveStatus(t)];
          const desc = t.description.trim().replace(/\.$/, "");
          lines.push(`${desc}. ${st}.`);
          lines.push("");
        }
      }
      lines.push("");
    }
    return lines.join("\n").trimEnd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byArea, human, isAfterPrazo]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      toast.success("Resumo copiado para a área de transferência");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto manualmente.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-1" /> Resumo do dia
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Resumo do dia — {human}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto border rounded-md p-4 bg-muted/30 font-mono text-sm leading-relaxed whitespace-pre-wrap">
          <p className="font-sans font-medium mb-3 text-foreground">
            Ocorrências Relevantes TEU/UT de {human}
          </p>
          {AREAS.map((a) => (
            <div key={a} className="mb-4">
              <p className="font-sans font-bold uppercase mb-2 text-foreground">
                {AREA_LABEL[a]}
              </p>
              {byArea[a].length === 0 ? (
                <p className="text-muted-foreground italic">Sem ocorrências.</p>
              ) : (
                byArea[a].map((t) => {
                  const st = STATUS_LABEL[effectiveStatus(t)];
                  const desc = t.description.trim().replace(/\.$/, "");
                  return (
                    <p key={t.id} className="mb-2">
                      {desc}. {st}.
                    </p>
                  );
                })
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
          <Button onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            {copied ? "Copiado!" : "Copiar resumo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
