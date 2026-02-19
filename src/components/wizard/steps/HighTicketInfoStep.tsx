import { useWizardStore } from '@/store/wizardStore';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DollarSign, 
  Clock, 
  Users, 
  Phone, 
  Target,
  Briefcase,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  HighTicketServiceType, 
  HighTicketProgramDuration,
  HighTicketInfo 
} from '@/types';

const SERVICE_TYPES: { value: HighTicketServiceType; label: string; description: string }[] = [
  { value: 'coaching-1on1', label: 'Coaching 1 a 1', description: 'Sesiones individuales personalizadas' },
  { value: 'coaching-group', label: 'Coaching Grupal', description: 'Grupos pequeños (5-20 personas)' },
  { value: 'consulting', label: 'Consultoría', description: 'Asesoría estratégica para negocios' },
  { value: 'mentorship', label: 'Mentoría', description: 'Acompañamiento a largo plazo' },
  { value: 'done-for-you', label: 'Done For You', description: 'Servicio hecho por ti' },
  { value: 'other', label: 'Otro', description: 'Servicio personalizado' },
];

const PROGRAM_DURATIONS: { value: HighTicketProgramDuration; label: string }[] = [
  { value: '30-days', label: '30 días' },
  { value: '60-days', label: '60 días' },
  { value: '90-days', label: '90 días' },
  { value: '6-months', label: '6 meses' },
  { value: '12-months', label: '12 meses' },
  { value: 'custom', label: 'Personalizado' },
];

const CALL_FORMATS = [
  { value: 'zoom', label: 'Zoom / Video', icon: '💻' },
  { value: 'phone', label: 'Teléfono', icon: '📞' },
  { value: 'in-person', label: 'Presencial', icon: '🤝' },
];

