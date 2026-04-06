import { forwardRef, useId } from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  /** Optional label rendered above the input. */
  label?: string;
  /** Small help text rendered below the input (hidden when `error` is set). */
  hint?: string;
  /** Error message — overrides hint, applies danger styling. */
  error?: string;
  /** Content rendered inside the input on the left (icon or short text). */
  prefix?: React.ReactNode;
  /** Content rendered inside the input on the right (icon or short text). */
  suffix?: React.ReactNode;
  /** Mark the field visually required (label asterisk). */
  required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      hint,
      error,
      prefix,
      suffix,
      required,
      id: providedId,
      disabled,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = providedId ?? generatedId;
    const describedById = error || hint ? `${id}-describe` : undefined;

    const inputClass = cn(
      'w-full h-9 rounded-md border border-line bg-bg px-3 text-sm text-ink',
      'placeholder:text-ink-40',
      'transition-colors duration-fast ease-standard',
      'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20',
      'disabled:cursor-not-allowed disabled:bg-bg-3 disabled:text-ink-40',
      error && 'border-red focus:border-red focus:ring-red/20',
      prefix && 'pl-9',
      suffix && 'pr-9',
      className,
    );

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-xs font-medium text-ink-80">
            {label}
            {required && (
              <span aria-hidden="true" className="ml-0.5 text-red">
                *
              </span>
            )}
          </label>
        )}
        <div className="relative">
          {prefix && (
            <span
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-40 flex items-center"
              aria-hidden="true"
            >
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            className={inputClass}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedById}
            aria-required={required}
            disabled={disabled}
            {...props}
          />
          {suffix && (
            <span
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-40 flex items-center"
              aria-hidden="true"
            >
              {suffix}
            </span>
          )}
        </div>
        {error ? (
          <span id={describedById} className="text-xs text-red">
            {error}
          </span>
        ) : hint ? (
          <span id={describedById} className="text-xs text-ink-60">
            {hint}
          </span>
        ) : null}
      </div>
    );
  },
);
Input.displayName = 'Input';
