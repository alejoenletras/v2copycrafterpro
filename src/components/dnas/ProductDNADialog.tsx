import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, Loader2 } from 'lucide-react';
import type { ProductInfo } from '@/types';

interface ProductDNADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, data: Partial<ProductInfo>) => Promise<void>;
  initialName?: string;
  initialData?: Partial<ProductInfo>;
  isLoading?: boolean;
}

export default function ProductDNADialog({
  open, onOpenChange, onSave, initialName = '', initialData, isLoading,
}: ProductDNADialogProps) {
  const [name, setName] = useState(initialName);
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [audienceProblem, setAudienceProblem] = useState('');
  const [solution, setSolution] = useState('');
  const [transformationOffer, setTransformationOffer] = useState('');
  const [benefitBullets, setBenefitBullets] = useState<string[]>([]);
  const [newBullet, setNewBullet] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [guaranteePeriod, setGuaranteePeriod] = useState('');
  const [guaranteeDescription, setGuaranteeDescription] = useState('');
  const [paymentPlanEnabled, setPaymentPlanEnabled] = useState(false);
  const [installments, setInstallments] = useState<number | ''>('');
  const [installmentPrice, setInstallmentPrice] = useState<number | ''>('');
  const [bonuses, setBonuses] = useState<Array<{ name: string; value: number }>>([]);
  const [newBonusName, setNewBonusName] = useState('');
  const [newBonusValue, setNewBonusValue] = useState<number | ''>('');

  useEffect(() => {
    if (open) {
      setName(initialName);
      if (initialData) {
        setProductName(initialData.name || '');
        setPrice(initialData.price || '');
        setAudienceProblem(initialData.audienceProblem || '');
        setSolution(initialData.solution || '');
        setTransformationOffer(initialData.transformationOffer || '');
        setBenefitBullets(initialData.benefitBullets || []);
        setKeywords(initialData.keywords || []);
        setGuaranteePeriod(initialData.guaranteePeriod || '');
        setGuaranteeDescription(initialData.guaranteeDescription || '');
        setPaymentPlanEnabled(initialData.paymentPlan?.enabled || false);
        setInstallments(initialData.paymentPlan?.installments || '');
        setInstallmentPrice(initialData.paymentPlan?.installmentPrice || '');
        setBonuses(initialData.bonuses || []);
      } else {
        setProductName('');
        setPrice('');
        setAudienceProblem('');
        setSolution('');
        setTransformationOffer('');
        setBenefitBullets([]);
        setKeywords([]);
        setGuaranteePeriod('');
        setGuaranteeDescription('');
        setPaymentPlanEnabled(false);
        setInstallments('');
        setInstallmentPrice('');
        setBonuses([]);
      }
      setNewBullet('');
      setNewKeyword('');
      setNewBonusName('');
      setNewBonusValue('');
    }
  }, [open, initialName, initialData]);

  const addBullet = () => {
    if (newBullet.trim()) {
      setBenefitBullets(prev => [...prev, newBullet.trim()]);
      setNewBullet('');
    }
  };

  const removeBullet = (index: number) => {
    setBenefitBullets(prev => prev.filter((_, i) => i !== index));
  };

  const addKeyword = () => {
    if (newKeyword.trim()) {
      setKeywords(prev => [...prev, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (index: number) => {
    setKeywords(prev => prev.filter((_, i) => i !== index));
  };

  const addBonus = () => {
    if (newBonusName.trim() && newBonusValue) {
      setBonuses(prev => [...prev, { name: newBonusName.trim(), value: Number(newBonusValue) }]);
      setNewBonusName('');
      setNewBonusValue('');
    }
  };

  const removeBonus = (index: number) => {
    setBonuses(prev => prev.filter((_, i) => i !== index));
  };

  const totalValue = (Number(price) || 0) + bonuses.reduce((sum, b) => sum + b.value, 0);

  const canSave = name.trim() && productName.trim() && price;

  const handleSave = async () => {
    const data: Partial<ProductInfo> = {
      name: productName,
      price: Number(price),
      audienceProblem,
      solution,
      transformationOffer,
      benefitBullets,
      keywords,
      guaranteePeriod: (guaranteePeriod || '30') as any,
      guaranteeDescription,
      bonuses,
      paymentPlan: {
        enabled: paymentPlanEnabled,
        installments: Number(installments) || 1,
        installmentPrice: Number(installmentPrice) || 0,
      },
    };
    await onSave(name.trim(), data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar' : 'Nuevo'} Producto / Servicio</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nombre del perfil *</Label>
            <Input
              placeholder="Ej: Curso Dropshipping Pro, Mentoría 1:1..."
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nombre del producto *</Label>
              <Input
                placeholder="Nombre del producto/servicio"
                value={productName}
                onChange={e => setProductName(e.target.value)}
              />
            </div>
            <div>
              <Label>Precio (USD) *</Label>
              <Input
                type="number"
                placeholder="997"
                value={price}
                onChange={e => setPrice(e.target.value ? Number(e.target.value) : '')}
              />
            </div>
          </div>

          {/* Problema de la audiencia */}
          <div>
            <Label>Problema de la audiencia que soluciona tu producto</Label>
            <Textarea
              placeholder="Ej: Los emprendedores gastan miles en publicidad sin resultados porque no saben escribir copys que conviertan..."
              value={audienceProblem}
              onChange={e => setAudienceProblem(e.target.value)}
              rows={3}
            />
          </div>

          {/* Solución del producto */}
          <div>
            <Label>Solucion del producto</Label>
            <Textarea
              placeholder="Ej: Un sistema paso a paso que te enseña a crear copys de alta conversion usando frameworks probados de persuasion..."
              value={solution}
              onChange={e => setSolution(e.target.value)}
              rows={3}
            />
          </div>

          {/* Oferta basada en la transformación */}
          <div>
            <Label>Oferta basada en la transformacion</Label>
            <Textarea
              placeholder="Ej: Pasa de gastar $5,000/mes en publicidad sin retorno a generar $3 por cada $1 invertido en menos de 90 dias..."
              value={transformationOffer}
              onChange={e => setTransformationOffer(e.target.value)}
              rows={3}
            />
          </div>

          {/* Bullets de beneficios */}
          <div className="space-y-3">
            <Label>Bullets de beneficios</Label>
            {benefitBullets.map((bullet, i) => (
              <div key={i} className="flex items-center gap-2 p-2 border rounded">
                <span className="flex-1 text-sm">{bullet}</span>
                <Button type="button" size="sm" variant="ghost" onClick={() => removeBullet(i)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                placeholder="Ej: Acceso de por vida a +40 plantillas de copy"
                value={newBullet}
                onChange={e => setNewBullet(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addBullet())}
                className="flex-1"
              />
              <Button type="button" size="sm" variant="outline" onClick={addBullet}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Bonos */}
          <div className="space-y-3">
            <Label>Bonos</Label>
            {bonuses.map((bonus, i) => (
              <div key={i} className="flex items-center gap-2 p-2 border rounded">
                <span className="flex-1 text-sm">{bonus.name}</span>
                <span className="text-sm font-medium text-primary">${bonus.value}</span>
                <Button type="button" size="sm" variant="ghost" onClick={() => removeBonus(i)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                placeholder="Nombre del bono"
                value={newBonusName}
                onChange={e => setNewBonusName(e.target.value)}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="Valor $"
                value={newBonusValue}
                onChange={e => setNewBonusValue(e.target.value ? Number(e.target.value) : '')}
                className="w-24"
              />
              <Button type="button" size="sm" variant="outline" onClick={addBonus}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Palabras clave */}
          <div className="space-y-3">
            <Label>Palabras clave para la oferta</Label>
            <div className="flex flex-wrap gap-2">
              {keywords.map((kw, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                  {kw}
                  <button type="button" onClick={() => removeKeyword(i)} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Ej: escalabilidad, libertad financiera, automatizacion..."
                value={newKeyword}
                onChange={e => setNewKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                className="flex-1"
              />
              <Button type="button" size="sm" variant="outline" onClick={addKeyword}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Garantía */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Periodo de garantia</Label>
              <Select value={guaranteePeriod} onValueChange={setGuaranteePeriod}>
                <SelectTrigger><SelectValue placeholder="Periodo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="60">60 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descripcion de garantia</Label>
              <Input
                placeholder="Ej: Devolucion sin preguntas"
                value={guaranteeDescription}
                onChange={e => setGuaranteeDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Plan de pagos */}
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="paymentPlan"
                checked={paymentPlanEnabled}
                onCheckedChange={(checked) => setPaymentPlanEnabled(!!checked)}
              />
              <Label htmlFor="paymentPlan">Ofrecer plan de pagos</Label>
            </div>
            {paymentPlanEnabled && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Numero de cuotas</Label>
                  <Input
                    type="number"
                    placeholder="3"
                    value={installments}
                    onChange={e => setInstallments(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>
                <div>
                  <Label>Precio por cuota</Label>
                  <Input
                    type="number"
                    placeholder="397"
                    value={installmentPrice}
                    onChange={e => setInstallmentPrice(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Value Stack Total */}
          {(Number(price) > 0 || bonuses.length > 0) && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg text-center">
              <div className="text-sm text-muted-foreground">Valor total del stack</div>
              <div className="text-2xl font-bold text-primary">${totalValue.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">
                Precio de venta: ${Number(price).toLocaleString() || 0}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!canSave || isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
