import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CustomToggleProps {
  label?: string;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  icon?: { on: React.ReactNode; off: React.ReactNode };
}

export const CustomToggle = React.forwardRef<HTMLButtonElement, CustomToggleProps>(
  ({ label, defaultChecked = false, onChange, disabled = false, className, icon }, ref) => {
    const [isChecked, setIsChecked] = useState(defaultChecked);

    const handleToggle = () => {
      if (!disabled) {
        const newState = !isChecked;
        setIsChecked(newState);
        onChange?.(newState);
      }
    };

    return (
      <div className={cn('flex items-center gap-3', className)}>
        <motion.button
          ref={ref}
          onClick={handleToggle}
          disabled={disabled}
          className={cn(
            'relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300',
            isChecked
              ? 'bg-gradient-to-r from-blue-500 to-purple-600'
              : 'bg-gray-300 dark:bg-gray-600',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          whileTap={{ scale: 0.95 }}
          aria-label={label}
          role="switch"
          aria-checked={isChecked}
        >
          <motion.div
            className="absolute left-1 inline-flex h-6 w-6 transform items-center justify-center rounded-full bg-white shadow-md"
            animate={{ x: isChecked ? 24 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 40 }}
          >
            {icon && (isChecked ? icon.on : icon.off)}
          </motion.div>
        </motion.button>
        {label && <label className="cursor-pointer select-none">{label}</label>}
      </div>
    );
  }
);

CustomToggle.displayName = 'CustomToggle';

// Usage Example:
export const CustomToggleDemo = () => {
  const [soundEnabled, setSoundEnabled] = useState(
