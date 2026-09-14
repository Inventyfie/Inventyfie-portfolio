import { motion } from 'motion/react';
import { Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';

export const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();

  const themes = [{ value: 'dark' as const, icon: Moon, label: 'Dark' }];

  return (
    <div className="switcher-shell flex items-center gap-2 rounded-full bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 p-1.5">
      {themes.map(({ value, icon: Icon, label }) => (
        <motion.button
          key={value}
          onClick={() => setTheme(value)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'relative p-2 rounded-full transition-all duration-300',
            theme === value
              ? 'switcher-active bg-neon-cyan/20 text-neon-cyan dark:bg-neon-cyan/20 dark:text-neon-cyan'
              : 'text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white/70'
          )}
          title={label}
        >
          {theme === value && (
            <motion.div
              layoutId="theme-indicator"
              className="absolute inset-0 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 dark:bg-neon-cyan/10 dark:border-neon-cyan/30"
              transition={{ duration: 0.3 }}
            />
          )}
          <Icon size={18} className="relative z-10" />
        </motion.button>
      ))}
    </div>
  );
};
