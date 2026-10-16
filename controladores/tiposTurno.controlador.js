// ==============================================================
// CONTROLADOR DE TIPOS DE TURNO
// Conecta con TipoTurnoModelo
// ==============================================================
const TipoTurnoModelo = require('../modelos/tipoTurno.modelo');

async function listarTiposTurno(peticion, respuesta) {
    try {
        const tipos = await TipoTurnoModelo.obtenerTodos();

        return respuesta.json({
            exito: true,
            datos: tipos
        });
    } catch (error) {
        console.error('Error al listar tipos de turno:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Error al obtener los tipos de turno.'
        });
    }
}

module.exports = {
    listarTiposTurno
};
