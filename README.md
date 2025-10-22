# Planificador de Horario Semanal

Aplicación web para organizar y gestionar actividades diarias con persistencia de datos entre dispositivos.

## Características

- Interfaz web moderna y responsive
- Gestión de actividades semanales
- Persistencia de datos con backend API REST
- Base de datos SQLite
- Modo oscuro/claro
- Sincronización automática entre dispositivos
- Dockerizado para fácil despliegue

## Arquitectura

- **Frontend**: HTML5, CSS3, JavaScript vanilla
- **Backend**: Node.js + Express
- **Base de datos**: SQLite (mejor-sqlite3)
- **Contenedorización**: Docker + Docker Compose

## Estructura del Proyecto

```
.
├── index.html              # Frontend de la aplicación
├── server/
│   ├── server.js          # Servidor Express con API REST
│   ├── package.json       # Dependencias del servidor
│   └── schedule.db        # Base de datos SQLite (generada automáticamente)
├── Dockerfile             # Configuración Docker
├── docker-compose.yml     # Orquestación de contenedores
└── README.md             # Este archivo
```

## API REST

### Endpoints

#### GET /api/health
Health check del servidor.

**Respuesta:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-22T01:40:03.914Z"
}
```

#### GET /api/activities
Obtener todas las actividades.

**Respuesta:**
```json
[
  {
    "id": "1234567890",
    "name": "Reunión de equipo",
    "day": "Lunes",
    "time": "09:00",
    "duration": 60,
    "created_at": "2025-10-22 01:40:16"
  }
]
```

#### POST /api/activities
Crear una o múltiples actividades.

**Body:**
```json
[
  {
    "id": "1234567890",
    "name": "Reunión de equipo",
    "day": "Lunes",
    "time": "09:00",
    "duration": 60
  }
]
```

**Respuesta:**
```json
{
  "message": "Actividades creadas exitosamente",
  "count": 1
}
```

#### PUT /api/activities/:id
Actualizar una actividad.

**Body:**
```json
{
  "name": "Reunión actualizada",
  "day": "Martes",
  "time": "10:00",
  "duration": 90
}
```

#### DELETE /api/activities/:id
Eliminar una actividad.

#### POST /api/activities/delete-multiple
Eliminar múltiples actividades.

**Body:**
```json
{
  "ids": ["id1", "id2", "id3"]
}
```

## Instalación y Uso

### Opción 1: Desarrollo Local

1. **Instalar dependencias del servidor:**
   ```bash
   cd server
   npm install
   ```

2. **Iniciar el servidor:**
   ```bash
   npm start
   ```

3. **Acceder a la aplicación:**
   Abre tu navegador en `http://localhost:3000`

### Opción 2: Docker Compose (Recomendado)

1. **Construir y ejecutar con Docker Compose:**
   ```bash
   docker-compose up -d
   ```

2. **Acceder a la aplicación:**
   Abre tu navegador en `http://localhost:3000`

3. **Ver logs:**
   ```bash
   docker-compose logs -f
   ```

4. **Detener la aplicación:**
   ```bash
   docker-compose down
   ```

5. **Detener y eliminar datos:**
   ```bash
   docker-compose down -v
   ```

### Opción 3: Docker Manual

1. **Construir la imagen:**
   ```bash
   docker build -t schedule-app .
   ```

2. **Ejecutar el contenedor:**
   ```bash
   docker run -d -p 3000:3000 -v schedule-data:/app/server schedule-app
   ```

## Configuración

### Variables de Entorno

- `PORT`: Puerto del servidor (por defecto: 3000)
- `NODE_ENV`: Entorno de ejecución (production/development)

### Persistencia de Datos

La base de datos SQLite se guarda en:
- **Desarrollo local**: `server/schedule.db`
- **Docker**: En un volumen nombrado `schedule-data`

Los datos persisten entre reinicios del contenedor gracias al volumen de Docker.

## Desarrollo

### Estructura de la Base de Datos

```sql
CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  day TEXT NOT NULL,
  time TEXT NOT NULL,
  duration INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### Migración desde localStorage

Si tienes datos existentes en localStorage, la aplicación los detectará automáticamente y los migrará al servidor la primera vez que se conecte.

## Pruebas

Ejecutar las pruebas existentes:
```bash
npm test
```

## Despliegue en Producción

### Usando Docker Hub

1. **Tag de la imagen:**
   ```bash
   docker tag schedule-app tu-usuario/schedule-app:latest
   ```

2. **Push a Docker Hub:**
   ```bash
   docker push tu-usuario/schedule-app:latest
   ```

3. **Pull y ejecutar en servidor:**
   ```bash
   docker pull tu-usuario/schedule-app:latest
   docker run -d -p 80:3000 -v schedule-data:/app/server tu-usuario/schedule-app:latest
   ```

### Usando GitHub Pages + Backend Separado

El frontend (index.html) puede desplegarse en GitHub Pages, mientras que el backend se ejecuta en un servidor separado. Solo necesitas configurar la variable `API_URL` en el frontend para apuntar a tu servidor backend.

## Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## Licencia

ISC

## Autor

DevOps Final - Hola Mundo
