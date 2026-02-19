import { useMutation, useQueryClient } from '@tanstack/react-query';
import { EDGE_FUNCTION_URL, SUPABASE_KEY } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

async function callEdgeFunction(body: Record<string, unknown>, signal?: AbortSignal) {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = 'Error al generar copy';
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json();
}

export function useGenerate() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generate = useMutation({
    mutationFn: async ({ projectId, funnelType }: { projectId: string; funnelType?: string }) => {
      // 3 minute timeout for the full process
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000);

      try {
        if (funnelType === 'autowebinar') {
          // ═══ AUTOWEBINAR: 4 llamadas separadas desde el frontend ═══
          // Cada llamada dura ~40s y NO excede el timeout de 60s de la edge function
          
          toast({ title: 'Etapa 1 de 3', description: 'Generando Landing + Guión del Webinar...' });
          const res1 = await callEdgeFunction({ projectId, part: 1 }, controller.signal);
          if (!res1.success) throw new Error(res1.error || 'Error en Etapa 1');
          console.log('Etapa 1 completa, length:', res1.text?.length);

          toast({ title: 'Etapa 2 de 3', description: 'Generando Secuencia de 15 Emails...' });
          const res2 = await callEdgeFunction({ projectId, part: 2 }, controller.signal);
          if (!res2.success) throw new Error(res2.error || 'Error en Etapa 2');
          console.log('Etapa 2 completa, length:', res2.text?.length);

          toast({ title: 'Etapa 3 de 3', description: 'Generando 30 Comunicados de WhatsApp...' });
          const res3 = await callEdgeFunction({ projectId, part: 3 }, controller.signal);
          if (!res3.success) throw new Error(res3.error || 'Error en Etapa 3');
          console.log('Etapa 3 completa, length:', res3.text?.length);

          // Combine and save
          const combined = `<!-- SECTION:LANDING_WEBINAR -->\n${res1.text}\n\n<!-- SECTION:EMAILS -->\n${res2.text}\n\n<!-- SECTION:WHATSAPP -->\n${res3.text}`;
          console.log('Contenido combinado, total length:', combined.length);

          toast({ title: 'Guardando...', description: 'Guardando copy completo en la base de datos' });
          const saveRes = await callEdgeFunction({ projectId, action: 'save', content: combined }, controller.signal);
          if (!saveRes.success) throw new Error(saveRes.error || 'Error al guardar');

          clearTimeout(timeoutId);
          return saveRes.copy;
        } else {
          // ═══ OTROS FUNNELS: una sola llamada ═══
          const data = await callEdgeFunction({ projectId }, controller.signal);
          clearTimeout(timeoutId);
          if (!data.success) throw new Error(data.error || 'Error desconocido');
          return data.copy;
        }
      } catch (error: unknown) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('La generación tomó demasiado tiempo. Intenta nuevamente.');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-copies'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: '¡Copy generado exitosamente!', description: 'Tu copy está listo para usar' });
    },
    onError: (error: Error) => {
      console.error('Error en generación:', error);
      toast({ title: 'Error al generar copy', description: error.message, variant: 'destructive' });
    },
  });

  return {
    generate: generate.mutate,
    generateAsync: generate.mutateAsync,
    isGenerating: generate.isPending,
    generatedCopy: generate.data,
    error: generate.error,
  };
}
