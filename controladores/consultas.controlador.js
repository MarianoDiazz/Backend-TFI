// ==============================================================
// CONTROLADOR DE CONSULTAS Y ATENCIÓN MÉDICA
// Conecta con ConsultaModelo y TurnoModelo
// ==============================================================
const ConsultaModelo = require('../modelos/consulta.modelo');
const TurnoModelo = require('../modelos/turno.modelo');

// 1. Guardar la consulta médica de un turno
async function registrarConsulta(peticion, respuesta) {
    try {
        const {
            id_turno,
            id_paciente,
            diagnostico,
            receta_indicaciones,
            presion_arterial,
            peso_kg
        } = peticion.body;

        if (!id_turno || !id_paciente || !diagnostico) {
            return respuesta.status(400).json({
                exito: false,
                mensaje: 'Turno, Paciente y Diagnóstico son obligatorios.'
            });
        }

        const consultaExistente = await ConsultaModelo.obtenerPorTurno(id_turno);

        if (consultaExistente) {
            await ConsultaModelo.actualizar(id_turno, {
                diagnostico,
                receta_indicaciones,
                presion_arterial,
                peso_kg
            });

            // Marcamos el turno como 'Atendido'
            await TurnoModelo.cambiarEstado(id_turno, 'Atendido');

            return respuesta.json({
                exito: true,
                mensaje: 'Consulta médica actualizada exitosamente.'
            });
        }

        const idConsulta = await ConsultaModelo.crear({
            id_turno,
            id_paciente,
            diagnostico,
            receta_indicaciones,
            presion_arterial,
            peso_kg
        });

        // Al registrar la consulta, marcamos el turno como 'Atendido'
        await TurnoModelo.cambiarEstado(id_turno, 'Atendido');

        return respuesta.status(201).json({
            exito: true,
            mensaje: 'Consulta registrada exitosamente.',
            id_consulta: idConsulta
        });
    } catch (error) {
        console.error('Error al registrar consulta:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Error al registrar la atención médica.'
        });
    }
}

// 2. Obtener la historia clínica de un paciente
async function obtenerHistorialPaciente(peticion, respuesta) {
    try {
        const { id_paciente } = peticion.params;
        const historial = await ConsultaModelo.obtenerHistorialPorPaciente(id_paciente);

        return respuesta.json({
            exito: true,
            total: historial.length,
            datos: historial
        });
    } catch (error) {
        console.error('Error al obtener historial:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Error al consultar la historia clínica.'
        });
    }
}

// 3. Obtener la consulta específica de un turno
async function obtenerConsultaPorTurno(peticion, respuesta) {
    try {
        const { id_turno } = peticion.params;
        const consulta = await ConsultaModelo.obtenerPorTurno(id_turno);

        if (!consulta) {
            return respuesta.json({
                exito: true,
                existe: false,
                datos: null
            });
        }

        return respuesta.json({
            exito: true,
            existe: true,
            datos: consulta
        });
    } catch (error) {
        console.error('Error al obtener consulta:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Error al consultar la atención médica.'
        });
    }
}

module.exports = {
    registrarConsulta,
    obtenerHistorialPaciente,
    obtenerConsultaPorTurno
};
