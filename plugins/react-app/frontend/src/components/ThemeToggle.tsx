import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabel = false }) => {
  const { theme, toggleTheme } = useTheme();
  const { translations } = useTranslation();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
        isDark
          ? 'bg-slate-900 border-slate-800 text-amber-400 hover:text-amber-300 hover:bg-slate-800/80 shadow-inner'
          : 'bg-slate-100 border-slate-300 text-indigo-600 hover:text-indigo-700 hover:bg-slate-200/80 shadow-sm'
      } ${className}`}
      title={isDark ? translations.common.lightMode : translations.common.darkMode}
      aria-label={isDark ? translations.common.lightMode : translations.common.darkMode}
    >
      {isDark ? (
        <Sun size={15} className="transition-transform duration-300 rotate-0 hover:rotate-45" />
      ) : (
        <Moon size={15} className="transition-transform duration-300 -rotate-12 hover:rotate-0" />
      )}
      {showLabel && (
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
          {isDark ? translations.common.lightMode : translations.common.darkMode}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;
