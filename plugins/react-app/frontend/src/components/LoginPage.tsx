import React, { useState } from 'react';
import { Sparkles, Lock, User, Eye, EyeOff, AlertCircle, Loader2, ArrowRight, ShieldCheck, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n';

export const LoginPage: React.FC = () => {
  const { login, error: authError, clearError } = useAuth();
  const { translations, locale, setLocale } = useTranslation();
  const t = translations.auth;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [showTenantInput, setShowTenantInput] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!username.trim() || !password.trim()) {
      setLocalError(t.emptyFieldsError);
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await login({
        username: username.trim(),
        password: password,
        userTenantId: tenantId.trim() || undefined
      });
      if (!success && !authError) {
        setLocalError(t.invalidCredentials);
      }
    } catch {
      setLocalError(t.invalidCredentials);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoCredentials = () => {
    setUsername('admin');
    setPassword('ofbiz');
    setTenantId('');
    setLocalError(null);
    clearError();
  };

  // Flag components (SVG)
  const TrFlag = ({ className = "w-4 h-3 rounded-[2px] shrink-0" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" className={className} aria-hidden="true">
      <g fillRule="evenodd">
        <path fill="#e30a17" d="M0 0h640v480H0z"/>
        <path fill="#fff" d="M407 247.5c0 66.2-54.6 119.9-122 119.9s-122-53.7-122-120 54.6-119.8 122-119.8 122 53.7 122 119.9"/>
        <path fill="#e30a17" d="M413 247.5c0 53-43.6 95.9-97.5 95.9s-97.6-43-97.6-96 43.7-95.8 97.6-95.8 97.6 42.9 97.6 95.9z"/>
        <path fill="#fff" d="m430.7 191.5-1 44.3-41.3 11.2 40.8 14.5-1 40.7 26.5-31.8 40.2 14-23.2-34.1 28.3-33.9-43.5 12-25.8-37z"/>
      </g>
    </svg>
  );

  const GbFlag = ({ className = "w-4 h-3 rounded-[2px] shrink-0" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" className={className} aria-hidden="true">
      <path fill="#012169" d="M0 0h640v480H0z"/>
      <path fill="#FFF" d="m75 0 244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-178L0 64V0z"/>
      <path fill="#C8102E" d="m424 281 216 159v40L369 281zm-184 20 6 35L54 480H0zM640 0v3L391 191l2-44L590 0zM0 0l239 176h-60L0 42z"/>
      <path fill="#FFF" d="M241 0v480h160V0zM0 160v160h640V160z"/>
      <path fill="#C8102E" d="M0 193v96h640v-96zM273 0v480h96V0z"/>
    </svg>
  );

  const displayedError = localError || authError;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative selection:bg-indigo-500 selection:text-white">
      {/* Background ambient gradient glow (Oracle Redwood Atmosphere) */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 -translate-x-1/2 w-72 h-72 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Language Switcher Bar */}
      <div className="absolute top-6 right-6 z-10 inline-flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-xl p-1 shadow-lg shrink-0">
        <button
          type="button"
          onClick={() => setLocale('tr')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
            locale === 'tr' ? 'bg-indigo-600 text-white shadow-sm' : 'border border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
          title="Türkçe"
        >
          <TrFlag />
          <span>TR</span>
        </button>
        <button
          type="button"
          onClick={() => setLocale('en')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
            locale === 'en' ? 'bg-indigo-600 text-white shadow-sm' : 'border border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
          title="English"
        >
          <GbFlag />
          <span>EN</span>
        </button>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 via-red-600 to-indigo-800 shadow-xl shadow-indigo-600/30 ring-1 ring-white/10 mb-2">
            <Sparkles size={28} className="text-white" />
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">{t.loginTitle}</h1>
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold">
              Oracle
            </span>
          </div>
          <p className="text-xs text-slate-400">{t.loginSubtitle}</p>
        </div>

        {/* Error Alert */}
        {displayedError && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{displayedError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              {t.username}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <User size={16} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (displayedError) {
                    setLocalError(null);
                    clearError();
                  }
                }}
                disabled={isSubmitting}
                placeholder={t.usernamePlaceholder}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-50"
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              {t.password}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock size={16} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (displayedError) {
                    setLocalError(null);
                    clearError();
                  }
                }}
                disabled={isSubmitting}
                placeholder={t.passwordPlaceholder}
                className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-50"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Multi-Tenant Toggle & Input */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowTenantInput(!showTenantInput)}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Building2 size={13} />
              <span>{t.tenantOptional}</span>
              <span className="text-[10px] text-slate-500">
                {showTenantInput ? '▲' : '▼'}
              </span>
            </button>

            {showTenantInput && (
              <div className="mt-2 animate-fadeIn">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  {t.tenantId}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Building2 size={15} />
                  </div>
                  <input
                    type="text"
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    disabled={isSubmitting}
                    placeholder={t.tenantIdPlaceholder}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-red-700 hover:from-indigo-500 hover:to-red-600 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>{t.loggingIn}</span>
              </>
            ) : (
              <>
                <span>{t.loginButton}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Demo Quick Credentials Card */}
        <div className="pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={fillDemoCredentials}
            className="w-full p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-indigo-500/40 text-left transition-all group cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={16} className="text-indigo-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-300 group-hover:text-indigo-300 transition-colors">
                  {t.demoCredentialsTitle}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  {t.demoCredentialsHint}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-all">
              {locale === 'tr' ? 'Doldur' : 'Auto Fill'}
            </span>
          </button>
        </div>
      </div>

      {/* Footer System Info */}
      <footer className="mt-8 text-center text-xs text-slate-600">
        <p>Apache OFBiz® & React Enterprise Architecture</p>
      </footer>
    </div>
  );
};

export default LoginPage;
