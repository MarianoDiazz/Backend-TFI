// ==============================================================
// RUTAS DE PACIENTES
// Requieren token de autenticación (enviado desde el localStorage)
// ==============================================================
const express = require('express');
const enrutador = express.Router();

const {
    listarPacientes,
    obtenerPacientePorId,
    crearPaciente,
    actualizarPaciente,
    eliminarPaciente
} = require('../controladores/pacientes.controlador');

const { verificarToken } = require('../middlewares/autenticacion');

// Aplicamos el middleware para que todas las rutas de pacientes requieran token
enrutador.use(verificarToken);

// Rutas CRUD
enrutador.get('/', listarPacientes);
enrutador.get('/:id', obtenerPacientePorId);
enrutador.post('/', crearPaciente);
enrutador.put('/:id', actualizarPaciente);
enrutador.delete('/:id', eliminarPaciente);

module.exports = enrutador;
