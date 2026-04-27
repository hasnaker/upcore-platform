'use client';

import { LogIn, MoreHorizontal, Pause, Play } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@upcore/design-system';
import type { AdminTenantRow } from './types';

interface TenantActionsMenuProps {
  row: AdminTenantRow;
  onSuspend: () => void;
  onActivate: () => void;
  onImpersonate: () => void;
}

export function TenantActionsMenu({
  row,
  onSuspend,
  onActivate,
  onImpersonate,
}: TenantActionsMenuProps) {
  const isSuspended = row.status === 'suspended';
  const isDeleted = row.status === 'deleted';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          aria-label={`${row.name} için aksiyonlar`}
          disabled={isDeleted}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={onImpersonate}>
          <LogIn className="mr-2 h-3.5 w-3.5" />
          Impersonate
        </DropdownMenuItem>
        {isSuspended ? (
          <DropdownMenuItem onSelect={onActivate}>
            <Play className="mr-2 h-3.5 w-3.5 text-green" />
            Tekrar aktifleştir
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={onSuspend}>
            <Pause className="mr-2 h-3.5 w-3.5 text-amber" />
            Askıya al
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
