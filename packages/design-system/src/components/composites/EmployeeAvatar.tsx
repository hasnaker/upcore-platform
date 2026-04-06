import { forwardRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../primitives/Avatar';
import { cn } from '../../utils/cn';
import { getInitials } from '../../utils/getInitials';

export type EmployeeAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizeMap: Record<EmployeeAvatarSize, { avatar: string; name: string; role: string }> = {
  xs: { avatar: 'h-6 w-6', name: 'text-xs', role: 'text-[10px]' },
  sm: { avatar: 'h-8 w-8', name: 'text-xs', role: 'text-[11px]' },
  md: { avatar: 'h-9 w-9', name: 'text-sm', role: 'text-xs' },
  lg: { avatar: 'h-11 w-11', name: 'text-sm', role: 'text-xs' },
  xl: { avatar: 'h-14 w-14', name: 'text-base', role: 'text-sm' },
};

export interface EmployeeAvatarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'role'> {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  /** Role / title rendered below the name. */
  role?: string;
  size?: EmployeeAvatarSize;
  /** Show name next to avatar. Defaults to `true`. */
  showName?: boolean;
  /** Show role under name. Defaults to `false`. */
  showRole?: boolean;
}

export const EmployeeAvatar = forwardRef<HTMLDivElement, EmployeeAvatarProps>(
  (
    {
      className,
      firstName,
      lastName,
      avatarUrl,
      role,
      size = 'md',
      showName = true,
      showRole = false,
      ...props
    },
    ref,
  ) => {
    const fullName = `${firstName} ${lastName}`.trim();
    const initials = getInitials(firstName, lastName);
    const sizing = sizeMap[size];

    return (
      <div ref={ref} className={cn('flex items-center gap-2.5', className)} {...props}>
        <Avatar className={sizing.avatar}>
          {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        {(showName || (showRole && role)) && (
          <div className="flex flex-col min-w-0">
            {showName && (
              <span
                className={cn('font-medium text-ink truncate leading-tight', sizing.name)}
              >
                {fullName}
              </span>
            )}
            {showRole && role && (
              <span className={cn('text-ink-60 truncate leading-tight', sizing.role)}>
                {role}
              </span>
            )}
          </div>
        )}
      </div>
    );
  },
);
EmployeeAvatar.displayName = 'EmployeeAvatar';
