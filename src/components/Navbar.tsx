import { AnimatePresence, motion } from 'motion/react';
import { Terminal, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { MascotWatcher } from './MascotWatcher';

type NavbarThemeAccent = {
  id: string;
  label: string;
};

interface NavbarProps {
  theme: NavbarThemeAccent;
  onThemeChipClick: () => void;
  navLinks: Array<{ name: string; href: string }>;
}

export const Navbar = ({ theme, onThemeChipClick, navLinks }: NavbarProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleThemeChipClick = () => {
    window.dispatchEvent(new CustomEvent('mascot-theme-changing'));
    onThemeChipClick();
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={cn(
        'fixed top-0 z-50 w-full transition-all duration-300 px-6 py-4',
        isScrolled ? 'glass nav-surface py-3' : 'bg-transparent'
      )}
    >
      <div className="flex w-full items-center justify-between">
        <motion.a
          href="#home"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <div className="icon-well flex h-10 w-10 items-center justify-center rounded-lg bg-neon-cyan/20 dark:bg-neon-cyan/20 text-neon-cyan dark:text-neon-cyan">
            <Terminal size={24} />
          </div>
          <span
            className="theme-text-primary font-display text-xl font-bold tracking-tighter uppercase text-slate-900 dark:text-white transition-colors duration-[3200ms] ease-in-out"
            style={{ color: 'var(--theme-brand-color)' }}
          >
            inventyfie<span style={{ color: 'var(--theme-brand-color)' }}>.</span>
          </span>
        </motion.a>

        {/* Desktop Nav */}
        <div className="hidden xl:flex xl:flex-1 xl:items-center xl:gap-8 xl:pl-16">
          <div className="flex items-center gap-4 lg:gap-5">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="nav-text theme-link-hover text-base font-medium text-slate-700 dark:text-white/70"
              >
                {link.name}
              </a>
            ))}

          </div>
          <div className="relative ml-auto flex items-center justify-end gap-3">
            <MascotWatcher />
            <div className="relative h-8 w-[152px] shrink-0">
              <AnimatePresence mode="sync">
                <motion.button
                  key={`navbar-theme-chip-${theme.id}`}
                  onClick={handleThemeChipClick}
                  initial={{ opacity: 0, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, filter: 'blur(3px)' }}
                  transition={{ duration: 2.2, ease: 'easeInOut' }}
                  className="absolute inset-0 flex items-center justify-center whitespace-nowrap rounded-full border border-white/25 bg-black/35 px-3 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-white/90 shadow-[0_8px_28px_rgba(0,0,0,0.3)] backdrop-blur-md transition-colors hover:border-white/50"
                >
                  {theme.label}
                </motion.button>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Mobile Toggle */}
        <button 
          className="nav-text xl:hidden text-white dark:text-white"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-0 top-full w-full glass nav-surface p-6 xl:hidden"
        >
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="nav-text text-lg font-medium text-slate-700 dark:text-white/70"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </a>
            ))}
          </div>
        </motion.div>
      )}
    </nav>
  );
};
