import { query } from '../config/db.js';

/**
 * DAO genérico: tiene el CRUD básico que comparten todas las tablas.
 * Cada DAO concreto hereda de acá y solo agrega sus consultas propias.
 * El parámetro `conn` permite usar el mismo método dentro de una transacción.
 */
export default class BaseDAO {
  constructor(tabla, columnas) {
    this.tabla = tabla;
    this.columnas = columnas; // whitelist: solo estas columnas se pueden escribir
  }

  // Me quedo solo con las columnas permitidas (evita que manden campos raros)
  filtrar(data) {
    const out = {};
    for (const col of this.columnas) {
      if (data[col] !== undefined) out[col] = data[col];
    }
    return out;
  }

  async findAll(conn) {
    return query(`SELECT * FROM ${this.tabla} ORDER BY id`, [], conn);
  }

  async findById(id, conn) {
    const rows = await query(`SELECT * FROM ${this.tabla} WHERE id = ?`, [id], conn);
    return rows[0] || null;
  }

  async create(data, conn) {
    const datos = this.filtrar(data);
    const result = await query(`INSERT INTO ${this.tabla} SET ?`, [datos], conn);
    return result.insertId;
  }

  async update(id, data, conn) {
    const datos = this.filtrar(data);
    if (Object.keys(datos).length === 0) return 0;
    const result = await query(`UPDATE ${this.tabla} SET ? WHERE id = ?`, [datos, id], conn);
    return result.affectedRows;
  }

  async delete(id, conn) {
    const result = await query(`DELETE FROM ${this.tabla} WHERE id = ?`, [id], conn);
    return result.affectedRows;
  }

  async count(where = '1=1', params = [], conn) {
    const rows = await query(`SELECT COUNT(*) AS total FROM ${this.tabla} WHERE ${where}`, params, conn);
    return Number(rows[0].total);
  }
}
