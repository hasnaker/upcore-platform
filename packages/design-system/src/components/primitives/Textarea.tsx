import { forwardRef, useId } from 'react';
import { cn } from '../../utils/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, hint, error, required, id: providedId, ...props }, ref) => {
    const generatedId = useId();
    const id = providedId ?? generatedId;
    const describedById = error || hint ? `${id}-describe` : undefined;

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
        <textarea
          ref={ref}
          id={id}
          className={cn(
            'w-full min-h-[80px] rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink',
            'placeholder:text-ink-40 resize-y',
            'transition-colors duration-fast ease-standard',
            'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20',
            'disabled:cursor-not-allowed disabled:bg-bg-3 disabled:text-ink-40',
            error && 'border-red focus:border-red focus:ring-red/20',
            className,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedById}
          aria-required={required}
          {...props}
        />
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
Textarea.displayName = 'Textarea';
