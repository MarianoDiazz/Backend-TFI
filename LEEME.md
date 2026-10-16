# 🏥 Sistema de Gestión para Consultorio Médico - Backend

Backend escolar desarrollado con **Node.js**, **Express** y **MySQL** (sin ORMs, consultas directas y fáciles de entender). El código y las rutas están **100% en español** y estructurados para que sea simple de comprender, modificar y defender en clase.

---

## 📁 Estructura del Proyecto

```text
backend/
├── base_de_datos/
│   ├── conexion.js           # Conexión simple a MySQL con mysql2/promise
│   └── esquema.sql            # Script SQL con las 9 tablas en 3FN y datos de prueba
├── modelos/                  # Clases POO con consultas SQL directas (sin ORM)
│   ├── usuario.modelo.js
│   ├── paciente.modelo.js
│   ├── turno.modelo.js
│   ├── pago.modelo.js
│   ├── consulta.modelo.js
│   ├── medicamento.modelo.js
│   ├── obraSocial.modelo.js
│   ├── tipoTurno.modelo.js
│   └── reporte.modelo.js
├── controladores/            # Reciben la petición HTTP, validan y llaman a los modelos
│   ├── autenticacion.controlador.js
│   ├── pacientes.controlador.js
│   ├── turnos.controlador.js
│   ├── obrasSociales.controlador.js
│   ├── tiposTurno.controlador.js
│   ├── usuarios.controlador.js
│   ├── pagos.controlador.js
│   ├── consultas.controlador.js
│   ├── medicamentos.controlador.js
│   └── reportes.controlador.js
├── middlewares/
│   └── autenticacion.js       # Valida el Token JWT que envía el frontend
├── rutas/                    # Define las URLs de la API y las conecta con los controladores
│   ├── autenticacion.rutas.js
│   ├── pacientes.rutas.js
│   ├── turnos.rutas.js
│   ├── obrasSociales.rutas.js
│   ├── tiposTurno.rutas.js
│   ├── usuarios.rutas.js
│   ├── pagos.rutas.js
│   ├── consultas.rutas.js
│   ├── medicamentos.rutas.js
│   └── reportes.rutas.js
├── .env                      # Variables de entorno (puerto, datos de MySQL)
├── .env.ejemplo              # Ejemplo de configuración
├── package.json
└── servidor.js               # Archivo principal que enciende la API
```

---

## 🗄️ 1. Crear la Base de Datos en MySQL

1. Abrí tu gestor de base de datos favorito (**phpMyAdmin** de XAMPP, **MySQL Workbench** o la terminal de MySQL).
2. Abrí y ejecutá el archivo:
   👉 `base_de_datos/esquema.sql`
3. Esto creará la base de datos `consultorio_medico` con las 9 tablas requeridas:
   - `roles`
   - `usuarios`
   - `obras_sociales`
   - `pacientes` *(Entidad Principal 1)*
   - `tipos_turno` *(Entidad Adicional 1)*
   - `turnos` *(Entidad Principal 2)*
   - `pagos` *(Entidad Adicional 2)*
   - `consultas`
   - `medicamentos` *(Entidad Adicional 3 - Vademécum)*

### 👥 Usuarios de prueba listos para usar:
Todos vienen creados con la contraseña: **`123456`**

| Rol | Email | Contraseña |
| :--- | :--- | :--- |
| **Médico** | `medico@consultorio.com` | `123456` |
| **Recepción** | `recepcion@consultorio.com` | `123456` |
| **Administrador** | `admin@consultorio.com` | `123456` |

---

## ⚙️ 2. Configuración (`.env`)

En la raíz del proyecto tenés el archivo `.env`. Si tu MySQL tiene contraseña, modificalo:

```env
PUERTO=3000

BD_HOST=localhost
BD_USUARIO=root
BD_PASSWORD=
BD_NOMBRE=consultorio_medico
BD_PUERTO=3306

JWT_SECRETO=clave_secreta_escolar_consultorio_123
```

---

## 🚀 3. Cómo Ejecutar el Backend

Para iniciar el servidor en modo desarrollo (se reinicia automáticamente con cambios):
```bash
npm run dev
```

O en modo tradicional:
```bash
npm start
```

El servidor quedará escuchando en:
👉 `http://localhost:3000`

---

## 🔑 4. Cómo funciona la Autenticación (LocalStorage + Token)

1. En el frontend (React), el usuario ingresa su email y contraseña y hace un `POST` a:
   `http://localhost:3000/api/autenticacion/iniciar-sesion`
2. El servidor responde con un JSON que contiene `token` y los datos del `usuario`.
3. El frontend guarda el token en `localStorage`:
   ```javascript
   localStorage.setItem('token', respuesta.data.token);
   ```
