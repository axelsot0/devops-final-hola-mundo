
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('Aplicación de Horario Semanal', () => {
  let dom;
  let document;

  beforeAll(() => {
    const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
    dom = new JSDOM(html, { runScripts: 'dangerously' });
    document = dom.window.document;
  });

  test('La página contiene el título correcto', () => {
    const h1 = document.querySelector('h1');
    expect(h1.textContent).toBe('Mi Horario Semanal');
  });

  test('Existe el formulario para agregar actividades', () => {
    const form = document.getElementById('activityForm');
    expect(form).toBeTruthy();
  });

  test('El formulario contiene todos los campos necesarios', () => {
    const activityName = document.getElementById('activityName');
    const activityDay = document.getElementById('activityDay');
    const activityTime = document.getElementById('activityTime');
    const activityDuration = document.getElementById('activityDuration');

    expect(activityName).toBeTruthy();
    expect(activityDay).toBeTruthy();
    expect(activityTime).toBeTruthy();
    expect(activityDuration).toBeTruthy();
  });

  test('Existe la sección del horario semanal', () => {
    const scheduleSection = document.querySelector('.schedule-section');
    expect(scheduleSection).toBeTruthy();
  });

  test('Existe el contenedor del grid semanal', () => {
    const weekGrid = document.getElementById('weekGrid');
    expect(weekGrid).toBeTruthy();
  });

  test('El botón de submit tiene el texto correcto', () => {
    const submitBtn = document.getElementById('submitBtn');
    expect(submitBtn.textContent).toBe('Agregar Actividad');
  });

  test('El selector de días tiene 7 opciones de días', () => {
    const daySelect = document.getElementById('activityDay');
    const options = daySelect.querySelectorAll('option');
    // 7 días + 1 opción "Seleccionar día"
    expect(options.length).toBe(8);
  });
});
