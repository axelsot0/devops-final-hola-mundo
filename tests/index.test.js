
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('Aplicación de Horario Semanal', () => {
  let document;

  beforeAll(() => {
    const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
    const dom = new JSDOM(html);
    document = dom.window.document;
  });

  test('La página contiene el título correcto', () => {
    const h1 = document.querySelector('h1');
    expect(h1).not.toBeNull();
    expect(h1.textContent.trim()).toBe('Mi Horario Semanal');
  });

  test('Existe el formulario para agregar actividades', () => {
    const form = document.getElementById('activityForm');
    expect(form).not.toBeNull();
  });

  test('El formulario contiene todos los campos necesarios', () => {
    const nameInput = document.getElementById('activityName');
    const timeInput = document.getElementById('activityTime');
    const hoursInput = document.getElementById('activityHours');
    const minutesInput = document.getElementById('activityDuration');
    const daysSelector = document.getElementById('daysSelector');

    expect(nameInput).not.toBeNull();
    expect(timeInput).not.toBeNull();
    expect(hoursInput).not.toBeNull();
    expect(minutesInput).not.toBeNull();
    expect(daysSelector).not.toBeNull();
  });

  test('Existe la sección del horario semanal', () => {
    const scheduleSection = document.querySelector('.schedule-section');
    expect(scheduleSection).not.toBeNull();
  });

  test('Existe el contenedor del grid semanal', () => {
    const weekGrid = document.getElementById('weekGrid');
    expect(weekGrid).not.toBeNull();
  });

  test('El botón de submit tiene el texto correcto', () => {
    const submitBtn = document.getElementById('submitBtn');
    expect(submitBtn).not.toBeNull();
    expect(submitBtn.textContent.trim()).toBe('Agregar Actividad');
  });

  test('Hay 7 checkboxes para los días de la semana', () => {
    const dayCheckboxes = document.querySelectorAll('#daysSelector input[type="checkbox"]');
    expect(dayCheckboxes.length).toBe(7);
  });

  test('Todos los checkboxes de días tienen los valores correctos', () => {
    const dayCheckboxes = Array.from(
      document.querySelectorAll('#daysSelector input[type="checkbox"]')
    );
    const values = dayCheckboxes.map(cb => cb.value);
    expect(values).toEqual([
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
      'Domingo',
    ]);
  });
});
