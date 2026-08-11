const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const theme = fs.readFileSync(path.join(root, 'purple-modern-theme.css'), 'utf8');

assert.ok(app.includes('function ensureFeedbackPreferences'), 'o estado deve garantir preferências padrão de som e vibração');
assert.ok(app.includes('let quizAudioUnlocked = false;'), 'o áudio do quiz deve registrar quando foi desbloqueado pelo navegador');
assert.ok(app.includes("id = 'toggle-quiz-sound'"), 'o botão rápido de som do quiz deve ser criado dinamicamente');
assert.ok(app.includes("button.dataset.feedback = key"), 'os controles de preferência do perfil devem ser criados dinamicamente');
assert.ok(app.includes("function triggerQuizVibration(kind = 'correct')"), 'o quiz deve emitir vibração sutil quando suportado');
assert.ok(app.includes('function unlockQuizAudio(context = getQuizAudioContext())'), 'o quiz deve destravar o áudio no primeiro gesto permitido');
assert.ok(app.includes("function playPhaseAdvanceSound()"), 'deve existir um som próprio para passar de fase');
assert.ok(app.includes("triggerQuizVibration(right ? 'correct' : 'wrong')"), 'acertos e erros devem disparar vibração leve');
assert.ok(app.includes("if (passed) { playPhaseAdvanceSound(); triggerQuizVibration('phase'); }"), 'passar de fase deve tocar um som especial e vibrar');
assert.ok(app.includes("function renderFeedbackPreferenceControls()"), 'os controles de preferência devem ser atualizados visualmente');

assert.ok(css.includes('.access-control.selected'), 'os botões de preferência devem ter estado visual selecionado');
assert.ok(css.includes('.quiz-sound-toggle.muted'), 'o botão do quiz deve indicar visualmente quando o som estiver desligado');
assert.ok(theme.includes('.access-control.selected'), 'o tema roxo deve respeitar o estado selecionado');

console.log('quiz-feedback-effects.test.js: todos os testes passaram');
