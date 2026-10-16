// ==============================================================
// CONTROLADOR DE AUTENTICACIÓN
// Utiliza UsuarioModelo para consultar la base de datos
// ==============================================================
const UsuarioModelo = require('../modelos/usuario.modelo');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const CLAVE_SECRETA = process.env.JWT_SECRETO || 'clave_secreta_escolar_consultorio_123';

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

// 3. Recuperar contraseña
async function recuperarClave(peticion, respuesta) {
    try {
        const { email, nueva_password } = peticion.body;

        if (!email) {
            return respuesta.status(400).json({
                exito: false,
                mensaje: 'Debes indicar el email para recuperar la contraseña.'
            });
        }

        const usuario = await UsuarioModelo.buscarPorEmail(email);
        if (!usuario) {
            return respuesta.status(404).json({
                exito: false,
                mensaje: 'No existe ningún usuario registrado con ese email.'
            });
        }

        if (!nueva_password) {
            return respuesta.json({
                exito: true,
                mensaje: 'Email verificado. Ahora podés enviar la nueva contraseña.'
            });
        }

        const nuevoHash = await bcrypt.hash(nueva_password, 10);
        await UsuarioModelo.actualizarClave(email, nuevoHash);

        return respuesta.json({
            exito: true,
            mensaje: 'Contraseña actualizada con éxito. Ya podés iniciar sesión con tu nueva clave.'
        });

    } catch (error) {
        console.error('Error en recuperarClave:', error);
        return respuesta.status(500).json({
            exito: false,
            mensaje: 'Error al procesar la recuperación de contraseña.'
        });
    }
}

module.exports = {
    iniciarSesion,
    obtenerPerfil,
    recuperarClave
};
