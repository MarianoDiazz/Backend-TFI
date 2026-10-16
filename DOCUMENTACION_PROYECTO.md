# 🏥 GUÍA DE ESTUDIO Y PRESENTACIÓN DE TESIS - VERSIÓN ACTUALIZADA
## Sistema de Gestión para Consultorio Médico
**Especialidad:** Medicina Clínica General | **Alcance:** 1 Médico y 1 Recepción

---

## 1. Speech Rápido para Contarle la Idea al Profesor
> *"Profe, la idea nuestra es hacer un sistema web para un consultorio médico particular, pensado para la dinámica de trabajo entre un médico clínico y su secretaria, que hoy suelen manejar todo en papel o planillas de Excel desordenadas.*
>
> *El sistema tiene dos roles bien marcados:*
> * *La recepcionista da de alta pacientes, agenda turnos clasificándolos según el tipo de turno (primera vez, control, etc.), cobra la consulta o coseguro registrando el pago (efectivo, transferencia o débito) y marca la asistencia en la sala de espera.*
> * *El médico tiene su panel de atención clínica en tiempo real, registra diagnósticos y prescribe recetas seleccionando del catálogo de medicamentos. Por secreto profesional, la recepción no accede a las historias clínicas.*
>
> *Cubriendo al 100% lo que pediste en el pizarrón:*
> * *Las 2 entidades principales son **Pacientes** y **Turnos**, a las cuales les sumamos 3 entidades complementarias clave: **Pagos**, **Medicamentos** y **Tipos de Turno**.*
> * *Incluimos ABM completo de usuarios, login seguro con roles y recuperación de contraseñas.*
> * *Armamos 8 pantallas conectadas y un módulo de Reportes con métricas y exportación a Excel / CSV (turnos mensuales, recaudación por medio de pago y pacientes por Obra Social vs. Particulares).*
> * *A nivel técnico usamos en el frontend React con TypeScript y Vite (con Axios y almacenamiento de sesión en LocalStorage), y en el backend Node.js con Express conectado a MySQL normalizado en 3FN, estructurado en capas desacopladas (Routes -> Middlewares -> Controllers -> Models en POO) con consultas SQL directas y manejo robusto de excepciones try-catch."*

---

## 2. Checklist de Requerimientos del Pizarrón (Actualizado)

| Requerimiento del Pizarrón | Implementación en el Proyecto |
| :--- | :--- |
| **2 Entidades Principales [CONFIRMEN]** | **Pacientes** (sujeto de atención) y **Turnos** (operación central del consultorio). |
| **3 Entidades Adicionales (Ampliación)** | **Pagos** (cobros/caja), **Medicamentos** (vademécum) y **Tipos_Turno** (clasificación de citas). |
| **ABM de Usuarios** | Gestión de credenciales, roles y alta, baja lógica y modificación completa de empleados del consultorio. |
| **Inicio de Sesión y Roles** | Login validando credenciales contra hash seguro `bcrypt` y derivando vistas y permisos según rol (Médico, Recepción, Admin). |
| **Recuperación de Contraseñas** | Flujo para solicitud de restablecimiento y actualización segura de contraseña. |
| **BD Relacional, PK-FK y 3 FN** | MySQL estructurado en 3ra Forma Normal sin redundancias y con claves foráneas estrictas. |
| **Validación Integridad BD** | Restricciones `UNIQUE` en DNI y Email; integridad referencial con `ON DELETE RESTRICT`. |
| **Arquitectura MVC / Capas** | Backend desacoplado: `Routes -> Middlewares -> Controllers -> Models`. Se eliminó la capa redundante de servicios para SQL puro sin ORM. |
| **Modularización y POO** | Clases de modelos en JavaScript (`PacienteModelo`, `TurnoModelo`, etc.) con métodos estáticos que encapsulan el SQL. |
| **Robustez (try - catch)** | Captura de excepciones en base de datos y controladores para evitar caídas del servidor y responder con códigos HTTP correctos. |
| **Reportes (OBLIGATORIO)** | Métricas: volumen de turnos por estado, facturación por método de pago y Obra Social vs. Particular. |
| **Exportación PDF / Excel / CSV** | Endpoint de descarga automática de archivo CSV (`/api/reportes/exportar/csv`) con BOM UTF-8 compatible nativamente con Microsoft Excel. |
| **Mejora y Presupuesto** | Sección de presupuesto (horas de desarrollo + servidores) y plan de mejoras futuras. |

---

## 3. Detalle de las 8 Pantallas del Sistema

