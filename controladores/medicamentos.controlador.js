// ==============================================================
// CONTROLADOR DE MEDICAMENTOS (Vademécum - Entidad Adicional 3)
// Conecta con MedicamentoModelo
// ==============================================================
const MedicamentoModelo = require('../modelos/medicamento.modelo');

async function listarMedicamentos(peticion, respuesta) {
    try {
        const { busqueda } = peticion.query;
        const medicamentos = await MedicamentoModelo.obtenerTodos(busqueda);

        return respuesta.json({
            exito: true,
            total: medicamentos.length,
            datos: medicamentos
        });
    } catch (error) {
        console.error('Error al listar medicamentos:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Error al consultar el vademécum de medicamentos.'
        });
    }
}

module.exports = {
    listarMedicamentos
};
