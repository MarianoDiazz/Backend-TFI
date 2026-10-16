// ==============================================================
// MODELO: TIPO DE TURNO (POO)
// ==============================================================
const conexion = require('../base_de_datos/conexion');

class TipoTurnoModelo {

    // Listar todos los tipos de turnos activos
    static async obtenerTodos() {
        const [filas] = await conexion.query(
            'SELECT id_tipo_turno, nombre, duracion_estimada_min FROM tipos_turno WHERE activo = 1 ORDER BY id_tipo_turno ASC'
        );
        return filas;
    }
}

module.exports = TipoTurnoModelo;
