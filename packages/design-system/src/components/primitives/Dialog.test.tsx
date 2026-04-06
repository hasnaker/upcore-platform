import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './Dialog';

describe('Dialog', () => {
  it('is closed by default', () => {
    render(
      <Dialog>
        <DialogTrigger>Aç</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Başlık</DialogTitle>
            <DialogDescription>Açıklama</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.queryByText('Başlık')).not.toBeInTheDocument();
  });

  it('opens on trigger click', async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Aç</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Başlık</DialogTitle>
            <DialogDescription>Açıklama</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByText('Aç'));
    expect(screen.getByText('Başlık')).toBeInTheDocument();
    expect(screen.getByText('Açıklama')).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Başlık</DialogTitle>
            <DialogDescription>Açıklama</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByText('Başlık')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByText('Başlık')).not.toBeInTheDocument();
  });

  it('renders close button by default', () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>T</DialogTitle>
            <DialogDescription>D</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole('button', { name: 'Kapat' })).toBeInTheDocument();
  });

  it('hides close button when hideClose is set', () => {
    render(
      <Dialog defaultOpen>
        <DialogContent hideClose>
          <DialogHeader>
            <DialogTitle>T</DialogTitle>
            <DialogDescription>D</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.queryByRole('button', { name: 'Kapat' })).not.toBeInTheDocument();
  });
});
