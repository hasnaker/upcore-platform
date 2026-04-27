'use client';

import { useState } from 'react';
import { AlertTriangle, Play } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from '@upcore/design-system';
import type { AdminTenantRow } from './types';

interface SuspendDialogProps {
  tenant: AdminTenantRow | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function SuspendDialog({
  tenant,
  pending,
  onClose,
  onConfirm,
}: SuspendDialogProps) {
  const [reason, setReason] = useState('');
  return (
    <Dialog
      open={!!tenant}
      onOpenChange={(open) => {
        if (!open) {
          setReason('');
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber" />
            Tenant&apos;ı askıya al
          </DialogTitle>
          <DialogDescription>
            <strong>{tenant?.name}</strong> askıya alındığında tüm kullanıcıların
            oturumları anında sonlandırılır. Bu işlem audit log&apos;a
            kaydedilir.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex flex-col gap-2">
          <Label htmlFor="suspend-reason">Gerekçe (zorunlu)</Label>
          <Textarea
            id="suspend-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Örn: ödeme gecikmesi · ticket #1234 · hukuki talep"
            rows={3}
            required
          />
          <p className="text-[11px] text-ink-40">
            Bu metin `tenant.suspended.v1` event&apos;ine eklenir ve 7 yıl
            saklanır.
          </p>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={pending}
          >
            Vazgeç
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={reason.trim().length < 3 || pending}
            onClick={() => onConfirm(reason.trim())}
          >
            {pending ? 'Askıya alınıyor…' : 'Askıya al'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ActivateDialogProps {
  tenant: AdminTenantRow | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function ActivateDialog({
  tenant,
  pending,
  onClose,
  onConfirm,
}: ActivateDialogProps) {
  const [reason, setReason] = useState('');
  return (
    <Dialog
      open={!!tenant}
      onOpenChange={(open) => {
        if (!open) {
          setReason('');
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-4 w-4 text-green" />
            Tenant&apos;ı aktifleştir
          </DialogTitle>
          <DialogDescription>
            <strong>{tenant?.name}</strong> tekrar aktif duruma alınacak;
            kullanıcılar hemen oturum açabilir.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex flex-col gap-2">
          <Label htmlFor="activate-reason">Not (opsiyonel)</Label>
          <Textarea
            id="activate-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Örn: ödeme onaylandı · ticket #1234"
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={pending}
          >
            Vazgeç
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() => onConfirm(reason.trim())}
          >
            {pending ? 'Aktifleştiriliyor…' : 'Aktifleştir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
