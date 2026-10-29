import mysql from 'mysql2/promise';
import { env } from './env.js';

// Pool de conexiones: reusa conexiones en vez de abrir una por consulta
export const pool = mysql.createPool({
  ...env.db,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true, // fechas como texto, evito líos de zona horaria
  timezone: 'local',
});

// Ejecuta una consulta con el pool o con una conexión de transacción
export async function query(sql, params = [], conn = pool) {
  const [rows] = await conn.query(sql, params);
  return rows;
}

// Envuelve varias operaciones en una transacción: o se guardan todas o ninguna
export async function withTransaction(callback) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function testConnection() {
  const conn = await pool.getConnection();
  conn.release();
}
