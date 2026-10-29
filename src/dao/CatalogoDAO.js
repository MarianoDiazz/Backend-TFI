import BaseDAO from './BaseDAO.js';
import { query } from '../config/db.js';

// Especialidades y obras sociales son catálogos parecidos, reuso la misma lógica
class EspecialidadDAO extends BaseDAO {
  constructor() {
    super('especialidades', ['nombre', 'descripcion']);
  }

  async listar() {
    return query(`
      SELECT e.*,
             (SELECT COUNT(*) FROM medicos m WHERE m.especialidad_id = e.id) AS cantidad_medicos
      FROM especialidades e ORDER BY e.nombre`);
  }
}

class ObraSocialDAO extends BaseDAO {
  constructor() {
    super('obras_sociales', ['nombre', 'codigo', 'telefono', 'activo']);
  }

  async listar() {
    return query(`
      SELECT o.*,
             (SELECT COUNT(*) FROM pacientes p WHERE p.obra_social_id = o.id AND p.activo = 1) AS cantidad_pacientes
      FROM obras_sociales o ORDER BY o.nombre`);
  }
}

export const especialidadDAO = new EspecialidadDAO();
export const obraSocialDAO = new ObraSocialDAO();