| # | Pantalla | Rol con Acceso | Funcionalidad y Contenido | Endpoint Backend |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **Login / Acceso** | Todos | Inicio de sesión con email y contraseña. Redirige según rol (Médico o Recepción). | `POST /api/autenticacion/iniciar-sesion` |
| **2** | **Recuperar Contraseña** | Público | Ingreso de email para verificación y cambio de contraseña. | `POST /api/autenticacion/recuperar-clave` |
| **3** | **Dashboard / Sala de Espera** | Recepción / Médico | Turnos del día. Registro de llegada ("En espera"), botón de cobro rápido (Pagos) y llamado a consulta. | `GET /api/turnos?fecha=...`<br>`PATCH /api/turnos/:id/estado`<br>`POST /api/pagos` |
| **4** | **ABM de Pacientes (Principal 1)** | Recepción (edición)<br>Médico (lectura) | Búsqueda por DNI/Apellido. Formulario: DNI, Nombre, Teléfono, Email, Obra Social o Particular y N° Afiliado. | `GET, POST, PUT, DELETE`<br>`/api/pacientes` |
| **5** | **ABM de Turnos / Agenda (Principal 2)** | Recepción | Grilla horaria. Selección de Paciente, Fecha, Hora y selector de Tipo de Turno (Control, Primera Vez, Apto Físico). | `GET, POST, DELETE`<br>`/api/turnos` |
| **6** | **Atención y Recetario** | Solo Médico | Diagnóstico, signos vitales (presión, peso) y buscador del vademécum de Medicamentos. | `POST /api/consultas`<br>`GET /api/medicamentos` |
| **7** | **ABM de Usuarios** | Admin / Médico | Alta, baja lógica y modificación de credenciales y roles para el personal del consultorio. | `GET, POST, PUT, PATCH`<br>`/api/usuarios` |
| **8** | **Reportes y Métricas (Obligatorio)** | Ambos | Estadísticas: cantidad de turnos, pacientes Particulares vs. Obra Social y recaudación total de Pagos. **Exportar a Excel/CSV.** | `GET /api/reportes/metricas`<br>`GET /api/reportes/exportar/csv` |

---

## 4. Entidades del Sistema y Base de Datos (3FN)

Total de Entidades: **9 tablas relacionadas** que cumplen estrictamente con la **Tercera Forma Normal (3FN)**.

1. **`roles`**: `id_rol` (PK), `nombre_rol` (UNIQUE), `descripcion`.
2. **`usuarios`**: `id_usuario` (PK), `id_rol` (FK), `nombre`, `apellido`, `email` (UNIQUE), `password_hash`, `token_recuperacion`, `activo`.
3. **`obras_sociales`**: `id_obra_social` (PK), `nombre` (UNIQUE), `sigla`, `activa`. *(Incluye el registro 'Particular' para evitar nulos).*
4. **`pacientes` ⭐ (Entidad Principal 1)**: `id_paciente` (PK), `id_obra_social` (FK), `dni` (UNIQUE), `nombre`, `apellido`, `telefono`, `email`, `numero_afiliado` (NULL si es particular), `activo`.
5. **`tipos_turno` 🌟 (Entidad Adicional 1)**: `id_tipo_turno` (PK), `nombre` ('Primera Consulta', 'Control', 'Apto Físico'), `duracion_estimada_min`, `activo`.
6. **`turnos` ⭐ (Entidad Principal 2)**: `id_turno` (PK), `id_paciente` (FK), `id_medico` (FK), `id_tipo_turno` (FK), `fecha_hora`, `motivo`, `estado` ('Pendiente', 'En Espera', 'En Consulta', 'Atendido', 'Cancelado').
7. **`pagos` 🌟 (Entidad Adicional 2)**: `id_pago` (PK), `id_turno` (FK, UNIQUE), `monto`, `metodo_pago` ('Efectivo', 'Transferencia', 'Débito'), `fecha_pago`, `estado` ('Cobrado', 'Pendiente').
8. **`consultas`**: `id_consulta` (PK), `id_turno` (FK, UNIQUE), `id_paciente` (FK), `diagnostico`, `receta_indicaciones`, `presion_arterial`, `peso_kg`, `fecha_atencion`.
9. **`medicamentos` 🌟 (Entidad Adicional 3 - Vademécum)**: `id_medicamento` (PK), `nombre_comercial`, `droga_generico`, `presentacion` ('Comprimidos 500mg', 'Jarabe 250ml'), `activo`.

---

## 5. Diagrama Entidad-Relación Conceptual (DER)

```text
[roles] (1) ---------< (N) [usuarios] (1: Medico)
                             |
                             | (1)
                             |
                            (N)
[tipos_turno] (1) ----< (N) [turnos] (1) ---------- (1) [pagos]
                             |  |
                            (N) (1)
                             |  |
                            (1) (1)
[obras_sociales] (1) -< (N) [pacientes] --------< (N) [consultas]
                                                         |
                                                        (N) (receta / vademécum)
                                                         |
                                                        (1)
                                                   [medicamentos]
```

---

## 6. Arquitectura de Software y Seguridad

