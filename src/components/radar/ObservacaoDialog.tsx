import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ObservacaoDialog({
  open, onOpenChange, onConfirm, title, initial = "",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (obs: string) => Promise<void>;
  title: string;
  initial?: string;
}) {
  const [obs, setObs] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setObs(initial); onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label>Observação (obrigatória)</Label>
          <Textarea required rows={4} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Descreva o motivo / impedimento..." />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!obs.trim() || busy}
            onClick={async () => {
              setBusy(true);
              try { await onConfirm(obs.trim()); } finally { setBusy(false); }
            }}
          >Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
