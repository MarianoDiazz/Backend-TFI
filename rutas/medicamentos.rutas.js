// ==============================================================
// RUTAS DE MEDICAMENTOS (VADEMÉCUM)
// ==============================================================
const express = require('express');
const enrutador = express.Router();

const { listarMedicamentos } = require('../controladores/medicamentos.controlador');
const { verificarToken } = require('../middlewares/autenticacion');

enrutador.use(verificarToken);

// Búsqueda y catálogo de medicamentos para recetar
enrutador.get('/', listarMedicamentos);

module.exports = enrutador;