| Capa | Tecnología | Función y Responsabilidad |
| :--- | :--- | :--- |
| **Frontend** | React + TypeScript + Vite | Single Page Application rápida, tipado estricto e interfaces reactivas. |
| **Estilos** | CSS Puro (.css) | Maquetación responsive limpia sin librerías pesadas. |
| **Cliente HTTP** | Axios | Consumo de API REST enviando el Token guardado en `localStorage`. |
| **Backend** | Node.js + Express | Servidor API REST asíncrono y desacoplado en capas. |
| **Capas Backend** | `Routes -> Middlewares -> Controllers -> Models` | **Rutas** reciben HTTP ➔ **Middlewares** validan token/roles ➔ **Controladores** procesan `req/res` ➔ **Modelos** ejecutan el SQL puro. |
| **Base de Datos** | MySQL | Base relacional normalizada en 3FN con constraints `ON DELETE RESTRICT`. |
| **Seguridad de Claves** | Bcrypt (10 salt rounds) | Encriptación de un solo sentido para contraseñas; jamás se guarda texto plano. |
| **Sesión / Tokens** | JSON Web Tokens (JWT) | Autenticación sin estado (Stateless): el servidor firma el token y el cliente lo envía en `Authorization: Bearer <token>`. |
| **Prevención SQLi** | Parámetros `?` de MySQL2 | Todas las consultas están parametrizadas para evitar inyecciones de código SQL malicioso. |

---

## 7. Presupuesto y Mejoras del Sistema

### A. Presupuesto Estimado del Proyecto
* **Costo de Desarrollo (Horas Hombre):** 95 horas estimadas de análisis, diseño, base de datos y programación a un valor promedio de mercado ($15 USD/hora) = **$1.425 USD**.
* **Infraestructura y Servidores:**
  * Servidor Cloud VPS (Node.js + MySQL) en Render o DigitalOcean: $7 a $12 USD/mes.
  * Dominio web (.com / .com.ar): $12 a $15 USD/año.
  * Certificado SSL: Gratuito (Let's Encrypt).
* **Costo total estimado de puesta en marcha (Año 1):** **~$1.550 USD**.

### B. Mejoras Futuras
1. **Integración con WhatsApp API:** Mensajes automáticos de confirmación y recordatorio de turnos 24 horas antes.
2. **Portal de Autogestión del Paciente:** Reserva de turnos online directamente por parte del paciente.
3. **Pasarela de Cobro Digital:** Integración de Mercado Pago para señar la consulta en el momento de reservar.

---

## 8. Tips para Preguntas Frecuentes de la Defensa (¡Preguntas de Examen!)

* **¿Cuáles son las 2 entidades principales y por qué sumaron 3 más?**
  > *Respuesta:* *"Las 2 entidades principales del negocio son **Pacientes** y **Turnos**. Agregamos **Pagos** para llevar el control de caja del consultorio, **Tipos_Turno** para diferenciar duraciones de atención (ej: primera vez dura más que un control), y **Medicamentos** para que la prescripción médica no sea un texto libre arbitrario sino un vademécum estandarizado."*

* **¿Cómo resuelven el paciente particular vs. obra social?**
  > *Respuesta:* *"'Particular' existe como un registro en la tabla `obras_sociales`. Esto evita trabajar con valores nulos (evita `NULL` en claves foráneas) y simplifica notablemente las consultas de reportes con un simple `GROUP BY`."*

* **¿Por qué la recepcionista no puede ver diagnósticos ni historias clínicas?**
  > *Respuesta:* *"Por estricto cumplimiento del secreto profesional médico y la Ley de Derechos del Paciente e Historia Clínica. Recepción solo gestiona datos de contacto, agenda y pagos."*

* **¿Por qué los Modelos son clases con métodos estáticos si no usan un ORM?**
  > *Respuesta:* *"Para respetar el patrón MVC y el paradigma de Programación Orientada a Objetos (POO). De esta forma el controlador solo se encarga de la web (`req` y `res`), mientras que el Modelo encapsula las consultas SQL a MySQL sin depender de un ORM pesado."*

* **¿Cómo previenen inyecciones SQL?**
  > *Respuesta:* *"A través de consultas preparadas con parámetros `?` en el driver `mysql2`. El motor de MySQL trata los parámetros exclusivamente como datos y nunca como código ejecutable."*

* **¿Por qué usan baja lógica (`activo = 0`) en lugar de `DELETE` físico?**
  > *Respuesta:* *"Para preservar la integridad referencial y el historial médico legal. Si borramos físicamente un paciente o un usuario, romperíamos las relaciones con los turnos y consultas pasadas, violando la integridad de la base de datos."*

* **¿Cómo funciona la autenticación con el token JWT?**
  > *Respuesta:* *"Es una autenticación sin estado (Stateless). Al hacer login, el servidor genera un token firmado que el frontend almacena en `localStorage`. Luego, en cada petición protegida, Axios lo envía en la cabecera `Authorization: Bearer <token>`, permitiendo al servidor validar la identidad y el rol en cada llamado."*
