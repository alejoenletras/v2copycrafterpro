import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Zap, Loader2, AlertCircle, Clock, ShieldX, Ban } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const { user, profile, loading, isApproved, signIn, signUp, signOut } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
      </div>
    );
  }

  // Already logged in and approved
  if (user && isApproved) {
    return <Navigate to="/dnas" replace />;
  }

  // Logged in but not approved — show status screen
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
      setLoginError(err.message === 'Invalid login credentials'
        ? 'Email o contrasena incorrectos'
        : err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (regPassword.length < 6) {
      setRegError('La contrasena debe tener al menos 6 caracteres');
      return;
    }
    if (regPassword !== regConfirm) {
      setRegError('Las contrasenas no coinciden');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <Card className="w-full max-w-md border-border/50 bg-slate-900/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="w-7 h-7 text-violet-500" />
            <span className="text-2xl font-bold tracking-tight text-white">Hooq</span>
          </div>
          <CardDescription className="text-slate-400">
            Plataforma de copywriting con IA
          </CardDescription>
        </CardHeader>

        <CardContent>
          {regSuccess ? (
            <div className="text-center py-6 space-y-3">
              <Clock className="w-12 h-12 text-amber-400 mx-auto" />
              <h3 className="text-lg font-semibold text-white">Registro exitoso</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Tu cuenta esta pendiente de aprobacion.
                Te notificaremos cuando sea aprobada.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setRegSuccess(false);
                  setTab('login');
                }}
              >
                Volver al inicio de sesion
              </Button>
            </div>
          ) : (
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'login' | 'register')}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Iniciar sesion</TabsTrigger>
                <TabsTrigger value="register">Registrarse</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      required
                      className="bg-slate-800/50 border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Contrasena</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      required
                      className="bg-slate-800/50 border-slate-700"
                    />
                  </div>
                  {loginError && (
                    <div className="flex items-center gap-2 text-sm text-red-400">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {loginError}
                    </div>
                  )}
                  <Button
                    type="submit"
                    className="w-full bg-violet-600 hover:bg-violet-700"
                    disabled={loginLoading}
                  >
                    {loginLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Iniciar sesion
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Nombre completo</Label>
                    <Input
                      id="reg-name"
                      type="text"
                      placeholder="Tu nombre"
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                      required
                      className="bg-slate-800/50 border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      required
                      className="bg-slate-800/50 border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Contrasena</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="Minimo 6 caracteres"
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      required
                      className="bg-slate-800/50 border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-confirm">Confirmar contrasena</Label>
                    <Input
                      id="reg-confirm"
                      type="password"
                      placeholder="Repite la contrasena"
                      value={regConfirm}
                      onChange={e => setRegConfirm(e.target.value)}
                      required
                      className="bg-slate-800/50 border-slate-700"
                    />
                  </div>
                  {regError && (
                    <div className="flex items-center gap-2 text-sm text-red-400">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {regError}
                    </div>
                  )}
                  <Button
                    type="submit"
                    className="w-full bg-violet-600 hover:bg-violet-700"
                    disabled={regLoading}
                  >
                    {regLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Crear cuenta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusScreen({ status, onSignOut }: { status: string; onSignOut: () => void }) {
  const config: Record<string, { icon: any; title: string; desc: string; color: string }> = {
    pending: {
      icon: Clock,
      title: 'Cuenta pendiente de aprobacion',
      desc: 'Tu cuenta esta siendo revisada. Te notificaremos cuando sea aprobada.',
      color: 'text-amber-400',
    },
    rejected: {
      icon: ShieldX,
      title: 'Acceso denegado',
      desc: 'Tu solicitud de acceso ha sido rechazada. Contacta al administrador para mas informacion.',
      color: 'text-red-400',
    },
    suspended: {
      icon: Ban,
      title: 'Cuenta suspendida',
      desc: 'Tu cuenta ha sido suspendida. Contacta al administrador para mas informacion.',
      color: 'text-slate-400',
    },
  };

  const c = config[status] || config.pending;
  const Icon = c.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <Card className="w-full max-w-md border-border/50 bg-slate-900/80 backdrop-blur-sm">
        <CardContent className="text-center py-10 space-y-4">
          <Icon className={`w-14 h-14 mx-auto ${c.color}`} />
          <h2 className="text-xl font-semibold text-white">{c.title}</h2>
          <p className="text-sm text-slate-400 leading-relaxed">{c.desc}</p>
          <Button variant="outline" onClick={onSignOut} className="mt-4">
            Cerrar sesion
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
