import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PulseBar } from './PulseBar';

describe('PulseBar', () => {
  it('renders progressbar with correct ARIA values', () => {
    render(<PulseBar score={72} label="Pulse" />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '72');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('clamps values above max', () => {
    render(<PulseBar score={200} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '100');
  });

  it('clamps values below 0', () => {
    render(<PulseBar score={-10} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '0');
  });

  it('displays label and value', () => {
    render(<PulseBar score={55} label="Mood" />);
    expect(screen.getByText('Mood')).toBeInTheDocument();
    expect(screen.getByText(/55/)).toBeInTheDocument();
  });

  it('supports custom max', () => {
    render(<PulseBar score={7} max={10} label="X" />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemax', '10');
    expect(screen.getByText('7 / 10')).toBeInTheDocument();
  });
});
