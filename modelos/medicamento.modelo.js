// ==============================================================
// MODELO: MEDICAMENTO (Vademécum - POO)
// ==============================================================
const conexion = require('../base_de_datos/conexion');

class MedicamentoModelo {

    // Listar medicamentos activos con búsqueda opcional
    static async obtenerTodos(busqueda = null) {
        let consultaSql = 'SELECT * FROM medicamentos WHERE activo = 1';
        const parametros = [];

        if (busqueda) {
            consultaSql += ' AND (nombre_comercial LIKE ? OR droga_generico LIKE ?)';
            const termino = `%${busqueda}%`;
            parametros.push(termino, termino);
        }

        consultaSql += ' ORDER BY nombre_comercial ASC';

        const [filas] = await conexion.query(consultaSql, parametros);
        return filas;
    }
}

module.exports = MedicamentoModelo;
