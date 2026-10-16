// ==============================================================
// MODELO: REPORTE (POO - Consultas analíticas)
// ==============================================================
const conexion = require('../base_de_datos/conexion');

class ReporteModelo {

    // 1. Conteo de turnos agrupados por estado
    static async obtenerTurnosPorEstado() {
        const [filas] = await conexion.query(`
            SELECT estado, COUNT(*) AS cantidad
            FROM turnos
            GROUP BY estado
        `);
        return filas;
    }

    // 2. Pacientes por cobertura médica (Obra Social vs. Particular)
    static async obtenerPacientesPorCobertura() {
        const [filas] = await conexion.query(`
            SELECT 
                os.nombre AS obra_social,
                COUNT(p.id_paciente) AS cantidad
            FROM obras_sociales os
            LEFT JOIN pacientes p ON os.id_obra_social = p.id_obra_social AND p.activo = 1
            GROUP BY os.id_obra_social, os.nombre
            ORDER BY cantidad DESC
        `);
        return filas;
    }

    // 3. Recaudación agrupada por método de pago
    static async obtenerRecaudacionPorMetodo() {
        const [filas] = await conexion.query(`
            SELECT 
                metodo_pago,
                COALESCE(SUM(monto), 0) AS total_recaudado,
                COUNT(*) AS cantidad_pagos
            FROM pagos
            WHERE estado = 'Cobrado'
            GROUP BY metodo_pago
        `);
        return filas;
    }

    // 4. Total general recaudado
    static async obtenerTotalRecaudado() {
        const [filas] = await conexion.query(`
            SELECT COALESCE(SUM(monto), 0) AS total_general
            FROM pagos
            WHERE estado = 'Cobrado'
        `);
        return filas[0]?.total_general || 0;
    }

    // 5. Lista detallada de turnos y cobros para exportación (Excel / CSV)
    static async obtenerDetalleParaExportar() {
        const consultaSql = `
            SELECT 
                t.id_turno,
                DATE_FORMAT(t.fecha_hora, '%Y-%m-%d %H:%i') AS fecha_hora,
                t.estado AS estado_turno,
                CONCAT(p.apellido, ', ', p.nombre) AS paciente,
                p.dni AS dni_paciente,
                os.nombre AS cobertura,
                CONCAT(m.apellido, ', ', m.nombre) AS medico,
                tt.nombre AS tipo_turno,
                COALESCE(pg.monto, 0) AS monto_pagado,
                COALESCE(pg.metodo_pago, 'Sin Pago') AS metodo_pago,
                COALESCE(pg.estado, 'Sin Cobrar') AS estado_pago
            FROM turnos t
            INNER JOIN pacientes p ON t.id_paciente = p.id_paciente
            INNER JOIN obras_sociales os ON p.id_obra_social = os.id_obra_social
            INNER JOIN usuarios m ON t.id_medico = m.id_usuario
            INNER JOIN tipos_turno tt ON t.id_tipo_turno = tt.id_tipo_turno
            LEFT JOIN pagos pg ON t.id_turno = pg.id_turno
            ORDER BY t.fecha_hora DESC
        `;
        const [filas] = await conexion.query(consultaSql);
        return filas;
    }
}

module.exports = ReporteModelo;
