// ==============================================================
// CONTROLADOR DE PAGOS (Entidad Adicional 2)
// Conecta con PagoModelo
// ==============================================================
const PagoModelo = require('../modelos/pago.modelo');

// 1. Registrar o actualizar un pago de un turno
async function registrarPago(peticion, respuesta) {
    try {
        const { id_turno, monto, metodo_pago, estado } = peticion.body;

        if (!id_turno || !monto || !metodo_pago) {
            return respuesta.status(400).json({
                exito: false,
                mensaje: 'ID de Turno, Monto y Método de pago son obligatorios.'
            });
        }

        const pagoExistente = await PagoModelo.obtenerPorTurno(id_turno);

        if (pagoExistente) {
            await PagoModelo.actualizar(id_turno, {
                monto,
                metodo_pago,
                estado: estado || 'Cobrado'
            });
            return respuesta.json({
                exito: true,
                mensaje: 'Pago actualizado exitosamente.'
            });
        }

        const idPago = await PagoModelo.crear({
            id_turno,
            monto,
            metodo_pago,
            estado: estado || 'Cobrado'
        });

        return respuesta.status(201).json({
            exito: true,
            mensaje: 'Pago registrado exitosamente.',
            id_pago: idPago
        });
    } catch (error) {
        console.error('Error al registrar pago:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Error al registrar el cobro.'
        });
    }
}

// 2. Obtener información del pago de un turno
async function obtenerPagoPorTurno(peticion, respuesta) {
    try {
        const { id_turno } = peticion.params;
        const pago = await PagoModelo.obtenerPorTurno(id_turno);

        if (!pago) {
            return respuesta.json({
                exito: true,
                tiene_pago: false,
                datos: null
            });
        }

        return respuesta.json({
            exito: true,
            tiene_pago: true,
            datos: pago
        });
    } catch (error) {
        console.error('Error al obtener pago:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Error al consultar el pago.'
        });
    }
}

module.exports = {
    registrarPago,
    obtenerPagoPorTurno
};
