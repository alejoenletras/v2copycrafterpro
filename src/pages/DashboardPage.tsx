import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { testConnection, supabase } from '@/lib/supabase';
import { useProjects } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Folder, Loader2, AlertCircle, CheckCircle, FileText, Eye, Pencil, Trash2, Dna, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useWizardStore } from '@/store/wizardStore';

interface ConnectionStatus {
  success: boolean;
  message: string;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { projects, isLoading, error, deleteProject, isDeleting } = useProjects();
  const { loadProject, resetWizard } = useWizardStore();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    testConnection().then(setConnectionStatus);
  }, []);

  const handleViewLastCopy = async () => {
    try {
      const { data, error } = await supabase
        .from('generated_copies')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        navigate(`/copy/${data.id}`);
      } else {
        toast({
          title: '📄 Sin copys',
          description: 'Aún no has generado ningún copy',
        });
      }
    } catch (err: any) {
      toast({
        title: '❌ Error',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleProjectClick = (project: any) => {
    // Check if project has generated copies
    const generatedCopies = project.generated_copies || [];
    
    if (generatedCopies.length > 0) {
      // Go to the most recent copy
      const latestCopy = generatedCopies.sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      navigate(`/copy/${latestCopy.id}`);
    } else {
      // Go to wizard to edit/complete the project
      handleEditProject(project.id);
    }
  };

  const handleEditProject = async (projectId: string) => {
    const result = await loadProject(projectId);
    if (result.success) {
      navigate('/wizard');
    } else {
      toast({
        title: '❌ Error',
        description: result.error || 'No se pudo cargar el proyecto',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setProjectToDelete(projectId);
  };

  const confirmDelete = () => {
    if (projectToDelete) {
      deleteProject(projectToDelete);
      setProjectToDelete(null);
    }
  };

  const handleNewProject = () => {
    resetWizard();
    navigate('/wizard');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground">Gestiona tus proyectos de copy</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => navigate('/content-generator')}
                className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90"
              >
                <Wand2 className="h-4 w-4" />
                Generador IA
              </Button>
              <Button variant="outline" onClick={() => navigate('/dnas')} className="gap-2">
                <Dna className="h-4 w-4" />
                DNAs
              </Button>
              <Button variant="outline" onClick={handleViewLastCopy} className="gap-2">
                <Eye className="h-4 w-4" />
                Ver último copy
              </Button>
              <Button onClick={handleNewProject} className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Proyecto
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Connection Status */}
      {connectionStatus && (
        <div className="container mx-auto px-4 py-4">
          <div className={`flex items-center gap-2 p-4 rounded-lg ${
            connectionStatus.success 
              ? 'bg-green-500/10 text-green-600 border border-green-500/20' 
              : 'bg-destructive/10 text-destructive border border-destructive/20'
          }`}>
            {connectionStatus.success ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span>{connectionStatus.message}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Card className="border-destructive">
            <CardContent className="py-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <p className="text-destructive">Error al cargar proyectos</p>
            </CardContent>
          </Card>
        ) : projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project: any) => {
              const hasCopy = project.generated_copies && project.generated_copies.length > 0;
              
              return (
                <Card 
                  key={project.id} 
                  className="hover:shadow-xl transition-all cursor-pointer border-2 hover:border-primary/50"
                  onClick={() => handleProjectClick(project)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="flex items-center gap-2">
                        {hasCopy ? (
                          <FileText className="h-5 w-5 text-green-500" />
                        ) : (
                          <Folder className="h-5 w-5 text-primary" />
                        )}
                        {project.product_info?.name || 'Proyecto sin nombre'}
                      </CardTitle>
                      <Badge variant={hasCopy ? "default" : "secondary"}>
                        {hasCopy ? '✅ Copy generado' : 'Borrador'}
                      </Badge>
                    </div>
                    <CardDescription>
                      {project.funnel_type?.toUpperCase()} • {project.country}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Actualizado: {new Date(project.updated_at).toLocaleDateString()}
                    </p>
                    {hasCopy && (
                      <p className="text-xs text-green-600 mt-2">
                        Click para ver el copy generado →
                      </p>
                    )}
                    {!hasCopy && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Click para continuar editando →
                      </p>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditProject(project.id);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => handleDeleteProject(project.id, e)}
                      >
                        <Trash2 className="h-3 w-3" />
                        Eliminar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay proyectos</h3>
              <p className="text-muted-foreground mb-4">
                Crea tu primer proyecto para comenzar a generar copy persuasivo
              </p>
              <Button onClick={handleNewProject} className="gap-2">
                <Plus className="h-4 w-4" />
                Crear Proyecto
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!projectToDelete} onOpenChange={() => setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proyecto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán todos los datos del proyecto y los copys generados asociados.
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
