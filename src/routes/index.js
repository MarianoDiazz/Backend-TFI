import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { verificarToken, permitirRoles } from '../middlewares/auth.js';
import { validar, validarId } from '../middlewares/validate.js';
import * as S from '../validators/schemas.js';

import * as auth from '../controllers/authController.js';
import * as usuarios from '../controllers/usuarioController.js';
import * as medicos from '../controllers/medicoController.js';
import * as pacientes from '../controllers/pacienteController.js';
import * as horarios from '../controllers/horarioController.js';
import * as turnos from '../controllers/turnoController.js';
import * as consultas from '../controllers/consultaController.js';
import * as reportes from '../controllers/reporteController.js';
import * as dashboard from '../controllers/dashboardController.js';
import { crearControladorCatalogo } from '../controllers/catalogoController.js';
import { especialidadDAO, obraSocialDAO } from '../dao/CatalogoDAO.js';

const router = Router();

// Roles (para no escribir los strings a mano en cada ruta)
const ADMIN = 'ADMIN';
const MEDICO = 'MEDICO';
const RECEP = 'RECEPCIONISTA';
const TODOS = [ADMIN, MEDICO, RECEP];

// Freno de fuerza bruta en login y recuperación: 10 intentos cada 15 min por IP
// (en desarrollo lo aflojo para poder probar tranquilo)
const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.nodeEnv === 'production' ? 10 : 200,
  message: { ok: false, message: 'Demasiados intentos. Esperá unos minutos y probá de nuevo.' },
});

// ---------- Auth (público) ----------
router.post('/auth/login', limiteAuth, validar(S.loginSchema), auth.login);
router.post('/auth/forgot-password', limiteAuth, validar(S.forgotSchema), auth.forgotPassword);
router.post('/auth/reset-password', limiteAuth, validar(S.resetSchema), auth.resetPassword);

// De acá para abajo todo requiere estar logueado
router.use(verificarToken);

router.get('/auth/me', auth.me);
router.put('/auth/cambiar-password', validar(S.cambiarPasswordSchema), auth.cambiarPassword);

// ---------- Dashboard ----------
router.get('/dashboard', dashboard.resumen);

// ---------- Usuarios (solo ADMIN) ----------
router.get('/usuarios/roles', permitirRoles(ADMIN), usuarios.listarRoles);
router.get('/usuarios/auditoria', permitirRoles(ADMIN), usuarios.auditoria);
router.get('/usuarios', permitirRoles(ADMIN), usuarios.listar);
router.get('/usuarios/:id', permitirRoles(ADMIN), validarId, usuarios.obtener);
router.post('/usuarios', permitirRoles(ADMIN), validar(S.usuarioCreateSchema), usuarios.crear);
router.put('/usuarios/:id', permitirRoles(ADMIN), validarId, validar(S.usuarioUpdateSchema), usuarios.actualizar);
router.delete('/usuarios/:id', permitirRoles(ADMIN), validarId, usuarios.baja);

// ---------- Catálogos (todos leen, ADMIN escribe) ----------
const registrarCatalogo = (path, dao, nombre, schema) => {
  const c = crearControladorCatalogo(dao, nombre);
  router.get(path, permitirRoles(...TODOS), c.listar);
  router.post(path, permitirRoles(ADMIN), validar(schema), c.crear);
  router.put(`${path}/:id`, permitirRoles(ADMIN), validarId, validar(schema), c.actualizar);
  router.delete(`${path}/:id`, permitirRoles(ADMIN), validarId, c.eliminar);
};
registrarCatalogo('/especialidades', especialidadDAO, 'Especialidad', S.especialidadSchema);
registrarCatalogo('/obras-sociales', obraSocialDAO, 'Obra social', S.obraSocialSchema);

// ---------- Médicos ----------
router.get('/medicos', permitirRoles(...TODOS), medicos.listar);
router.get('/medicos/:id', permitirRoles(...TODOS), validarId, medicos.obtener);
router.post('/medicos', permitirRoles(ADMIN), validar(S.medicoCreateSchema), medicos.crear);
router.put('/medicos/:id', permitirRoles(ADMIN), validarId, validar(S.medicoUpdateSchema), medicos.actualizar);
router.delete('/medicos/:id', permitirRoles(ADMIN), validarId, medicos.baja);

// ---------- Horarios de atención ----------
router.get('/horarios', permitirRoles(...TODOS), horarios.listar);
router.post('/horarios', permitirRoles(ADMIN, MEDICO), validar(S.horarioSchema), horarios.crear);
router.put('/horarios/:id', permitirRoles(ADMIN, MEDICO), validarId, validar(S.horarioSchema), horarios.actualizar);
router.delete('/horarios/:id', permitirRoles(ADMIN, MEDICO), validarId, horarios.eliminar);

// ---------- Pacientes ----------
router.get('/pacientes', permitirRoles(...TODOS), pacientes.listar);
router.get('/pacientes/:id', permitirRoles(...TODOS), validarId, pacientes.obtener);
router.get('/pacientes/:id/historia', permitirRoles(ADMIN, MEDICO), validarId, pacientes.historia);
router.post('/pacientes', permitirRoles(ADMIN, RECEP), validar(S.pacienteSchema), pacientes.crear);
router.put('/pacientes/:id', permitirRoles(ADMIN, RECEP), validarId, validar(S.pacienteSchema), pacientes.actualizar);
router.delete('/pacientes/:id', permitirRoles(ADMIN, RECEP), validarId, pacientes.baja);
router.patch('/pacientes/:id/reactivar', permitirRoles(ADMIN, RECEP), validarId, pacientes.reactivar);

// ---------- Turnos ----------
router.get('/turnos/disponibles', permitirRoles(...TODOS), turnos.disponibles);
router.get('/turnos/primer-libre', permitirRoles(...TODOS), turnos.proximoLibre);
router.get('/turnos', permitirRoles(...TODOS), turnos.listar);
router.get('/turnos/:id', permitirRoles(...TODOS), validarId, turnos.obtener);
router.post('/turnos', permitirRoles(ADMIN, RECEP), validar(S.turnoCreateSchema), turnos.crear);
router.patch('/turnos/:id/estado', permitirRoles(...TODOS), validarId, validar(S.turnoEstadoSchema), turnos.cambiarEstado);
router.patch('/turnos/:id/reprogramar', permitirRoles(ADMIN, RECEP), validarId, validar(S.turnoReprogramarSchema), turnos.reprogramar);

// ---------- Consultas / historia clínica (datos sensibles: solo médico y admin) ----------
router.post('/consultas', permitirRoles(MEDICO), validar(S.consultaSchema), consultas.crear);
router.get('/consultas/:id', permitirRoles(ADMIN, MEDICO), validarId, consultas.obtener);
router.put('/consultas/:id', permitirRoles(MEDICO), validarId, validar(S.consultaUpdateSchema), consultas.actualizar);

// ---------- Reportes (PDF / Excel / CSV) ----------
router.get('/reportes/turnos', permitirRoles(...TODOS), reportes.turnos);
router.get('/reportes/pacientes', permitirRoles(ADMIN, RECEP), reportes.pacientes);
router.get('/reportes/productividad', permitirRoles(ADMIN), reportes.productividad);
router.get('/reportes/obras-sociales', permitirRoles(ADMIN, RECEP), reportes.obrasSociales);
router.get('/reportes/historia/:id', permitirRoles(ADMIN, MEDICO), validarId, reportes.historia);
router.get('/reportes/auditoria', permitirRoles(ADMIN), reportes.auditoria);

export default router;
