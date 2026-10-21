// ==============================================================
// CONTROLADOR DE AUTENTICACIÓN
// Utiliza UsuarioModelo para consultar la base de datos
// ==============================================================
const UsuarioModelo = require('../modelos/usuario.modelo');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

const CLAVE_SECRETA = process.env.JWT_SECRETO;
const URL_FRONTEND = process.env.URL_FRONTEND || 'http://localhost:5173';

// Convierte el token en un hash SHA-256 para guardarlo en la base
function hashearToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

// 1. Iniciar sesión (Login)
async function iniciarSesion(peticion, respuesta) {
    try {
        const { email, password } = peticion.body;

        if (!email || !password) {
            return respuesta.status(400).json({
                exito: false,
                mensaje: 'Por favor ingresá tu email y contraseña.'
            });
        }

        // Buscamos al usuario usando el Modelo
        const usuario = await UsuarioModelo.buscarPorEmail(email);

        if (!usuario) {
            return respuesta.status(401).json({
                exito: false,
                mensaje: 'Email o contraseña incorrectos.'
            });
        }

        if (!usuario.activo) {
            return respuesta.status(403).json({
                exito: false,
                mensaje: 'Este usuario se encuentra inactivo. Consultá con el administrador.'
            });
        }

        // Comparamos la contraseña en texto plano con el hash guardado
        const contrasenaValida = await bcrypt.compare(password, usuario.password_hash);
        if (!contrasenaValida) {
            return respuesta.status(401).json({
                exito: false,
                mensaje: 'Email o contraseña incorrectos.'
            });
        }

        // Generamos el token JWT para el frontend (dura 8 horas)
        const datosParaToken = {
            id_usuario: usuario.id_usuario,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            email: usuario.email,
            rol: usuario.rol
        };

        const token = jwt.sign(datosParaToken, CLAVE_SECRETA, { expiresIn: '8h' });

        return respuesta.json({
            exito: true,
            mensaje: 'Inicio de sesión exitoso.',
            token: token,
            usuario: {
                id_usuario: usuario.id_usuario,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                email: usuario.email,
                rol: usuario.rol
            }
        });

    } catch (error) {
        console.error('Error en iniciarSesion:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Ocurrió un error en el servidor al intentar iniciar sesión.'
        });
    }
}

// 2. Obtener el perfil del usuario autenticado
async function obtenerPerfil(peticion, respuesta) {
    try {
        const idUsuario = peticion.usuario.id_usuario;
        const usuario = await UsuarioModelo.buscarPorId(idUsuario);

        if (!usuario) {
            return respuesta.status(404).json({
                exito: false,
                mensaje: 'Usuario no encontrado.'
            });
        }

        return respuesta.json({
            exito: true,
            usuario: usuario
        });

    } catch (error) {
        console.error('Error en obtenerPerfil:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Error al obtener la información del perfil.'
        });
    }
}

// 3. Pedir recuperación de contraseña: genera un enlace de un solo uso
async function solicitarRecuperacion(peticion, respuesta) {
    try {
        const { email } = peticion.body;

        if (!email) {
            return respuesta.status(400).json({
                exito: false,
                mensaje: 'Ingresá tu email.'
            });
        }

        const usuario = await UsuarioModelo.buscarPorEmail(email);

        if (usuario && usuario.activo) {
            // Token aleatorio: el original va en el enlace, en la base guardamos solo su hash
            const token = crypto.randomBytes(32).toString('hex');
            await UsuarioModelo.guardarTokenRecuperacion(usuario.id_usuario, hashearToken(token));

            const enlace = `${URL_FRONTEND}/restablecer-clave?token=${token}`;
            // En producción este enlace se envía por email. En desarrollo lo mostramos en la consola.
            console.log(`🔑 Enlace de recuperación para ${email} (vence en 30 minutos):`);
            console.log(enlace);
        }

        // Misma respuesta exista o no el email: así no revelamos quién tiene cuenta
        return respuesta.json({
            exito: true,
            mensaje: 'Si el email está registrado, te enviamos un enlace para crear una nueva contraseña. Vence en 30 minutos.'
        });

    } catch (error) {
        console.error('Error en solicitarRecuperacion:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Error al procesar la recuperación de contraseña.'
        });
    }
}

// 4. Restablecer la contraseña con el enlace recibido
async function restablecerClave(peticion, respuesta) {
    try {
        const { token, nueva_password } = peticion.body;

        if (!token || !nueva_password) {
            return respuesta.status(400).json({
                exito: false,
                mensaje: 'Faltan datos para restablecer la contraseña.'
            });
        }

        if (typeof nueva_password !== 'string' || nueva_password.length < 6) {
            return respuesta.status(400).json({
                exito: false,
                mensaje: 'La contraseña debe tener al menos 6 caracteres.'
            });
        }

        const usuario = await UsuarioModelo.buscarPorTokenVigente(hashearToken(token));
        if (!usuario) {
            return respuesta.status(400).json({
                exito: false,
                mensaje: 'El enlace no es válido o ya venció. Pedí uno nuevo.'
            });
        }

        const nuevoHash = await bcrypt.hash(nueva_password, 10);
        await UsuarioModelo.restablecerClave(usuario.id_usuario, nuevoHash);

        return respuesta.json({
            exito: true,
            mensaje: 'Contraseña actualizada. Ya podés iniciar sesión.'
        });

    } catch (error) {
        console.error('Error en restablecerClave:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Error al restablecer la contraseña.'
        });
    }
}

module.exports = {
    iniciarSesion,
    obtenerPerfil,
    solicitarRecuperacion,
    restablecerClave
};
