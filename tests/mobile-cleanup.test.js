const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'clean-app-layout.css'), 'utf8');

assert.ok(html.includes('id="profile-school-year"'), 'o ano escolar deve continuar editável no Perfil');
assert.ok(html.includes('id="subject-school-year" hidden') && html.includes('id="school-year" hidden'), 'as cópias do seletor fora do Perfil devem ser somente internas');
assert.ok(!html.includes('class="subject-year-card"'), 'a tela de matérias não deve repetir a escolha do ano');
assert.ok(!html.includes('<label>Ano escolar\n                <select id="school-year"'), 'a configuração da trilha não deve repetir a escolha do ano');
assert.ok(app.includes('definido no Perfil e aplicado automaticamente'), 'a lógica deve explicar que o Perfil controla o ano');

assert.ok(html.includes('class="nav-label"') && css.includes('.app-nav > button > .nav-label'), 'os nomes das abas móveis devem ter uma camada própria e responsiva');
assert.ok(css.includes('max-height: calc(100dvh - 96px)') && css.includes('overflow-y: auto'), 'o menu Mais deve permanecer utilizável em celulares baixos');
assert.ok(css.includes('.admin-table-wrap { -webkit-overflow-scrolling: touch; }'), 'as tabelas administrativas devem rolar suavemente no celular');

console.log('mobile-cleanup.test.js: interface móvel e ano escolar verificados');
