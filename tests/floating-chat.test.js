const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'friends-chat.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'purple-modern-theme.css'), 'utf8');

[
  'id="chat-drag-handle"',
  'id="chat-minimize"',
  'id="chat-sound-toggle"',
  'id="chat-unread-badge"',
  'id="chat-live-alert"'
].forEach((control) => assert.ok(html.includes(control), `controle ausente: ${control}`));

assert.ok(html.includes('aria-modal="false"'), 'o chat flutuante não deve bloquear a página como modal');
assert.ok(script.includes("addEventListener('pointerdown', startChatDrag)"), 'o chat deve aceitar arraste por mouse ou toque');
assert.ok(script.includes("addEventListener('keydown', moveChatWithKeyboard)"), 'o chat deve poder ser movido por teclado');
assert.ok(script.includes('estuda-floating-chat-position-v1'), 'a posição escolhida deve ser lembrada neste dispositivo');
assert.ok(script.includes('estuda-floating-chat-sound-v1'), 'a preferência de som deve ser lembrada neste dispositivo');
assert.ok(script.includes('window.AudioContext || window.webkitAudioContext'), 'novas mensagens devem ter aviso sonoro compatível');
assert.ok(script.includes("panel.classList.add('has-new-message')"), 'novas mensagens devem destacar visualmente a janela');
assert.ok(script.includes('if (message.sender_id === user.id)'), 'mensagens enviadas pelo próprio usuário não devem disparar o alerta de recebimento');
assert.ok(script.includes('!chatMinimized && !document.hidden'), 'mensagens minimizadas ou fora de foco devem permanecer não lidas');
assert.ok(script.includes('async function revealIncomingChat(message)') && script.includes("minimized: true, focus: false, markRead: false"), 'uma mensagem recebida deve abrir automaticamente o chat minimizado sem roubar o foco');
assert.ok(script.includes('void handleRealtimeMessage(payload.new)'), 'as mensagens em tempo real devem acionar a abertura automática');
assert.ok(script.includes("document.addEventListener('pointerdown', primeChatAudio"), 'o som deve ser preparado após a primeira interação permitida pelo navegador');

assert.ok(css.includes('.chat-backdrop { z-index: 900') && css.includes('pointer-events: none'), 'a camada do chat deve manter o aplicativo utilizável');
assert.ok(css.includes('.chat-panel.is-minimized') && css.includes('@keyframes chat-attention'), 'o layout deve incluir minimização e destaque animado');
assert.ok(css.includes('@media (max-width: 820px)') && css.includes('env(safe-area-inset-bottom)'), 'a janela deve respeitar celular, tablet e áreas seguras');
assert.ok(css.includes(".quick-replies::before { content: 'Atalhos'") && css.includes('height: 27px !important'), 'as respostas rápidas devem aparecer como atalhos pequenos e sutis');
assert.ok(css.includes('.chat-form > textarea') && css.includes('min-height: 124px !important'), 'o campo principal da mensagem deve ocupar uma área ampla');

assert.ok(!app.includes("|| !el('chat-modal').hidden ||"), 'o chat não pode deixar o restante do aplicativo inerte');
assert.ok(!app.includes('if (friendsHub?.isChatOpen()) friendsHub.closeChat();'), 'a conversa deve continuar aberta durante a navegação');

console.log('floating-chat.test.js: todos os testes passaram');
