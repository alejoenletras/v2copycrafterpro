import { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useWizardStore } from '@/store/wizardStore';
import { User, Target, Zap, Globe, Sparkles } from 'lucide-react';

const ANGLE_OPTIONS = [
  { value: 'anti-agencia', label: 'Anti-Agencia', description: '70% más barato que agencias' },
  { value: 'simplicidad', label: 'Simplicidad Extrema', description: 'De idea a campaña en 3 clics' },
  { value: '24-7', label: 'Always On 24/7', description: 'Optimización que nunca duerme' },
  { value: 'democratizacion', label: 'Democratización', description: 'Publicidad pro para todos' },
  { value: 'resultados', label: 'Resultados Garantizados', description: 'ROI real y medible' },
  { value: 'velocidad', label: 'Velocidad', description: '5 minutos y activo' },
  { value: 'personalizado', label: 'Personalizado', description: 'Definir abajo' },
];

const INDUSTRY_OPTIONS = [
  { value: 'ecommerce', label: 'E-commerce / Tiendas Online' },
  { value: 'coaches', label: 'Coaches y Consultores' },
  { value: 'infoproductos', label: 'Infoproductos / Cursos' },
  { value: 'servicios', label: 'Servicios Profesionales' },
  { value: 'restaurantes', label: 'Restaurantes / Locales' },
  { value: 'inmobiliaria', label: 'Inmobiliarias' },
  { value: 'fitness', label: 'Fitness / Nutrición' },
  { value: 'belleza', label: 'Belleza / Estética' },
  { value: 'agencias', label: 'Agencias Pequeñas' },
  { value: 'otro', label: 'Otro' },
];

const COUNTRY_OPTIONS = [
  { value: 'mexico', label: '🇲🇽 México' },
  { value: 'colombia', label: '🇨🇴 Colombia' },
  { value: 'argentina', label: '🇦🇷 Argentina' },
  { value: 'spain', label: '🇪🇸 España' },
  { value: 'usa', label: '🇺🇸 Estados Unidos' },
  { value: 'multiple', label: '🌎 Multinacional (español neutro)' },
];

