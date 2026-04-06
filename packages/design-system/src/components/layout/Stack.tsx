import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const stackVariants = cva('flex', {
  variants: {
    direction: {
      row: 'flex-row',
      column: 'flex-col',
    },
    gap: {
      0: 'gap-0',
      1: 'gap-1',
      2: 'gap-2',
      3: 'gap-3',
      4: 'gap-4',
      5: 'gap-5',
      6: 'gap-6',
      8: 'gap-8',
      10: 'gap-10',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly',
    },
    wrap: {
      nowrap: 'flex-nowrap',
      wrap: 'flex-wrap',
      'wrap-reverse': 'flex-wrap-reverse',
    },
  },
  defaultVariants: {
    direction: 'column',
    gap: 4,
    align: 'stretch',
    justify: 'start',
    wrap: 'nowrap',
  },
});

export interface StackProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof stackVariants> {
}

export const Stack = forwardRef<HTMLDivElement, StackProps>(
  ({ className, direction, gap, align, justify, wrap, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(stackVariants({ direction, gap, align, justify, wrap }), className)}
      {...props}
    />
  ),
);
Stack.displayName = 'Stack';

export interface HStackProps extends Omit<StackProps, 'direction'> {}
export const HStack = forwardRef<HTMLDivElement, HStackProps>((props, ref) => (
  <Stack ref={ref} direction="row" {...props} />
));
HStack.displayName = 'HStack';

export interface VStackProps extends Omit<StackProps, 'direction'> {}
export const VStack = forwardRef<HTMLDivElement, VStackProps>((props, ref) => (
  <Stack ref={ref} direction="column" {...props} />
));
VStack.displayName = 'VStack';
