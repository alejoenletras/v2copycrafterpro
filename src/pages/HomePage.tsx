import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
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
  ArrowRight,
  Loader2,
} from "lucide-react";

const featureCards = [
  {
    icon: Brain,
    to: "/dnas",
    title: "DNAs de Marca",
    description: "Define la personalidad, audiencia y producto de tu marca",
  },
  {
    icon: FileText,
    to: "/vsl",
    title: "VSL Maker",
    description: "Genera scripts de venta completos secci\u00f3n por secci\u00f3n",
  },
  {
    icon: Search,
    to: "/ads-agent",
    title: "Agente de Ads",
    description: "Busca y analiza anuncios ganadores en m\u00faltiples plataformas",
  },
  {
    icon: MessageSquare,
    to: "/brand-chat",
    title: "Chat de Marca",
    description: "Asistente IA entrenado con la voz de tu marca",
  },
  {
    icon: BarChart3,
    to: "/surveys",
    title: "An\u00e1lisis de Encuestas",
    description: "Convierte encuestas en avatares de comprador",
  },
  {
    icon: Video,
    to: "/video-inspiration",
    title: "Video Inspiration",
    description: "Analiza videos virales y encuentra ads similares",
  },
  {
    icon: Users,
    to: "/referentes",
    title: "Referentes",
    description: "Gestiona referentes y modela su contenido",
  },
  {
    icon: FileEdit,
    to: "/references",
    title: "Training",
    description: "Entrena la IA con correcciones y referencias",
  },
];

interface Stats {
  dnas: number;
  conversations: number;
  surveys: number;
  vslProjects: number;
}

export default function HomePage() {
  const { user, profile } = useAuth();
  const userId = useUserId();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "usuario";

  useEffect(() => {
    if (!userId || userId === "default-user") return;

    async function fetchStats() {
      setLoadingStats(true);
      try {
        const [dnasRes, convsRes, surveysRes, vslRes] = await Promise.all([
          supabase
            .from("dnas" as any)
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId),
          supabase
            .from("chat_conversations" as any)
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId),
          supabase
            .from("survey_analyses" as any)
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId),
          supabase
            .from("vsl_projects" as any)
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId),
        ]);

        setStats({
          dnas: (dnasRes as any).count ?? 0,
          conversations: (convsRes as any).count ?? 0,
          surveys: (surveysRes as any).count ?? 0,
          vslProjects: (vslRes as any).count ?? 0,
        });
      } catch {
        setStats({ dnas: 0, conversations: 0, surveys: 0, vslProjects: 0 });
      } finally {
        setLoadingStats(false);
      }
    }

    fetchStats();
  }, [userId]);

  const statCards = [
    { icon: Brain, value: stats?.dnas ?? 0, label: "DNAs creados" },
    {
      icon: MessageSquare,
      value: stats?.conversations ?? 0,
      label: "Conversaciones",
    },
    {
      icon: BarChart3,
      value: stats?.surveys ?? 0,
      label: "An\u00e1lisis de encuestas",
    },
    { icon: FileText, value: stats?.vslProjects ?? 0, label: "Proyectos VSL" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          Bienvenido a Hooq
          {displayName ? (
            <span className="text-violet-400">, {displayName}</span>
          ) : null}
        </h1>
        <p className="mt-1 text-zinc-400 text-lg">
          Tu plataforma de copywriting con IA
        </p>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {featureCards.map((card) => (
          <NavLink
            key={card.to}
            to={card.to}
            className="group bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3 transition-all duration-200 hover:border-violet-500/30 hover:bg-zinc-900 hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between">
              <card.icon className="w-6 h-6 text-violet-400" />
              <ArrowRight className="w-4 h-4 text-zinc-600 transition-colors group-hover:text-violet-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-base">
                {card.title}
              </h3>
              <p className="text-zinc-400 text-sm mt-1">{card.description}</p>
            </div>
          </NavLink>
        ))}
      </div>

      {/* Usage Stats */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">
          Actividad reciente
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 flex flex-col items-center gap-1"
            >
              <stat.icon className="w-5 h-5 text-violet-400 mb-1" />
              {loadingStats ? (
                <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
              ) : (
                <span className="text-2xl font-bold text-white">
                  {stat.value}
                </span>
              )}
              <span className="text-xs text-zinc-500 text-center">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
