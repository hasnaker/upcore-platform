import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Kaydet</Button>);
    expect(screen.getByRole('button', { name: 'Kaydet' })).toBeInTheDocument();
  });

  it('applies primary variant by default', () => {
    render(<Button>X</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-ink');
  });

  it('applies destructive variant classes', () => {
    render(<Button variant="destructive">Sil</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-red');
  });

  it('applies size classes', () => {
    render(<Button size="lg">Büyük</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-10');
  });

  it('calls onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Tıkla</Button>);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('disables when loading', () => {
    render(<Button loading>Yükleniyor</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });

  it('renders leftIcon when not loading', () => {
    render(
      <Button leftIcon={<span data-testid="icon">★</span>}>Etiket</Button>,
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('hides leftIcon when loading', () => {
    render(
      <Button loading leftIcon={<span data-testid="icon">★</span>}>
        Etiket
      </Button>,
    );
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument();
  });

  it('merges custom className', () => {
    render(<Button className="custom">X</Button>);
    expect(screen.getByRole('button')).toHaveClass('custom');
  });

  it('forwards ref', () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(<Button ref={ref}>R</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('renders as child via asChild', () => {
    render(
      <Button asChild>
        <a href="/test">Link</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Link' });
    expect(link).toHaveAttribute('href', '/test');
    expect(link).toHaveClass('bg-ink');
  });
});
