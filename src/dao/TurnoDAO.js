import BaseDAO from './BaseDAO.js';
import { query } from '../config/db.js';

const SELECT_TURNO = `
  SELECT t.id, t.paciente_id, t.medico_id, t.fecha, t.hora, t.estado, t.motivo, t.creado_en,
         CONCAT(p.apellido, ', ', p.nombre) AS paciente, p.dni AS paciente_dni,
         o.nombre AS obra_social,
         CONCAT(um.apellido, ', ', um.nombre) AS medico, e.nombre AS especialidad,
         CONCAT(uc.nombre, ' ', uc.apellido) AS creado_por_nombre,
         c.id AS consulta_id
  FROM turnos t
  JOIN pacientes p       ON p.id = t.paciente_id
  LEFT JOIN obras_sociales o ON o.id = p.obra_social_id
  JOIN medicos m         ON m.id = t.medico_id
  JOIN usuarios um       ON um.id = m.usuario_id
  JOIN especialidades e  ON e.id = m.especialidad_id
  JOIN usuarios uc       ON uc.id = t.creado_por
  LEFT JOIN consultas c  ON c.turno_id = t.id`;

class TurnoDAO extends BaseDAO {
  constructor() {
    super('turnos', ['paciente_id', 'medico_id', 'fecha', 'hora', 'estado', 'motivo', 'creado_por']);
  }

  // Filtros combinables: rango de fechas, médico, paciente y estado
  async listar({ desde, hasta, medico_id, paciente_id, estado } = {}) {
    const where = [];
    const params = [];
    if (desde) { where.push('t.fecha >= ?'); params.push(desde); }
    if (hasta) { where.push('t.fecha <= ?'); params.push(hasta); }
    if (medico_id) { where.push('t.medico_id = ?'); params.push(medico_id); }
    if (paciente_id) { where.push('t.paciente_id = ?'); params.push(paciente_id); }
    if (estado) { where.push('t.estado = ?'); params.push(estado); }
    return query(
      `${SELECT_TURNO} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY t.fecha, t.hora`,
      params
    );
  }

  async findDetalle(id, conn) {
    const rows = await query(`${SELECT_TURNO} WHERE t.id = ?`, [id], conn);
    return rows[0] || null;
  }

  // Horas ya tomadas de un médico en una fecha (los cancelados no cuentan)
  async horasOcupadas(medicoId, fecha) {
    const rows = await query(
      `SELECT hora FROM turnos WHERE medico_id = ? AND fecha = ? AND estado <> 'CANCELADO'`,
      [medicoId, fecha]
    );
    return rows.map((r) => r.hora);
  }

  // Un paciente no puede tener dos turnos a la misma hora con distintos médicos
  async pacienteOcupado(pacienteId, fecha, hora, exceptoId = 0) {
    const n = await this.count(
      `paciente_id = ? AND fecha = ? AND hora = ? AND estado <> 'CANCELADO' AND id <> ?`,
      [pacienteId, fecha, hora, exceptoId]
    );
    return n > 0;
  }

  async contarFuturosDeMedico(medicoId) {
    return this.count(
      `medico_id = ? AND fecha >= CURDATE() AND estado IN ('PENDIENTE','CONFIRMADO')`,
      [medicoId]
    );
  }

  // --- consultas para el dashboard ---
  async resumenPorEstado(desde, hasta, medicoId) {
    const params = [desde, hasta];
    let extra = '';
    if (medicoId) { extra = 'AND medico_id = ?'; params.push(medicoId); }
    return query(
      `SELECT estado, COUNT(*) AS cantidad FROM turnos
       WHERE fecha BETWEEN ? AND ? ${extra} GROUP BY estado`,
      params
    );
  }

  async turnosPorDia(desde, hasta, medicoId) {
    const params = [desde, hasta];
    let extra = '';
    if (medicoId) { extra = 'AND medico_id = ?'; params.push(medicoId); }
    return query(
      `SELECT fecha, COUNT(*) AS cantidad FROM turnos
       WHERE fecha BETWEEN ? AND ? AND estado <> 'CANCELADO' ${extra}
       GROUP BY fecha ORDER BY fecha`,
      params
    );
  }

  // Resumen de productividad por médico (para reportes)
  async resumenPorMedico(desde, hasta) {
    return query(
      `SELECT CONCAT(u.apellido, ', ', u.nombre) AS medico, e.nombre AS especialidad,
              COUNT(t.id) AS total,
              SUM(t.estado = 'ATENDIDO')  AS atendidos,
              SUM(t.estado = 'AUSENTE')   AS ausentes,
              SUM(t.estado = 'CANCELADO') AS cancelados,
              SUM(t.estado IN ('PENDIENTE','CONFIRMADO')) AS pendientes
       FROM medicos m
       JOIN usuarios u ON u.id = m.usuario_id
       JOIN especialidades e ON e.id = m.especialidad_id
       LEFT JOIN turnos t ON t.medico_id = m.id AND t.fecha BETWEEN ? AND ?
       GROUP BY m.id, u.apellido, u.nombre, e.nombre ORDER BY u.apellido`,
      [desde, hasta]
    );
  }

  async resumenPorObraSocial(desde, hasta) {
    return query(
      `SELECT COALESCE(o.nombre, 'Particular') AS obra_social,
              COUNT(t.id) AS turnos, SUM(t.estado = 'ATENDIDO') AS atendidos
       FROM turnos t
       JOIN pacientes p ON p.id = t.paciente_id
       LEFT JOIN obras_sociales o ON o.id = p.obra_social_id
       WHERE t.fecha BETWEEN ? AND ? AND t.estado <> 'CANCELADO'
       GROUP BY obra_social ORDER BY turnos DESC`,
      [desde, hasta]
    );
  }
}

export default new TurnoDAO();
