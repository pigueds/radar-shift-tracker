import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AREAS, AREA_LABEL, IMPACTS, IMPACT_LABEL, PRIORITIES, PRIORITY_LABEL,
  TURNOS, TURNO_LABEL,
  type Area, type Impact, type Priority, type Turno,
} from "@/lib/domain";

export type TaskFormValues = {
  description: string;
  area: Area;
  responsavel: string;
  turno: Turno;
  prioridade: Priority;
  impacto: Impact;
  task_date: string;
};

export function TaskFormDialog({
  trigger,
  initial,
  defaultDate,
  onSubmit,
  title = "Nova tarefa",
}: {
  trigger: React.ReactNode;
  initial?: Partial<TaskFormValues>;
  defaultDate: string;
  onSubmit: (v: TaskFormValues) => Promise<void>;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset, setValue, watch } = useForm<TaskFormValues>({
    defaultValues: {
      description: initial?.description ?? "",
      area: initial?.area ?? "termica",
      responsavel: initial?.responsavel ?? "",
      turno: initial?.turno ?? "integral",
      prioridade: initial?.prioridade ?? "media",
      impacto: initial?.impacto ?? "rotina_operacional",
      task_date: initial?.task_date ?? defaultDate,
    },
  });

  const submit = handleSubmit(async (v) => {
    await onSubmit(v);
    setOpen(false);
    reset();
  });

  const v = watch();
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea required maxLength={500} {...register("description", { required: true })} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" required {...register("task_date", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Área</Label>
              <Select value={v.area} onValueChange={(val) => setValue("area", val as Area)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AREAS.map((a) => <SelectItem key={a} value={a}>{AREA_LABEL[a]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Input {...register("responsavel")} />
            </div>
            <div className="space-y-2">
              <Label>Turno</Label>
              <Select value={v.turno} onValueChange={(val) => setValue("turno", val as Turno)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TURNOS.map((t) => <SelectItem key={t} value={t}>{TURNO_LABEL[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={v.prioridade} onValueChange={(val) => setValue("prioridade", val as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Impacto operacional</Label>
              <Select value={v.impacto} onValueChange={(val) => setValue("impacto", val as Impact)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {IMPACTS.map((i) => <SelectItem key={i} value={i}>{IMPACT_LABEL[i]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
