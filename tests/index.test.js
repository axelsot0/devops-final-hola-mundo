
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

test('La página contiene el texto "Hola Mundo"', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
  const dom = new JSDOM(html);
  const h1 = dom.window.document.querySelector('h1');
  expect(h1.textContent).toBe('¡Hola Mundo desde GitHub Pages!');
});
