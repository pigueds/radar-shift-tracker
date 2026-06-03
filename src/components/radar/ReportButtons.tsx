import { FileDown, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  AREA_LABEL, IMPACT_LABEL, PRIORITY_LABEL, STATUS_LABEL, TURNO_LABEL,
  type Status,
} from "@/lib/domain";
import type { Task } from "./TaskCard";

export function ReportButtons({
  date, tasks, herdadas, stats,
}: {
  date: string;
  tasks: Task[];
  herdadas: Task[];
  stats: { total: number; concluidas: number; pendentes: number; emAndamento: number; naoConcluidas: number; vencidas: number; pct: number };
}) {
  const human = format(new Date(date + "T00:00"), "dd/MM/yyyy", { locale: ptBR });

  function rowsFor(arr: Task[]) {
    return arr.map((t) => [
      AREA_LABEL[t.area],
      t.description,
      t.responsavel || "—",
      TURNO_LABEL[t.turno],
      PRIORITY_LABEL[t.prioridade],
      IMPACT_LABEL[t.impacto],
      STATUS_LABEL[(t.status as Status)],
      t.observacao || "—",
      format(new Date(t.updated_at), "dd/MM HH:mm"),
    ]);
  }
  const header = ["Área", "Descrição", "Resp.", "Turno", "Prioridade", "Impacto", "Status", "Obs.", "Atualizado"];

  function exportPdf() {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("Relatório RADAR Operacional", 14, 16);
    doc.setFontSize(11);
    doc.text(`Data: ${human}`, 14, 24);
    doc.text(
      `Total: ${stats.total}  •  Concluídas: ${stats.concluidas}  •  Pendentes: ${stats.pendentes}  •  Em andamento: ${stats.emAndamento}  •  Não concluídas: ${stats.naoConcluidas}  •  Vencidas: ${stats.vencidas}  •  ${stats.pct}%`,
      14, 31,
    );
    autoTable(doc, {
      startY: 38,
      head: [header],
      body: rowsFor(tasks),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [40, 60, 110] },
    });
    if (herdadas.length) {
      const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
      doc.setFontSize(12);
      doc.text("Pendências Herdadas", 14, finalY + 10);
      autoTable(doc, {
        startY: finalY + 14,
        head: [header],
        body: rowsFor(herdadas),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [180, 80, 40] },
      });
    }
    doc.save(`radar-${date}.pdf`);
  }

  function exportXlsx() {
    const wb = XLSX.utils.book_new();
    const summary = [
      ["Relatório RADAR Operacional"],
      ["Data", human],
      ["Total", stats.total],
      ["Concluídas", stats.concluidas],
      ["Pendentes", stats.pendentes],
      ["Em andamento", stats.emAndamento],
      ["Não concluídas", stats.naoConcluidas],
      ["Vencidas", stats.vencidas],
      ["% conclusão", stats.pct],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Resumo");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, ...rowsFor(tasks)]), "Tarefas");
    if (herdadas.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, ...rowsFor(herdadas)]), "Herdadas");
    }
    XLSX.writeFile(wb, `radar-${date}.xlsx`);
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={exportPdf}><FileDown className="h-4 w-4 mr-1" />PDF</Button>
      <Button variant="outline" size="sm" onClick={exportXlsx}><FileSpreadsheet className="h-4 w-4 mr-1" />Excel</Button>
    </div>
  );
}
