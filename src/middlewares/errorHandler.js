import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

// Traduzco los errores de MySQL a mensajes entendibles para el usuario
const ERRORES_MYSQL = {
  ER_DUP_ENTRY: [409, 'Ya existe un registro con esos datos (dato duplicado)'],
  ER_ROW_IS_REFERENCED_2: [409, 'No se puede eliminar: tiene registros asociados'],
  ER_ROW_IS_REFERENCED: [409, 'No se puede eliminar: tiene registros asociados'],
  ER_NO_REFERENCED_ROW_2: [400, 'Se hace referencia a un registro que no existe'],
  ER_CHECK_CONSTRAINT_VIOLATED: [400, 'Los datos no cumplen las reglas de la base de datos'],
  ER_DATA_TOO_LONG: [400, 'Algún campo supera el largo permitido'],
  ER_TRUNCATED_WRONG_VALUE: [400, 'Formato de dato inválido'],
  ECONNREFUSED: [503, 'No hay conexión con la base de datos. ¿Está prendido MySQL en XAMPP?'],
};

export function notFound(req, res, next) {
  next(new AppError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404));
}

// Manejador global: todo error que llegue con next(err) termina acá
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Error interno del servidor';

  if (!(err instanceof AppError) && ERRORES_MYSQL[err.code]) {
    [status, message] = ERRORES_MYSQL[err.code];
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'El JSON enviado está mal formado';
  } else if (!(err instanceof AppError)) {
    status = 500;
    message = 'Ocurrió un error inesperado. Intentá de nuevo.';
  }

  if (status >= 500) console.error('[ERROR]', err);

  res.status(status).json({
    ok: false,
    message,
    ...(err.details ? { errores: err.details } : {}),
    ...(env.nodeEnv === 'development' && status >= 500 ? { debug: err.message } : {}),
  });
}
