const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'purple-modern-theme.css'), 'utf8');

assert.ok(html.includes('id="side-mascot"') && html.includes('side-mascot-interactive'), 'a coruja lateral deve ser um controle interativo');
assert.ok(html.includes('id="side-mascot-speech"') && html.includes('aria-live="polite"'), 'as falas do mascote devem ser anunciadas com acessibilidade');
assert.ok(html.includes('wing-left') && html.includes('wing-right') && html.includes('side-mascot-effects'), 'o mascote deve ter asas e uma camada de efeitos');

assert.ok(app.includes("message: 'Vamos começar a aprender!'"), 'a frase principal pedida deve existir');
['wings', 'heart', 'kiss', 'celebrate', 'dance', 'high-five', 'curious', 'focus'].forEach((reaction) => {
  assert.ok(app.includes(`id: '${reaction}'`), `a reação ${reaction} deve existir`);
});
assert.ok(app.includes("el('side-mascot')?.addEventListener('click', playSideMascotReaction)"), 'cada toque deve disparar uma nova reação');
assert.ok(app.includes('SpeechSynthesisUtterance') && app.includes("speech.lang = 'pt-BR'"), 'o mascote deve poder falar em português brasileiro');

assert.ok(css.includes('.side-mascot-speech') && css.includes('@keyframes side-mascot-particle'), 'fala e partículas devem ter apresentação visual própria');
assert.ok(css.includes('@keyframes side-mascot-left-wing') && css.includes('@keyframes side-mascot-right-wing'), 'as asas devem possuir animação dedicada');
assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'), 'as reações devem respeitar a preferência por movimento reduzido');

console.log('interactive-mascot.test.js: todos os testes passaram');