export default function SaleADSConfigStep() {
  const { project, updateSaleADSConfig } = useWizardStore();

  const saleadsConfig = project.saleadsConfig || {
    expert: {
      expertType: 'founder',
      name: 'Juan Osorio',
      credentials: '+$20M USD invertidos en publicidad, 319K seguidores',
      transformationStory: '',
      whyUseSaleADS: '',
      toneOfVoice: 'Directo, anti-agencia, motivador',
    },
    angle: {
      angleName: '',
      mainEnemy: '',
      bigIdea: '',
      mainPromise: '',
      hook30sec: '',
    },
    avatar: {
      isSpecific: false,
    },
    targetDuration: 20,
    ctaType: 'free-trial' as const,
    targetCountry: 'multiple',
  };

  // Si el usuario llega aquí con el estado vacío (refresh), re-hidratamos defaults.
  useEffect(() => {
    if (!project.saleadsConfig) {
      updateSaleADSConfig(saleadsConfig);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const updateExpert = (updates: Record<string, any>) => {
    updateSaleADSConfig({
      expert: { ...saleadsConfig.expert, ...updates },
    });
  };

  const updateAngle = (updates: Record<string, any>) => {
    updateSaleADSConfig({
      angle: { ...saleadsConfig.angle, ...updates },
    });
  };

  const updateAvatar = (updates: Record<string, any>) => {
    updateSaleADSConfig({
      avatar: { ...saleadsConfig.avatar, ...updates },
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Título */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/10 to-orange-500/10 rounded-full mb-4">
          <Zap className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-semibold text-purple-700">SaleADS.ai VSL</span>
        </div>
        <h2 className="text-3xl font-display font-bold text-foreground mb-2">
          Configuración VSL SaleADS.ai
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Define el experto, ángulo de comunicación y avatar objetivo para este VSL
        </p>
      </div>

      {/* SECCIÓN 1: EXPERTO/NARRADOR */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <User className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Experto/Narrador</h3>
              <p className="text-sm text-muted-foreground">¿Quién presenta este VSL?</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <Label className="text-sm font-medium">Tipo de experto</Label>
              <RadioGroup
                value={saleadsConfig.expert?.expertType || 'founder'}
                onValueChange={(value) => updateExpert({ expertType: value })}
                className="mt-2 space-y-3"
              >
                <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="founder" id="founder" className="mt-0.5" />
                  <div>
                    <Label htmlFor="founder" className="font-semibold cursor-pointer">Juan Osorio (Founder)</Label>
                    <p className="text-sm text-muted-foreground">
                      El fundador de SaleADS.ai, +$20M invertidos, 319K seguidores
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="user" id="user" className="mt-0.5" />
                  <div>
                    <Label htmlFor="user" className="font-semibold cursor-pointer">Usuario Exitoso</Label>
                    <p className="text-sm text-muted-foreground">
                      Un cliente real que tuvo resultados con SaleADS.ai
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="character" id="character" className="mt-0.5" />
                  <div>
                    <Label htmlFor="character" className="font-semibold cursor-pointer">Personaje/Avatar</Label>
                    <p className="text-sm text-muted-foreground">
                      Una identidad creada para este ángulo específico
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {saleadsConfig.expert?.expertType !== 'founder' && (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Nombre del experto</Label>
                  <Input
                    placeholder="Ej: María García"
                    value={saleadsConfig.expert?.name || ''}
                    onChange={(e) => updateExpert({ name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Credenciales principales</Label>
                  <Input
                    placeholder="Ej: Dueña de tienda online, +500 ventas/mes"
                    value={saleadsConfig.expert?.credentials || ''}
                    onChange={(e) => updateExpert({ credentials: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div>
              <Label>Historia de transformación (breve)</Label>
              <Textarea
                placeholder="Ej: Antes gastaba $2000/mes en agencias sin resultados claros. Ahora con SaleADS genero el triple de ventas por $59..."
                rows={3}
                value={saleadsConfig.expert?.transformationStory || ''}
                onChange={(e) => updateExpert({ transformationStory: e.target.value })}
              />
            </div>

            <div>
              <Label>Por qué usa/recomienda SaleADS.ai</Label>
              <Textarea
                placeholder="Ej: Porque me permite competir con grandes marcas sin gastar en agencias"
                rows={2}
                value={saleadsConfig.expert?.whyUseSaleADS || ''}
                onChange={(e) => updateExpert({ whyUseSaleADS: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECCIÓN 2: ÁNGULO DE COMUNICACIÓN */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Ángulo de Comunicación</h3>
              <p className="text-sm text-muted-foreground">El enfoque principal del mensaje</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <Label>Nombre del ángulo</Label>
              <Select
                value={saleadsConfig.angle?.angleName || ''}
                onValueChange={(value) => updateAngle({ angleName: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un ángulo..." />
                </SelectTrigger>
                <SelectContent>
                  {ANGLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Enemigo/Villano principal</Label>
              <Input
                placeholder="Ej: Agencias que cobran $2,000/mes sin resultados claros"
                value={saleadsConfig.angle?.mainEnemy || ''}
                onChange={(e) => updateAngle({ mainEnemy: e.target.value })}
              />
            </div>

            <div>
              <Label>Big Idea (idea central del VSL)</Label>
              <Textarea
                placeholder="Ej: La publicidad profesional no debería costar $2,000/mes cuando la IA puede hacerlo por menos de 1 café al día"
                rows={2}
                value={saleadsConfig.angle?.bigIdea || ''}
                onChange={(e) => updateAngle({ bigIdea: e.target.value })}
              />
            </div>

            <div>
              <Label>Promesa principal</Label>
              <Input
                placeholder="Ej: Campañas profesionales optimizadas 24/7 por menos de $2/día"
                value={saleadsConfig.angle?.mainPromise || ''}
                onChange={(e) => updateAngle({ mainPromise: e.target.value })}
              />
            </div>

            <div>
              <Label>Hook (primeros 30 segundos)</Label>
              <Textarea
                placeholder="Ej: ¿Pagas $2,000/mes a una agencia que básicamente hace lo mismo que una IA puede hacer por $59?"
                rows={3}
                value={saleadsConfig.angle?.hook30sec || ''}
                onChange={(e) => updateAngle({ hook30sec: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECCIÓN 3: AVATAR OBJETIVO */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Avatar Objetivo</h3>
              <p className="text-sm text-muted-foreground">¿A quién le habla este VSL?</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <Label className="text-sm font-medium">¿Avatar específico o general?</Label>
              <RadioGroup
                value={saleadsConfig.avatar?.isSpecific ? 'specific' : 'general'}
                onValueChange={(value) => updateAvatar({ isSpecific: value === 'specific' })}
                className="mt-2 flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="general" id="general" />
                  <Label htmlFor="general" className="cursor-pointer">
                    General (todos los emprendedores)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="specific" id="specific" />
                  <Label htmlFor="specific" className="cursor-pointer">
                    Específico (industria/nicho)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {saleadsConfig.avatar?.isSpecific && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Industria/Nicho</Label>
                    <Select
                      value={saleadsConfig.avatar?.industry || ''}
                      onValueChange={(value) => updateAvatar({ industry: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona industria..." />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Nivel de experiencia</Label>
                    <Select
                      value={saleadsConfig.avatar?.experienceLevel || ''}
                      onValueChange={(value) => updateAvatar({ experienceLevel: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona nivel..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="principiante">Principiante (nunca hizo ads)</SelectItem>
                        <SelectItem value="intermedio">Intermedio (intentó sin éxito)</SelectItem>
                        <SelectItem value="avanzado">Avanzado (quiere automatizar)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Frustración principal</Label>
                  <Textarea
                    placeholder="Ej: Pierde dinero en Facebook Ads sin entender por qué"
                    rows={2}
                    value={saleadsConfig.avatar?.mainFrustration || ''}
                    onChange={(e) => updateAvatar({ mainFrustration: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Deseo primario</Label>
                  <Input
                    placeholder="Ej: Generar ventas consistentes sin gastar en agencias"
                    value={saleadsConfig.avatar?.primaryDesire || ''}
                    onChange={(e) => updateAvatar({ primaryDesire: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SECCIÓN 4: CONFIGURACIÓN TÉCNICA */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Configuración Técnica</h3>
              <p className="text-sm text-muted-foreground">Ajustes finales del VSL</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Duración objetivo (minutos)</Label>
              <Select
                value={saleadsConfig.targetDuration?.toString() || '20'}
                onValueChange={(value) => updateSaleADSConfig({ targetDuration: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutos</SelectItem>
                  <SelectItem value="20">20 minutos (recomendado)</SelectItem>
                  <SelectItem value="25">25 minutos</SelectItem>
                  <SelectItem value="30">30 minutos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>País/Región objetivo</Label>
              <Select
                value={saleadsConfig.targetCountry || 'multiple'}
                onValueChange={(value) => updateSaleADSConfig({ targetCountry: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PREVIEW */}
      <Card className="bg-gradient-to-r from-purple-50 to-orange-50 border-purple-200">
        <CardContent className="p-6">
          <h4 className="font-bold text-purple-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Vista Previa del VSL
          </h4>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <p className="text-purple-800">
                <span className="font-semibold">Experto:</span>{' '}
                {saleadsConfig.expert?.expertType === 'founder'
                  ? 'Juan Osorio (Founder)'
                  : saleadsConfig.expert?.name || 'No definido'}
              </p>
              <p className="text-purple-800">
                <span className="font-semibold">Ángulo:</span>{' '}
                {ANGLE_OPTIONS.find(a => a.value === saleadsConfig.angle?.angleName)?.label || 'No definido'}
              </p>
              <p className="text-purple-800">
                <span className="font-semibold">Avatar:</span>{' '}
                {saleadsConfig.avatar?.isSpecific
                  ? INDUSTRY_OPTIONS.find(i => i.value === saleadsConfig.avatar?.industry)?.label || 'Específico'
                  : 'General (todos los emprendedores)'}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-purple-800">
                <span className="font-semibold">Duración:</span> {saleadsConfig.targetDuration || 20} minutos
              </p>
              <p className="text-purple-800">
                <span className="font-semibold">País:</span>{' '}
                {COUNTRY_OPTIONS.find(c => c.value === saleadsConfig.targetCountry)?.label || 'Multinacional'}
              </p>
              <p className="text-purple-800">
                <span className="font-semibold">CTA:</span> 1 MES GRATIS (luego $59/mes)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
