import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AREAS, AREA_LABEL, type Area } from "@/lib/domain";

export type TaskFormValues = {
  description: string;
  area: Area;
  responsavel: string;
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
            <div className="space-y-2 col-span-2">
              <Label>Responsável</Label>
              <Input {...register("responsavel")} />
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
