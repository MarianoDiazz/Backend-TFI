// ==============================================================
// RUTAS DE AUTENTICACIÓN
// ==============================================================
const express = require('express');
const enrutador = express.Router();

const { 
    iniciarSesion, 
    obtenerPerfil, 
    solicitarRecuperacion,
    restablecerClave
} = require('../controladores/autenticacion.controlador');

const { verificarToken } = require('../middlewares/autenticacion');

// Ruta pública: Iniciar sesión con email y contraseña
enrutador.post('/iniciar-sesion', iniciarSesion);

// Ruta pública: Recuperar contraseña
enrutador.post('/recuperar-clave', solicitarRecuperacion);
enrutador.post('/restablecer-clave', restablecerClave);

// Ruta protegida: Obtener datos del usuario logueado usando el token
enrutador.get('/perfil', verificarToken, obtenerPerfil);

module.exports = enrutador;
