// ==============================================================
// CONTROLADOR DE OBRAS SOCIALES
// Conecta con ObraSocialModelo
// ==============================================================
const ObraSocialModelo = require('../modelos/obraSocial.modelo');

async function listarObrasSociales(peticion, respuesta) {
    try {
        const obrasSociales = await ObraSocialModelo.obtenerTodas();

        return respuesta.json({
            exito: true,
            datos: obrasSociales
        });
    } catch (error) {
        console.error('Error al listar obras sociales:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Error al obtener obras sociales.'
        });
    }
}

module.exports = {
    listarObrasSociales
};
