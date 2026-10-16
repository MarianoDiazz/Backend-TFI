// ==============================================================
// MODELO: OBRA SOCIAL (POO)
// ==============================================================
const conexion = require('../base_de_datos/conexion');

class ObraSocialModelo {

    // Listar todas las obras sociales activas (incluye 'Particular')
    static async obtenerTodas() {
        const [filas] = await conexion.query(
            'SELECT id_obra_social, nombre, sigla FROM obras_sociales WHERE activa = 1 ORDER BY nombre ASC'
        );
        return filas;
    }
}

module.exports = ObraSocialModelo;
