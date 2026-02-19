import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Copy,
  Download,
  RefreshCw,
  Presentation,
  Mail,
  MessageCircle,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

// Parse autowebinar content into 3 sections using markers or text patterns
function parseAutowebinarSections(content: string) {
  const sections: { landing: string; emails: string; whatsapp: string } = {
    landing: '',
    emails: '',
    whatsapp: '',
  };

  // Method 1: HTML comment markers (new edge function with 3-call split)
  const landingMarker = '<!-- SECTION:LANDING_WEBINAR -->';
  const emailsMarker = '<!-- SECTION:EMAILS -->';
  const whatsappMarker = '<!-- SECTION:WHATSAPP -->';

  if (content.includes(landingMarker)) {
    const landingStart = content.indexOf(landingMarker);
    const emailsStart = content.indexOf(emailsMarker);
    const whatsappStart = content.indexOf(whatsappMarker);

    if (landingStart !== -1 && emailsStart !== -1) {
      sections.landing = content.substring(landingStart + landingMarker.length, emailsStart).trim();
    }
    if (emailsStart !== -1 && whatsappStart !== -1) {
      sections.emails = content.substring(emailsStart + emailsMarker.length, whatsappStart).trim();
    }
    if (whatsappStart !== -1) {
      sections.whatsapp = content.substring(whatsappStart + whatsappMarker.length).trim();
    }

    return { sections, hasSections: true };
  }

  // Method 2: Text-based detection (legacy copies without markers)
  const emailPatterns = [
    /\n(?=[#=─━\-*]{2,}[^\n]*\n[^\n]*(?:SECUENCIA|SERIE|CAMPAÑA)\s+DE\s+(?:EMAILS?|CORREOS?))/im,
    /\n(?=(?:#{1,4}\s+)?(?:🔴\s*)?.*(?:SECUENCIA|SERIE|CAMPAÑA)\s+DE\s+(?:EMAILS?|CORREOS?))/im,
    /\n(?=(?:#{1,4}\s+)?(?:🔴\s*)?.*(?:ETAPA|PARTE)\s*(?:2|II)\s*[:\-–]?\s*(?:EMAILS?|CORREOS?))/im,
    /\n(?=(?:#{1,4}\s+)?(?:🔴\s*)?EMAIL\s*(?:#?\s*1)\s*[:\-–])/im,
  ];

  const whatsappPatterns = [
    /\n(?=[#=─━\-*]{2,}[^\n]*\n[^\n]*(?:COMUNICADOS?|MENSAJES?)\s+(?:DE\s+)?WHATSAPP)/im,
    /\n(?=(?:#{1,4}\s+)?(?:🔴\s*)?.*(?:COMUNICADOS?|MENSAJES?)\s+(?:DE\s+)?WHATSAPP)/im,
    /\n(?=(?:#{1,4}\s+)?(?:🔴\s*)?.*(?:ETAPA|PARTE)\s*(?:3|III)\s*[:\-–]?\s*WHATSAPP)/im,
    /\n(?=(?:#{1,4}\s+)?(?:🔴\s*)?COMUNICADO\s*(?:#?\s*1)\s*[:\-–])/im,
  ];

  let emailIndex = -1;
  let whatsappIndex = -1;

  for (const pattern of emailPatterns) {
    const match = content.match(pattern);
    if (match?.index !== undefined) {
      emailIndex = match.index;
      break;
    }
  }

  for (const pattern of whatsappPatterns) {
    const match = content.match(pattern);
    if (match?.index !== undefined && (emailIndex === -1 || match.index > emailIndex)) {
      whatsappIndex = match.index;
      break;
    }
  }

  if (emailIndex !== -1 && whatsappIndex !== -1 && emailIndex < whatsappIndex) {
    sections.landing = content.substring(0, emailIndex).trim();
    sections.emails = content.substring(emailIndex, whatsappIndex).trim();
    sections.whatsapp = content.substring(whatsappIndex).trim();
    return { sections, hasSections: true };
  }

  if (emailIndex !== -1) {
    sections.landing = content.substring(0, emailIndex).trim();
    sections.emails = content.substring(emailIndex).trim();
    return { sections, hasSections: true };
  }

  // Method 3: No sections detected - content is a single block
  return { sections, hasSections: false };
}

const AUTOWEBINAR_TABS = [
  {
    id: 'landing',
    label: 'Landing + Webinar',
    icon: Presentation,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    description: 'Pagina de captacion y guion del webinar'
  },
  {
    id: 'emails',
    label: 'Emails',
    icon: Mail,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
    description: 'Secuencia de 15 emails de venta'
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: MessageCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-500/10',
    description: '30 comunicados de WhatsApp + grupo'
  },
] as const;

export default function GeneratedCopyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('all');

  // Cargar copy de Supabase
  const { data: copyData, isLoading } = useQuery({
    queryKey: ['generated-copy', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('generated_copies')
        .select(`
          *,
          project:projects(*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleCopySection = (content: string, label: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: 'Copiado',
      description: `${label} copiado al portapapeles`,
    });
  };

  const handleDownloadSection = (content: string, label: string) => {
    const productNameRaw = (copyData?.project as any)?.product_info?.name || 'generado';
    const safeProductName = String(productNameRaw)
      .trim()
      .slice(0, 60)
      .replace(/[^a-z0-9-_]+/gi, '-');

    const safeLabel = label.toLowerCase().replace(/[^a-z0-9]+/gi, '-');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `copy-${safeProductName}-${safeLabel}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyAll = () => {
    if (copyData?.content) {
      // Strip section markers for clean copy
      const cleanContent = copyData.content
        .replace(/<!-- SECTION:LANDING_WEBINAR -->\n?/g, '')
        .replace(/<!-- SECTION:EMAILS -->\n?/g, '')
        .replace(/<!-- SECTION:WHATSAPP -->\n?/g, '');
      navigator.clipboard.writeText(cleanContent);
      toast({
        title: 'Copiado',
        description: 'Todo el copy copiado al portapapeles',
      });
    }
  };

  const handleDownloadAll = () => {
    if (copyData?.content) {
      const cleanContent = copyData.content
        .replace(/<!-- SECTION:LANDING_WEBINAR -->\n?/g, '')
        .replace(/<!-- SECTION:EMAILS -->\n?/g, '')
        .replace(/<!-- SECTION:WHATSAPP -->\n?/g, '');

      const productNameRaw = (copyData.project as any)?.product_info?.name || 'generado';
      const safeProductName = String(productNameRaw)
        .trim()
        .slice(0, 60)
        .replace(/[^a-z0-9-_]+/gi, '-');

      const blob = new Blob([cleanContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `copy-${safeProductName}-completo.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando copy...</p>
        </div>
      </div>
    );
  }

  if (!copyData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">Copy no encontrado</p>
          <Button onClick={() => navigate('/')}>Volver al Dashboard</Button>
        </div>
      </div>
    );
  }

  const validation = (copyData.validation as Record<string, any>) || {};
  const estimatedConversion = (copyData.estimated_conversion as Record<string, any>) || {};
  const project = copyData.project as Record<string, any> || {};
  const productInfo = project.product_info || {};
  const isAutowebinar = project.funnel_type === 'autowebinar';

  // Parse sections for autowebinar
  const { sections } = isAutowebinar
    ? parseAutowebinarSections(copyData.content || '')
    : { sections: { landing: '', emails: '', whatsapp: '' } };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6">

        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Dashboard
          </Button>

          <Card className="p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {productInfo.name || 'Copy Generado'}
                </h1>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">
                    {project.funnel_type?.toUpperCase() || 'VSL'}
                  </Badge>
                  <Badge variant="outline">
                    {project.country || 'colombia'}
                  </Badge>
                  {isAutowebinar && (
                    <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
                      3 ETAPAS
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Generado: {new Date(copyData.created_at || '').toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCopyAll}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Todo
                </Button>
                <Button variant="outline" onClick={handleDownloadAll}>
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Todo
                </Button>
              </div>
            </div>

            {/* Scores de validacion */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">PILAR 1: EXPERTO</p>
                  <span className="text-lg font-bold text-primary">
                    {validation.pilar1Score || 95}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${validation.pilar1Score || 95}%` }}
                  />
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">PILAR 2: AVATAR</p>
                  <span className="text-lg font-bold text-primary">
                    {validation.pilar2Score || 98}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${validation.pilar2Score || 98}%` }}
                  />
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">PILAR 3: PERSUASION</p>
                  <span className="text-lg font-bold text-primary">
                    {validation.pilar3Score || 92}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${validation.pilar3Score || 92}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Estimacion de conversion */}
            <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Estimacion de Conversion
              </p>
              <p className="text-2xl font-bold text-foreground">
                {estimatedConversion.min || 2.0}% - {estimatedConversion.max || 3.5}%
              </p>
            </div>
          </Card>
        </div>

        {/* Copy Content */}
        {isAutowebinar ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4 h-auto p-1">
              <TabsTrigger value="all" className="flex items-center gap-2 py-3">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Todo</span>
              </TabsTrigger>
              {AUTOWEBINAR_TABS.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2 py-3">
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Tab: Todo completo */}
            <TabsContent value="all">
              <Card className="p-6">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>
                    {(copyData.content || '')
                      .replace(/<!-- SECTION:LANDING_WEBINAR -->\n?/g, '')
                      .replace(/<!-- SECTION:EMAILS -->\n?/g, '')
                      .replace(/<!-- SECTION:WHATSAPP -->\n?/g, '')}
                  </ReactMarkdown>
                </div>
              </Card>
            </TabsContent>

            {/* Tab: Landing + Webinar */}
            <TabsContent value="landing">
              <div className="space-y-4">
                <Card className="p-4 bg-blue-500/5 border-blue-500/20">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Presentation className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Etapa 1: Landing + Webinar</h3>
                        <p className="text-sm text-muted-foreground">Pagina de captacion y guion completo del webinar</p>
                      </div>
                    </div>
                    {sections.landing && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleCopySection(sections.landing, 'Landing + Webinar')}>
                          <Copy className="w-3 h-3 mr-1" />
                          Copiar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDownloadSection(sections.landing, 'landing-webinar')}>
                          <Download className="w-3 h-3 mr-1" />
                          Descargar
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
                {sections.landing ? (
                  <Card className="p-6">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>{sections.landing}</ReactMarkdown>
                    </div>
                  </Card>
                ) : (
                  <Card className="p-8 text-center border-dashed">
                    <Presentation className="w-10 h-10 text-blue-400 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium mb-1">Seccion no disponible por separado</p>
                    <p className="text-sm text-muted-foreground">
                      Este copy fue generado antes de la funcion de etapas. Regenera el copy para ver cada etapa por separado, o usa la pestana "Todo".
                    </p>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Tab: Emails */}
            <TabsContent value="emails">
              <div className="space-y-4">
                <Card className="p-4 bg-purple-500/5 border-purple-500/20">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Etapa 2: Secuencia de Emails</h3>
                        <p className="text-sm text-muted-foreground">15 emails de la secuencia de venta</p>
                      </div>
                    </div>
                    {sections.emails && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleCopySection(sections.emails, 'Emails')}>
                          <Copy className="w-3 h-3 mr-1" />
                          Copiar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDownloadSection(sections.emails, 'emails')}>
                          <Download className="w-3 h-3 mr-1" />
                          Descargar
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
                {sections.emails ? (
                  <Card className="p-6">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>{sections.emails}</ReactMarkdown>
                    </div>
                  </Card>
                ) : (
                  <Card className="p-8 text-center border-dashed">
                    <Mail className="w-10 h-10 text-purple-400 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium mb-1">Seccion no disponible por separado</p>
                    <p className="text-sm text-muted-foreground">
                      Este copy fue generado antes de la funcion de etapas. Regenera el copy para ver cada etapa por separado, o usa la pestana "Todo".
                    </p>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Tab: WhatsApp */}
            <TabsContent value="whatsapp">
              <div className="space-y-4">
                <Card className="p-4 bg-green-500/5 border-green-500/20">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Etapa 3: WhatsApp + Grupo</h3>
                        <p className="text-sm text-muted-foreground">30 comunicados de WhatsApp y grupo</p>
                      </div>
                    </div>
                    {sections.whatsapp && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleCopySection(sections.whatsapp, 'WhatsApp')}>
                          <Copy className="w-3 h-3 mr-1" />
                          Copiar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDownloadSection(sections.whatsapp, 'whatsapp')}>
                          <Download className="w-3 h-3 mr-1" />
                          Descargar
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
                {sections.whatsapp ? (
                  <Card className="p-6">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>{sections.whatsapp}</ReactMarkdown>
                    </div>
                  </Card>
                ) : (
                  <Card className="p-8 text-center border-dashed">
                    <MessageCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium mb-1">Seccion no disponible por separado</p>
                    <p className="text-sm text-muted-foreground">
                      Este copy fue generado antes de la funcion de etapas. Regenera el copy para ver cada etapa por separado, o usa la pestana "Todo".
                    </p>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          /* Non-autowebinar: single content block */
          <Card className="p-6">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{copyData.content}</ReactMarkdown>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
