import { forwardRef, Fragment } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  /** Custom component for links. Defaults to `<a>`. */
  linkAs?: React.ElementType;
}

export const Breadcrumb = forwardRef<HTMLElement, BreadcrumbProps>(
  ({ className, items, linkAs, ...props }, ref) => {
    const Link = linkAs ?? 'a';
    return (
      <nav
        ref={ref}
        aria-label="Breadcrumb"
        className={cn('flex items-center gap-1.5 text-xs text-ink-60', className)}
        {...props}
      >
        <ol className="flex items-center gap-1.5">
          {items.map((item, idx) => {
            const isLast = idx === items.length - 1;
            return (
              <Fragment key={`${item.label}-${idx}`}>
                <li className="flex items-center">
                  {item.href && !isLast ? (
                    <Link
                      href={item.href}
                      className="transition-colors duration-fast hover:text-ink"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span
                      aria-current={isLast ? 'page' : undefined}
                      className={cn(isLast && 'text-ink font-medium')}
                    >
                      {item.label}
                    </span>
                  )}
                </li>
                {!isLast && (
                  <ChevronRight
                    className="h-3 w-3 text-ink-40"
                    aria-hidden="true"
                  />
                )}
              </Fragment>
            );
          })}
        </ol>
      </nav>
    );
  },
);
Breadcrumb.displayName = 'Breadcrumb';
