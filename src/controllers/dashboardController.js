import { hoyISO } from '../utils/helpers.js';
import { query } from '../config/db.js';
import turnoDAO from '../dao/TurnoDAO.js';

// Último día del mes de una fecha YYYY-MM-DD
function finDeMes(fecha) {
  const [y, m] = fecha.split('-').map(Number);
  const ultimo = new Date(y, m, 0).getDate();
  return `${fecha.slice(0, 8)}${String(ultimo).padStart(2, '0')}`;
}

// GET /api/dashboard -> números para la pantalla de inicio (filtrados si es médico)
export async function resumen(req, res, next) {
  try {
    const hoy = hoyISO();
    const inicioMes = hoy.slice(0, 8) + '01';
    const hace30 = new Date(Date.now() - 29 * 86400000);
    const desde30 = new Date(hace30.getTime() - hace30.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const medicoId = req.usuario.rol === 'MEDICO' ? req.usuario.medico_id : null;

    const [turnosHoy, porEstadoMes, porDia, totales] = await Promise.all([
      turnoDAO.listar({ desde: hoy, hasta: hoy, medico_id: medicoId }),
      turnoDAO.resumenPorEstado(inicioMes, finDeMes(hoy), medicoId),
      turnoDAO.turnosPorDia(desde30, hoy, medicoId),
      query(`SELECT
               (SELECT COUNT(*) FROM pacientes WHERE activo = 1) AS pacientes,
               (SELECT COUNT(*) FROM medicos m JOIN usuarios u ON u.id = m.usuario_id WHERE u.activo = 1) AS medicos,
               (SELECT COUNT(*) FROM pacientes WHERE creado_en >= ?) AS pacientes_nuevos_mes`, [inicioMes]),
    ]);

    res.json({
      ok: true,
      data: {
        hoy,
        totales: totales[0],
        turnosHoy,
        porEstadoMes,
        porDia,
      },
    });
  } catch (err) {
    next(err);
  }
}
