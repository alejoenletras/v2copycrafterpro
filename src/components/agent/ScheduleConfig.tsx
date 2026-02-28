import { useState, useEffect } from 'react';
import { useSchedule, Schedule } from '@/hooks/useSchedule';

const DAYS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, '0')}:00`,
}));

interface ScheduleConfigProps {
  keyword: string;
  countries: string[];
  maxAds: number;
  dnaExpert: string;
  dnaAudience: string;
  dnaProduct: string;
  telegramChatId: string;
  email: string;
}

export default function ScheduleConfig(props: ScheduleConfigProps) {
  const { schedule, loading, saveSchedule, toggleActive, deleteSchedule } = useSchedule();

  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [runHour, setRunHour] = useState(8);
  const [runDays, setRunDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (schedule) {
      setFrequency(schedule.frequency);
      setRunHour(schedule.run_hour);
      setRunDays(schedule.run_days);
    }
  }, [schedule]);

  const toggleDay = (day: number) => {
    setRunDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const handleSave = async () => {
    if (runDays.length === 0) {
      setMessage('⚠️ Selecciona al menos un día');
      return;
    }
    if (!props.keyword.trim()) {
      setMessage('⚠️ Escribe una palabra clave primero');
      return;
    }
    if (!props.telegramChatId.trim()) {
      setMessage('⚠️ Ingresa tu Chat ID de Telegram');
      return;
    }

    setSaving(true);
    setMessage('');

    const { error } = await saveSchedule({
      keyword: props.keyword,
      countries: props.countries,
      max_ads: props.maxAds,
      dna_expert: props.dnaExpert,
      dna_audience: props.dnaAudience,
      dna_product: props.dnaProduct,
      telegram_chat_id: props.telegramChatId,
      email: props.email,
      frequency,
      run_hour: runHour,
      run_minute: 0,
      timezone: 'America/Bogota',
      run_days: runDays,
      is_active: true,
    });

    setSaving(false);
    setMessage(error ? `❌ Error: ${(error as any).message}` : '✅ Automatización guardada');

    if (!error) {
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleDelete = async () => {
    await deleteSchedule();
    setMessage('🗑️ Automatización eliminada');
    setFrequency('daily');
    setRunHour(8);
    setRunDays([1, 2, 3, 4, 5]);
    setTimeout(() => setMessage(''), 3000);
  };

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-xl border border-gray-200">
        <p className="text-gray-400 text-sm text-center">Cargando automatización...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-white rounded-xl border border-gray-200">
      {/* Header con toggle */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">⏰ Automatización</h3>
        {schedule?.id && (
          <button
            onClick={() => toggleActive(!schedule.is_active)}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
              schedule.is_active
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {schedule.is_active ? '● Activo' : '○ Pausado'}
          </button>
        )}
      </div>

      {/* Frecuencia */}
      <div>
        <label className="text-sm text-gray-600 mb-1.5 block">Frecuencia</label>
        <div className="flex gap-2">
          {(['daily', 'weekly'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFrequency(f)}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                frequency === f
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'daily' ? 'Diario' : 'Semanal'}
            </button>
          ))}
        </div>
      </div>

      {/* Hora */}
      <div>
        <label className="text-sm text-gray-600 mb-1.5 block">Hora de ejecución (Colombia)</label>
        <select
          value={runHour}
          onChange={e => setRunHour(Number(e.target.value))}
          className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm
                     focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                     bg-white"
        >
          {HOURS.map(h => (
            <option key={h.value} value={h.value}>{h.label}</option>
          ))}
        </select>
      </div>

      {/* Días */}
      <div>
        <label className="text-sm text-gray-600 mb-1.5 block">
          {frequency === 'daily' ? 'Ejecutar estos días' : 'Ejecutar el día'}
        </label>
        <div className="flex gap-1.5">
          {DAYS.map(d => (
            <button
              key={d.value}
              onClick={() => toggleDay(d.value)}
              className={`flex-1 h-10 rounded-lg text-xs font-medium transition-all ${
                runDays.includes(d.value)
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resumen */}
      <div className="bg-purple-50 rounded-lg p-3">
        <p className="text-xs text-purple-700">
          📋 El agente buscará <strong>"{props.keyword || '...'}"</strong> con{' '}
          <strong>{props.maxAds} anuncios</strong>{' '}
          {frequency === 'daily' ? 'todos los' : 'los'}{' '}
          <strong>{runDays.map(d => DAYS[d].label).join(', ') || '...'}</strong>{' '}
          a las <strong>{runHour.toString().padStart(2, '0')}:00</strong> (COL)
        </p>
      </div>

      {/* Última ejecución */}
      {schedule?.last_run_at && (
        <p className="text-xs text-gray-400">
          Última ejecución: {new Date(schedule.last_run_at).toLocaleString('es-CO')}
          {schedule.last_run_status === 'triggered' && ' ✓'}
        </p>
      )}

      {/* Mensaje */}
      {message && (
        <p className={`text-sm font-medium ${
          message.startsWith('❌') ? 'text-red-600' :
          message.startsWith('⚠️') ? 'text-yellow-600' : 'text-green-600'
        }`}>
          {message}
        </p>
      )}

      {/* Botones */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-semibold
                     hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          {saving ? 'Guardando...' : schedule?.id ? '💾 Actualizar automatización' : '⚡ Activar automatización'}
        </button>
        {schedule?.id && (
          <button
            onClick={handleDelete}
            className="px-4 py-2.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium
                       hover:bg-red-100 transition-colors"
            title="Eliminar automatización"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
}