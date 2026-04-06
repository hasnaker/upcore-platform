import { forwardRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SidebarNavItem {
  href: string;
  label: string;
  icon?: LucideIcon;
  badge?: number | string;
  children?: SidebarNavItem[];
}

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  /** Brand / logo rendered at the top. */
  logo: React.ReactNode;
  navItems: SidebarNavItem[];
  /** Href of the currently active route (matches against `item.href`). */
  activeHref?: string;
  collapsed?: boolean;
  onCollapseToggle?: () => void;
  /** Custom link component. Defaults to plain `<a>`. */
  linkAs?: React.ElementType;
  /** Optional footer content (e.g. user profile). */
  footer?: React.ReactNode;
}

export const Sidebar = forwardRef<HTMLElement, SidebarProps>(
  (
    {
      className,
      logo,
      navItems,
      activeHref,
      collapsed = false,
      onCollapseToggle,
      linkAs,
      footer,
      ...props
    },
    ref,
  ) => {
    const Link = linkAs ?? 'a';
    return (
      <aside
        ref={ref}
        data-collapsed={collapsed ? 'true' : 'false'}
        className={cn(
          'flex h-full flex-col border-r border-line bg-bg',
          'transition-[width] duration-base ease-standard',
          collapsed ? 'w-[64px]' : 'w-[240px]',
          className,
        )}
        {...props}
      >
        <div
          className={cn(
            'flex h-14 shrink-0 items-center gap-2 border-b border-line px-4',
            collapsed && 'justify-center px-2',
          )}
        >
          <div className="min-w-0 truncate">{logo}</div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <ul className="flex flex-col gap-0.5">
            {navItems.map((item) => (
              <SidebarItem
                key={item.href}
                item={item}
                activeHref={activeHref}
                collapsed={collapsed}
                Link={Link}
              />
            ))}
          </ul>
        </nav>
        {footer && (
          <div className={cn('border-t border-line px-2 py-3', collapsed && 'px-1')}>
            {footer}
          </div>
        )}
        {onCollapseToggle && (
          <button
            type="button"
            onClick={onCollapseToggle}
            className={cn(
              'flex h-8 w-8 items-center justify-center self-end m-2 rounded-md text-ink-60',
              'transition-colors duration-fast hover:bg-bg-3 hover:text-ink',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            )}
            aria-label={collapsed ? 'Kenar çubuğunu genişlet' : 'Kenar çubuğunu daralt'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        )}
      </aside>
    );
  },
);
Sidebar.displayName = 'Sidebar';

interface SidebarItemProps {
  item: SidebarNavItem;
  activeHref?: string;
  collapsed: boolean;
  Link: React.ElementType;
  depth?: number;
}

const SidebarItem = ({ item, activeHref, collapsed, Link, depth = 0 }: SidebarItemProps) => {
  const isActive = activeHref === item.href;
  const hasChildren = item.children && item.children.length > 0;
  const [open, setOpen] = useState(
    hasChildren ? item.children?.some((c) => c.href === activeHref) ?? false : false,
  );
  const Icon = item.icon;

  if (hasChildren && !collapsed) {
    return (
      <li>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium',
            'transition-colors duration-fast text-ink-60 hover:bg-bg-3 hover:text-ink',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            depth > 0 && 'pl-6',
          )}
          aria-expanded={open}
        >
          {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
          <span className="flex-1 truncate text-left">{item.label}</span>
          <ChevronDown
            className={cn(
              'h-3 w-3 shrink-0 transition-transform duration-fast',
              open && 'rotate-180',
            )}
            aria-hidden="true"
          />
        </button>
        {open && (
          <ul className="mt-0.5 flex flex-col gap-0.5">
            {item.children?.map((child) => (
              <SidebarItem
                key={child.href}
                item={child}
                activeHref={activeHref}
                collapsed={collapsed}
                Link={Link}
                depth={depth + 1}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <Link
        href={item.href}
        aria-current={isActive ? 'page' : undefined}
        title={collapsed ? item.label : undefined}
        className={cn(
          'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium',
          'transition-colors duration-fast',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          isActive
            ? 'bg-accent-soft text-accent'
            : 'text-ink-60 hover:bg-bg-3 hover:text-ink',
          collapsed && 'justify-center px-0',
          depth > 0 && !collapsed && 'pl-8',
        )}
      >
        {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
        {!collapsed && item.badge !== undefined && (
          <span
            className={cn(
              'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none',
              isActive ? 'bg-accent text-bg' : 'bg-bg-3 text-ink-60',
            )}
          >
            {item.badge}
          </span>
        )}
      </Link>
    </li>
  );
};