4. Para las siguientes peticiones protegidas (pacientes, turnos, etc.), el frontend envía el token en los encabezados HTTP (`headers`):
   ```javascript
   // Ejemplo con Axios:
   const token = localStorage.getItem('token');

   const respuesta = await axios.get('http://localhost:3000/api/pacientes', {
       headers: {
           Authorization: `Bearer ${token}`
       }
   });
   ```

---

## 📡 5. Listado de Rutas (Endpoints) de la API

### 🔐 Autenticación
- `POST /api/autenticacion/iniciar-sesion` *(Pública)*: Recibe `{ email, password }`. Devuelve el token JWT y los datos del usuario.
- `GET /api/autenticacion/perfil` *(Requiere Token)*: Devuelve los datos del usuario logueado.
- `POST /api/autenticacion/recuperar-clave` *(Pública)*: Recibe `{ email, nueva_password }`.

### 🧑‍⚕️ Pacientes (Entidad Principal 1)
- `GET /api/pacientes`: Lista todos los pacientes activos. Permite buscar con `?busqueda=perez` o `?busqueda=30111222`.
- `GET /api/pacientes/:id`: Obtiene el detalle de un paciente.
- `POST /api/pacientes`: Crea un paciente. Recibe `{ dni, nombre, apellido, telefono, email, id_obra_social, numero_afiliado }`.
- `PUT /api/pacientes/:id`: Actualiza los datos de un paciente.
- `DELETE /api/pacientes/:id`: Da de baja lógica al paciente (`activo = 0`).

### 📅 Turnos (Entidad Principal 2)
- `GET /api/turnos`: Lista turnos con filtros opcionales:
  - `?fecha=YYYY-MM-DD` (ej: turnos de hoy)
  - `?estado=En Espera`
  - `?id_medico=2`
- `GET /api/turnos/:id`: Obtiene el turno por ID.
- `POST /api/turnos`: Crea un nuevo turno. Recibe `{ id_paciente, id_medico, id_tipo_turno, fecha_hora, motivo }`.
- `PATCH /api/turnos/:id/estado`: Cambia el estado del turno (`Pendiente`, `En Espera`, `En Consulta`, `Atendido`, `Cancelado`).
- `DELETE /api/turnos/:id`: Cancela el turno.

### 💳 Pagos (Entidad Adicional 2 - Cobro rápido)
- `POST /api/pagos`: Registra el cobro de un turno. Recibe `{ id_turno, monto, metodo_pago, estado }`.
- `GET /api/pagos/turno/:id_turno`: Consulta si un turno ya fue pagado.

### 🩺 Consultas Médicas e Historia Clínica
- `POST /api/consultas`: El médico guarda el diagnóstico, signos vitales (`presion_arterial`, `peso_kg`) y `receta_indicaciones`. Marca automáticamente el turno como `Atendido`.
- `GET /api/consultas/paciente/:id_paciente`: Trae todo el historial clínico del paciente.
- `GET /api/consultas/turno/:id_turno`: Obtiene la atención médica realizada en ese turno.

### 💊 Medicamentos (Vademécum - Entidad Adicional 3)
- `GET /api/medicamentos`: Lista medicamentos para recetar. Permite buscar con `?busqueda=amox`.

### 👥 ABM de Usuarios
- `GET /api/usuarios`: Lista todos los empleados/usuarios con sus roles.
- `GET /api/usuarios/:id`: Obtiene datos de un usuario por su ID.
- `POST /api/usuarios` *(Solo Admin)*: Crea un nuevo usuario con clave hasheada. Recibe `{ nombre, apellido, email, password, id_rol }`.
- `PUT /api/usuarios/:id` *(Solo Admin)*: Modifica los datos del usuario. Recibe `{ nombre, apellido, email, id_rol }`.
- `PATCH /api/usuarios/:id/estado` *(Solo Admin)*: Da de baja o activa un usuario. Recibe `{ activo: 0 }` o `{ activo: 1 }`.

### 📋 Catálogos auxiliares (para selects de formularios)
- `GET /api/obras-sociales`: Lista todas las obras sociales (incluye 'Particular').
- `GET /api/tipos-turno`: Lista los tipos de turnos (Primera Consulta, Control, Apto Físico).
- `GET /api/usuarios/medicos`: Lista los médicos activos para asignar turnos.

### 📊 Reportes y Exportación (Requerimiento Obligatorio de Tesis)
- `GET /api/reportes/metricas`: Devuelve en JSON:
  - Volumen de turnos agrupados por estado.
  - Pacientes particulares vs. cada obra social.
  - Facturación por método de pago (`Efectivo`, `Transferencia`, `Débito`).
  - Total general recaudado.
- `GET /api/reportes/exportar/csv`: **Descarga automática de archivo `.csv`** compatible directo con Microsoft Excel con el listado completo de turnos, pacientes, médicos y cobros.
