// ==============================================================
// RUTAS DE TIPOS DE TURNO
// ==============================================================
const express = require('express');
const enrutador = express.Router();

const { listarTiposTurno } = require('../controladores/tiposTurno.controlador');
const { verificarToken } = require('../middlewares/autenticacion');

enrutador.get('/', verificarToken, listarTiposTurno);

module.exports = enrutador;
