import BaseDAO from './BaseDAO.js';
import { query } from '../config/db.js';

// Nunca devuelvo password_hash en los listados
const SELECT_PUBLICO = `
  SELECT u.id, u.nombre, u.apellido, u.email, u.rol_id, r.nombre AS rol,
         u.activo, u.ultimo_login, u.creado_en,
         m.id AS medico_id
  FROM usuarios u
  JOIN roles r ON r.id = u.rol_id
  LEFT JOIN medicos m ON m.usuario_id = u.id`;

class UsuarioDAO extends BaseDAO {
  constructor() {
    super('usuarios', ['nombre', 'apellido', 'email', 'password_hash', 'rol_id', 'activo', 'ultimo_login']);
  }

  async listar({ buscar, rol_id, activo } = {}) {
    const where = [];
    const params = [];
    if (buscar) {
      where.push('(u.nombre LIKE ? OR u.apellido LIKE ? OR u.email LIKE ?)');
      params.push(`%${buscar}%`, `%${buscar}%`, `%${buscar}%`);
    }
    if (rol_id) { where.push('u.rol_id = ?'); params.push(rol_id); }
    if (activo !== undefined && activo !== '') { where.push('u.activo = ?'); params.push(Number(activo)); }
    const sql = `${SELECT_PUBLICO} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY u.apellido, u.nombre`;
    return query(sql, params);
  }

  async findPublicoById(id, conn) {
    const rows = await query(`${SELECT_PUBLICO} WHERE u.id = ?`, [id], conn);
    return rows[0] || null;
  }

  // Este sí trae el hash, lo uso solo para el login
  async findByEmailConPassword(email) {
    const rows = await query(
      `SELECT u.*, r.nombre AS rol FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.email = ?`,
      [email]
    );
    return rows[0] || null;
  }

  async emailExiste(email, exceptoId = 0) {
    return (await this.count('email = ? AND id <> ?', [email, exceptoId])) > 0;
  }

  async registrarLogin(id) {
    await query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?', [id]);
  }

  async contarAdminsActivos() {
    return this.count('rol_id = 1 AND activo = 1');
  }
}

export default new UsuarioDAO();
