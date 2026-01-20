import { FC } from 'react';
import {
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface SpinPackage {
  spins: number;
  price: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPackage: SpinPackage | null;
  onConfirm: () => void;
}

export const PaymentModal: FC<PaymentModalProps> = ({ isOpen, onClose, selectedPackage, onConfirm }) => {
  if (!selectedPackage) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-golden">Confirmar Compra</DialogTitle>
          <DialogDescription>
            Você está prestes a adquirir um pacote de giros para a Roda da Fortuna Real.
          </DialogDescription>
        </DialogHeader>
        <div className="my-4">
          <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-border">
            <span className="text-lg font-semibold">Pacote: {selectedPackage.spins} {selectedPackage.spins > 1 ? 'Giros' : 'Giro'}</span>
            <span className="text-lg font-bold text-golden">{selectedPackage.price.toFixed(2)} USDT</span>
          </div>
          <p className="text-sm text-foreground/60 mt-2">O valor será debitado da sua carteira conectada. Certifique-se de ter saldo suficiente.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={onConfirm}>Confirmar Pagamento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
