import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CompetitorProfile } from '@/types';

interface OrganicPostFiltersProps {
  platform: string;
  onPlatformChange: (v: string) => void;
  postType: string;
  onPostTypeChange: (v: string) => void;
  competitorId: string;
  onCompetitorChange: (v: string) => void;
  competitors: CompetitorProfile[];
  minViews: string;
  onMinViewsChange: (v: string) => void;
}

export function OrganicPostFilters({
  platform, onPlatformChange,
  postType, onPostTypeChange,
  competitorId, onCompetitorChange,
  competitors,
  minViews, onMinViewsChange,
}: OrganicPostFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <Select value={platform} onValueChange={onPlatformChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Plataforma" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="instagram">Instagram</SelectItem>
          <SelectItem value="tiktok">TikTok</SelectItem>
        </SelectContent>
      </Select>
      <Select value={postType} onValueChange={onPostTypeChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="video">Video</SelectItem>
          <SelectItem value="image">Imagen</SelectItem>
          <SelectItem value="carousel">Carrusel</SelectItem>
        </SelectContent>
      </Select>
      <Select value={competitorId} onValueChange={onCompetitorChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Competidor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {competitors.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.fb_page_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="number"
        placeholder="Min. views"
        value={minViews}
        onChange={(e) => onMinViewsChange(e.target.value)}
        className="w-[130px]"
      />
    </div>
  );
}
