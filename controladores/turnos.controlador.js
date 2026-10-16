// ==============================================================
// CONTROLADOR DE TURNOS (Entidad Principal 2)
// Conecta con TurnoModelo
// ==============================================================
const TurnoModelo = require('../modelos/turno.modelo');

// 1. Listar turnos (permite filtrar por fecha o por estado)
async function listarTurnos(peticion, respuesta) {
    try {
        const { fecha, estado, id_medico } = peticion.query;
        const turnos = await TurnoModelo.obtenerTodos({ fecha, estado, id_medico });

        return respuesta.json({
            exito: true,
            total: turnos.length,
            datos: turnos
        });
    } catch (error) {
        console.error('Error al listar turnos:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Error al obtener los turnos.'
        });
    }
}

// 2. Obtener un turno por su ID
async function obtenerTurnoPorId(peticion, respuesta) {
    try {
        const { id } = peticion.params;
        const turno = await TurnoModelo.obtenerPorId(id);

        if (!turno) {
            return respuesta.status(404).json({
                exito: false,
                mensaje: 'Turno no encontrado.'
            });
        }

        return respuesta.json({
            exito: true,
            datos: turno
        });
    } catch (error) {
        console.error('Error al obtener turno:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Error al obtener la información del turno.'
        });
    }
}

// 3. Crear un nuevo turno
async function crearTurno(peticion, respuesta) {
    try {
        const { 
            id_paciente, 
            id_medico, 
            id_tipo_turno, 
            fecha_hora, 
            motivo 
        } = peticion.body;

        if (!id_paciente || !id_medico || !id_tipo_turno || !fecha_hora) {
            return respuesta.status(400).json({
                exito: false,
                mensaje: 'Paciente, Médico, Tipo de Turno y Fecha/Hora son datos requeridos.'
            });
        }

        const idInsertado = await TurnoModelo.crear({
            id_paciente,
            id_medico,
            id_tipo_turno,
            fecha_hora,
            motivo
        });

        return respuesta.status(201).json({
            exito: true,
            mensaje: 'Turno agendado exitosamente.',
            id_turno: idInsertado
        });
    } catch (error) {
        console.error('Error al crear turno:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Error al agendar el turno.'
        });
    }
}

// 4. Cambiar estado del turno (En Espera, En Consulta, Atendido, Cancelado)
async function cambiarEstadoTurno(peticion, respuesta) {
    try {
        const { id } = peticion.params;
        const { estado } = peticion.body;

        const estadosPermitidos = ['Pendiente', 'En Espera', 'En Consulta', 'Atendido', 'Cancelado'];

        if (!estado || !estadosPermitidos.includes(estado)) {
            return respuesta.status(400).json({
                exito: false,
                mensaje: `Estado no válido. Los estados permitidos son: ${estadosPermitidos.join(', ')}`
            });
        }

        const modificado = await TurnoModelo.cambiarEstado(id, estado);

        if (!modificado) {
            return respuesta.status(404).json({
                exito: false,
                mensaje: 'Turno no encontrado.'
            });
        }

        return respuesta.json({
            exito: true,
            mensaje: `El estado del turno se actualizó a "${estado}".`
        });
    } catch (error) {
        console.error('Error al cambiar estado del turno:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Error al actualizar el estado del turno.'
        });
    }
}

// 5. Cancelar turno
async function cancelarTurno(peticion, respuesta) {
    try {
        const { id } = peticion.params;
        const cancelado = await TurnoModelo.cambiarEstado(id, 'Cancelado');

        if (!cancelado) {
            return respuesta.status(404).json({
                exito: false,
                mensaje: 'Turno no encontrado.'
            });
        }

        return respuesta.json({
            exito: true,
            mensaje: 'Turno cancelado exitosamente.'
        });
    } catch (error) {
        console.error('Error al cancelar turno:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Error al cancelar el turno.'
        });
    }
}

module.exports = {
    listarTurnos,
    obtenerTurnoPorId,
    crearTurno,
    cambiarEstadoTurno,
    cancelarTurno
};
