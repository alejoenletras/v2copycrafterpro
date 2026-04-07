import { useState } from 'react';
import { X } from 'lucide-react';

const STORAGE_KEY = 'hooq_cache_notice_dismissed_v1';

export default function ClearCachePopup() {
  const [visible, setVisible] = useState(() => {
    return !localStorage.getItem(STORAGE_KEY);
  });

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-zinc-900">
        <button
          onClick={dismiss}
          className="absolute right-3 top-3 p-1 rounded-lg hover:bg-zinc-100 transition-colors"
        >
          <X className="w-5 h-5 text-zinc-400" />
        </button>

        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center">
            <span className="text-2xl">🔄</span>
          </div>

          <h2 className="text-lg font-bold">Actualizacion importante</h2>

          <p className="text-sm text-zinc-600 leading-relaxed">
            Hemos realizado mejoras en Hooq. Para que todo funcione correctamente,
            necesitas <strong>borrar las cookies y cache de tu navegador</strong> y
            luego volver a iniciar sesion.
          </p>

          <div className="bg-zinc-50 rounded-xl p-4 text-left text-sm space-y-2">
            <p className="font-semibold text-zinc-800">Pasos:</p>
            <ol className="list-decimal list-inside space-y-1 text-zinc-600">
              <li>Borra las cookies y cache de tu navegador</li>
              <li>
                Ve a{' '}
                <a
                  href="https://hooq.online/login"
                  className="text-violet-600 font-medium underline underline-offset-2"
                >
                  hooq.online/login
                </a>
              </li>
              <li>Inicia sesion de nuevo</li>
            </ol>
          </div>

          <button
            onClick={dismiss}
            className="w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
