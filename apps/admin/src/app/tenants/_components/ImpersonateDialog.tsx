'use client';

import { useState } from 'react';
import { LogIn } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@upcore/design-system';
import type { AdminTenantRow } from './types';

interface ImpersonateDialogProps {
  tenant: AdminTenantRow | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function ImpersonateDialog({
  tenant,
  pending,
  onClose,
  onConfirm,
}: ImpersonateDialogProps) {
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
            <LogIn className="h-4 w-4 text-accent" />
            Impersonation başlat
          </DialogTitle>
          <DialogDescription>
            <strong>{tenant?.name}</strong> tenant&apos;ına UpCore personeli
            olarak giriş yapacaksınız. Oturum 60 dakika içinde sona erer ve tüm
            hareketler {` tenant.impersonation.v1 `}audit event&apos;i olarak 7
            yıl saklanır.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex flex-col gap-2">
          <Label htmlFor="impersonate-reason">
            Ticket / gerekçe (zorunlu)
          </Label>
          <Input
            id="impersonate-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="SUPPORT-1234"
            required
          />
          <p className="text-[11px] text-ink-40">
            KVKK + müşteri sözleşmesi kapsamında sadece destek ticket&apos;ı
            bağlamında kullanılmalıdır.
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
            disabled={reason.trim().length < 3 || pending}
            onClick={() => onConfirm(reason.trim())}
          >
            {pending ? 'Başlatılıyor…' : 'Impersonation başlat'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
