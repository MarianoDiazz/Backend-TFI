import { AppError } from '../utils/AppError.js';
import auditoriaDAO from '../dao/AuditoriaDAO.js';

/**
 * Fábrica de controladores CRUD para catálogos simples (especialidades, obras sociales).
 * Le paso el DAO y me devuelve listar/crear/actualizar/eliminar listos. Reutilización pura.
 */
export function crearControladorCatalogo(dao, nombreEntidad) {
  return {
    async listar(req, res, next) {
      try {
        res.json({ ok: true, data: await dao.listar() });
      } catch (err) {
        next(err);
      }
    },

    async crear(req, res, next) {
      try {
        const id = await dao.create(req.body);
        await auditoriaDAO.registrar(req.usuario.id, 'ALTA', dao.tabla, id, req.body.nombre);
        res.status(201).json({ ok: true, data: await dao.findById(id) });
      } catch (err) {
        next(err);
      }
    },

    async actualizar(req, res, next) {
      try {
        if (!(await dao.findById(req.params.id))) throw AppError.notFound(nombreEntidad);
        await dao.update(req.params.id, req.body);
        await auditoriaDAO.registrar(req.usuario.id, 'MODIFICA', dao.tabla, req.params.id);
        res.json({ ok: true, data: await dao.findById(req.params.id) });
      } catch (err) {
        next(err);
      }
    },

    // Si tiene registros asociados, MySQL tira error de FK y el errorHandler lo traduce
    async eliminar(req, res, next) {
      try {
        const afectados = await dao.delete(req.params.id);
        if (!afectados) throw AppError.notFound(nombreEntidad);
        await auditoriaDAO.registrar(req.usuario.id, 'ELIMINA', dao.tabla, req.params.id);
        res.json({ ok: true, message: `${nombreEntidad} eliminada` });
      } catch (err) {
        next(err);
      }
    },
  };
}
