const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync(require('path').join(__dirname, '..', 'material-quiz.js'), 'utf8');
const sandbox = { window: {}, document: { getElementById() { return null; } }, console, Date, Math, Set, Map, String, RegExp };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const text = `A fotossíntese é o processo realizado pelas plantas para produzir matéria orgânica usando energia luminosa. A clorofila absorve principalmente as faixas azul e vermelha da luz solar. Durante esse processo, o dióxido de carbono entra nas folhas através dos estômatos. A água absorvida pelas raízes é transportada pelo xilema até as folhas. A fase clara ocorre nos tilacoides e produz ATP e NADPH. O ciclo de Calvin ocorre no estroma do cloroplasto e utiliza dióxido de carbono. O oxigênio liberado na fotossíntese tem origem nas moléculas de água. A glicose produzida pode ser armazenada na forma de amido. A intensidade luminosa influencia a velocidade das reações fotossintéticas. Temperatura muito alta pode reduzir a atividade das enzimas envolvidas no processo. Plantas também realizam respiração celular durante o dia e durante a noite. Os estômatos regulam as trocas gasosas e também a perda de água por transpiração.`;
const questions = sandbox.window.EstudaMaterialQuiz.buildQuestions(text, 'Biologia');
const summary = sandbox.window.EstudaMaterialQuiz.buildSummary(text, 'Biologia');
const mindMap = sandbox.window.EstudaMaterialQuiz.buildMindMap(text, 'Biologia', summary);

assert.strictEqual(questions.length, 10, 'deve criar exatamente dez questões');
assert.ok(questions.every((question) => question.a.length === 5), 'cada questão precisa de cinco alternativas');
assert.ok(questions.every((question) => question.correct >= 0 && question.correct < 5), 'cada questão precisa de uma resposta correta');
assert.ok(questions.every((question) => question.origin === 'Material próprio' && question.materialQuiz), 'origem deve identificar a apostila');
assert.strictEqual(new Set(questions.map((question) => question.q)).size, 10, 'não deve repetir enunciados na rodada');
questions.forEach((question) => assert.ok(question.note.includes('Trecho conferido'), 'a correção deve mostrar o trecho da apostila'));
assert.ok(summary.overview.length >= 1 && summary.keyPoints.length >= 1, 'o resumo deve ter visão geral e pontos principais');
assert.ok(summary.plainText.includes('RESUMO COMPLETO — Biologia'), 'o resumo copiável deve identificar a matéria');
[...summary.overview, ...summary.keyPoints, ...summary.numericalFacts].forEach((sentence) => assert.ok(text.includes(sentence), 'cada afirmação factual deve existir literalmente no texto conferido'));
assert.ok(sandbox.window.EstudaMaterialQuiz.scoreOcrResult({ text, confidence: 92 }) > sandbox.window.EstudaMaterialQuiz.scoreOcrResult({ text: '|||| � ___', confidence: 45 }), 'a pontuação deve favorecer a leitura mais confiável');
assert.ok(mindMap.branches.length >= 3 && mindMap.branches.length <= 6, 'o mapa deve organizar entre três e seis conceitos');
assert.strictEqual(new Set(mindMap.branches.map((branch) => branch.label.toLocaleLowerCase('pt-BR'))).size, mindMap.branches.length, 'o mapa não deve repetir conceitos');
mindMap.branches.flatMap((branch) => branch.details).forEach((sentence) => assert.ok(text.includes(sentence), 'cada conexão do mapa deve estar literalmente no texto conferido'));
assert.ok(mindMap.plainText.includes('MAPA MENTAL — Biologia') && mindMap.plainText.includes('TEMA CENTRAL: Biologia'), 'o mapa copiável deve identificar o tema central');

const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
const app = fs.readFileSync(require('path').join(__dirname, '..', 'app.js'), 'utf8');
const admin = fs.readFileSync(require('path').join(__dirname, '..', 'admin-panel.js'), 'utf8');
const migration = fs.readFileSync(require('path').join(__dirname, '..', 'contact-material-migration.sql'), 'utf8');
const securityMigration = fs.readFileSync(require('path').join(__dirname, '..', 'security-hardening-migration.sql'), 'utf8');
const renatoAdminMigration = fs.readFileSync(require('path').join(__dirname, '..', 'admin-renato-migration.sql'), 'utf8');
assert.ok(html.includes('id="material-images"') && html.includes('id="material-extracted-text"'), 'interface de fotos e revisão deve existir');
assert.ok(html.includes('id="scan-material-page"') && html.includes('id="material-camera"'), 'celular e tablet devem oferecer captura direta pela câmera');
assert.ok(html.includes('capture="environment"') && html.includes('id="choose-material-images"'), 'a câmera traseira e a galeria devem ser opções separadas');
assert.ok(source.includes("{ append: true, scanned: true }") && source.includes('material-remove-photo'), 'novas páginas escaneadas devem ser acumuladas e poder ser removidas');
assert.ok(html.includes('id="material-text-confirmed"') && html.includes('id="generate-material-summary"') && html.includes('id="material-summary-panel"'), 'confirmação e resumo completo devem existir');
assert.ok(html.includes('id="material-mind-map-content"') && html.includes('id="copy-material-mind-map"'), 'mapa mental interativo e opção de copiar devem existir');
assert.ok(html.includes('data-side-nav="material"') && html.includes('data-nav="material"'), 'modo apostila deve estar disponível no menu lateral e móvel');
assert.ok(html.includes('id="material-subject" type="hidden" value="Minha apostila"') && !html.includes('<select id="material-subject"'), 'a tela de fotos não deve pedir a escolha de matéria');
assert.ok(!html.includes('id="material-home-title"'), 'o cartão antigo da tela inicial deve ser removido');
assert.ok(html.includes('id="register-whatsapp"') && html.includes('id="register-whatsapp-opt-in"'), 'cadastro deve incluir WhatsApp e autorização');
assert.ok(app.includes('whatsapp_phone: whatsapp') && app.includes('startMaterialQuiz'), 'cadastro e início do quiz precisam estar integrados');
assert.ok(admin.includes("from('user_contacts')") && admin.includes('admin_log_whatsapp_contact'), 'painel deve consultar contato privado e auditar abertura');
assert.ok(migration.includes('enable row level security') && migration.includes('current_user_is_admin()'), 'contatos precisam de RLS e proteção administrativa');
assert.ok(app.includes('const activeAdminEmail') && !app.includes('ADMIN_AUTH_EMAIL'), 'interface administrativa deve usar o e-mail autenticado, sem endereço fixo');
assert.ok(!html.includes('id="admin-access-email"') && html.includes('id="side-admin-button"') && html.includes('id="login-email" type="email"'), 'a administração deve ficar fora do perfil e o login deve validar e-mails');
assert.ok(renatoAdminMigration.includes("lower(email) = 'renatodagamma@gmail.com'") && renatoAdminMigration.includes('set is_admin = true'), 'migração deve promover a nova conta administrativa solicitada');
assert.ok(securityMigration.includes('create schema if not exists private') && securityMigration.includes('security invoker'), 'funções expostas devem delegar a implementações privadas');
assert.ok(securityMigration.includes("revoke all on function public.rls_auto_enable()") && securityMigration.includes('drop function if exists public.handle_new_user()'), 'funções internas não podem ficar executáveis pela API');
assert.ok(securityMigration.includes("lower(u.email) = 'admin@estudemais.net'") && securityMigration.includes("admin.temporario@estudamais.app"), 'migração deve promover a nova conta e remover o privilégio temporário');

console.log('OK: OCR comparativo, resumo extrativo, modo apostila e administração verificados.');
