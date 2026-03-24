import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  Layers, BookOpen, Search, Video, Users, Sparkles, Film,
  FileText, Activity, Zap, Menu, X, BarChart2, MessageSquare,
  Shield, LogOut,
} from 'lucide-react';

const NAV_GROUPS = [
  {
    label: 'CONFIGURAR',
    items: [
      { label: 'DNAs', href: '/dnas', icon: Layers },
      { label: 'Training', href: '/references', icon: BookOpen },
    ],
  },
  {
    label: 'INVESTIGAR',
    items: [
      { label: 'Referentes', href: '/referentes', icon: Search },
      { label: 'Video inspiration', href: '/video-inspiration', icon: Video },
      { label: 'Competencia', href: '/competitors', icon: Users },
      { label: 'Encuestas', href: '/surveys', icon: BarChart2 },
    ],
  },
  {
    label: 'GENERAR',
    items: [
      { label: 'Agente de ads', href: '/ads-agent', icon: Sparkles },
      { label: 'VSL maker', href: '/vsl', icon: Film },
      { label: 'Chat de marca', href: '/brand-chat', icon: MessageSquare },
    ],
  },
  {
    label: 'RESULTADOS',
    items: [
      { label: 'Guiones', href: '/scripts', icon: FileText, showBadge: true },
      { label: 'Historial', href: '/runs', icon: Activity },
    ],
  },
];

export default function Sidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, profile, isAdmin: profileIsAdmin, signOut } = useAuth();

  // Fallback: check admin by email if profile fetch fails
  const ADMIN_EMAILS = ['alejoenletras@gmail.com'];
  const isAdmin = profileIsAdmin || (user?.email ? ADMIN_EMAILS.includes(user.email) : false);

  const { data: draftCount = 0 } = useQuery({
    queryKey: ['scripts-draft-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('modeled_scripts' as any)
        .select('id', { count: 'exact', head: true })
        .eq('status', 'draft');
      return count ?? 0;
    },
    refetchInterval: 30000,
  });

  // Build nav groups with optional admin section
  const allGroups = isAdmin
    ? [
        ...NAV_GROUPS,
        {
          label: 'ADMIN',
          items: [
            { label: 'Usuarios', href: '/admin', icon: Shield },
          ],
        },
      ]
    : NAV_GROUPS;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-border">
        <Zap className="w-5 h-5 text-violet-500 shrink-0" />
        <span className="font-bold text-base tracking-tight">Hooq</span>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {allGroups.map((group) => (
          <div key={group.label}>
            <p className="px-2 mb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href ||
                  (item.href !== '/' && location.pathname.startsWith(item.href));
                const badge = (item as any).showBadge && draftCount > 0 ? draftCount : 0;

                return (
                  <li key={item.href}>
                    <NavLink
                      to={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] transition-colors',
                        isActive
                          ? 'bg-violet-50 text-violet-700 font-medium'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {badge > 0 && (
                        <span className="text-[11px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium leading-none">
                          {badge}
                        </span>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User info + sign out */}
      {profile && (
        <div className="border-t border-border px-3 py-3 space-y-2">
          <div className="truncate">
            <p className="text-[13px] font-medium truncate">
              {profile.full_name || 'Usuario'}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {profile.email}
            </p>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-[13px] text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Cerrar sesion
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[220px] shrink-0 bg-card border-r border-border h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile hamburger */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-md bg-card border border-border shadow-sm"
        onClick={() => setMobileOpen(o => !o)}
      >
        {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="md:hidden fixed left-0 top-0 h-full w-[220px] bg-card border-r border-border z-50">
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}
