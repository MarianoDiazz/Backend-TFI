import BaseDAO from './BaseDAO.js';
import { query } from '../config/db.js';

class PasswordResetDAO extends BaseDAO {
  constructor() {
    super('password_resets', ['usuario_id', 'token_hash', 'expira_en', 'usado']);
  }

  // Si piden otro link, invalido los anteriores
  async invalidarDeUsuario(usuarioId, conn) {
    await query('UPDATE password_resets SET usado = 1 WHERE usuario_id = ? AND usado = 0', [usuarioId], conn);
  }

  // El vencimiento lo calcula MySQL con su propio reloj, así no depende de la zona horaria de Node
  async crearToken(usuarioId, tokenHash, minutos, conn) {
    await query(
      'INSERT INTO password_resets (usuario_id, token_hash, expira_en) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))',
      [usuarioId, tokenHash, minutos],
      conn
    );
  }

  async findVigente(tokenHash) {
    const rows = await query(
      'SELECT * FROM password_resets WHERE token_hash = ? AND usado = 0 AND expira_en > NOW()',
      [tokenHash]
    );
    return rows[0] || null;
  }
}

export default new PasswordResetDAO();
