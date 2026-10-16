// ==============================================================
// MIDDLEWARE DE AUTENTICACIÓN
// Verifica que las peticiones incluyan un token JWT válido
// que el frontend envía desde el localStorage
// ==============================================================
const jwt = require('jsonwebtoken');
require('dotenv').config();

const CLAVE_SECRETA = process.env.JWT_SECRETO || 'clave_secreta_escolar_consultorio_123';

function verificarToken(peticion, respuesta, siguiente) {
    // 1. Obtener el encabezado de autorización
    const cabeceraAutorizacion = peticion.headers['authorization'] || peticion.headers['Authorization'];

    // Si no enviaron nada en la cabecera
    if (!cabeceraAutorizacion) {
        return respuesta.status(401).json({
            exito: false,
            mensaje: 'Acceso no autorizado. No se proporcionó ningún token.'
        });
    }

    // 2. Extraer el token (puede venir como "Bearer token123..." o directamente "token123...")
    let token = cabeceraAutorizacion;
    if (cabeceraAutorizacion.startsWith('Bearer ')) {
        token = cabeceraAutorizacion.slice(7).trim();
    }

    // 3. Verificar si el token es válido
    try {
        const datosDecodificados = jwt.verify(token, CLAVE_SECRETA);
        // Guardamos los datos del usuario en la petición para que los controladores puedan usarlos
        peticion.usuario = datosDecodificados;
        // Continuamos con el controlador
        siguiente();
    } catch (error) {
        return respuesta.status(403).json({
            exito: false,
            mensaje: 'Token inválido o expirado. Por favor iniciá sesión nuevamente.'
        });
    }
}

// Middleware opcional para restringir acceso por rol (ej: 'Medico', 'Recepcion', 'Admin')
function permitirRoles(...rolesPermitidos) {
    return (peticion, respuesta, siguiente) => {
        // Verificamos si el rol del usuario autenticado está en la lista permitida
        if (!peticion.usuario || !rolesPermitidos.includes(peticion.usuario.rol)) {
            return respuesta.status(403).json({
                exito: false,
                mensaje: 'No tenés permisos para realizar esta acción.'
            });
        }
        siguiente();
    };
}

module.exports = {
    verificarToken,
    permitirRoles
};
