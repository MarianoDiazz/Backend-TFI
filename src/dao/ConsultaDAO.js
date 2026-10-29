import BaseDAO from './BaseDAO.js';
import { query } from '../config/db.js';

const SELECT_CONSULTA = `
  SELECT c.*, t.fecha, t.hora, t.paciente_id, t.medico_id,
         CONCAT(p.apellido, ', ', p.nombre) AS paciente, p.dni AS paciente_dni,
         CONCAT(u.apellido, ', ', u.nombre) AS medico, e.nombre AS especialidad
  FROM consultas c
  JOIN turnos t   ON t.id = c.turno_id
  JOIN pacientes p ON p.id = t.paciente_id
  JOIN medicos m  ON m.id = t.medico_id
  JOIN usuarios u ON u.id = m.usuario_id
  JOIN especialidades e ON e.id = m.especialidad_id`;

class ConsultaDAO extends BaseDAO {
  constructor() {
    super('consultas', [
      'turno_id', 'motivo_consulta', 'diagnostico', 'tratamiento', 'indicaciones', 'peso_kg', 'presion',
    ]);
  }

  // Historia clínica completa de un paciente (de la más nueva a la más vieja)
  async historiaClinica(pacienteId) {
    return query(`${SELECT_CONSULTA} WHERE t.paciente_id = ? ORDER BY t.fecha DESC, t.hora DESC`, [pacienteId]);
  }

  async findDetalle(id, conn) {
    const rows = await query(`${SELECT_CONSULTA} WHERE c.id = ?`, [id], conn);
    return rows[0] || null;
  }

  async findByTurno(turnoId, conn) {
    const rows = await query('SELECT * FROM consultas WHERE turno_id = ?', [turnoId], conn);
    return rows[0] || null;
  }
}

export default new ConsultaDAO();
