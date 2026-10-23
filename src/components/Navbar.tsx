import { motion } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

interface NavbarProps {
  navLinks: Array<{ name: string; href: string }>;
  activeHref?: string;
}

export const Navbar = ({ navLinks, activeHref }: NavbarProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={cn(
        'fixed top-0 z-50 w-full px-6 py-5 transition-colors duration-200',
        isScrolled || isMobileMenuOpen ? 'nav-surface' : 'bg-transparent'
      )}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
        <motion.a
          href="#home"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-display text-2xl font-semibold uppercase tracking-[0.14em] text-ink"
        >
          Inventyfie
        </motion.a>

        <div className="hidden items-center gap-2 xl:flex">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              aria-current={activeHref === link.href ? 'page' : undefined}
              className="nav-pill"
            >
              {link.name}
            </a>
          ))}
        </div>

        <button
          className="text-ink xl:hidden"
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="nav-surface absolute left-0 top-full w-full px-6 pb-6 pt-2 xl:hidden"
        >
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                aria-current={activeHref === link.href ? 'page' : undefined}
                className="nav-pill w-fit"
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
