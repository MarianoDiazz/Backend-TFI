// ==============================================================
// MODELO: CONSULTA MÉDICA (POO - Consultas SQL directas sin ORM)
// ==============================================================
const conexion = require('../base_de_datos/conexion');

class ConsultaModelo {

    // Buscar si ya existe una consulta para un turno
    static async obtenerPorTurno(idTurno) {
        const [filas] = await conexion.query('SELECT * FROM consultas WHERE id_turno = ?', [idTurno]);
        return filas[0] || null;
    }

    // Guardar una nueva consulta médica
    static async crear(datos) {
        const { id_turno, id_paciente, diagnostico, receta_indicaciones, presion_arterial, peso_kg } = datos;
        const consultaSql = `
            INSERT INTO consultas (id_turno, id_paciente, diagnostico, receta_indicaciones, presion_arterial, peso_kg)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [resultado] = await conexion.query(consultaSql, [
            id_turno,
            id_paciente,
            diagnostico,
            receta_indicaciones || null,
            presion_arterial || null,
            peso_kg || null
        ]);
        return resultado.insertId;
    }

    // Actualizar una consulta existente
    static async actualizar(idTurno, datos) {
        const { diagnostico, receta_indicaciones, presion_arterial, peso_kg } = datos;
        const consultaSql = `
            UPDATE consultas 
            SET diagnostico = ?, receta_indicaciones = ?, presion_arterial = ?, peso_kg = ?
            WHERE id_turno = ?
        `;
        const [resultado] = await conexion.query(consultaSql, [
            diagnostico,
            receta_indicaciones || null,
            presion_arterial || null,
            peso_kg || null,
            idTurno
        ]);
        return resultado.affectedRows > 0;
    }

    // Obtener la historia clínica completa de un paciente
    static async obtenerHistorialPorPaciente(idPaciente) {
        const consultaSql = `
            SELECT 
                c.id_consulta,
                c.id_turno,
                c.diagnostico,
                c.receta_indicaciones,
                c.presion_arterial,
                c.peso_kg,
                c.fecha_atencion,
                t.fecha_hora AS fecha_turno,
                m.nombre AS nombre_medico,
                m.apellido AS apellido_medico
            FROM consultas c
            INNER JOIN turnos t ON c.id_turno = t.id_turno
            INNER JOIN usuarios m ON t.id_medico = m.id_usuario
            WHERE c.id_paciente = ?
            ORDER BY c.fecha_atencion DESC
        `;
        const [filas] = await conexion.query(consultaSql, [idPaciente]);
        return filas;
    }
}

module.exports = ConsultaModelo;
