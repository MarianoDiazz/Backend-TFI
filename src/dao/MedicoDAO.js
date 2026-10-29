import BaseDAO from './BaseDAO.js';
import { query } from '../config/db.js';

const SELECT_MEDICO = `
  SELECT m.id, m.usuario_id, m.matricula, m.especialidad_id, m.telefono,
         u.nombre, u.apellido, u.email, u.activo,
         e.nombre AS especialidad
  FROM medicos m
  JOIN usuarios u ON u.id = m.usuario_id
  JOIN especialidades e ON e.id = m.especialidad_id`;

class MedicoDAO extends BaseDAO {
  constructor() {
    super('medicos', ['usuario_id', 'matricula', 'especialidad_id', 'telefono']);
  }

  async listar({ especialidad_id, soloActivos } = {}) {
    const where = [];
    const params = [];
    if (especialidad_id) { where.push('m.especialidad_id = ?'); params.push(especialidad_id); }
    if (soloActivos) where.push('u.activo = 1');
    return query(
      `${SELECT_MEDICO} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY u.apellido, u.nombre`,
      params
    );
  }

  async findDetalle(id, conn) {
    const rows = await query(`${SELECT_MEDICO} WHERE m.id = ?`, [id], conn);
    return rows[0] || null;
  }

  async findByUsuario(usuarioId) {
    const rows = await query(`${SELECT_MEDICO} WHERE m.usuario_id = ?`, [usuarioId]);
    return rows[0] || null;
  }

  async matriculaExiste(matricula, exceptoId = 0) {
    return (await this.count('matricula = ? AND id <> ?', [matricula, exceptoId])) > 0;
  }
}

export default new MedicoDAO();
