// Error propio con código HTTP, así el manejador global sabe qué responder
export class AppError extends Error {
  constructor(message, status = 400, details = undefined) {
    super(message);
    this.status = status;
    this.details = details;
  }

  static notFound(entidad = 'Recurso') {
    return new AppError(`${entidad} no encontrado`, 404);
  }

  static forbidden(msg = 'No tenés permisos para esta acción') {
    return new AppError(msg, 403);
  }

  static conflict(msg) {
    return new AppError(msg, 409);
  }
}
