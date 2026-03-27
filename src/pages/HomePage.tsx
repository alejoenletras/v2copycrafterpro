import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserId } from "@/hooks/useUserId";
import { supabase } from "@/lib/supabase";
import {
  Brain,
  FileText,
  Search,
  MessageSquare,
  BarChart3,
  Video,
  Users,
  FileEdit,
  ChevronRight,
  Activity,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const featureCards = [
  {
    icon: Brain,
    to: "/dnas",
    title: "DNAs de Marca",
    description: "Define personalidad, audiencia y producto",
  },
  {
    icon: FileText,
    to: "/vsl",
    title: "VSL Maker",
    description: "Scripts de venta seccion por seccion",
  },
  {
    icon: Search,
    to: "/ads-agent",
    title: "Agente de Ads",
    description: "Busca anuncios ganadores multi-plataforma",
  },
  {
    icon: MessageSquare,
    to: "/brand-chat",
    title: "Chat de Marca",
    description: "Asistente IA con la voz de tu marca",
  },
  {
    icon: BarChart3,
    to: "/surveys",
    title: "Analisis de Encuestas",
    description: "Encuestas → avatares de comprador",
  },
  {
    icon: Video,
    to: "/video-inspiration",
    title: "Video Inspiration",
    description: "Analiza videos y encuentra ads similares",
  },
  {
    icon: Users,
    to: "/referentes",
    title: "Referentes",
    description: "Gestiona y modela contenido de referentes",
  },
  {
    icon: FileEdit,
    to: "/references",
    title: "Training",
    description: "Entrena la IA con correcciones",
  },
];

interface Stats {
  dnas: number;
  conversations: number;
  surveys: number;
  vslProjects: number;
}

type BadgeColor = "violet" | "emerald" | "amber";

interface ActivityItem {
  id: string;
  title: string;
  type: "Chat" | "Encuesta" | "VSL";
  badge: BadgeColor;
  date: Date;
  to: string;
}

const badgeClasses: Record<BadgeColor, string> = {
  violet: "bg-violet-500/10 text-violet-400 border border-violet-500/20",
  emerald: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  amber: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
};

const badgeIcons: Record<string, typeof MessageSquare> = {
  Chat: MessageSquare,
  Encuesta: BarChart3,
  VSL: FileText,
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  const { user, profile } = useAuth();
  const userId = useUserId();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  /* --- Display name & date --- */
  const fullName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "usuario";
  const firstName = fullName.split(" ")[0];

  const now = new Date();
  const dateStr = now.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const capitalizedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  const initials = fullName
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? "")
    .join("");

  /* --- Fetch stats --- */
  useEffect(() => {
    async function fetchStats() {
      if (!userId || !userId) {
        return; // wait for real userId — don't zero out
      }
      setLoadingStats(true);
      try {
        const [dnasRes, convsRes, surveysRes, vslRes] = await Promise.all([
          supabase.from("dnas" as any).select("id").eq("user_id", userId),
          supabase.from("chat_conversations" as any).select("id").eq("user_id", userId),
          supabase.from("survey_analyses" as any).select("id").eq("user_id", userId),
          supabase.from("vsl_projects" as any).select("id").eq("user_id", userId),
        ]);

        setStats({
          dnas: dnasRes.data?.length ?? 0,
          conversations: convsRes.data?.length ?? 0,
          surveys: surveysRes.data?.length ?? 0,
          vslProjects: vslRes.data?.length ?? 0,
        });
      } catch {
        setStats({ dnas: 0, conversations: 0, surveys: 0, vslProjects: 0 });
      } finally {
        setLoadingStats(false);
      }
    }

    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Hard timeout for stats - never skeleton more than 5s after fetch starts
  useEffect(() => {
    if (!loadingStats) return;
    const t = setTimeout(() => {
      setStats(s => s ?? { dnas: 0, conversations: 0, surveys: 0, vslProjects: 0 });
      setLoadingStats(false);
    }, 5000);
    return () => clearTimeout(t);
  }, [loadingStats]);

  /* --- Fetch recent activity --- */
  useEffect(() => {
    async function fetchActivity() {
      if (!userId || !userId) {
        return; // wait for real userId — don't zero out
      }
      setLoadingActivity(true);
      try {
        const [chatsRes, surveysRes, vslRes] = await Promise.all([
          supabase
            .from("chat_conversations" as any)
            .select("id, title, updated_at")
            .eq("user_id", userId)
            .order("updated_at", { ascending: false })
            .limit(3),
          supabase
            .from("survey_analyses" as any)
            .select("id, file_name, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(3),
          supabase
            .from("vsl_projects" as any)
            .select("id, project_name, updated_at")
            .eq("user_id", userId)
            .order("updated_at", { ascending: false })
            .limit(2),
        ]);

        const items: ActivityItem[] = [];

        ((chatsRes as any).data ?? []).forEach((c: any) => {
          items.push({
            id: c.id,
            title: c.title || "Conversacion sin titulo",
            type: "Chat",
            badge: "violet",
            date: new Date(c.updated_at),
            to: "/brand-chat",
          });
        });

        ((surveysRes as any).data ?? []).forEach((s: any) => {
          items.push({
            id: s.id,
            title: s.file_name || "Encuesta sin titulo",
            type: "Encuesta",
            badge: "emerald",
            date: new Date(s.created_at),
            to: "/surveys",
          });
        });

        ((vslRes as any).data ?? []).forEach((v: any) => {
          items.push({
            id: v.id,
            title: v.project_name || "Proyecto sin titulo",
            type: "VSL",
            badge: "amber",
            date: new Date(v.updated_at),
            to: "/vsl",
          });
        });

        items.sort((a, b) => b.date.getTime() - a.date.getTime());
        setActivity(items.slice(0, 8));
      } catch {
        setActivity([]);
      } finally {
        setLoadingActivity(false);
      }
    }

    fetchActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Hard timeout for activity - never skeleton more than 5s after fetch starts
  useEffect(() => {
    if (!loadingActivity) return;
    const t = setTimeout(() => {
      setActivity([]);
      setLoadingActivity(false);
    }, 5000);
    return () => clearTimeout(t);
  }, [loadingActivity]);

  /* --- Helpers --- */
  function relativeDate(d: Date): string {
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Ahora";
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Ayer";
    if (days < 7) return `Hace ${days} dias`;
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  }

  const statCards = [
    {
      icon: Brain,
      value: stats?.dnas ?? 0,
      label: "DNAs creados",
      color: "text-violet-400",
      bg: "bg-violet-500/10",
    },
    {
      icon: MessageSquare,
      value: stats?.conversations ?? 0,
      label: "Conversaciones",
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      icon: BarChart3,
      value: stats?.surveys ?? 0,
      label: "Encuestas analizadas",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      icon: FileText,
      value: stats?.vslProjects ?? 0,
      label: "Proyectos VSL",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
  ];

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="w-full px-6 py-8 space-y-6">
      {/* ---- Top: Greeting ---- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Hola, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground/70 mt-0.5">{capitalizedDate}</p>
        </div>
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center">
          <span className="text-sm font-semibold text-foreground">{initials}</span>
        </div>
      </div>

      {/* ---- Stats Row ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-card border border-border rounded-xl p-5 flex items-start gap-3 transition-all duration-200"
          >
            <div className={`rounded-lg p-2 ${stat.bg}`}>
              <stat.icon className={`w-[18px] h-[18px] ${stat.color}`} />
            </div>
            <div className="min-w-0">
              {loadingStats || !stats ? (
                <div className="h-8 w-10 bg-zinc-800 rounded animate-pulse" />
              ) : (
                <span className="text-3xl font-bold text-foreground leading-none block">
                  {stat.value}
                </span>
              )}
              <span className="text-xs text-muted-foreground/70 mt-1 block">
                {stat.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ---- Main Grid ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column — Herramientas (3/5) */}
        <div className="lg:col-span-3 space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground mb-1">
            Herramientas
          </h2>
          {featureCards.map((card) => (
            <NavLink
              key={card.to}
              to={card.to}
              className="group flex items-center gap-4 bg-card border border-border rounded-xl p-4 transition-all duration-200 hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/5 hover:scale-[1.01]"
            >
              <div className="flex-shrink-0 rounded-lg bg-violet-500/10 p-3">
                <card.icon className="w-5 h-5 text-violet-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {card.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {card.description}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600 flex-shrink-0 transition-colors group-hover:text-zinc-300" />
            </NavLink>
          ))}
        </div>

        {/* Right Column — Actividad reciente (2/5) */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground mb-1">
            Actividad reciente
          </h2>

          {loadingActivity || !stats ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-2 w-1/3 bg-zinc-800 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : activity.length === 0 ? (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-10 flex flex-col items-center justify-center text-center">
              <Activity className="w-8 h-8 text-zinc-700 mb-3" />
              <p className="text-sm text-muted-foreground/70">Sin actividad reciente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activity.map((item) => {
                const BadgeIcon = badgeIcons[item.type];
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.to)}
                    className="w-full text-left bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 flex items-center gap-3 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900"
                  >
                    <div className="flex-shrink-0 rounded-lg bg-zinc-800 p-2">
                      <BadgeIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        {relativeDate(item.date)}
                      </p>
                    </div>
                    <span
                      className={`flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${badgeClasses[item.badge]}`}
                    >
                      {item.type}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
