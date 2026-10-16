// ==============================================================
// RUTAS DE USUARIOS (ABM Completo)
// ==============================================================
const express = require('express');
const enrutador = express.Router();

const {
    listarMedicos,
    listarUsuarios,
    obtenerUsuarioPorId,
    crearUsuario,
    actualizarUsuario,
    cambiarEstadoUsuario
} = require('../controladores/usuarios.controlador');

const { verificarToken, permitirRoles } = require('../middlewares/autenticacion');

// Todos los endpoints de usuarios requieren token
enrutador.use(verificarToken);

// Listar médicos (disponible para Recepción y Médicos para asignar turnos)
enrutador.get('/medicos', listarMedicos);

// ABM de Usuarios (disponible para Admin o según roles)
enrutador.get('/', listarUsuarios);
enrutador.get('/:id', obtenerUsuarioPorId);
enrutador.post('/', permitirRoles('Admin'), crearUsuario);
enrutador.put('/:id', permitirRoles('Admin'), actualizarUsuario);
enrutador.patch('/:id/estado', permitirRoles('Admin'), cambiarEstadoUsuario);

module.exports = enrutador;
