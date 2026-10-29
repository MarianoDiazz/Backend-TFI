import { AppError } from '../utils/AppError.js';

// Valida req.body (o query/params) contra un esquema Zod antes de llegar al controlador
export function validar(schema, origen = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[origen]);
    if (!result.success) {
      const errores = result.error.issues.map((i) => ({
        campo: i.path.join('.'),
        mensaje: i.message,
      }));
      return next(new AppError('Hay datos inválidos en el formulario', 400, errores));
    }
    // Guardo los datos ya limpios/convertidos
    if (origen === 'body') req.body = result.data;
    else req.validado = result.data;
    next();
  };
}

// Valida que :id sea un número entero positivo
export function validarId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return next(new AppError('ID inválido', 400));
  req.params.id = id;
  next();
}
