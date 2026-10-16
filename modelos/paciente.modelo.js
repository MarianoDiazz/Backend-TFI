// ==============================================================
// MODELO: PACIENTE (POO - Consultas SQL directas sin ORM)
// ==============================================================
const conexion = require('../base_de_datos/conexion');

class PacienteModelo {

    // Listar todos los pacientes activos (con filtro opcional de búsqueda)
    static async obtenerTodos(busqueda = null) {
        let consultaSql = `
            SELECT 
                p.id_paciente,
                p.dni,
                p.nombre,
                p.apellido,
                p.telefono,
                p.email,
                p.numero_afiliado,
                p.activo,
                p.id_obra_social,
                o.nombre AS nombre_obra_social,
                o.sigla AS sigla_obra_social
            FROM pacientes p
            INNER JOIN obras_sociales o ON p.id_obra_social = o.id_obra_social
            WHERE p.activo = 1
        `;
        const parametros = [];

        if (busqueda) {
            consultaSql += ` AND (p.dni LIKE ? OR p.apellido LIKE ? OR p.nombre LIKE ?)`;
            const termino = `%${busqueda}%`;
            parametros.push(termino, termino, termino);
        }

        consultaSql += ` ORDER BY p.apellido ASC, p.nombre ASC`;

        const [filas] = await conexion.query(consultaSql, parametros);
        return filas;
    }

    // Buscar un paciente por su ID
    static async obtenerPorId(idPaciente) {
        const consultaSql = `
            SELECT 
                p.id_paciente,
                p.dni,
                p.nombre,
                p.apellido,
                p.telefono,
                p.email,
                p.numero_afiliado,
                p.activo,
                p.id_obra_social,
                o.nombre AS nombre_obra_social
            FROM pacientes p
            INNER JOIN obras_sociales o ON p.id_obra_social = o.id_obra_social
            WHERE p.id_paciente = ?
        `;
        const [filas] = await conexion.query(consultaSql, [idPaciente]);
        return filas[0] || null;
    }

    // Buscar un paciente por DNI (para validar duplicados)
    static async buscarPorDni(dni, ignorarId = null) {
        let consultaSql = 'SELECT id_paciente, dni FROM pacientes WHERE dni = ?';
        const parametros = [dni];

        if (ignorarId) {
            consultaSql += ' AND id_paciente != ?';
            parametros.push(ignorarId);
        }

        const [filas] = await conexion.query(consultaSql, parametros);
        return filas[0] || null;
    }

    // Insertar un nuevo paciente
    static async crear(datos) {
        const { dni, nombre, apellido, telefono, email, id_obra_social, numero_afiliado } = datos;
        const consultaSql = `
            INSERT INTO pacientes (dni, nombre, apellido, telefono, email, id_obra_social, numero_afiliado, activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `;
        const valores = [
            dni,
            nombre,
            apellido,
            telefono || null,
            email || null,
            id_obra_social,
            numero_afiliado || null
        ];

        const [resultado] = await conexion.query(consultaSql, valores);
        return resultado.insertId;
    }

    // Actualizar datos de un paciente
    static async actualizar(idPaciente, datos) {
        const { dni, nombre, apellido, telefono, email, id_obra_social, numero_afiliado } = datos;
        const consultaSql = `
            UPDATE pacientes 
            SET dni = ?, nombre = ?, apellido = ?, telefono = ?, email = ?, id_obra_social = ?, numero_afiliado = ?
            WHERE id_paciente = ?
        `;
        const valores = [
            dni,
            nombre,
            apellido,
            telefono || null,
            email || null,
            id_obra_social,
            numero_afiliado || null,
            idPaciente
        ];

        const [resultado] = await conexion.query(consultaSql, valores);
        return resultado.affectedRows > 0;
    }

    // Baja lógica (activo = 0)
    static async darDeBaja(idPaciente) {
        const [resultado] = await conexion.query(
            'UPDATE pacientes SET activo = 0 WHERE id_paciente = ?',
            [idPaciente]
        );
        return resultado.affectedRows > 0;
    }
}

module.exports = PacienteModelo;
