import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Aktif</Badge>);
    expect(screen.getByText('Aktif')).toBeInTheDocument();
  });

  it('applies default variant classes', () => {
    render(<Badge>X</Badge>);
    expect(screen.getByText('X')).toHaveClass('bg-bg-3');
  });

  it('applies semantic variants', () => {
    render(<Badge variant="danger">Risk</Badge>);
    expect(screen.getByText('Risk')).toHaveClass('bg-red-soft');
  });

  it('supports sizes', () => {
    render(<Badge size="sm">S</Badge>);
    expect(screen.getByText('S')).toHaveClass('h-5');
  });
});
