// ==============================================================
// MODELO: TURNO (POO - Consultas SQL directas sin ORM)
// ==============================================================
const conexion = require('../base_de_datos/conexion');

class TurnoModelo {

    // Listar turnos con filtros opcionales (fecha, estado, id_medico)
    static async obtenerTodos(filtros = {}) {
        const { fecha, estado, id_medico } = filtros;

        let consultaSql = `
            SELECT 
                t.id_turno,
                t.fecha_hora,
                t.motivo,
                t.estado,
                p.id_paciente,
                p.dni AS dni_paciente,
                p.nombre AS nombre_paciente,
                p.apellido AS apellido_paciente,
                p.telefono AS telefono_paciente,
                os.nombre AS nombre_obra_social,
                m.id_usuario AS id_medico,
                m.nombre AS nombre_medico,
                m.apellido AS apellido_medico,
                tt.id_tipo_turno,
                tt.nombre AS nombre_tipo_turno,
                tt.duracion_estimada_min,
                pg.id_pago,
                pg.monto AS monto_pago,
                pg.metodo_pago,
                pg.estado AS estado_pago
            FROM turnos t
            INNER JOIN pacientes p ON t.id_paciente = p.id_paciente
            INNER JOIN obras_sociales os ON p.id_obra_social = os.id_obra_social
            INNER JOIN usuarios m ON t.id_medico = m.id_usuario
            INNER JOIN tipos_turno tt ON t.id_tipo_turno = tt.id_tipo_turno
            LEFT JOIN pagos pg ON t.id_turno = pg.id_turno
            WHERE 1=1
        `;
        const parametros = [];

        if (fecha) {
            consultaSql += ` AND DATE(t.fecha_hora) = ?`;
            parametros.push(fecha);
        }

        if (estado) {
            consultaSql += ` AND t.estado = ?`;
            parametros.push(estado);
        }

        if (id_medico) {
            consultaSql += ` AND t.id_medico = ?`;
            parametros.push(id_medico);
        }

        consultaSql += ` ORDER BY t.fecha_hora ASC`;

        const [filas] = await conexion.query(consultaSql, parametros);
        return filas;
    }

    // Obtener un turno por su ID
    static async obtenerPorId(idTurno) {
        const consultaSql = `
            SELECT 
                t.id_turno,
                t.fecha_hora,
                t.motivo,
                t.estado,
                p.id_paciente,
                p.dni AS dni_paciente,
                p.nombre AS nombre_paciente,
                p.apellido AS apellido_paciente,
                m.id_usuario AS id_medico,
                m.nombre AS nombre_medico,
                m.apellido AS apellido_medico,
                tt.id_tipo_turno,
                tt.nombre AS nombre_tipo_turno
            FROM turnos t
            INNER JOIN pacientes p ON t.id_paciente = p.id_paciente
            INNER JOIN usuarios m ON t.id_medico = m.id_usuario
            INNER JOIN tipos_turno tt ON t.id_tipo_turno = tt.id_tipo_turno
            WHERE t.id_turno = ?
        `;
        const [filas] = await conexion.query(consultaSql, [idTurno]);
        return filas[0] || null;
    }

    // Crear un nuevo turno
    static async crear(datos) {
        const { id_paciente, id_medico, id_tipo_turno, fecha_hora, motivo } = datos;
        const consultaSql = `
            INSERT INTO turnos (id_paciente, id_medico, id_tipo_turno, fecha_hora, motivo, estado)
            VALUES (?, ?, ?, ?, ?, 'Pendiente')
        `;
        const valores = [id_paciente, id_medico, id_tipo_turno, fecha_hora, motivo || null];
        const [resultado] = await conexion.query(consultaSql, valores);
        return resultado.insertId;
    }

    // Actualizar el estado del turno ('Pendiente', 'En Espera', 'En Consulta', 'Atendido', 'Cancelado')
    static async cambiarEstado(idTurno, nuevoEstado) {
        const [resultado] = await conexion.query(
            'UPDATE turnos SET estado = ? WHERE id_turno = ?',
            [nuevoEstado, idTurno]
        );
        return resultado.affectedRows > 0;
    }
}

module.exports = TurnoModelo;
