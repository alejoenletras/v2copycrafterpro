import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDNAs } from '@/hooks/useDNAs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Home, Loader2, Mic, Users, Package, Pencil, Trash2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ExpertDNADialog from '@/components/dnas/ExpertDNADialog';
import AudienceDNADialog from '@/components/dnas/AudienceDNADialog';
import ProductDNADialog from '@/components/dnas/ProductDNADialog';
import type { DNAType } from '@/types';

export default function DNAsPage() {
  const navigate = useNavigate();
  const { dnas, isLoading, createDNA, isCreating, updateDNA, isUpdating, deleteDNA, isDeleting } = useDNAs();

  const [expertDialogOpen, setExpertDialogOpen] = useState(false);
  const [audienceDialogOpen, setAudienceDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingDNA, setEditingDNA] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const expertDNAs = dnas?.filter(d => d.type === 'expert') || [];
  const audienceDNAs = dnas?.filter(d => d.type === 'audience') || [];
  const productDNAs = dnas?.filter(d => d.type === 'product') || [];

  const handleCreate = (type: DNAType) => {
    setEditingDNA(null);
    if (type === 'expert') setExpertDialogOpen(true);
    if (type === 'audience') setAudienceDialogOpen(true);
    if (type === 'product') setProductDialogOpen(true);
  };

  const handleEdit = (dna: any) => {
    setEditingDNA(dna);
    if (dna.type === 'expert') setExpertDialogOpen(true);
    if (dna.type === 'audience') setAudienceDialogOpen(true);
    if (dna.type === 'product') setProductDialogOpen(true);
  };

  const handleSaveExpert = async (name: string, data: any) => {
    if (editingDNA) {
      updateDNA({ id: editingDNA.id, updates: { name, data } });
    } else {
      createDNA({ type: 'expert', name, data });
    }
    setExpertDialogOpen(false);
    setEditingDNA(null);
  };

  const handleSaveAudience = async (name: string, data: any) => {
    if (editingDNA) {
      updateDNA({ id: editingDNA.id, updates: { name, data } });
    } else {
      createDNA({ type: 'audience', name, data });
    }
    setAudienceDialogOpen(false);
    setEditingDNA(null);
  };

  const handleSaveProduct = async (name: string, data: any) => {
    if (editingDNA) {
      updateDNA({ id: editingDNA.id, updates: { name, data } });
    } else {
      createDNA({ type: 'product', name, data });
    }
    setProductDialogOpen(false);
    setEditingDNA(null);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteDNA(deleteId);
      setDeleteId(null);
    }
  };

  const DNAChip = ({ dna }: { dna: any }) => (
    <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-muted rounded-full text-sm group hover:bg-muted/80 transition-colors">
      <span
        className="cursor-pointer"
        onClick={() => handleEdit(dna)}
      >
        {dna.name}
      </span>
      <button
        className="opacity-0 group-hover:opacity-100 transition-opacity ml-1"
        onClick={(e) => { e.stopPropagation(); handleEdit(dna); }}
      >
        <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
      </button>
      <button
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => { e.stopPropagation(); setDeleteId(dna.id); }}
      >
        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">DNAs de Campana</h1>
              <p className="text-muted-foreground">
                Define tu Personalidad, Público y Producto para reutilizarlos en tus proyectos
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/')} className="gap-2">
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personalidad */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Mic className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Personalidad</CardTitle>
                      <CardDescription>La identidad de tu negocio o marca</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {expertDNAs.map(dna => (
                    <DNAChip key={dna.id} dna={dna} />
                  ))}
                  {expertDNAs.length === 0 && (
                    <p className="text-sm text-muted-foreground">No hay personalidades guardadas</p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => handleCreate('expert')} className="gap-1">
                  <Plus className="h-4 w-4" /> Agregar
                </Button>
              </CardContent>
            </Card>

            {/* Público */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Público</CardTitle>
                      <CardDescription>Tu público objetivo</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {audienceDNAs.map(dna => (
                    <DNAChip key={dna.id} dna={dna} />
                  ))}
                  {audienceDNAs.length === 0 && (
                    <p className="text-sm text-muted-foreground">No hay públicos guardados</p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => handleCreate('audience')} className="gap-1">
                  <Plus className="h-4 w-4" /> Agregar
                </Button>
              </CardContent>
            </Card>

            {/* Producto / Servicio */}
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Package className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Producto / Servicio</CardTitle>
                      <CardDescription>Lo que vas a vender</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {productDNAs.map(dna => (
                    <DNAChip key={dna.id} dna={dna} />
                  ))}
                  {productDNAs.length === 0 && (
                    <p className="text-sm text-muted-foreground">No hay productos guardados</p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => handleCreate('product')} className="gap-1">
                  <Plus className="h-4 w-4" /> Agregar
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Dialogs */}
      <ExpertDNADialog
        open={expertDialogOpen}
        onOpenChange={setExpertDialogOpen}
        onSave={handleSaveExpert}
        initialName={editingDNA?.type === 'expert' ? editingDNA.name : ''}
        initialData={editingDNA?.type === 'expert' ? editingDNA.data : undefined}
        isLoading={isCreating || isUpdating}
      />
      <AudienceDNADialog
        open={audienceDialogOpen}
        onOpenChange={setAudienceDialogOpen}
        onSave={handleSaveAudience}
        initialName={editingDNA?.type === 'audience' ? editingDNA.name : ''}
        initialData={editingDNA?.type === 'audience' ? editingDNA.data : undefined}
        isLoading={isCreating || isUpdating}
      />
      <ProductDNADialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        onSave={handleSaveProduct}
        initialName={editingDNA?.type === 'product' ? editingDNA.name : ''}
        initialData={editingDNA?.type === 'product' ? editingDNA.data : undefined}
        isLoading={isCreating || isUpdating}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar DNA?</AlertDialogTitle>
            <AlertDialogDescription>
              Este perfil se eliminará permanentemente. Los proyectos existentes que lo usaron no se verán afectados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
