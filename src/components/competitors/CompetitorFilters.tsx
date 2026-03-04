import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

interface CompetitorFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  igStatus: string;
  onIgStatusChange: (v: string) => void;
  tiktokStatus: string;
  onTiktokStatusChange: (v: string) => void;
  keywords: string[];
  keyword: string;
  onKeywordChange: (v: string) => void;
}

export function CompetitorFilters({
  search, onSearchChange,
  igStatus, onIgStatusChange,
  tiktokStatus, onTiktokStatusChange,
  keywords, keyword, onKeywordChange,
}: CompetitorFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={keyword} onValueChange={onKeywordChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Keyword" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          {keywords.map((k) => (
            <SelectItem key={k} value={k}>{k}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={igStatus} onValueChange={onIgStatusChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Instagram" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">IG: Todos</SelectItem>
          <SelectItem value="found">IG: Encontrado</SelectItem>
          <SelectItem value="not_found">IG: No encontrado</SelectItem>
          <SelectItem value="pending">IG: Pendiente</SelectItem>
        </SelectContent>
      </Select>
      <Select value={tiktokStatus} onValueChange={onTiktokStatusChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="TikTok" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">TikTok: Todos</SelectItem>
          <SelectItem value="found">TikTok: Encontrado</SelectItem>
          <SelectItem value="not_found">TikTok: No encontrado</SelectItem>
          <SelectItem value="pending">TikTok: Pendiente</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
