const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '..')));

// Inicializar base de datos
const db = new Database(path.join(__dirname, 'schedule.db'));

// Crear tabla si no existe
db.exec(`
  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    day TEXT NOT NULL,
    time TEXT NOT NULL,
    duration INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Ruta raíz - servir index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// API Routes

// Obtener todas las actividades
app.get('/api/activities', (req, res) => {
  try {
    const activities = db.prepare('SELECT * FROM activities ORDER BY time').all();
    res.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Error al obtener actividades' });
  }
});

// Crear nueva actividad (o múltiples)
app.post('/api/activities', (req, res) => {
  try {
    const activities = Array.isArray(req.body) ? req.body : [req.body];
    const insertStmt = db.prepare(`
      INSERT INTO activities (id, name, day, time, duration)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((activities) => {
      for (const activity of activities) {
        insertStmt.run(
          activity.id,
          activity.name,
          activity.day,
          activity.time,
          activity.duration
        );
      }
    });

    insertMany(activities);
    res.status(201).json({ message: 'Actividades creadas exitosamente', count: activities.length });
  } catch (error) {
    console.error('Error creating activities:', error);
    res.status(500).json({ error: 'Error al crear actividades' });
  }
});

// Actualizar actividad
app.put('/api/activities/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, day, time, duration } = req.body;

    const stmt = db.prepare(`
      UPDATE activities
      SET name = ?, day = ?, time = ?, duration = ?
      WHERE id = ?
    `);

    const result = stmt.run(name, day, time, duration, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Actividad no encontrada' });
    }

    res.json({ message: 'Actividad actualizada exitosamente' });
  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(500).json({ error: 'Error al actualizar actividad' });
  }
});

// Eliminar actividad
app.delete('/api/activities/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM activities WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Actividad no encontrada' });
    }

    res.json({ message: 'Actividad eliminada exitosamente' });
  } catch (error) {
    console.error('Error deleting activity:', error);
    res.status(500).json({ error: 'Error al eliminar actividad' });
  }
});

// Eliminar múltiples actividades
app.post('/api/activities/delete-multiple', (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de IDs' });
    }

    const placeholders = ids.map(() => '?').join(',');
    const stmt = db.prepare(`DELETE FROM activities WHERE id IN (${placeholders})`);
    const result = stmt.run(...ids);

    res.json({
      message: 'Actividades eliminadas exitosamente',
      deleted: result.changes
    });
  } catch (error) {
    console.error('Error deleting multiple activities:', error);
    res.status(500).json({ error: 'Error al eliminar actividades' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`API disponible en http://localhost:${PORT}/api`);
});

// Cerrar base de datos al terminar el proceso
process.on('SIGINT', () => {
  db.close();
  console.log('\nBase de datos cerrada');
  process.exit(0);
});
