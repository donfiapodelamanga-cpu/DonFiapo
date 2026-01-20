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

import { useTranslations } from 'next-intl';

export const PaymentModal: FC<PaymentModalProps> = ({ isOpen, onClose, selectedPackage, onConfirm }) => {
  const t = useTranslations('Games.spin');

  if (!selectedPackage) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-golden">{t('payment.title')}</DialogTitle>
          <DialogDescription>
            {t('payment.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="my-4">
          <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-border">
            <span className="text-lg font-semibold">{t('payment.package')} {selectedPackage.spins} {selectedPackage.spins > 1 ? t('spinsPlural') : t('spinSingular')}</span>
            <span className="text-lg font-bold text-golden">{selectedPackage.price.toFixed(2)} USDT</span>
          </div>
          <p className="text-sm text-foreground/60 mt-2">{t('payment.disclaimer')}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('payment.cancel')}</Button>
          <Button onClick={onConfirm}>{t('payment.confirm')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
