const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const moduleSource = fs.readFileSync(path.join(root, 'essay-correction.js'), 'utf8');
const functionSource = fs.readFileSync(path.join(root, 'supabase/functions/correct-essay/index.ts'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'essay-corrections-migration.sql'), 'utf8');

assert.ok(html.includes('id="essay-screen"') && html.includes('data-side-nav="essay"') && html.includes('data-nav="essay"'), 'a oficina deve estar acessível no computador e no celular');
assert.ok(html.includes('inspirada nas 5 competências do Enem') && html.includes('Corrigir por 5 créditos'), 'a interface deve explicar o modelo e o custo');
assert.ok(html.includes('não fica salvo no histórico') && html.includes('id="essay-safety-confirm"'), 'a proteção de dados deve estar visível antes do envio');
assert.ok(app.includes("if (id === 'essay-screen') return 'essay'") && app.includes('async function openEssay()'), 'a tela deve participar da navegação segura do app');
assert.ok(moduleSource.includes("localStorage.setItem(DRAFT_KEY") && moduleSource.includes(".functions.invoke('correct-essay'"), 'o rascunho deve ser local e a correção deve ocorrer no servidor');
assert.ok(functionSource.includes("store: false") && functionSource.includes("'omni-moderation-latest'") && functionSource.includes("'gpt-5-mini'"), 'a função deve moderar, evitar armazenamento do provedor e usar modelo estruturado');
assert.ok(functionSource.includes('max_output_tokens: 2500') && !functionSource.includes('minLength:'), 'o schema estruturado deve usar o subconjunto compatível e limitar a resposta');
assert.ok(functionSource.includes("AI_RATE_LIMITED") && functionSource.includes("AI_BILLING_REQUIRED") && functionSource.includes('readSupabasePublishableKey'), 'a função deve diagnosticar falhas da IA e aceitar as chaves atuais do Supabase');
assert.ok(functionSource.includes("aiResponse.status === 429") && functionSource.includes("retry-after") && functionSource.includes("quotaExhausted"), 'limites temporários devem ter uma repetição controlada sem repetir quando faltar saldo');
assert.ok(functionSource.includes("'gpt-4.1-mini'") && functionSource.includes('buildAiRequest(fallbackModel)'), 'a correção deve usar um modelo compatível de reserva quando o principal atingir o limite');
assert.ok(functionSource.includes("moderationResponse.status !== 429") && functionSource.includes('conteúdo perigoso'), 'um limite temporário da moderação não deve derrubar a oficina e a orientação protetiva deve permanecer');
assert.ok(functionSource.includes(".rpc('finalize_essay_correction'") && !migration.includes('essay_text'), 'o débito deve ser atômico e o texto integral não deve ser persistido');
assert.ok(migration.includes("credits = credits - v_charge") && migration.includes('for update') && migration.includes('to service_role'), 'somente o backend deve poder debitar os cinco créditos');
assert.ok(migration.includes("essay_without_credits") && migration.includes("v_charge := 0"), 'administradores e acessos concedidos não devem consumir créditos');
assert.ok(migration.includes("'essay_correction', null") && !migration.includes("'essay:' || p_id"), 'a transação de redação não deve violar a referência de eventos de pagamento');
assert.ok(migration.includes('enable row level security') && migration.includes('(select auth.uid()) = user_id'), 'cada usuário deve visualizar apenas o próprio histórico');
assert.ok(moduleSource.includes('readFunctionFailure') && moduleSource.includes("theme.length < 3") && moduleSource.includes('friendlyError'), 'a tela deve validar o tema e explicar o erro real sem perder o rascunho');

console.log('essay-correction.test.js: oficina, privacidade e cobrança verificadas');
