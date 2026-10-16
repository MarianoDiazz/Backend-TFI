// ==============================================================
// MODELO: PAGO (POO - Consultas SQL directas sin ORM)
// ==============================================================
const conexion = require('../base_de_datos/conexion');

class PagoModelo {

    // Buscar pago asociado a un turno
    static async obtenerPorTurno(idTurno) {
        const [filas] = await conexion.query('SELECT * FROM pagos WHERE id_turno = ?', [idTurno]);
        return filas[0] || null;
    }

    // Registrar un nuevo pago
    static async crear(datos) {
        const { id_turno, monto, metodo_pago, estado } = datos;
        const consultaSql = `
            INSERT INTO pagos (id_turno, monto, metodo_pago, estado)
            VALUES (?, ?, ?, ?)
        `;
        const [resultado] = await conexion.query(consultaSql, [
            id_turno,
            monto,
            metodo_pago,
            estado || 'Cobrado'
        ]);
        return resultado.insertId;
    }

    // Actualizar un pago existente
    static async actualizar(idTurno, datos) {
        const { monto, metodo_pago, estado } = datos;
        const consultaSql = `
            UPDATE pagos 
            SET monto = ?, metodo_pago = ?, estado = ?, fecha_pago = NOW() 
            WHERE id_turno = ?
        `;
        const [resultado] = await conexion.query(consultaSql, [
            monto,
            metodo_pago,
            estado || 'Cobrado',
            idTurno
        ]);
        return resultado.affectedRows > 0;
    }
}

module.exports = PagoModelo;
