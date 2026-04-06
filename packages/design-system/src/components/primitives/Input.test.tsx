import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input', () => {
  it('renders with label and wires htmlFor', () => {
    render(<Input label="Ad" />);
    const input = screen.getByLabelText('Ad');
    expect(input).toBeInTheDocument();
  });

  it('accepts user input', async () => {
    const user = userEvent.setup();
    render(<Input label="Ad" />);
    const input = screen.getByLabelText('Ad');
    await user.type(input, 'Ada');
    expect(input).toHaveValue('Ada');
  });

  it('renders hint below the input', () => {
    render(<Input label="E-posta" hint="Kurumsal adresinizi girin" />);
    expect(screen.getByText('Kurumsal adresinizi girin')).toBeInTheDocument();
  });

  it('renders error and sets aria-invalid', () => {
    render(<Input label="E-posta" error="Geçersiz e-posta" />);
    expect(screen.getByText('Geçersiz e-posta')).toBeInTheDocument();
    expect(screen.getByLabelText('E-posta')).toHaveAttribute('aria-invalid', 'true');
  });

  it('error replaces hint when both provided', () => {
    render(<Input label="Field" hint="Help" error="Bad" />);
    expect(screen.queryByText('Help')).not.toBeInTheDocument();
    expect(screen.getByText('Bad')).toBeInTheDocument();
  });

  it('renders prefix and suffix slots', () => {
    render(
      <Input
        label="Ara"
        prefix={<span data-testid="pfx">@</span>}
        suffix={<span data-testid="sfx">★</span>}
      />,
    );
    expect(screen.getByTestId('pfx')).toBeInTheDocument();
    expect(screen.getByTestId('sfx')).toBeInTheDocument();
  });

  it('marks required', () => {
    render(<Input label="Ad" required />);
    expect(screen.getByLabelText(/Ad/).getAttribute('aria-required')).toBe('true');
  });
});
