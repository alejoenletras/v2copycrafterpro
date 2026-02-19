import { useWizardStore } from '@/store/wizardStore';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Package, DollarSign, Shield, Gift, Plus, X, Lightbulb, Globe, Target, Zap, List, Tag } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Bonus, GuaranteePeriod, Country } from '@/types';

const COUNTRIES: { value: Country; label: string; flag: string }[] = [
  { value: 'mexico', label: 'México', flag: '🇲🇽' },
  { value: 'colombia', label: 'Colombia', flag: '🇨🇴' },
  { value: 'argentina', label: 'Argentina', flag: '🇦🇷' },
  { value: 'spain', label: 'España', flag: '🇪🇸' },
  { value: 'chile', label: 'Chile', flag: '🇨🇱' },
  { value: 'peru', label: 'Perú', flag: '🇵🇪' },
  { value: 'multiple', label: 'Múltiples países (español neutro)', flag: '🌎' },
];

export default function ProductInfoStep() {
  const { project, updateProductInfo, updateProject } = useWizardStore();
  const productInfo = project.productInfo;
  
  const [newBonusName, setNewBonusName] = useState('');
  const [newBonusValue, setNewBonusValue] = useState('');
  const [newBullet, setNewBullet] = useState('');
  const [newKeyword, setNewKeyword] = useState('');

  const benefitBullets: string[] = productInfo?.benefitBullets || [];
  const keywords: string[] = productInfo?.keywords || [];

  const bonuses: Bonus[] = productInfo?.bonuses || [];
  const price = productInfo?.price || 0;
  const paymentPlan = productInfo?.paymentPlan || { enabled: false, installments: 3, installmentPrice: 0 };
  const guaranteePeriod = productInfo?.guaranteePeriod || '60';

  // Calculate installment price when price or installments change
  useEffect(() => {
    if (paymentPlan.enabled && price > 0 && paymentPlan.installments > 0) {
      const calculatedPrice = Math.ceil(price / paymentPlan.installments * 1.15); // 15% extra for payment plan
      if (paymentPlan.installmentPrice === 0) {
        updateProductInfo({ 
          paymentPlan: { ...paymentPlan, installmentPrice: calculatedPrice }
        });
      }
    }
  }, [price, paymentPlan.installments, paymentPlan.enabled]);

  const handleAddBonus = () => {
    if (newBonusName.trim() && newBonusValue) {
      const newBonus: Bonus = {
        name: newBonusName.trim(),
        value: parseFloat(newBonusValue) || 0,
      };
      updateProductInfo({ bonuses: [...bonuses, newBonus] });
      setNewBonusName('');
      setNewBonusValue('');
    }
  };

  const handleRemoveBonus = (index: number) => {
    updateProductInfo({ bonuses: bonuses.filter((_, i) => i !== index) });
  };

  const handleAddBullet = () => {
    if (newBullet.trim()) {
      updateProductInfo({ benefitBullets: [...benefitBullets, newBullet.trim()] });
      setNewBullet('');
    }
  };

  const handleRemoveBullet = (index: number) => {
    updateProductInfo({ benefitBullets: benefitBullets.filter((_, i) => i !== index) });
  };

  const handleAddKeyword = () => {
    if (newKeyword.trim()) {
      updateProductInfo({ keywords: [...keywords, newKeyword.trim()] });
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (index: number) => {
    updateProductInfo({ keywords: keywords.filter((_, i) => i !== index) });
  };

  // Calculate stack de valor
  const totalBonusValue = bonuses.reduce((acc, b) => acc + b.value, 0);
  const totalValue = price + totalBonusValue;
  const discount = totalValue > 0 ? Math.round(((totalValue - price) / totalValue) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 rounded-full text-emerald-600 text-sm font-medium mb-4">
          <Brain className="w-4 h-4" />
          Pilar 3: Persuasión
        </div>
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
          📦 Información de tu Producto/Servicio
        </h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Detalles de la oferta que vas a presentar
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main form - 2 columns */}
        <div className="md:col-span-2 space-y-6">
          {/* Product Name - BÁSICOS */}
          <Card className="p-6 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <Label className="text-lg font-semibold text-foreground">
                  Nombre del producto/servicio
                </Label>
                <p className="text-sm text-muted-foreground">
                  El nombre oficial de tu curso, programa o servicio
                </p>
              </div>
            </div>
            <Input
              placeholder='Ej: "Transformación 90 Días", "Método 4 Horas", "Academia de Copys"'
              value={productInfo?.name || ''}
              onChange={(e) => updateProductInfo({ name: e.target.value })}
              className="text-lg"
            />
          </Card>

          {/* Problema de la audiencia */}
          <Card className="p-6 bg-red-50 dark:bg-red-950/30">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <Label className="text-lg font-semibold text-foreground">
                  Problema que soluciona tu producto
                </Label>
                <p className="text-sm text-muted-foreground">
                  El dolor principal de tu audiencia que tu producto resuelve
                </p>
              </div>
            </div>
            <Textarea
              placeholder='Ej: "Los emprendedores gastan miles en publicidad sin resultados porque no saben escribir copys que conviertan..."'
              value={productInfo?.audienceProblem || ''}
              onChange={(e) => updateProductInfo({ audienceProblem: e.target.value })}
              rows={3}
              className="resize-none"
            />
          </Card>

          {/* Solución del producto */}
          <Card className="p-6 bg-cyan-50 dark:bg-cyan-950/30">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <Label className="text-lg font-semibold text-foreground">
                  Solucion del producto
                </Label>
                <p className="text-sm text-muted-foreground">
                  Como tu producto/servicio resuelve el problema
                </p>
              </div>
            </div>
            <Textarea
              placeholder='Ej: "Un sistema paso a paso que te enseña a crear copys de alta conversion usando frameworks probados de persuasion..."'
              value={productInfo?.solution || ''}
              onChange={(e) => updateProductInfo({ solution: e.target.value })}
              rows={3}
              className="resize-none"
            />
          </Card>

          {/* Oferta basada en transformación */}
          <Card className="p-6 bg-violet-50 dark:bg-violet-950/30">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <Label className="text-lg font-semibold text-foreground">
                  Oferta basada en la transformacion
                </Label>
                <p className="text-sm text-muted-foreground">
                  Describe la transformacion que tu cliente vivira (antes → despues)
                </p>
              </div>
            </div>
            <Textarea
              placeholder='Ej: "Pasa de gastar $5,000/mes en publicidad sin retorno a generar $3 por cada $1 invertido en menos de 90 dias..."'
              value={productInfo?.transformationOffer || ''}
              onChange={(e) => updateProductInfo({ transformationOffer: e.target.value })}
              rows={3}
              className="resize-none"
            />
          </Card>

          {/* Bullets de beneficios */}
          <Card className="p-6 bg-orange-50 dark:bg-orange-950/30">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                <List className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <Label className="text-lg font-semibold text-foreground">
                  Bullets de beneficios
                </Label>
                <p className="text-sm text-muted-foreground">
                  Lista de beneficios concretos que recibe el cliente
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {benefitBullets.map((bullet, i) => (
                <div key={i} className="flex items-center gap-2 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <span className="text-orange-500 font-bold">•</span>
                  <span className="flex-1 text-sm text-foreground">{bullet}</span>
                  <button onClick={() => handleRemoveBullet(i)} className="p-1 hover:bg-destructive/10 rounded">
                    <X className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder='Ej: "Acceso de por vida a +40 plantillas de copy"'
                value={newBullet}
                onChange={(e) => setNewBullet(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddBullet(); } }}
              />
              <Button onClick={handleAddBullet} variant="secondary">
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </Button>
            </div>
          </Card>

          {/* Palabras clave */}
          <Card className="p-6 bg-teal-50 dark:bg-teal-950/30">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                <Tag className="w-5 h-5 text-teal-500" />
              </div>
              <div>
                <Label className="text-lg font-semibold text-foreground">
                  Palabras clave para la oferta
                </Label>
                <p className="text-sm text-muted-foreground">
                  Terminos que resuenan con tu audiencia y definen tu oferta
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {keywords.map((kw, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-500/10 text-teal-700 dark:text-teal-300 text-sm rounded-full border border-teal-500/20">
                  {kw}
                  <button onClick={() => handleRemoveKeyword(i)} className="hover:text-destructive ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder='Ej: "escalabilidad", "libertad financiera", "automatizacion"...'
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddKeyword(); } }}
              />
              <Button onClick={handleAddKeyword} variant="secondary">
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </Button>
            </div>
          </Card>

          {/* Pricing */}
          <Card className="p-6 bg-blue-50 dark:bg-blue-950/30">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <Label className="text-lg font-semibold text-foreground">
                  Precio
                </Label>
                <p className="text-sm text-muted-foreground">
                  El precio principal de tu oferta
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl font-bold text-foreground">$</span>
              <Input
                type="number"
                placeholder="997"
                value={productInfo?.price || ''}
                onChange={(e) => updateProductInfo({ price: parseFloat(e.target.value) || 0 })}
                className="text-2xl font-bold w-40"
              />
              <span className="text-muted-foreground">USD</span>
            </div>

            <div className="border-t border-border pt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={paymentPlan.enabled}
                  onCheckedChange={(checked) => 
                    updateProductInfo({ 
                      paymentPlan: { ...paymentPlan, enabled: !!checked }
                    })
                  }
                />
                <span className="font-medium text-foreground">¿Ofreces plan de pagos en cuotas?</span>
              </label>

              {paymentPlan.enabled && (
                <div className="mt-4 p-4 bg-white/50 dark:bg-white/5 rounded-lg animate-fade-in">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm mb-2 block">Número de cuotas</Label>
                      <Input
                        type="number"
                        min={2}
                        max={12}
                        placeholder="3"
                        value={paymentPlan.installments || ''}
                        onChange={(e) => 
                          updateProductInfo({ 
                            paymentPlan: { 
                              ...paymentPlan, 
                              installments: parseInt(e.target.value) || 0 
                            }
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-sm mb-2 block">Precio por cuota</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-foreground">$</span>
                        <Input
                          type="number"
                          placeholder="397"
                          value={paymentPlan.installmentPrice || ''}
                          onChange={(e) => 
                            updateProductInfo({ 
                              paymentPlan: { 
                                ...paymentPlan, 
                                installmentPrice: parseFloat(e.target.value) || 0 
                              }
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  {paymentPlan.installments > 0 && paymentPlan.installmentPrice > 0 && (
                    <p className="text-sm text-emerald-600 font-medium mt-3 p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded">
                      ✓ {paymentPlan.installments} pagos de ${paymentPlan.installmentPrice}
                    </p>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Guarantee */}
          <Card className="p-6 bg-green-50 dark:bg-green-950/30">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <Label className="text-lg font-semibold text-foreground">
                  🛡️ Garantía de satisfacción
                </Label>
                <p className="text-sm text-muted-foreground">
                  ¿Qué garantía ofreces a tus clientes?
                </p>
              </div>
            </div>

            <RadioGroup
              value={guaranteePeriod}
              onValueChange={(value) => updateProductInfo({ guaranteePeriod: value as GuaranteePeriod })}
              className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="30" id="g30" />
                <Label htmlFor="g30" className="cursor-pointer">30 días</Label>
              </div>
              <div className="flex items-center space-x-2 p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <RadioGroupItem value="60" id="g60" />
                <Label htmlFor="g60" className="cursor-pointer text-emerald-700 dark:text-emerald-300">
                  60 días <span className="text-xs">(RECOMENDADO)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="90" id="g90" />
                <Label htmlFor="g90" className="cursor-pointer">90 días</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="gcustom" />
                <Label htmlFor="gcustom" className="cursor-pointer">Otra</Label>
              </div>
            </RadioGroup>

            <Textarea
              placeholder='Ej: "60 días sin preguntas. Solo email REEMBOLSO y 24-48h devolución completa."'
              value={productInfo?.guaranteeDescription || ''}
              onChange={(e) => updateProductInfo({ guaranteeDescription: e.target.value })}
              rows={2}
              className="resize-none"
            />
          </Card>

          {/* Bonuses */}
          <Card className="p-6 bg-yellow-50 dark:bg-yellow-950/30">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Gift className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <Label className="text-lg font-semibold text-foreground">
                  🎁 Bonos incluidos en la oferta
                </Label>
                <p className="text-sm text-muted-foreground">
                  ¿Qué extras recibe el cliente al comprar hoy?
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              {bonuses.map((bonus, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 group"
                >
                  <Gift className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span className="flex-1 text-sm text-foreground">{bonus.name}</span>
                  <span className="text-sm font-medium text-amber-600">${bonus.value}</span>
                  <button
                    onClick={() => handleRemoveBonus(index)}
                    className="p-1 hover:bg-destructive/10 rounded transition-all"
                  >
                    <X className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-[1fr,100px,auto] gap-2">
              <Input
                placeholder='Nombre del bono (Ej: "Plantillas de Email")'
                value={newBonusName}
                onChange={(e) => setNewBonusName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddBonus();
                  }
                }}
              />
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  placeholder="197"
                  value={newBonusValue}
                  onChange={(e) => setNewBonusValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddBonus();
                    }
                  }}
                />
              </div>
              <Button onClick={handleAddBonus} variant="secondary">
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </Button>
            </div>
          </Card>

          {/* Country/Market */}
          <Card className="p-6 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                <Globe className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <Label className="text-lg font-semibold text-foreground">
                  País objetivo principal
                </Label>
                <p className="text-sm text-muted-foreground">
                  Esto nos ayuda a adaptar el lenguaje y ejemplos
                </p>
              </div>
            </div>

            <Select
              value={project.country || 'multiple'}
              onValueChange={(value) => updateProject({ country: value as Country })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un país" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country.value} value={country.value}>
                    <span className="flex items-center gap-2">
                      <span>{country.flag}</span>
                      <span>{country.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>
        </div>

        {/* Stack de Valor - 1 column */}
        <div className="md:col-span-1">
          <Card className="p-6 bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 sticky top-4">
            <h3 className="font-bold text-lg text-foreground mb-4 flex items-center gap-2">
              💰 Stack de Valor Total
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Producto principal</span>
                <span className="font-medium text-foreground">${price || 0}</span>
              </div>

              {bonuses.map((bonus, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground truncate pr-2">{bonus.name}</span>
                  <span className="font-medium text-foreground">${bonus.value}</span>
                </div>
              ))}

              <div className="pt-3 border-t-2 border-foreground/20">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-foreground">Valor Total:</span>
                  <span className="font-bold text-lg text-foreground">${totalValue}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-emerald-600">PRECIO HOY:</span>
                  <span className="font-bold text-2xl text-emerald-600">${price || 0}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Ahorro:</span>
                    <span className="font-bold text-lg text-red-500">{discount}% OFF</span>
                  </div>
                )}
              </div>
            </div>

            {bonuses.length === 0 && (
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Agrega bonos para aumentar el valor percibido
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}