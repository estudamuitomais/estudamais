const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'purple-modern-theme.css'), 'utf8');

assert.ok(html.includes('<b>Aprenda Jogando</b>'), 'o inicio lateral deve se chamar Aprenda Jogando');
assert.ok(html.includes('<b>Configure seu estudo</b>'), 'a configuracao de estudo deve ter um nome claro');
assert.ok(html.includes('data-side-nav="avatar"') && html.includes('data-nav="avatar"'), 'o avatar deve estar disponivel nas navegacoes desktop e movel');
assert.ok(html.includes('id="side-admin-button"') && html.includes('data-side-nav="admin" hidden'), 'a lateral deve reservar uma aba administrativa oculta ate a conta ser reconhecida como admin');
assert.ok(!html.includes('class="avatar-home-card"'), 'o cartao grande do avatar deve sair da tela inicial');

assert.ok(!html.includes('<label>Sistema de ensino'), 'o usuario nao deve escolher manualmente um sistema de ensino');
assert.ok(html.includes('<select id="curriculum" hidden'), 'a referencia curricular interna deve continuar disponivel para montar os exercicios');
assert.ok(app.includes('function automaticCurriculum(code = schoolYear)'), 'a referencia deve ser definida automaticamente pelo ano escolar');
assert.ok(app.includes("'Base Enem/Inep' : 'BNCC'"), 'Ensino Medio deve usar a base Inep e Fundamental deve usar a BNCC');

assert.ok(html.includes('Escolha o g') && html.includes('data-avatar-presentation="masculine"') && html.includes('data-avatar-presentation="feminine"'), 'as opcoes masculino e feminino devem existir no estudio');
assert.ok(app.includes("category.id !== 'presentation'") && app.includes('renderAvatarGenderChoice()'), 'o genero dedicado deve substituir a antiga aba escondida de estilo');
assert.ok(app.includes("destination === 'avatar'") && app.includes("button.dataset.nav === 'avatar'"), 'os novos atalhos devem abrir o estudio');
assert.ok(app.includes('function updateAdminNavigationVisibility()') && app.includes("destination === 'admin'") && app.includes("if (id === 'admin-screen') return 'admin';"), 'a navegacao deve exibir e destacar a aba administrativa quando o usuario for admin');
assert.ok(css.includes('.avatar-gender-card') && css.includes('.side-avatar-feature') && css.includes('.side-admin-feature'), 'as novas opcoes devem possuir apresentacao visual propria');
assert.ok(css.includes('repeat(7, minmax(0, 1fr))'), 'a navegacao movel deve comportar os sete destinos');

console.log('navigation-avatar.test.js: todos os testes passaram');
