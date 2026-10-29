import BaseDAO from './BaseDAO.js';
import { query } from '../config/db.js';

const SELECT_PACIENTE = `
  SELECT p.*, o.nombre AS obra_social,
         TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) AS edad
  FROM pacientes p
  LEFT JOIN obras_sociales o ON o.id = p.obra_social_id`;

class PacienteDAO extends BaseDAO {
  constructor() {
    super('pacientes', [
      'dni', 'nombre', 'apellido', 'fecha_nacimiento', 'sexo', 'telefono',
      'email', 'direccion', 'obra_social_id', 'nro_afiliado', 'activo',
    ]);
  }

  // Listado con búsqueda y paginación
  async listar({ buscar, obra_social_id, activo = '1', limit = 20, offset = 0 }) {
    const where = [];
    const params = [];
    if (buscar) {
      where.push('(p.dni LIKE ? OR p.nombre LIKE ? OR p.apellido LIKE ?)');
      params.push(`%${buscar}%`, `%${buscar}%`, `%${buscar}%`);
    }
    if (obra_social_id) { where.push('p.obra_social_id = ?'); params.push(obra_social_id); }
    if (activo !== 'todos') { where.push('p.activo = ?'); params.push(Number(activo)); }
    const filtro = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const data = await query(
      `${SELECT_PACIENTE} ${filtro} ORDER BY p.apellido, p.nombre LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [{ total }] = await query(`SELECT COUNT(*) AS total FROM pacientes p ${filtro}`, params);
    return { data, total: Number(total) };
  }

  async findDetalle(id) {
    const rows = await query(`${SELECT_PACIENTE} WHERE p.id = ?`, [id]);
    return rows[0] || null;
  }

  async dniExiste(dni, exceptoId = 0) {
    return (await this.count('dni = ? AND id <> ?', [dni, exceptoId])) > 0;
  }
}

export default new PacienteDAO();
