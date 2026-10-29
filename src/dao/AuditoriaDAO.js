import BaseDAO from './BaseDAO.js';
import { query } from '../config/db.js';

class AuditoriaDAO extends BaseDAO {
  constructor() {
    super('auditoria', ['usuario_id', 'accion', 'entidad', 'entidad_id', 'detalle']);
  }

  // Registro la acción; si falla no quiero romper la operación principal
  async registrar(usuarioId, accion, entidad, entidadId = null, detalle = null, conn) {
    try {
      await this.create(
        { usuario_id: usuarioId, accion, entidad, entidad_id: entidadId, detalle: detalle?.slice(0, 255) },
        conn
      );
    } catch (err) {
      console.error('[auditoria] no se pudo registrar:', err.message);
    }
  }

  async ultimos(limite = 100) {
    return query(
      `SELECT a.*, CONCAT(u.nombre, ' ', u.apellido) AS usuario
       FROM auditoria a LEFT JOIN usuarios u ON u.id = a.usuario_id
       ORDER BY a.id DESC LIMIT ?`,
      [limite]
    );
  }
}

export default new AuditoriaDAO();
