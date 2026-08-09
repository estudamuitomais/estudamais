const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'purple-modern-theme.css'), 'utf8');

assert.ok(html.includes('id="landing-home"') && html.includes('id="landing-title"'), 'a nova apresentação deve existir na entrada');
assert.ok(html.includes('<span class="brand-mark" aria-hidden="true">🦉</span> Estuda<span>+</span>'), 'o menu interno deve mostrar o mascote junto da marca Estuda+');
assert.ok(html.includes('<strong>Estuda<em>+</em></strong>'), 'o cabeçalho público deve mostrar o mascote ao lado da palavra Estuda+');
assert.ok(html.includes('Estude de forma <em>inteligente e divertida</em>'), 'a entrada deve comunicar a proposta do Estuda Mais');
assert.ok((html.match(/data-open-auth=/g) || []).length >= 4, 'a apresentação deve oferecer acessos claros para entrar e criar conta');
assert.ok((html.match(/<article/g) || []).length >= 4 && html.includes('id="landing-benefits"'), 'os quatro benefícios principais devem ficar visíveis');
assert.ok(html.includes('id="landing-auth-shell"') && html.includes('id="close-landing-auth"'), 'o acesso deve abrir em uma área própria e permitir voltar');

assert.ok(app.includes('function showLandingAuth()') && app.includes('function showLandingHome()'), 'a apresentação e o acesso devem alternar de forma controlada');
assert.ok(app.includes("document.querySelectorAll('[data-open-auth]')"), 'os botões da apresentação devem abrir o modo correto');
assert.ok(app.includes("document.querySelectorAll('[data-landing-scroll]')"), 'a navegação da apresentação deve levar aos conteúdos');

assert.ok(css.includes('/* Nova entrada Estuda+:'), 'o visual da nova entrada deve ficar documentado');
assert.ok(css.includes('.landing-hero {') && css.includes('.landing-mascot-stage {'), 'a composição principal e o avatar devem ter estilos dedicados');
assert.ok(!/\.auth-screen,\s*\r?\n\.auth-screen\.active/.test(css), 'a tela de acesso não pode continuar visível após a navegação');
assert.ok(css.includes('.auth-screen:not(.active) { display: none !important; }'), 'a tela de acesso inativa deve ser ocultada explicitamente');
assert.ok(css.includes('@media (max-width: 760px)') && css.includes('@media (max-width: 430px)'), 'a entrada deve possuir ajustes para tablet e celular');
assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'), 'as animações devem respeitar a preferência de acessibilidade');

console.log('landing-layout.test.js: todos os testes passaram');
