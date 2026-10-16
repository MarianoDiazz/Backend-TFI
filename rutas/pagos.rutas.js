// ==============================================================
// RUTAS DE PAGOS
// ==============================================================
const express = require('express');
const enrutador = express.Router();

const {
    registrarPago,
    obtenerPagoPorTurno
} = require('../controladores/pagos.controlador');

const { verificarToken } = require('../middlewares/autenticacion');

enrutador.use(verificarToken);

// Registrar o actualizar un pago
enrutador.post('/', registrarPago);

// Consultar pago de un turno
enrutador.get('/turno/:id_turno', obtenerPagoPorTurno);

module.exports = enrutador;
