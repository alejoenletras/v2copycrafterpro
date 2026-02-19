import { supabase } from '@/integrations/supabase/client';

// Cliente de backend (Lovable Cloud)
export { supabase };

const baseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');

// Clave publishable (pública) para llamar funciones del backend
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

// URL de la función "generate-copy"
export const EDGE_FUNCTION_URL = `${baseUrl}/functions/v1/generate-copy`;

export async function testConnection() {
  try {
    const { data, error } = await supabase.from('projects').select('id').limit(1);

    if (error) {
      return {
        success: false,
        message: `Error: ${error.message}`,
      };
    }

    return {
      success: true,
      message: `✅ Conectado al backend (${data?.length || 0} proyectos)`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error: ${error.message}`,
    };
  }
}
