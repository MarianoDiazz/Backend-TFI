// Funciones chicas que uso en varios lados

// Fecha de hoy en formato YYYY-MM-DD (hora local)
export function hoyISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

// Día de la semana 1 (lunes) a 7 (domingo) para una fecha YYYY-MM-DD
export function diaSemana(fechaISO) {
  const [y, m, d] = fechaISO.split('-').map(Number);
  const dia = new Date(y, m - 1, d).getDay(); // 0 = domingo
  return dia === 0 ? 7 : dia;
}

// "08:30:00" -> minutos desde las 00:00
export function aMinutos(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

// minutos -> "08:30:00"
export function aHora(min) {
  const h = String(Math.floor(min / 60)).padStart(2, '0');
  const m = String(min % 60).padStart(2, '0');
  return `${h}:${m}:00`;
}

// Normaliza "8:30" o "08:30" a "08:30:00"
export function normalizarHora(hora) {
  const [h, m = '0'] = String(hora).split(':');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`;
}

// Saca del objeto las claves undefined (para updates parciales)
export function limpiar(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

// Paginación simple a partir de la query string
export function paginacion(q) {
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(q.limit) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

// Fecha y hora legible en horario argentino, para los reportes
export function fechaHoraAR(d = new Date()) {
  return d.toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Tucuman', hour12: false,
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