export default function HighTicketInfoStep() {
  const { project, updateHighTicketInfo } = useWizardStore();
  const ht = project.highTicketInfo || {} as Partial<HighTicketInfo>;

  const handleUpdate = (updates: Partial<HighTicketInfo>) => {
    updateHighTicketInfo(updates);
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in space-y-8">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-600 text-sm font-medium mb-4">
          <Target className="w-4 h-4" />
          VSL High Ticket
        </div>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
          Configuración High Ticket
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Define los parámetros de tu oferta premium para generar un VSL optimizado para conversión 5-15%.
        </p>
      </div>

      {/* Service Type */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Tipo de Servicio</h3>
            <p className="text-sm text-muted-foreground">¿Qué tipo de servicio premium ofreces?</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {SERVICE_TYPES.map((service) => (
            <button
              key={service.value}
              onClick={() => handleUpdate({ serviceType: service.value })}
              className={cn(
                "p-4 rounded-lg border-2 text-left transition-all",
                ht.serviceType === service.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <p className="font-medium text-foreground">{service.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{service.description}</p>
              {ht.serviceType === service.value && (
                <CheckCircle2 className="w-4 h-4 text-primary mt-2" />
              )}
            </button>
          ))}
        </div>

        {ht.serviceType === 'other' && (
          <div className="mt-4">
            <Label>Especifica tu servicio</Label>
            <Input
              value={ht.serviceTypeOther || ''}
              onChange={(e) => handleUpdate({ serviceTypeOther: e.target.value })}
              placeholder="Ej: Programa de transformación empresarial"
              className="mt-1"
            />
          </div>
        )}
      </Card>

      {/* Investment Range */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Rango de Inversión</h3>
            <p className="text-sm text-muted-foreground">El rango de precio de tu servicio (en USD)</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Inversión Mínima ($)</Label>
            <Input
              type="number"
              value={ht.investmentRange?.min || ''}
              onChange={(e) => handleUpdate({ 
                investmentRange: { 
                  ...ht.investmentRange, 
                  min: parseInt(e.target.value) || 0,
                  max: ht.investmentRange?.max || 0
                } 
              })}
              placeholder="3000"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Inversión Máxima ($)</Label>
            <Input
              type="number"
              value={ht.investmentRange?.max || ''}
              onChange={(e) => handleUpdate({ 
                investmentRange: { 
                  ...ht.investmentRange,
                  min: ht.investmentRange?.min || 0,
                  max: parseInt(e.target.value) || 0 
                } 
              })}
              placeholder="10000"
              className="mt-1"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          💡 El VSL mencionará este rango para calificar prospectos desde el inicio.
        </p>
      </Card>

      {/* Program Duration */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Duración del Programa</h3>
            <p className="text-sm text-muted-foreground">¿Cuánto dura tu programa o servicio?</p>
          </div>
        </div>

        <Select
          value={ht.programDuration || ''}
          onValueChange={(value) => handleUpdate({ programDuration: value as HighTicketProgramDuration })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona la duración" />
          </SelectTrigger>
          <SelectContent>
            {PROGRAM_DURATIONS.map((duration) => (
              <SelectItem key={duration.value} value={duration.value}>
                {duration.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {ht.programDuration === 'custom' && (
          <div className="mt-4">
            <Label>Duración personalizada</Label>
            <Input
              value={ht.programDurationCustom || ''}
              onChange={(e) => handleUpdate({ programDurationCustom: e.target.value })}
              placeholder="Ej: 4 meses intensivos"
              className="mt-1"
            />
          </div>
        )}
      </Card>

      {/* Qualification Criteria */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Criterios de Calificación</h3>
            <p className="text-sm text-muted-foreground">Define quién es tu cliente ideal (para filtrar desde el VSL)</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Ingresos mensuales mínimos (USD)</Label>
            <Input
              type="number"
              value={ht.qualificationCriteria?.minimumMonthlyRevenue || ''}
              onChange={(e) => handleUpdate({ 
                qualificationCriteria: { 
                  ...ht.qualificationCriteria,
                  minimumMonthlyRevenue: parseInt(e.target.value) || 0,
                  requiredExperience: ht.qualificationCriteria?.requiredExperience || '',
                  expectedCommitment: ht.qualificationCriteria?.expectedCommitment || ''
                } 
              })}
              placeholder="5000"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              El VSL mencionará: "Si no generas al menos $X/mes, esto no es para ti"
            </p>
          </div>

          <div>
            <Label>Experiencia o background requerido</Label>
            <Input
              value={ht.qualificationCriteria?.requiredExperience || ''}
              onChange={(e) => handleUpdate({ 
                qualificationCriteria: { 
                  ...ht.qualificationCriteria,
                  minimumMonthlyRevenue: ht.qualificationCriteria?.minimumMonthlyRevenue || 0,
                  requiredExperience: e.target.value,
                  expectedCommitment: ht.qualificationCriteria?.expectedCommitment || ''
                } 
              })}
              placeholder="Ej: 2+ años de experiencia en ventas online"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Compromiso esperado del cliente</Label>
            <Textarea
              value={ht.qualificationCriteria?.expectedCommitment || ''}
              onChange={(e) => handleUpdate({ 
                qualificationCriteria: { 
                  ...ht.qualificationCriteria,
                  minimumMonthlyRevenue: ht.qualificationCriteria?.minimumMonthlyRevenue || 0,
                  requiredExperience: ht.qualificationCriteria?.requiredExperience || '',
                  expectedCommitment: e.target.value
                } 
              })}
              placeholder="Ej: Disponibilidad de 10 horas semanales, implementar estrategias dentro de 48 horas"
              className="mt-1"
              rows={2}
            />
          </div>
        </div>
      </Card>

      {/* Strategic Call Info */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <Phone className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Llamada Estratégica</h3>
            <p className="text-sm text-muted-foreground">Configura el CTA final del VSL (aplicación → llamada)</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Duración de la llamada (minutos)</Label>
            <Input
              type="number"
              value={ht.strategicCallInfo?.duration || ''}
              onChange={(e) => handleUpdate({ 
                strategicCallInfo: { 
                  ...ht.strategicCallInfo,
                  duration: parseInt(e.target.value) || 30,
                  format: ht.strategicCallInfo?.format || 'zoom',
                  whoConducts: ht.strategicCallInfo?.whoConducts || 'you'
                } 
              })}
              placeholder="30"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="mb-3 block">Formato de la llamada</Label>
            <RadioGroup
              value={ht.strategicCallInfo?.format || 'zoom'}
              onValueChange={(value) => handleUpdate({ 
                strategicCallInfo: { 
                  ...ht.strategicCallInfo,
                  duration: ht.strategicCallInfo?.duration || 30,
                  format: value as 'zoom' | 'phone' | 'in-person',
                  whoConducts: ht.strategicCallInfo?.whoConducts || 'you'
                } 
              })}
              className="flex gap-4"
            >
              {CALL_FORMATS.map((format) => (
                <div key={format.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={format.value} id={format.value} />
                  <Label htmlFor={format.value} className="cursor-pointer">
                    {format.icon} {format.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label className="mb-3 block">¿Quién conduce la llamada?</Label>
            <RadioGroup
              value={ht.strategicCallInfo?.whoConducts || 'you'}
              onValueChange={(value) => handleUpdate({ 
                strategicCallInfo: { 
                  ...ht.strategicCallInfo,
                  duration: ht.strategicCallInfo?.duration || 30,
                  format: ht.strategicCallInfo?.format || 'zoom',
                  whoConducts: value as 'you' | 'team'
                } 
              })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="you" id="you" />
                <Label htmlFor="you" className="cursor-pointer">
                  <Users className="w-4 h-4 inline mr-1" /> Tú directamente
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="team" id="team" />
                <Label htmlFor="team" className="cursor-pointer">
                  <Users className="w-4 h-4 inline mr-1" /> Tu equipo
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </Card>

      {/* Summary */}
      <Card className="p-6 bg-gradient-to-br from-amber-500/5 to-orange-500/5 border-amber-500/20">
        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-amber-600" />
          Resumen de tu Oferta High Ticket
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Servicio</p>
            <p className="font-medium text-foreground">
              {SERVICE_TYPES.find(s => s.value === ht.serviceType)?.label || '-'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Inversión</p>
            <p className="font-medium text-foreground">
              ${ht.investmentRange?.min || 0} - ${ht.investmentRange?.max || 0}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Duración</p>
            <p className="font-medium text-foreground">
              {PROGRAM_DURATIONS.find(d => d.value === ht.programDuration)?.label || '-'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Ingresos mín.</p>
            <p className="font-medium text-foreground">
              ${ht.qualificationCriteria?.minimumMonthlyRevenue || 0}/mes
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
