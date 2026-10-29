import BaseDAO from './BaseDAO.js';
import { query } from '../config/db.js';

class HorarioDAO extends BaseDAO {
  constructor() {
    super('horarios_atencion', ['medico_id', 'dia_semana', 'hora_inicio', 'hora_fin', 'duracion_turno']);
  }

  async listarPorMedico(medicoId) {
    return query(
      'SELECT * FROM horarios_atencion WHERE medico_id = ? ORDER BY dia_semana, hora_inicio',
      [medicoId]
    );
  }

  async listarPorMedicoYDia(medicoId, dia) {
    return query(
      'SELECT * FROM horarios_atencion WHERE medico_id = ? AND dia_semana = ? ORDER BY hora_inicio',
      [medicoId, dia]
    );
  }

  // Dos franjas del mismo día no se pueden pisar
  async haySuperposicion({ medico_id, dia_semana, hora_inicio, hora_fin }, exceptoId = 0) {
    const n = await this.count(
      'medico_id = ? AND dia_semana = ? AND id <> ? AND hora_inicio < ? AND hora_fin > ?',
      [medico_id, dia_semana, exceptoId, hora_fin, hora_inicio]
    );
    return n > 0;
  }
}

export default new HorarioDAO();
