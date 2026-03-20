import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Zap, Loader2, AlertCircle, Clock, ShieldX, Ban,
  Eye, EyeOff, Brain, FileText, Search, MessageSquare,
  BarChart3, Video, Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/* ─── Feature cards data ─── */
const features = [
  { icon: Brain, title: 'DNAs de Marca', desc: 'Define la personalidad, audiencia y producto de tu marca con IA' },
  { icon: FileText, title: 'VSL Maker', desc: 'Genera scripts de venta completos sección por sección' },
  { icon: Search, title: 'Agente de Ads', desc: 'Busca y analiza anuncios ganadores en Meta, TikTok e Instagram' },
  { icon: MessageSquare, title: 'Chat de Marca', desc: 'Asistente IA entrenado con la voz de tu marca' },
  { icon: BarChart3, title: 'Análisis de Encuestas', desc: 'Convierte encuestas en avatares de comprador profundos' },
  { icon: Video, title: 'Video Inspiration', desc: 'Analiza videos virales y encuentra ads similares' },
  { icon: Target, title: 'Motor de Modelado', desc: 'Adapta anuncios ganadores al DNA de tu marca' },
  { icon: Zap, title: '52 Segundos', desc: 'Campañas completas en menos de un minuto' },
];

/* ─── Google icon SVG ─── */
function GoogleIcon() {
  return (
    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

/* ─── CSS for scrolling columns ─── */
const scrollStyles = `
@keyframes scroll-up {
  0% { transform: translateY(0); }
  100% { transform: translateY(-50%); }
}
@keyframes scroll-down {
  0% { transform: translateY(-50%); }
  100% { transform: translateY(0); }
}
.scroll-up {
  animation: scroll-up 25s linear infinite;
}
.scroll-down {
  animation: scroll-down 25s linear infinite;
}
`;

/* ─── Main component ─── */
export default function LoginPage() {
  const { user, profile, loading, isApproved, signIn, signUp, signOut } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);

  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);
  const [showRegPw, setShowRegPw] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);

  // Google OAuth state
  const [googleLoading, setGoogleLoading] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
      </div>
    );
  }

  if (user && isApproved) {
    return <Navigate to="/dnas" replace />;
  }

  const handleSignOut = async () => {
    await signOut();
    window.location.reload();
  };

  if (user && profile && !isApproved) {
    return <StatusScreen status={profile.status} onSignOut={handleSignOut} />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      await signIn(loginEmail, loginPassword);
    } catch (err: any) {
      setLoginError(
        err.message === 'Invalid login credentials'
          ? 'Email o contraseña incorrectos'
          : err.message
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (regPassword.length < 6) {
      setRegError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (regPassword !== regConfirm) {
      setRegError('Las contraseñas no coinciden');
      return;
    }
    setRegLoading(true);
    try {
      await signUp(regEmail, regPassword, regName);
      setRegSuccess(true);
    } catch (err: any) {
      setRegError(err.message);
    } finally {
      setRegLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: 'https://hooq.online/dnas' },
      });
    } catch {
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <style>{scrollStyles}</style>
      <div className="min-h-screen flex flex-col lg:flex-row bg-zinc-950">

        {/* ═══ LEFT COLUMN — Form ═══ */}
        <div className="w-full lg:w-[45%] flex flex-col items-center justify-center px-6 py-12 lg:py-0 relative">
          {/* Logo */}
          <div className="absolute top-8 left-8 flex items-center gap-2">
            <Zap className="w-7 h-7 text-violet-500" />
            <span className="text-2xl font-bold tracking-tight text-white">Hooq</span>
          </div>

          <div className="w-full max-w-[420px]">
            {/* Heading */}
            <div className="mb-8 text-center lg:text-left">
              <h1 className="text-3xl font-bold text-white mb-2">
                {tab === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}
              </h1>
              <p className="text-zinc-400">
                {tab === 'login'
                  ? 'Ingresa a tu plataforma de copywriting con IA'
                  : 'Empieza a crear copy que convierte'}
              </p>
            </div>

            {regSuccess ? (
              /* ── Registration success ── */
              <div className="text-center py-10 space-y-4">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8 text-amber-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">Registro exitoso</h3>
                <p className="text-sm text-zinc-400 leading-relaxed max-w-xs mx-auto">
                  Tu cuenta está pendiente de aprobación. Te notificaremos cuando sea aprobada.
                </p>
                <Button
                  variant="outline"
                  className="mt-4 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  onClick={() => { setRegSuccess(false); setTab('login'); }}
                >
                  Volver al inicio de sesión
                </Button>
              </div>
            ) : (
              <>
                {/* ── Tabs ── */}
                <div className="flex mb-6 bg-zinc-900 rounded-xl p-1">
                  <button
                    onClick={() => setTab('login')}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                      tab === 'login'
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Iniciar sesión
                  </button>
                  <button
                    onClick={() => setTab('register')}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                      tab === 'register'
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Crear cuenta
                  </button>
                </div>

                {/* ── LOGIN TAB ── */}
                {tab === 'login' && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    {/* Google */}
                    <button
                      onClick={handleGoogle}
                      disabled={googleLoading}
                      className="w-full flex items-center justify-center py-3 px-4 rounded-xl bg-white text-zinc-800 font-medium text-sm hover:bg-zinc-100 transition-colors disabled:opacity-60"
                    >
                      {googleLoading ? (
                        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                      ) : (
                        <GoogleIcon />
                      )}
                      Continuar con Google
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-zinc-800" />
                      <span className="text-xs text-zinc-500 uppercase tracking-wider">o continúa con email</span>
                      <div className="flex-1 h-px bg-zinc-800" />
                    </div>

                    {/* Email form */}
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email" className="text-zinc-100 text-sm">Email</Label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="tu@email.com"
                          value={loginEmail}
                          onChange={e => setLoginEmail(e.target.value)}
                          required
                          className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-violet-500 focus:ring-violet-500/20 h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password" className="text-zinc-100 text-sm">Contraseña</Label>
                        <div className="relative">
                          <Input
                            id="login-password"
                            type={showLoginPw ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={loginPassword}
                            onChange={e => setLoginPassword(e.target.value)}
                            required
                            className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-violet-500 focus:ring-violet-500/20 h-11 rounded-xl pr-11"
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginPw(!showLoginPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            {showLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {loginError && (
                        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          {loginError}
                        </div>
                      )}

                      <Button
                        type="submit"
                        className="w-full bg-violet-600 hover:bg-violet-700 text-white h-11 rounded-xl font-medium"
                        disabled={loginLoading}
                      >
                        {loginLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Ingresar
                      </Button>
                    </form>

                    <p className="text-center text-sm text-zinc-500">
                      ¿No tienes cuenta?{' '}
                      <button onClick={() => setTab('register')} className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                        Crear cuenta
                      </button>
                    </p>
                  </div>
                )}

                {/* ── REGISTER TAB ── */}
                {tab === 'register' && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    {/* Register form */}
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reg-name" className="text-zinc-100 text-sm">Nombre completo</Label>
                        <Input
                          id="reg-name"
                          type="text"
                          placeholder="Tu nombre"
                          value={regName}
                          onChange={e => setRegName(e.target.value)}
                          required
                          className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-violet-500 focus:ring-violet-500/20 h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-email" className="text-zinc-100 text-sm">Email</Label>
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder="tu@email.com"
                          value={regEmail}
                          onChange={e => setRegEmail(e.target.value)}
                          required
                          className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-violet-500 focus:ring-violet-500/20 h-11 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-password" className="text-zinc-100 text-sm">Contraseña</Label>
                        <div className="relative">
                          <Input
                            id="reg-password"
                            type={showRegPw ? 'text' : 'password'}
                            placeholder="Mínimo 6 caracteres"
                            value={regPassword}
                            onChange={e => setRegPassword(e.target.value)}
                            required
                            className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-violet-500 focus:ring-violet-500/20 h-11 rounded-xl pr-11"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPw(!showRegPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            {showRegPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-confirm" className="text-zinc-100 text-sm">Confirmar contraseña</Label>
                        <div className="relative">
                          <Input
                            id="reg-confirm"
                            type={showRegConfirm ? 'text' : 'password'}
                            placeholder="Repite la contraseña"
                            value={regConfirm}
                            onChange={e => setRegConfirm(e.target.value)}
                            required
                            className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-violet-500 focus:ring-violet-500/20 h-11 rounded-xl pr-11"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegConfirm(!showRegConfirm)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            {showRegConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {regError && (
                        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          {regError}
                        </div>
                      )}

                      <Button
                        type="submit"
                        className="w-full bg-violet-600 hover:bg-violet-700 text-white h-11 rounded-xl font-medium"
                        disabled={regLoading}
                      >
                        {regLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Crear cuenta
                      </Button>
                    </form>

                    <p className="text-center text-sm text-zinc-500">
                      ¿Ya tienes cuenta?{' '}
                      <button onClick={() => setTab('login')} className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                        Iniciar sesión
                      </button>
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ═══ RIGHT COLUMN — Feature Showcase ═══ */}
        <div className="hidden lg:flex w-[55%] bg-gradient-to-br from-violet-950 via-violet-950/80 to-zinc-950 relative overflow-hidden items-center justify-center p-12">
          {/* Subtle background glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="relative w-full max-w-[640px] h-[600px] overflow-hidden mask-gradient">
            {/* Mask for smooth fade at top/bottom */}
            <div className="absolute inset-0 z-10 pointer-events-none"
              style={{
                maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
              }}
            >
              <div className="flex gap-5 h-full">
                {/* Left column — scrolls up */}
                <div className="flex-1 overflow-hidden">
                  <div className="scroll-up">
                    {[...features.slice(0, 4), ...features.slice(0, 4)].map((f, i) => (
                      <FeatureCard key={`up-${i}`} icon={f.icon} title={f.title} desc={f.desc} />
                    ))}
                  </div>
                </div>

                {/* Right column — scrolls down */}
                <div className="flex-1 overflow-hidden">
                  <div className="scroll-down">
                    {[...features.slice(4), ...features.slice(4)].map((f, i) => (
                      <FeatureCard key={`down-${i}`} icon={f.icon} title={f.title} desc={f.desc} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}

/* ─── Feature Card ─── */
function FeatureCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="mb-5 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6 shadow-lg shadow-violet-500/5 hover:bg-white/[0.08] transition-colors">
      <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-violet-400" />
      </div>
      <h3 className="text-white font-semibold mb-1.5">{title}</h3>
      <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

/* ─── Status Screen ─── */
function StatusScreen({ status, onSignOut }: { status: string; onSignOut: () => void }) {
  const config: Record<string, { icon: any; title: string; desc: string; color: string; bg: string }> = {
    pending: {
      icon: Clock,
      title: 'Cuenta pendiente de aprobación',
      desc: 'Tu cuenta está siendo revisada. Te notificaremos cuando sea aprobada.',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    rejected: {
      icon: ShieldX,
      title: 'Acceso denegado',
      desc: 'Tu solicitud de acceso ha sido rechazada. Contacta al administrador para más información.',
      color: 'text-red-400',
      bg: 'bg-red-500/10',
    },
    suspended: {
      icon: Ban,
      title: 'Cuenta suspendida',
      desc: 'Tu cuenta ha sido suspendida. Contacta al administrador para más información.',
      color: 'text-zinc-400',
      bg: 'bg-zinc-500/10',
    },
  };

  const c = config[status] || config.pending;
  const Icon = c.icon;

  return (
    <>
      <style>{scrollStyles}</style>
      <div className="min-h-screen flex flex-col lg:flex-row bg-zinc-950">
        {/* Left — Status message */}
        <div className="w-full lg:w-[45%] flex flex-col items-center justify-center px-6 py-12 lg:py-0 relative">
          <div className="absolute top-8 left-8 flex items-center gap-2">
            <Zap className="w-7 h-7 text-violet-500" />
            <span className="text-2xl font-bold tracking-tight text-white">Hooq</span>
          </div>

          <div className="text-center space-y-5 max-w-sm">
            <div className={`w-20 h-20 rounded-full ${c.bg} flex items-center justify-center mx-auto`}>
              <Icon className={`w-10 h-10 ${c.color}`} />
            </div>
            <h2 className="text-2xl font-bold text-white">{c.title}</h2>
            <p className="text-zinc-400 leading-relaxed">{c.desc}</p>
            <Button
              variant="outline"
              onClick={onSignOut}
              className="mt-4 border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-xl"
            >
              Cerrar sesión
            </Button>
          </div>
        </div>

        {/* Right — Feature showcase (same as login) */}
        <div className="hidden lg:flex w-[55%] bg-gradient-to-br from-violet-950 via-violet-950/80 to-zinc-950 relative overflow-hidden items-center justify-center p-12">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="relative w-full max-w-[640px] h-[600px] overflow-hidden">
            <div className="absolute inset-0 z-10 pointer-events-none"
              style={{
                maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
              }}
            >
              <div className="flex gap-5 h-full">
                <div className="flex-1 overflow-hidden">
                  <div className="scroll-up">
                    {[...features.slice(0, 4), ...features.slice(0, 4)].map((f, i) => (
                      <FeatureCard key={`up-${i}`} icon={f.icon} title={f.title} desc={f.desc} />
                    ))}
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="scroll-down">
                    {[...features.slice(4), ...features.slice(4)].map((f, i) => (
                      <FeatureCard key={`down-${i}`} icon={f.icon} title={f.title} desc={f.desc} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
