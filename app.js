const el = (id) => document.getElementById(id);
let storageKey = 'estuda-mais-profile-v3-guest';
const supabaseUrl = 'https://wajefwcsnkwzetamjrwi.supabase.co';
const supabasePublishableKey = 'sb_publishable_jTt4rZEi6LCtVrjuYxk7mQ_SfkCqZfw';
const supabaseClient = globalThis.supabase?.createClient(supabaseUrl, supabasePublishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
let activeSupabaseUser = null;
let remoteSaveTimer = null;
let weeklyGoalReturnFocus = null;
const createNavigationSessionId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
let navigationSessionId = createNavigationSessionId();
let passwordRecoveryFlow = /(?:^|[?#&])type=recovery(?:&|$)/.test(`${window.location.search}${window.location.hash}`);
const gradeContent = window.EstudaGradeContent;
const questionEngine = window.EstudaQuestionExpansion;
const avatarStudio = window.EstudaAvatarStudio;
const APP_TUTORIAL_VERSION = 1;
let level = 'Fundamental', schoolYear = '6EF', difficulty = 'Fácil', curriculum = 'BNCC', quizMode = 'Guiado', current = 0, currentPhase = 1, resultAction = 'home', hits = 0, score = 0, roundStreak = 0, questions = [];
let avatarDraft = null, avatarCategory = 'skin', avatarStudioReturnFocus = null;
let tutorialStep = 0, tutorialReturnFocus = null, tutorialOpenedAutomatically = false;

const tutorialSteps = [
  { kicker: 'COMECE AQUI', title: 'Escolha seu ano e uma matéria', description: 'O Estuda+ organiza a aventura de acordo com a etapa escolar da criança.', kind: 'subjects', tips: ['Selecione o ano escolar na tela inicial.', 'Toque no cartão da matéria que deseja estudar.', 'Você poderá trocar essas escolhas sempre que quiser.'] },
  { kicker: 'MONTE SUA TRILHA', title: 'Personalize o desafio', description: 'Antes de começar, escolha como será a rodada de estudos.', kind: 'path', tips: ['O assunto é opcional: em branco, o app faz uma revisão geral.', 'Escolha o sistema de ensino, a dificuldade e o formato.', 'Cada fase reúne 10 questões variadas.'] },
  { kicker: 'APRENDA FAZENDO', title: 'Responda e entenda cada solução', description: 'Não basta saber se acertou: o comentário mostra como pensar melhor.', kind: 'question', tips: ['Há cinco alternativas e somente uma resposta correta.', 'Use “Passo a passo” e “Aprofundar” depois de responder.', 'Marque questões difíceis para revisar mais tarde.'] },
  { kicker: 'EVOLUA NA AVENTURA', title: 'Conclua fases e transforme seu avatar', description: 'Com 7 acertos ou mais, a próxima fase fica disponível e novos visuais são liberados.', kind: 'avatar', tips: ['Roupas e acessórios são conquistados por fases concluídas.', 'Repetir uma fase ajuda a praticar, mas não duplica recompensas.', 'Abra o ateliê no Início ou no Perfil para mudar o visual.'] },
  { kicker: 'CONTINUE CRESCENDO', title: 'Acompanhe o progresso e revise', description: 'O Perfil reúne conquistas, desempenho e os temas que merecem atenção.', kind: 'progress', tips: ['Complete missões curtas e acompanhe a evolução por matéria.', 'O caderno de erros traz conteúdos de volta no momento certo.', 'Adultos e professores podem identificar temas para sugerir revisão.'] }
];

const avatars = [
  { icon: '🧑‍🚀', name: 'Explorador', cost: 0 },
  { icon: '🦊', name: 'Raposa esperta', cost: 300 },
  { icon: '🧙', name: 'Mago dos números', cost: 800 },
  { icon: '🤖', name: 'Robô genial', cost: 1500 }
];
const medals = [
  { id: 'streak5', icon: '🔥', title: 'Em chamas', description: 'Acertou 5 questões seguidas', test: (state) => state.bestStreak >= 5 },
  { id: 'streak10', icon: '⚡', title: 'Raio de saber', description: 'Acertou 10 questões seguidas', test: (state) => state.bestStreak >= 10 },
  { id: 'mission', icon: '🎯', title: 'Missão cumprida', description: 'Respondeu 5 questões hoje', test: (state) => state.answeredToday >= 5 },
  { id: 'firstRound', icon: '🌱', title: 'Primeiro passo', description: 'Concluiu o primeiro desafio', test: (state) => state.rounds >= 1 },
  { id: 'reviewer', icon: '📘', title: 'Revisor', description: 'Voltou para praticar o caderno de erros', test: (state) => state.reviewCount >= 1 }
];
const contexts = [
  { keys: ['compra', 'mercado', 'dinheiro'], name: 'compras', start: 'Na lojinha de brinquedos,' },
  { keys: ['jogo', 'game'], name: 'jogos', start: 'Em um jogo de aventura,' },
  { keys: ['animal', 'bicho'], name: 'animais', start: 'No parque dos animais,' },
  { keys: ['espaço', 'espaco', 'planeta', 'astronomia'], name: 'espaço', start: 'Em uma missão espacial,' },
  { keys: ['esporte', 'futebol', 'bola'], name: 'esportes', start: 'Durante um campeonato,' }
];
const curriculumDescriptions = {
  BNCC: 'Baseado nas habilidades gerais da BNCC para a etapa selecionada.',
  'Base Enem/Inep': 'Trilha com questões públicas selecionadas do Enem/Inep, identificadas por ano, caderno e número.',
  AZ: 'Modo AZ: trilha de prática, revisão e resolução de problemas. Referência de estudo, sem reproduzir material didático proprietário.',
  COC: 'Modo COC: prática gradual e revisão por habilidade. Referência de estudo, sem reproduzir material didático proprietário.',
  Anglo: 'Modo Anglo: exercícios progressivos e foco em estratégia de resolução. Referência de estudo, sem reproduzir material didático proprietário.',
  SAS: 'Modo SAS: prática por habilidade e acompanhamento de desempenho. Referência de estudo, sem reproduzir material didático proprietário.',
  Personalizado: 'Use este modo para estudar com base no material enviado ou indicado pela escola.'
};
const curriculumSources = {
  BNCC: { label: 'Referência: BNCC — MEC', url: 'https://basenacionalcomum.mec.gov.br/abase/' },
  'Base Enem/Inep': { label: 'Referência: Matriz do Enem e provas públicas do Inep', url: 'https://www.gov.br/inep/pt-br/centrais-de-conteudo/acervo-linha-editorial/publicacoes-institucionais/avaliacoes-e-exames-da-educacao-basica/matrizes-de-referencia-enem' }
};
const enemAxes = { Matemática: 'resolução de situações-problema e modelagem', Português: 'leitura, interpretação e argumentação', História: 'análise de processos históricos e fontes', Geografia: 'leitura do espaço geográfico e relações socioambientais', Biologia: 'compreensão de fenômenos e investigação científica', Física: 'compreensão de fenômenos e modelagem', Química: 'compreensão de fenômenos e investigação científica' };
const subjectExamples = {
  Matemática: ['frações', 'porcentagem', 'compras', 'geometria', 'equações'],
  Português: ['interpretação de texto', 'figuras de linguagem', 'orações', 'crônica', 'argumentação'],
  História: ['Revolução Francesa', 'Brasil Império', 'Era Vargas', 'Guerra Fria', 'povos originários'],
  Geografia: ['clima', 'globalização', 'urbanização', 'biomas brasileiros', 'cartografia'],
  Biologia: ['ecologia', 'genética', 'corpo humano', 'evolução', 'cadeias alimentares'],
  Física: ['cinemática', 'energia', 'eletricidade', 'forças', 'ondas'],
  Química: ['ligações químicas', 'misturas', 'reações', 'pH', 'tabela periódica']
};
const weeklyThemes = [
  { title: 'Consumo consciente', copy: 'Use porcentagens, orçamento e comparação de preços para tomar decisões melhores.' },
  { title: 'Ciência em movimento', copy: 'Observe dados, levante hipóteses e explique o que muda em cada experimento.' },
  { title: 'Cidade que se transforma', copy: 'Conecte mapas, história, ambiente e escolhas das pessoas no mesmo desafio.' },
  { title: 'Comunicação que convence', copy: 'Leia com atenção: tese, evidência e intenção mudam a força de um texto.' }
];
const subjectIcons = { Matemática: '➗', Português: '📖', História: '🏛️', Geografia: '🌎', Biologia: '🧬', Física: '⚛️', Química: '🧪' };
const phaseNames = ['Fundamentos', 'Aplicação', 'Raciocínio', 'Missão final'];
const learningBank = [
  ['Qual atitude ajuda mais a aprender {topic}?', ['Ignorar dúvidas', 'Resolver exemplos e explicar o raciocínio', 'Decorar uma resposta pronta', 'Pular as etapas', 'Estudar só na véspera'], 1, 'Praticar e explicar com suas palavras fortalece a compreensão e mostra o que ainda precisa ser revisado.'],
  ['Ao errar uma questão de {topic}, o melhor a fazer é:', ['Desistir do assunto', 'Revisar a resolução e entender a causa do erro', 'Apagar a questão', 'Chutar outra resposta', 'Evitar exercícios parecidos'], 1, 'O erro é uma pista: entender sua causa transforma a correção em aprendizado.'],
  ['Qual estratégia ajuda a conferir um resultado sobre {topic}?', ['Aceitar a primeira resposta', 'Refazer o raciocínio com calma', 'Escolher a alternativa maior', 'Copiar de alguém', 'Mudar a resposta ao acaso'], 1, 'Conferir o caminho usado é uma ótima forma de verificar se a resposta faz sentido.'],
  ['Para aprender {topic} a longo prazo, é melhor:', ['Revisar um pouco em dias diferentes', 'Estudar tudo na véspera', 'Ler apenas o título', 'Responder sem pensar', 'Nunca revisar depois de acertar'], 0, 'Revisões espaçadas ajudam o cérebro a guardar a informação por mais tempo.'],
  ['O primeiro passo em uma questão de {topic} é:', ['Ler o enunciado e identificar o que foi pedido', 'Marcar qualquer alternativa', 'Ler só a última frase', 'Procurar a resposta antes de entender', 'Usar a resposta da anterior'], 0, 'A leitura atenta evita erros de interpretação e guia todo o raciocínio.'],
  ['O que mostra compreensão real de {topic}?', ['Repetir uma definição', 'Relacionar o conteúdo a um exemplo', 'Não fazer perguntas', 'Memorizar sem praticar', 'Evitar justificar a resposta'], 1, 'Conectar o conteúdo a exemplos mostra que você entendeu a ideia, não apenas a decorou.'],
  ['Qual é um jeito ativo de estudar {topic}?', ['Criar perguntas e tentar respondê-las', 'Deixar o material aberto', 'Sublinhar tudo', 'Pular explicações', 'Esperar a resposta'], 0, 'Quando você tenta lembrar e responder, seu cérebro trabalha mais — e aprende melhor.'],
  ['Ao explicar {topic} para alguém, você deve:', ['Usar exemplos claros', 'Evitar perguntas', 'Falar rápido', 'Repetir palavras difíceis', 'Não organizar as ideias'], 0, 'Exemplos claros e ideias organizadas tornam a explicação mais fácil de entender.'],
  ['Para que servem as questões sobre {topic}?', ['Medir a compreensão e ajustar os estudos', 'Só acumular respostas', 'Decorar uma frase', 'Evitar o conteúdo', 'Substituir todo o estudo'], 0, 'As questões mostram o que você já domina e o que vale a pena revisar.'],
  ['Depois de acertar uma questão de {topic}, uma boa escolha é:', ['Ler o comentário e seguir praticando', 'Parar de estudar para sempre', 'Ignorar o raciocínio', 'Nunca mais revisar', 'Não fazer questões diferentes'], 0, 'Mesmo ao acertar, conferir a explicação fortalece o que você acabou de aprender.']
];
const subjectChallengeBank = {
  Português: [
    ['Em um texto sobre {topic}, qual elemento ajuda a identificar a ideia central?', ['Um argumento repetido sem explicação', 'As informações que sustentam a tese do autor', 'A palavra mais longa do texto', 'Apenas o título', 'A opinião de quem lê'], 1, 'A ideia central é construída pelas informações e argumentos que o texto desenvolve.'],
    ['Um autor usa uma comparação para explicar {topic}. Qual é a função dessa escolha?', ['Tornar a ideia mais concreta para o leitor', 'Trocar o tema do texto', 'Eliminar a necessidade de contexto', 'Evitar qualquer interpretação', 'Substituir todos os argumentos'], 0, 'Comparações aproximam uma ideia abstrata de uma situação conhecida pelo leitor.'],
    ['Ao revisar um parágrafo sobre {topic}, qual mudança melhora a coerência?', ['Adicionar uma conclusão ligada aos argumentos anteriores', 'Repetir a mesma frase várias vezes', 'Mudar de assunto sem conexão', 'Retirar todos os conectivos', 'Usar palavras difíceis sem necessidade'], 0, 'Coerência é a ligação lógica entre as ideias do texto.']
  ],
  História: [
    ['Ao estudar {topic}, por que comparar fontes de épocas diferentes é importante?', ['Porque uma única fonte sempre explica tudo', 'Porque permite analisar perspectivas e interesses distintos', 'Porque dispensa a análise do contexto', 'Porque transforma opinião em fato', 'Porque elimina divergências históricas'], 1, 'Fontes históricas refletem pontos de vista; compará-las ajuda a interpretar o contexto.'],
    ['Qual pergunta ajuda a analisar uma fonte histórica sobre {topic}?', ['Quem produziu a fonte e para qual público?', 'Qual frase parece mais bonita?', 'Quantas páginas a fonte possui?', 'O texto usa letras maiúsculas?', 'A fonte concorda com minha opinião?'], 0, 'Autor, público e contexto ajudam a compreender intenções e limites de uma fonte.'],
    ['Uma mudança ligada a {topic} teve efeitos econômicos e sociais. Qual análise é mais completa?', ['Observar somente uma data', 'Relacionar causas, grupos envolvidos e consequências', 'Memorizar nomes isolados', 'Ignorar conflitos', 'Considerar apenas um personagem'], 1, 'Processos históricos envolvem causas, agentes e consequências interligadas.']
  ],
  Geografia: [
    ['Para compreender {topic}, qual dado espacial é mais útil?', ['A localização e a distribuição do fenômeno no território', 'A cor favorita dos moradores', 'Um dado sem local ou período', 'Apenas uma opinião individual', 'Uma informação sem escala'], 0, 'A Geografia analisa onde os fenômenos ocorrem, como se distribuem e por quê.'],
    ['Ao comparar duas regiões em um estudo sobre {topic}, o que deve ser considerado?', ['Escala, período e critérios de comparação', 'Somente o nome das regiões', 'A primeira informação encontrada', 'Dados de anos aleatórios', 'Uma única fotografia'], 0, 'Comparações confiáveis usam critérios equivalentes e consideram tempo e escala.'],
    ['Qual situação mostra relação entre sociedade e natureza em {topic}?', ['Uma ação humana que altera e é afetada pelo ambiente', 'Um fenômeno estudado sem território', 'Uma lista de nomes de cidades', 'Uma opinião sem evidência', 'Um mapa sem legenda'], 0, 'Questões geográficas relacionam ações humanas, ambiente e organização do espaço.']
  ],
  Biologia: [
    ['Em uma investigação sobre {topic}, qual procedimento torna a conclusão mais confiável?', ['Comparar resultados e controlar variáveis relevantes', 'Mudar todas as variáveis ao mesmo tempo', 'Escolher apenas o resultado esperado', 'Ignorar os dados coletados', 'Repetir a hipótese como conclusão'], 0, 'Controlar variáveis permite identificar melhor o que explica um resultado.'],
    ['Qual evidência melhor sustenta uma explicação científica sobre {topic}?', ['Dados observáveis que podem ser verificados', 'Uma opinião sem observação', 'Uma conclusão sem experimento', 'Uma frase repetida', 'Um palpite isolado'], 0, 'Explicações científicas devem ser apoiadas em evidências observáveis e verificáveis.'],
    ['Ao estudar {topic}, por que modelos científicos são úteis?', ['Porque simplificam sistemas complexos para investigação', 'Porque substituem qualquer evidência', 'Porque nunca precisam ser revisados', 'Porque são cópias perfeitas da realidade', 'Porque impedem perguntas novas'], 0, 'Modelos ajudam a explicar fenômenos, mas podem ser aprimorados com novas evidências.']
  ],
  Física: [
    ['Em um problema sobre {topic}, qual estratégia evita conclusões apressadas?', ['Identificar grandezas, unidades e relações entre elas', 'Escolher uma fórmula sem ler o enunciado', 'Ignorar as unidades', 'Usar números sem contexto', 'Trocar dados até o resultado parecer bom'], 0, 'Grandezas e unidades ajudam a escolher o modelo físico adequado.'],
    ['Qual resultado indica que um cálculo sobre {topic} merece revisão?', ['Uma unidade incompatível com a grandeza procurada', 'Um valor que foi calculado com etapas claras', 'Um dado informado no enunciado', 'Uma estimativa justificada', 'Uma conversão correta'], 0, 'A unidade funciona como uma verificação importante da coerência do cálculo.'],
    ['Por que estimar uma resposta é útil em {topic}?', ['Ajuda a perceber resultados muito distantes do esperado', 'Substitui todas as contas', 'Elimina a necessidade de dados', 'Impede o uso de unidades', 'Garante que qualquer resposta é correta'], 0, 'Uma estimativa oferece uma referência para conferir a ordem de grandeza do resultado.']
  ],
  Química: [
    ['Em uma análise de {topic}, qual observação pode indicar transformação química?', ['Formação de novas substâncias observável por evidências', 'Apenas a mudança de recipiente', 'A troca de lugar do material', 'A leitura do nome da substância', 'Uma mistura sem qualquer alteração'], 0, 'Transformações químicas envolvem formação de novas substâncias e podem apresentar evidências.'],
    ['Qual cuidado é essencial ao comparar substâncias em {topic}?', ['Distinguir propriedades observadas de conclusões apressadas', 'Usar apenas a cor como prova definitiva', 'Ignorar condições do experimento', 'Misturar dados de situações diferentes', 'Evitar qualquer medida'], 0, 'Uma propriedade isolada nem sempre identifica uma substância; o contexto experimental importa.'],
    ['Por que a representação por modelos é útil em {topic}?', ['Ajuda a explicar fenômenos que não são vistos diretamente', 'Torna desnecessária a observação', 'Elimina a necessidade de evidências', 'Impede novas hipóteses', 'Substitui toda experiência'], 0, 'Modelos ajudam a relacionar observações macroscópicas a explicações sobre a matéria.']
  ]
};

function today() { return new Date().toISOString().slice(0, 10); }
function weekKey() { const date = new Date(); const first = new Date(date.getFullYear(), 0, 1); return `${date.getFullYear()}-${Math.ceil((((date - first) / 86400000) + first.getDay() + 1) / 7)}`; }
function futureDate(days) { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); }
function completedPhaseCountFrom(progress = {}) { return Object.values(progress || {}).reduce((total, item) => total + Math.max(0, Math.min(4, Number(item?.completed) || 0)), 0); }
function blankState() { return { stateVersion: 5, totalPoints: 0, avatar: '🧑‍🚀', avatarDesign: avatarStudio.copyDefaults(), avatarDesignUpdatedAt: '', avatarCreated: false, tutorialSeenVersion: 0, tutorialSeenAt: '', tutorialOutcome: '', schoolYear: '6EF', answeredToday: 0, day: today(), bestStreak: 0, streakDays: 0, lastStudyDay: '', energy: 5, medals: [], subjectStats: {}, yearStats: {}, topicErrors: {}, notebook: [], savedQuestions: [], phaseProgress: {}, questionSequences: {}, seenQuestionIds: [], seenQuestionFingerprints: [], plan: { days: ['1', '2', '3'], minutes: '10' }, weekly: { id: weekKey(), answered: 0, goal: 50 }, accessibility: { font: false, contrast: false, calm: false }, materials: [], bestScore: 0, rounds: 0, reviewCount: 0 }; }
function mergeState(saved) {
  const base = blankState(), phaseProgress = saved?.phaseProgress && typeof saved.phaseProgress === 'object' && !Array.isArray(saved.phaseProgress) ? saved.phaseProgress : {};
  const migratedAvatar = saved?.avatarDesign ? avatarStudio.normalize(saved.avatarDesign) : avatarStudio.migrateLegacy(saved?.avatar);
  return { ...base, ...(saved || {}), stateVersion: 5, avatarDesign: avatarStudio.fitToUnlocks(migratedAvatar, completedPhaseCountFrom(phaseProgress)), avatarDesignUpdatedAt: String(saved?.avatarDesignUpdatedAt || ''), avatarCreated: Boolean(saved?.avatarCreated), tutorialSeenVersion: Math.max(0, Number(saved?.tutorialSeenVersion) || 0), tutorialSeenAt: String(saved?.tutorialSeenAt || ''), tutorialOutcome: saved?.tutorialOutcome === 'completed' ? 'completed' : saved?.tutorialOutcome === 'skipped' ? 'skipped' : '', subjectStats: saved?.subjectStats || {}, yearStats: saved?.yearStats || {}, topicErrors: saved?.topicErrors || {}, medals: saved?.medals || [], notebook: saved?.notebook || [], savedQuestions: saved?.savedQuestions || [], phaseProgress, questionSequences: saved?.questionSequences && typeof saved.questionSequences === 'object' && !Array.isArray(saved.questionSequences) ? saved.questionSequences : {}, seenQuestionIds: [...new Set(Array.isArray(saved?.seenQuestionIds) ? saved.seenQuestionIds : [])], seenQuestionFingerprints: [...new Set(Array.isArray(saved?.seenQuestionFingerprints) ? saved.seenQuestionFingerprints : [])], weekly: { ...base.weekly, ...(saved?.weekly || {}) } };
}
function mergePhaseProgress(local = {}, cloud = {}) {
  const merged = { ...local };
  Object.entries(cloud || {}).forEach(([key, value]) => { const previous = Number(merged[key]?.completed) || 0, incoming = Number(value?.completed) || 0; merged[key] = incoming >= previous ? { ...(merged[key] || {}), ...(value || {}), completed: incoming } : merged[key]; });
  return merged;
}
function mergeQuestionSequences(local = {}, cloud = {}) {
  const merged = { ...local };
  Object.entries(cloud).forEach(([key, value]) => { merged[key] = Math.max(Number(merged[key]) || 0, Number(value) || 0); });
  return merged;
}
function loadState() { try { return mergeState(JSON.parse(localStorage.getItem(storageKey))); } catch { return blankState(); } }
let state = loadState();
schoolYear = state.schoolYear || '6EF';
function normalizeDay() { if (state.day !== today()) { state.day = today(); state.answeredToday = 0; state.energy = 5; saveState(); } }
function normalizeWeek() { if (!state.weekly || state.weekly.id !== weekKey()) { state.weekly = { id: weekKey(), answered: 0, goal: state.weekly?.goal || 50 }; saveState(); } }
function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
  if (!activeSupabaseUser || !supabaseClient) return;
  clearTimeout(remoteSaveTimer);
  remoteSaveTimer = setTimeout(syncStateToSupabase, 700);
}
function schoolYearProfile(code = schoolYear) { return gradeContent.profile(code); }
function schoolYearLabel(code = schoolYear) { return schoolYearProfile(code).label; }
function populateSchoolYearControls() {
  ['subject-school-year', 'school-year'].forEach((id) => {
    const select = el(id); if (!select) return; select.innerHTML = '';
    const fundamental = document.createElement('optgroup'); fundamental.label = 'Ensino Fundamental';
    const high = document.createElement('optgroup'); high.label = 'Ensino Médio';
    gradeContent.schoolYears.forEach((year) => { const option = document.createElement('option'); option.value = year.code; option.textContent = year.label; (year.stage === 'Médio' ? high : fundamental).append(option); });
    select.append(fundamental, high); select.value = schoolYear;
  });
}
function updateSchoolYearHint() {
  const profile = schoolYearProfile();
  if (el('school-year-hint')) el('school-year-hint').textContent = profile.stage === 'Médio' ? `${profile.label}: questões de Ensino Médio organizadas em progressão e práticas do Enem.` : `${profile.label}: questões curriculares adequadas à faixa e alinhadas à progressão da BNCC.`;
  const curriculumSelect = el('curriculum');
  if (curriculumSelect) {
    const enemOption = [...curriculumSelect.options].find((option) => option.value === 'Base Enem/Inep');
    if (enemOption) enemOption.disabled = profile.stage !== 'Médio';
    if (profile.stage !== 'Médio' && curriculumSelect.value === 'Base Enem/Inep') { curriculumSelect.value = 'BNCC'; curriculum = 'BNCC'; }
  }
}
function setSchoolYear(code, persist = true) {
  const profile = schoolYearProfile(code); schoolYear = profile.code; level = profile.stage; state.schoolYear = profile.code;
  ['subject-school-year', 'school-year'].forEach((id) => { if (el(id)) el(id).value = profile.code; });
  updateSchoolYearHint(); renderTopicExamples(); renderPhaseMap();
  if (persist) saveState();
}
function showAuthNotice(message, error = false) { const notice = el('auth-notice'); notice.textContent = message; notice.classList.toggle('error', error); }
function setAuthBusy(formId, busy, label) {
  const form = el(formId), button = form?.querySelector('button[type="submit"]');
  if (!button) return;
  if (!button.dataset.originalLabel) button.dataset.originalLabel = button.innerHTML;
  button.disabled = busy;
  button.innerHTML = busy ? label : button.dataset.originalLabel;
}
function friendlyAuthError(error) {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (message.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (message.includes('already registered') || message.includes('already been registered')) return 'Este e-mail já possui cadastro. Entre com sua senha.';
  if (message.includes('expired') || message.includes('invalid token') || message.includes('session missing')) return 'Este link expirou ou já foi utilizado. Solicite uma nova recuperação de senha.';
  if (message.includes('password')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (message.includes('rate limit')) return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.';
  return 'Não foi possível concluir o acesso. Verifique sua conexão e tente novamente.';
}
async function fetchCloudProfile(user) {
  if (!supabaseClient) return { data: null, error: new Error('Serviço de sincronização indisponível.') };
  return supabaseClient.from('profiles').select('name, school_year, avatar, points, app_state').eq('id', user.id).maybeSingle();
}
async function fetchQuestionHistory(user = activeSupabaseUser) {
  if (!user || !supabaseClient) return { data: [], error: new Error('Histórico de questões indisponível.') };
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseClient
      .from('question_history')
      .select('question_id, question_fingerprint, seen_at')
      .eq('user_id', user.id)
      .order('seen_at', { ascending: true })
      .order('question_id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) return { data: rows, error };
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return { data: rows, error: null };
  }
}
function mergeReservedQuestionHistory(rows = []) {
  state.seenQuestionIds = [...new Set([...(state.seenQuestionIds || []), ...rows.map((row) => row.question_id).filter(Boolean)])];
  state.seenQuestionFingerprints = [...new Set([...(state.seenQuestionFingerprints || []), ...rows.map((row) => row.question_fingerprint).filter(Boolean)])];
}
async function reserveQuestionBatch(batch, subject, yearCode) {
  if (!activeSupabaseUser || !supabaseClient) return { reserved: true, conflict: false, error: null };
  const rows = [];
  const rowIds = new Set();
  const rowFingerprints = new Set();
  const addRow = (questionId, questionFingerprint) => {
    if (!questionId || !questionFingerprint || rowIds.has(questionId) || rowFingerprints.has(questionFingerprint)) return;
    rowIds.add(questionId);
    rowFingerprints.add(questionFingerprint);
    rows.push({ user_id: activeSupabaseUser.id, question_id: questionId, question_fingerprint: questionFingerprint, subject, school_year: yearCode });
  };
  batch.forEach((question) => {
    const currentFingerprint = questionEngine.fingerprint(question);
    addRow(question.id, currentFingerprint);
    (question.historyAliases?.ids || []).forEach((aliasId) => addRow(aliasId, `alias-id:${aliasId}`));
    (question.historyAliases?.fingerprints || []).forEach((aliasFingerprint) => addRow(`alias-fingerprint:${aliasFingerprint}`, aliasFingerprint));
  });
  const { error } = await supabaseClient.from('question_history').insert(rows);
  if (!error) return { reserved: true, conflict: false, error: null };
  const conflict = String(error.code || '') === '23505' || /duplicate key|unique constraint/i.test(String(error.message || ''));
  return { reserved: false, conflict, error };
}
async function syncStateToSupabase() {
  if (!activeSupabaseUser || !supabaseClient) return false;
  const payload = {
    name: state.userName || activeSupabaseUser.user_metadata?.name || '',
    school_year: state.schoolYear || '6EF',
    avatar: state.avatar || '🧑‍🚀',
    points: state.totalPoints || 0,
    app_state: state,
    updated_at: new Date().toISOString()
  };
  const { error } = await supabaseClient.from('profiles').update(payload).eq('id', activeSupabaseUser.id);
  if (error) { console.warn('Não foi possível sincronizar o progresso:', error.message); return false; }
  return true;
}
async function activateUser(user) {
  activeSupabaseUser = user;
  const userStorageKey = `estuda-mais-profile-v3-${user.id}`;
  const legacyStorageKey = `estuda-mais-profile-v3-${user.email}`;
  if (!localStorage.getItem(userStorageKey) && localStorage.getItem(legacyStorageKey)) localStorage.setItem(userStorageKey, localStorage.getItem(legacyStorageKey));
  storageKey = userStorageKey;
  const localState = loadState();
  const { data: profile, error: profileError } = await fetchCloudProfile(user);
  if (profileError || !profile) {
    console.warn('Não foi possível reconciliar o histórico antes de iniciar:', profileError?.message || 'perfil ausente');
    activeSupabaseUser = null;
    show('auth-screen', { historyMode: 'reset' });
    showAuthNotice('Não foi possível sincronizar seu histórico agora. Por segurança, o quiz não foi iniciado para evitar questões repetidas. Verifique a conexão e tente entrar novamente.', true);
    return false;
  }
  const { data: reservedHistory, error: historyError } = await fetchQuestionHistory(user);
  if (historyError) {
    console.warn('Não foi possível carregar o histórico atômico de questões:', historyError.message);
    activeSupabaseUser = null;
    show('auth-screen', { historyMode: 'reset' });
    showAuthNotice('Não foi possível conferir as questões já utilizadas. Por segurança, tente entrar novamente antes de iniciar o quiz.', true);
    return false;
  }
  if (profile?.app_state && Object.keys(profile.app_state).length) {
    const cloudState = mergeState(profile.app_state);
    state = cloudState;
    state.phaseProgress = mergePhaseProgress(localState.phaseProgress, cloudState.phaseProgress);
    const localAvatarTime = Date.parse(localState.avatarDesignUpdatedAt || '') || 0, cloudAvatarTime = Date.parse(cloudState.avatarDesignUpdatedAt || '') || 0;
    const avatarSource = localAvatarTime > cloudAvatarTime ? localState : cloudState;
    state.avatarDesign = avatarStudio.fitToUnlocks(avatarSource.avatarDesign, completedPhaseCountFrom(state.phaseProgress));
    state.avatarDesignUpdatedAt = avatarSource.avatarDesignUpdatedAt || '';
    state.avatarCreated = Boolean(localState.avatarCreated || cloudState.avatarCreated);
    state.tutorialSeenVersion = Math.max(Number(localState.tutorialSeenVersion) || 0, Number(cloudState.tutorialSeenVersion) || 0);
    const tutorialStateSource = Number(localState.tutorialSeenVersion) >= Number(cloudState.tutorialSeenVersion) ? localState : cloudState;
    state.tutorialSeenAt = tutorialStateSource.tutorialSeenAt || '';
    state.tutorialOutcome = tutorialStateSource.tutorialOutcome || '';
    state.seenQuestionIds = [...new Set([...(localState.seenQuestionIds || []), ...(cloudState.seenQuestionIds || [])])];
    state.seenQuestionFingerprints = [...new Set([...(localState.seenQuestionFingerprints || []), ...(cloudState.seenQuestionFingerprints || [])])];
    state.questionSequences = mergeQuestionSequences(localState.questionSequences, cloudState.questionSequences);
  } else state = localState;
  mergeReservedQuestionHistory(reservedHistory);
  state.userName = profile?.name || user.user_metadata?.name || state.userName || user.email?.split('@')[0] || 'Estudante';
  state.schoolYear = profile?.school_year || state.schoolYear || '6EF';
  state.avatar = profile?.avatar || state.avatar;
  state.avatarDesign = avatarStudio.fitToUnlocks(state.avatarDesign, completedPhaseCountFrom(state.phaseProgress));
  state.totalPoints = Math.max(state.totalPoints || 0, profile?.points || 0);
  const tutorialPendingVersion = Math.max(0, Number(user.user_metadata?.tutorial_pending_version) || 0);
  const shouldAutoOpenTutorial = tutorialPendingVersion >= APP_TUTORIAL_VERSION && state.tutorialSeenVersion < APP_TUTORIAL_VERSION;
  setSchoolYear(state.schoolYear, false);
  saveState();
  updateMission(); updateHome(); renderTopicExamples(); renderPhaseMap(); show('subject-screen', { historyMode: 'reset' });
  if (shouldAutoOpenTutorial) requestAnimationFrame(() => openAppTutorial({ automatic: true }));
  return true;
}
async function registerUser(event) {
  event.preventDefault();
  const name = el('register-name').value.trim(), email = el('register-email').value.trim().toLowerCase(), password = el('register-password').value;
  if (!name || !email || password.length < 6) { showAuthNotice('Preencha os campos e use uma senha com pelo menos 6 caracteres.', true); return; }
  if (!supabaseClient) { showAuthNotice('O serviço de cadastro não carregou. Verifique sua conexão e atualize a página.', true); return; }
  setAuthBusy('register-form', true, 'Criando conta…'); showAuthNotice('');
  try {
    const { data, error } = await supabaseClient.auth.signUp({ email, password, options: { data: { name, school_year: state.schoolYear || '6EF', avatar: state.avatar || '🧑‍🚀', tutorial_pending_version: APP_TUTORIAL_VERSION } } });
    if (error) throw error;
    if (data.session && data.user) { await activateUser(data.user); return; }
    el('login-email').value = email;
    setAuthMode('login');
    showAuthNotice('Conta criada! Abra seu e-mail, confirme o cadastro e depois entre.');
  } catch (error) { showAuthNotice(friendlyAuthError(error), true); }
  finally { setAuthBusy('register-form', false); }
}
async function loginUser(event) {
  event.preventDefault();
  const email = el('login-email').value.trim().toLowerCase(), password = el('login-password').value;
  if (!supabaseClient) { showAuthNotice('O serviço de acesso não carregou. Verifique sua conexão e atualize a página.', true); return; }
  setAuthBusy('login-form', true, 'Entrando…'); showAuthNotice('');
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await activateUser(data.user);
  } catch (error) { showAuthNotice(friendlyAuthError(error), true); }
  finally { setAuthBusy('login-form', false); }
}
function passwordRecoveryRedirect() {
  if (window.location.protocol === 'file:') return null;
  const redirect = new URL(window.location.href);
  redirect.hash = '';
  redirect.search = '';
  return redirect.toString();
}
async function requestPasswordReset(event) {
  event.preventDefault();
  const email = el('recovery-email').value.trim().toLowerCase();
  if (!email) { showAuthNotice('Digite o e-mail utilizado no cadastro.', true); return; }
  if (!supabaseClient) { showAuthNotice('O serviço de recuperação não carregou. Atualize a página e tente novamente.', true); return; }
  setAuthBusy('recovery-form', true, 'Enviando link…'); showAuthNotice('');
  try {
    const redirectTo = passwordRecoveryRedirect();
    const options = redirectTo ? { redirectTo } : {};
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, options);
    if (error) throw error;
    el('login-email').value = email;
    setAuthMode('login');
    showAuthNotice('Se este e-mail estiver cadastrado, você receberá um link para criar uma nova senha. Confira também o spam.');
  } catch (error) { showAuthNotice(friendlyAuthError(error), true); }
  finally { setAuthBusy('recovery-form', false); }
}
async function updateRecoveredPassword(event) {
  event.preventDefault();
  const password = el('new-password').value, confirmation = el('confirm-new-password').value;
  if (password.length < 6) { showAuthNotice('A nova senha precisa ter pelo menos 6 caracteres.', true); return; }
  if (password !== confirmation) { showAuthNotice('As senhas não são iguais. Digite novamente.', true); return; }
  if (!supabaseClient) { showAuthNotice('O serviço de recuperação não carregou. Atualize a página e tente novamente.', true); return; }
  setAuthBusy('new-password-form', true, 'Salvando senha…'); showAuthNotice('');
  try {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    if (!sessionData.session) throw new Error('Session missing');
    const { error } = await supabaseClient.auth.updateUser({ password });
    if (error) throw error;
    await supabaseClient.auth.signOut();
    activeSupabaseUser = null;
    passwordRecoveryFlow = false;
    window.history.replaceState({}, document.title, window.location.pathname || '/');
    el('new-password-form').reset();
    setAuthMode('login');
    showAuthNotice('Senha atualizada com sucesso! Entre usando sua nova senha.');
  } catch (error) { showAuthNotice(friendlyAuthError(error), true); }
  finally { setAuthBusy('new-password-form', false); }
}
async function logoutUser() {
  clearTimeout(remoteSaveTimer);
  if (activeSupabaseUser && supabaseClient) await syncStateToSupabase();
  if (supabaseClient) await supabaseClient.auth.signOut();
  activeSupabaseUser = null;
  storageKey = 'estuda-mais-profile-v3-guest';
  state = blankState();
  questions = []; current = 0; currentPhase = 1; resultAction = 'home'; hits = 0; score = 0; roundStreak = 0;
  setAuthMode('login', { historyMode: 'reset' });
  showAuthNotice('Você saiu com segurança. Até a próxima aventura!');
}
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);
const unique = (items) => [...new Set(items)];
function isUnlocked(avatar) { return state.totalPoints >= avatar.cost; }
function selectedAvatar() { return avatars.find((avatar) => avatar.icon === state.avatar) || avatars[0]; }
function completedAvatarPhases() { return completedPhaseCountFrom(state.phaseProgress); }
function avatarProgressMessage(count = completedAvatarPhases()) {
  const next = avatarStudio.nextUnlock(count);
  if (!next) return `${count} fases concluídas · você liberou todo o guarda-roupa!`;
  const remaining = next.unlock - count;
  return `${count} fase${count === 1 ? '' : 's'} concluída${count === 1 ? '' : 's'} · ${remaining === 1 ? 'a próxima fase libera' : `faltam ${remaining} fases para liberar`} ${next.name}.`;
}
function renderAvatarInto(id, design = state.avatarDesign, options = {}) {
  const target = el(id); if (!target) return;
  target.innerHTML = avatarStudio.render(design, options);
}
function renderAvatarSurfaces() {
  const count = completedAvatarPhases(), name = learnerName(), message = avatarProgressMessage(count);
  renderAvatarInto('home-avatar-preview');
  renderAvatarInto('top-avatar', state.avatarDesign, { decorative: true });
  renderAvatarInto('profile-avatar', state.avatarDesign, { decorative: true });
  renderAvatarInto('dashboard-avatar-preview');
  if (el('avatar-home-title')) el('avatar-home-title').textContent = state.avatarCreated ? `${name}, este é seu avatar!` : 'Crie seu avatar';
  if (el('avatar-home-progress')) el('avatar-home-progress').textContent = message;
  if (el('avatar-profile-progress')) el('avatar-profile-progress').textContent = message;
}
function renderAvatarStudioPreview() {
  if (!avatarDraft) return;
  renderAvatarInto('avatar-studio-preview', avatarDraft);
  const count = completedAvatarPhases(), next = avatarStudio.nextUnlock(count);
  el('avatar-phase-count').textContent = count;
  el('avatar-preview-name').textContent = learnerName();
  el('avatar-next-unlock').textContent = next ? `${next.name} será liberado ao completar ${next.unlock} fase${next.unlock === 1 ? '' : 's'}.` : 'Todo o guarda-roupa foi liberado. Excelente jornada!';
}
function avatarOptionSample(category, item) {
  const color = item.color;
  if (category === 'skin' || category === 'hairColor') return `<span class="avatar-option-sample is-color" style="--sample:${color}" aria-hidden="true"></span>`;
  return `<span class="avatar-option-sample" aria-hidden="true">${item.icon || '✦'}</span>`;
}
function renderAvatarOptions(category = avatarCategory) {
  const grid = el('avatar-option-grid'), count = completedAvatarPhases(); if (!grid || !avatarDraft) return;
  const categoryInfo = avatarStudio.categories.find((item) => item.id === category) || avatarStudio.categories[0];
  grid.setAttribute('aria-labelledby', `avatar-tab-${categoryInfo.id}`);
  grid.innerHTML = '';
  avatarStudio.catalog[categoryInfo.id].forEach((item) => {
    const unlocked = (item.unlock || 0) <= count, selected = avatarDraft[categoryInfo.id] === item.id;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'avatar-part-option'; button.dataset.avatarOption = item.id; button.setAttribute('aria-pressed', String(selected)); button.setAttribute('aria-disabled', String(!unlocked));
    const requirement = unlocked ? selected ? 'Selecionado' : 'Disponível' : `Libera após ${item.unlock} fase${item.unlock === 1 ? '' : 's'}`;
    button.innerHTML = `${avatarOptionSample(categoryInfo.id, item)}<span><strong>${item.name}</strong><small>${requirement}</small></span><b aria-hidden="true">${unlocked ? selected ? '✓' : '' : '🔒'}</b>`;
    button.addEventListener('click', () => {
      if (!unlocked) { const remaining = item.unlock - count; el('avatar-studio-status').textContent = `Continue a aventura: ${remaining === 1 ? 'falta 1 fase' : `faltam ${remaining} fases`} para liberar ${item.name}.`; return; }
      avatarDraft[categoryInfo.id] = item.id; el('avatar-studio-status').textContent = `${item.name} escolhido. Salve para usar este visual.`; renderAvatarStudioPreview(); renderAvatarOptions(categoryInfo.id); requestAnimationFrame(() => el('avatar-option-grid').querySelector(`[data-avatar-option="${item.id}"]`)?.focus());
    });
    grid.append(button);
  });
}
function renderAvatarEditor() {
  const tabs = el('avatar-category-tabs'); if (!tabs || !avatarDraft) return; tabs.innerHTML = '';
  avatarStudio.categories.forEach((category) => { const button = document.createElement('button'); const active = category.id === avatarCategory; button.type = 'button'; button.id = `avatar-tab-${category.id}`; button.setAttribute('role', 'tab'); button.setAttribute('aria-selected', String(active)); button.setAttribute('aria-controls', 'avatar-option-grid'); button.innerHTML = `<span aria-hidden="true">${category.icon}</span>${category.label}`; button.addEventListener('click', () => { avatarCategory = category.id; el('avatar-studio-status').textContent = ''; renderAvatarEditor(); }); tabs.append(button); });
  renderAvatarStudioPreview(); renderAvatarOptions(avatarCategory);
}
function renderAvatarUnlockResult(items = []) {
  const panel = el('avatar-unlock-result'); if (!panel) return; panel.hidden = !items.length;
  if (!items.length) return;
  el('avatar-unlock-icons').innerHTML = items.map((item) => `<span>${item.icon || '✨'}</span>`).join('');
  el('avatar-unlock-copy').textContent = items.map((item) => item.name).join(items.length > 1 ? ' e ' : '');
}
function tutorialVisualMarkup(kind) {
  if (kind === 'subjects') return '<div class="tutorial-subject-demo"><span>÷</span><span>文</span><span>⌁</span><b>6º ano selecionado</b></div>';
  if (kind === 'path') return '<div class="tutorial-path-demo"><div class="tutorial-path-line"><i class="done">✓</i><span></span><i class="current">2</i><span></span><i>3</i></div><strong>Faça 7 de 10 para avançar</strong></div>';
  if (kind === 'question') return '<div class="tutorial-question-demo"><small>QUESTÃO 3 DE 10</small><strong>Qual alternativa resolve corretamente o desafio?</strong><span>A&nbsp;&nbsp; Primeira possibilidade</span><span class="correct">✓&nbsp;&nbsp; Resposta correta comentada</span></div>';
  if (kind === 'avatar') return `<div class="tutorial-avatar-demo">${avatarStudio.render(state.avatarDesign, { decorative: true })}<div class="tutorial-avatar-items"><span><b>👕</b> Roupas por fases</span><span><b>👓</b> Acessórios novos</span><span><b>✦</b> Seu próprio estilo</span></div></div>`;
  return '<div class="tutorial-progress-demo"><article><span>🎯</span><div>Missão diária<i><b style="--demo-progress:80%"></b></i></div><b>4/5</b></article><article><span>↻</span><div>Revisões inteligentes<i><b style="--demo-progress:55%"></b></i></div><b>3</b></article><article><span>★</span><div>Evolução em Matemática<i><b style="--demo-progress:72%"></b></i></div><b>72%</b></article></div>';
}
function renderAppTutorial(options = {}) {
  const step = tutorialSteps[tutorialStep] || tutorialSteps[0];
  const position = tutorialStep + 1;
  el('tutorial-step-kicker').textContent = step.kicker;
  el('tutorial-step-count').textContent = `PASSO ${position} DE ${tutorialSteps.length}`;
  el('tutorial-title').textContent = step.title;
  el('tutorial-description').textContent = step.description;
  el('tutorial-tips').innerHTML = step.tips.map((tip) => `<li>${tip}</li>`).join('');
  const visual = el('tutorial-visual'); visual.className = `tutorial-visual is-${step.kind}`; visual.innerHTML = tutorialVisualMarkup(step.kind);
  const progress = el('tutorial-progress'); progress.setAttribute('aria-valuenow', String(position)); progress.querySelector('i').style.width = `${(position / tutorialSteps.length) * 100}%`;
  el('tutorial-dots').innerHTML = tutorialSteps.map((_, index) => `<i class="${index === tutorialStep ? 'active' : ''}"></i>`).join('');
  el('tutorial-prev').hidden = tutorialStep === 0;
  el('tutorial-next').innerHTML = tutorialStep === tutorialSteps.length - 1 ? 'Começar a estudar <span>✓</span>' : 'Próximo <span>→</span>';
  if (options.focusTitle) requestAnimationFrame(() => el('tutorial-title').focus({ preventScroll: true }));
}
function contextFor(topic) { const lower = String(topic || '').toLocaleLowerCase('pt-BR'); return contexts.find((item) => item.keys.some((key) => lower.includes(key))) || contexts[random(0, contexts.length - 1)]; }
function defaultTopicFor(subject = 'Matemática', year = schoolYear) {
  const profile = schoolYearProfile(year);
  return `Revisão geral de ${subject} — ${profile.short}`;
}
function resolveTopic(subject = 'Matemática', year = schoolYear, rawTopic = '') { return String(rawTopic ?? '').trim() || defaultTopicFor(subject, year); }
function normalizedTopicKey(rawTopic = '') {
  const topic = String(rawTopic ?? '').trim();
  if (!topic) return '__geral__';
  return topic.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
}
function topicForEntry(entry = {}) { return resolveTopic(entry.subject || 'Matemática', entry.schoolYear || schoolYear, entry.topic); }
function escapeHTML(value = '') { return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]); }
function routeKey(subject = el('subject')?.value || 'Matemática', topicKey = normalizedTopicKey(el('topic')?.value), system = el('curriculum')?.value || curriculum, year = el('school-year')?.value || schoolYear) { return `${year}|${system}|${subject}|${topicKey}`; }
function currentRoute() {
  const subject = el('subject')?.value || 'Matemática';
  const rawTopic = el('topic')?.value || '';
  const system = el('curriculum')?.value || curriculum;
  const year = el('school-year')?.value || schoolYear;
  const topic = resolveTopic(subject, year, rawTopic);
  const topicKey = normalizedTopicKey(rawTopic);
  return { subject, topic, topicKey, system, year, yearLabel: schoolYearLabel(year), key: routeKey(subject, topicKey, system, year) };
}
function getPhaseProgress(route = currentRoute()) { state.phaseProgress ||= {}; return state.phaseProgress[route.key] || { completed: 0 }; }
function questionKey(question) { return question.id || `${question.schoolYear || schoolYear}|${question.subject || ''}|${topicForEntry(question)}|${question.q || ''}`.slice(0, 440); }
function questionSkill(question) { const subjectSkills = { Matemática: 'Resolver e modelar situações', Português: 'Ler, inferir e argumentar', História: 'Analisar fontes e processos', Geografia: 'Interpretar espaço e dados', Biologia: 'Investigar fenômenos da vida', Física: 'Modelar grandezas e unidades', Química: 'Relacionar matéria e transformação' }; return question.skill || subjectSkills[question.subject] || 'Aplicar o conhecimento'; }
function currentTheme() { return weeklyThemes[(new Date().getDay() + new Date().getMonth()) % weeklyThemes.length]; }
function dueReviews() { return state.notebook.filter((entry) => entry.nextReview <= today()); }
function saveQuestionMark(question, mark) { const key = questionKey(question); let entry = state.savedQuestions.find((item) => item.key === key); if (!entry) { entry = { key, q: question.q, subject: question.subject, topic: topicForEntry(question), schoolYear: question.schoolYear || schoolYear, note: question.note, favorite: false, difficult: false, savedAt: today() }; state.savedQuestions.unshift(entry); } entry[mark] = !entry[mark]; if (!entry.favorite && !entry.difficult) state.savedQuestions = state.savedQuestions.filter((item) => item !== entry); state.savedQuestions = state.savedQuestions.slice(0, 40); saveState(); return entry?.[mark] || false; }
function isMarked(question, mark) { return !!state.savedQuestions.find((item) => item.key === questionKey(question))?.[mark]; }
function scheduleReview(question) { const key = questionKey(question); const existing = state.notebook.find((entry) => entry.key === key); if (existing) { existing.nextReview = futureDate(1); existing.step = 0; return; } state.notebook.unshift({ key, subject: question.subject, topic: topicForEntry(question), schoolYear: question.schoolYear || schoolYear, question: question.q, note: question.note, nextReview: futureDate(1), step: 0 }); state.notebook = state.notebook.slice(0, 30); }
function renderPhaseMap() { const route = currentRoute(); const progress = getPhaseProgress(route); const map = el('phase-map'); if (!map) return; map.innerHTML = '<div class="path-line"></div>'; const label = document.createElement('div'); label.className = 'phase-map-label'; label.textContent = `${route.subject} · ${route.yearLabel} · ${route.topic} · 4 fases · questões inéditas`; map.append(label); phaseNames.forEach((name, index) => { const number = index + 1; const complete = number <= progress.completed; const unlocked = number <= progress.completed + 1; const button = document.createElement('button'); button.type = 'button'; button.className = `lesson-node phase-node ${complete ? 'completed' : ''} ${unlocked ? 'unlocked' : 'locked-node'} ${number === progress.completed + 1 ? 'current' : ''}`; button.disabled = !unlocked; const icon = subjectIcons[route.subject] || subjectIcons.Matemática; button.innerHTML = `<span class="phase-illustration" aria-hidden="true">${icon}</span><span class="phase-number">${complete ? '★' : unlocked ? number : '🔒'}</span><small>Fase ${number}</small>`; button.title = `${name}: ${complete ? 'concluída' : unlocked ? 'disponível' : 'bloqueada'}`; button.addEventListener('click', () => { if (!unlocked) return; currentPhase = number; begin(number); }); map.append(button); }); }
function renderTopicExamples() { const subject = el('subject').value; const box = el('topic-examples'); if (!box) return; box.innerHTML = ''; const label = document.createElement('span'); const profile = schoolYearProfile(); const preposition = profile.stage === 'Médio' ? 'na' : 'no'; label.textContent = subject ? `Sugestões opcionais para ${subject} ${preposition} ${profile.short}:` : 'Escolha uma matéria para ver sugestões opcionais.'; box.append(label); const suggestions = gradeContent.suggestions(subject, schoolYear, subjectExamples[subject]); suggestions.forEach((topic) => { const button = document.createElement('button'); button.type = 'button'; button.className = 'topic-chip'; button.textContent = topic; button.addEventListener('click', () => { el('topic').value = topic; renderPhaseMap(); updateTopicHint(); }); box.append(button); }); updateTopicHint(); }
function updateTopicHint() {
  const hint = el('topic-auto-hint');
  if (!hint) return;
  const subject = el('subject')?.value || 'Matemática';
  const rawTopic = el('topic')?.value || '';
  hint.textContent = rawTopic.trim() ? `Tema selecionado: ${rawTopic.trim()}.` : `Sem assunto específico: usaremos ${defaultTopicFor(subject, schoolYear).toLocaleLowerCase('pt-BR')}.`;
}

function numericQuestion(text, result, explanation) {
  const offsets = shuffle([-10, -5, -3, -2, -1, 1, 2, 3, 5, 10]);
  const answers = unique([result, ...offsets.map((number) => result + number).filter((number) => number >= 0)]).slice(0, 5);
  while (answers.length < 5) answers.push(result + answers.length + 6);
  const options = shuffle(answers.map(String));
  return { q: text, a: options, correct: options.indexOf(String(result)), note: explanation };
}
function mathQuestions(topic, phase = 1) {
  const questions = [], context = contextFor(topic), intro = context.start;
  const phaseDifficulty = phase === 1 ? difficulty : phase === 2 ? 'Médio' : 'Difícil';
  for (let index = 0; index < 10; index++) {
    let a, b, c, total;
    if (phase === 4) {
      if (index % 3 === 0) { a = random(6, 14); b = random(5, 12); c = random(10, 25); total = a * b + c; questions.push(numericQuestion(`${intro} um grupo recebeu ${a} caixas com ${b} itens cada e ganhou mais ${c} itens extras. Quantos itens foram recebidos ao todo?`, total, `Primeiro calculamos os itens nas caixas: ${a} × ${b} = ${a * b}. Depois somamos os extras: ${a * b} + ${c} = ${total}.`)); continue; }
      if (index % 3 === 1) { a = random(18, 36) * 10; b = random(10, 30); c = random(5, 20); total = a * (100 - b) / 100 + c; questions.push(numericQuestion(`${intro} um kit custa R$ ${a}. Ele recebeu ${b}% de desconto e depois foi acrescentada uma taxa fixa de R$ ${c}. Qual é o valor final?`, total, `Após o desconto, o kit vale R$ ${a * (100 - b) / 100}. Somando a taxa de R$ ${c}, chegamos a R$ ${total}.`)); continue; }
      a = random(8, 18); b = random(3, 9); c = random(2, 6); total = (a + b) * c; questions.push(numericQuestion(`${intro} para cada uma de ${c} equipes foram separados ${a} cartões e mais ${b} cartões de bônus. Quantos cartões foram separados no total?`, total, `Cada equipe recebe ${a} + ${b} = ${a + b} cartões. Para ${c} equipes: ${a + b} × ${c} = ${total}.`)); continue;
    }
    if (phaseDifficulty === 'Fácil') {
      if (index % 3 === 0) { a = random(8, 45); b = random(5, 35); total = a + b; questions.push(numericQuestion(`${intro} havia ${a} estrelas e chegaram mais ${b}. Quantas estrelas há agora?`, total, `Somando ${a} e ${b}, temos ${total}.`)); }
      else if (index % 3 === 1) { a = random(20, 70); b = random(4, Math.min(19, a - 1)); total = a - b; questions.push(numericQuestion(`${intro} havia ${a} pontos. Depois de usar ${b}, quantos pontos sobraram?`, total, `Tirando ${b} de ${a}, restam ${total}.`)); }
      else { a = random(2, 9); b = random(2, 10); total = a * b; questions.push(numericQuestion(`${intro} existem ${a} grupos com ${b} itens em cada grupo. Quantos itens são?`, total, `${a} grupos de ${b} formam ${total}.`)); }
    } else if (phaseDifficulty === 'Médio') {
      if (index % 3 === 0) { a = random(25, 80); b = random(3, 9); total = a * b; questions.push(numericQuestion(`${intro} cada fase vale ${a} pontos. Em ${b} fases, quantos pontos são?`, total, `${a} × ${b} = ${total}.`)); }
      else if (index % 3 === 1) { b = random(3, 12); total = random(6, 18); a = b * total; questions.push(numericQuestion(`${intro} ${a} itens serão divididos igualmente entre ${b} crianças. Quantos itens para cada uma?`, total, `${a} ÷ ${b} = ${total}.`)); }
      else { a = random(2, 8) * 10; b = random(2, 8) * 5; total = a * b / 100; questions.push(numericQuestion(`${intro} um prêmio vale ${b} pontos. Quanto é ${a}% desse valor?`, total, `${a}% de ${b} é (${a} × ${b}) ÷ 100 = ${total}.`)); }
    } else {
      if (index % 3 === 0) { a = random(7, 19); b = random(3, 11); c = random(2, 9); total = a + b * c; questions.push(numericQuestion(`${intro} calcule ${a} + ${b} × ${c}.`, total, `Primeiro fazemos a multiplicação: ${b} × ${c} = ${b * c}. Depois: ${a} + ${b * c} = ${total}.`)); }
      else if (index % 3 === 1) { a = random(12, 30); b = random(2, 8); c = random(4, 10); total = (a - b) * c; questions.push(numericQuestion(`${intro} calcule (${a} − ${b}) × ${c}.`, total, `Primeiro: ${a} − ${b} = ${a - b}. Depois: ${a - b} × ${c} = ${total}.`)); }
      else { a = random(12, 36) * 10; b = random(10, 30); total = a * (100 - b) / 100; questions.push(numericQuestion(`${intro} um item custa R$ ${a}. Com ${b}% de desconto, qual é o preço final?`, total, `O desconto é ${b}% de R$ ${a}. O preço final é R$ ${total}.`)); }
    }
  }
  return shuffle(questions);
}
function enemStyleMathQuestions(topic) {
  const questions = [], intro = contextFor(topic).start;
  let a = random(140, 260), b = random(10, 25), c = random(5, 20), total = a * (100 - b) / 100 + c;
  questions.push(numericQuestion(`${intro} uma pesquisa de preços mostrou um kit por R$ ${a}. Na campanha, ele recebeu ${b}% de desconto e uma taxa fixa de R$ ${c}. Qual foi o valor final?`, total, `Depois do desconto, o kit custa R$ ${a * (100 - b) / 100}; com a taxa, o total é R$ ${total}.`));
  a = random(8, 16); b = random(3, 7); c = random(20, 35); total = a * b + c;
  questions.push(numericQuestion(`Uma escola instalou ${a} pontos de coleta; cada um recolhe ${b} kg por dia. Em uma ação especial, foram recolhidos mais ${c} kg. Qual foi o total do dia?`, total, `Os pontos recolhem ${a} × ${b} = ${a * b} kg. Somando ${c} kg, o total é ${total}.`));
  a = random(12, 20); b = random(4, 8); c = random(2, 5); total = (a * b) / c;
  questions.push(numericQuestion(`Uma rota tem ${a} km e será percorrida ${b} vezes por uma equipe. Se o percurso for dividido igualmente entre ${c} participantes, quantos km cada participante fará?`, total, `A distância total é ${a} × ${b} = ${a * b} km. Dividindo por ${c}, cada pessoa faz ${total} km.`));
  a = random(15, 24); b = random(10, 18); c = random(6, 14); total = (a + b + c) / 3;
  questions.push(numericQuestion(`Três medições de consumo foram ${a}, ${b} e ${c} unidades. Qual é a média dessas medições?`, total, `A média é (${a} + ${b} + ${c}) ÷ 3 = ${total}.`));
  a = random(24, 48); b = random(3, 6); total = a / b;
  questions.push(numericQuestion(`Em um mapa com escala simplificada, ${b} cm representam ${a} km. Quantos km representam 1 cm nesse mapa?`, total, `Basta dividir ${a} km por ${b} cm: ${a} ÷ ${b} = ${total}.`));
  a = random(12, 25); b = random(4, 10); total = 2 * (a + b);
  questions.push(numericQuestion(`Uma horta retangular mede ${a} m por ${b} m. Quantos metros de cerca são necessários para contornar todo o terreno?`, total, `O perímetro é 2 × (${a} + ${b}) = ${total} metros.`));
  a = random(30, 70); b = random(10, 30); total = a * (100 + b) / 100;
  questions.push(numericQuestion(`O número de visitantes de uma exposição era ${a}. Após uma divulgação, cresceu ${b}%. Quantos visitantes foram registrados?`, total, `O aumento é de ${b}% sobre ${a}; o novo valor é ${total}.`));
  a = random(6, 12); b = random(3, 8); c = random(5, 12); total = (a + b) * c;
  questions.push(numericQuestion(`Em cada uma de ${c} oficinas, há ${a} vagas para estudantes e ${b} para convidados. Quantas vagas existem ao todo?`, total, `Cada oficina possui ${a} + ${b} = ${a + b} vagas. Em ${c} oficinas, são ${total}.`));
  a = random(40, 90); b = random(5, 15); c = random(2, 4); total = a - b * c;
  questions.push(numericQuestion(`Um aplicativo registrou ${a} pontos. Em ${c} tentativas, perdeu ${b} pontos por tentativa. Com quantos pontos ficou?`, total, `A perda total é ${b} × ${c} = ${b * c}. Portanto, ${a} − ${b * c} = ${total}.`));
  a = random(9, 15); b = random(2, 6); c = random(3, 8); total = a * b + c * b;
  questions.push(numericQuestion(`Uma campanha distribui ${a} materiais e ${c} adesivos para cada um de ${b} grupos. Quantos itens serão distribuídos no total?`, total, `Cada grupo recebe ${a} + ${c} = ${a + c} itens. Em ${b} grupos: ${a + c} × ${b} = ${total}.`));
  return shuffle(questions);
}
const publishedEnemAdaptations = [
  { q: 'Em uma alimentação composta apenas por arroz e feijão, 100 g de arroz fornecem 1,5 mg de ferro e 2 mg de zinco; 100 g de feijão fornecem 7 mg de ferro e 3 mg de zinco. Para atingir 12,25 mg de ferro e 10 mg de zinco, quais quantidades devem ser consumidas?', a: ['58 g de arroz e 456 g de feijão', '200 g de arroz e 200 g de feijão', '350 g de arroz e 100 g de feijão', '375 g de arroz e 500 g de feijão', '400 g de arroz e 89 g de feijão'], correct: 2, note: 'Se r e f representam porções de 100 g de arroz e feijão, o sistema é 1,5r + 7f = 12,25 e 2r + 3f = 10. A solução é r = 3,5 e f = 1.', source: { label: 'Adaptada do Enem 2010, 2º dia, caderno amarelo, questão 171', url: 'https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos' } },
  { q: 'Um professor pode escolher 3 de 4 museus nacionais e 2 de 4 museus internacionais para uma viagem de pesquisa. Quantas seleções diferentes ele pode fazer?', a: ['6', '8', '20', '24', '36'], correct: 3, note: 'Há 4 maneiras de escolher 3 entre 4 museus nacionais e 6 maneiras de escolher 2 entre 4 internacionais. Pelo princípio multiplicativo: 4 × 6 = 24.', source: { label: 'Adaptada do Enem 2010, 2º dia, caderno amarelo, questão 175', url: 'https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos' } },
  { q: 'Para 40 minutos, o estacionamento Verde cobra R$ 5. O Amarelo cobra R$ 6 por até 4 h; o Preto cobra R$ 7 por até 3 h. Para 6 h, Amarelo cobra R$ 11 e Preto R$ 10. Quais são as opções mais econômicas para 40 min e para 6 h?', a: ['Verde e Preto', 'Verde e Amarelo', 'Amarelo e Amarelo', 'Preto e Preto', 'Verde e Verde'], correct: 0, note: 'Em 40 minutos, Verde custa R$ 5. Em 6 horas, Preto custa R$ 10 e Amarelo R$ 11. Portanto, Verde e Preto são as escolhas econômicas.', source: { label: 'Adaptada do Enem 2010, 2º dia, caderno amarelo, questão 176', url: 'https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos' } },
  { q: 'Um estádio de 68 000 lugares está com 95% de ocupação. Desses presentes, 487 não pagaram ingresso de US$ 150. Qual expressão representa corretamente a arrecadação?', a: ['0,95 × 68 000 × 150 − 487', '0,95 × (68 000 − 487) × 150', '(0,95 × 68 000 − 487) × 150', '95 × (68 000 − 487) × 150', '(95 × 68 000 − 487) × 150'], correct: 2, note: 'Primeiro calculamos o público presente: 0,95 × 68 000. Depois retiramos os 487 não pagantes. Apenas então multiplicamos pelo preço do ingresso.', source: { label: 'Adaptada do Enem 2010, 2º dia, caderno amarelo, questão 178', url: 'https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos' } }
];

const realEnem2010MathQuestions = [
  { q: 'Enem 2010, 2º dia, questão 169. No salto triplo, do segundo para o primeiro salto o alcance diminui 1,2 m e do terceiro para o segundo diminui 1,5 m. Para totalizar 17,4 m, a distância do primeiro salto deve estar entre:', a: ['4,0 m e 5,0 m.', '5,0 m e 6,0 m.', '6,0 m e 7,0 m.', '7,0 m e 8,0 m.', '8,0 m e 9,0 m.'], correct: 3, skill: 'Modelar uma situação com equação', note: 'Questão real do Enem 2010. Se o primeiro salto é x, os demais são x − 1,2 e x − 2,7. Logo, 3x − 3,9 = 17,4; x = 7,1 m.', source: { label: 'Fonte oficial: Enem 2010 · 2º dia · Caderno Amarelo · questão 169', url: 'https://download.inep.gov.br/educacao_basica/enem/provas/2010/dia2_caderno5_amarelo_com_gab.pdf' } },
  { q: 'Enem 2010, 2º dia, questão 170. Em um tratamento tradicional, 40% dos pacientes foram curados. Os demais foram divididos igualmente entre dois novos tratamentos, com taxas de cura de 35% e 45%. Em relação ao total inicial, os tratamentos inovadores proporcionaram cura de:', a: ['16%.', '24%.', '32%.', '48%.', '64%.'], correct: 1, skill: 'Calcular porcentagens sucessivas', note: 'Questão real do Enem 2010. Restam 60% dos pacientes; cada tratamento recebe 30%. As curas são 35% de 30% mais 45% de 30%, totalizando 24%.', source: { label: 'Fonte oficial: Enem 2010 · 2º dia · Caderno Amarelo · questão 170', url: 'https://download.inep.gov.br/educacao_basica/enem/provas/2010/dia2_caderno5_amarelo_com_gab.pdf' } },
  { q: 'Enem 2010, 2º dia, questão 171. Marco obteve 14, 15 e 16; Paulo, 8, 19 e 18. Ambos tiveram média 15. O desvio padrão de Marco foi 0,32 e o de Paulo, 4,97. Pelo critério de maior regularidade, quem ficou melhor classificado?', a: ['Marco, pois média e mediana são iguais.', 'Marco, pois obteve menor desvio padrão.', 'Paulo, pela nota 19 em Português.', 'Paulo, por ter maior mediana.', 'Paulo, por ter maior desvio padrão.'], correct: 1, skill: 'Interpretar medidas de dispersão', note: 'Questão real do Enem 2010. Menor desvio padrão significa resultados menos dispersos e, portanto, mais regulares. Marco tem desvio padrão 0,32.', source: { label: 'Fonte oficial: Enem 2010 · 2º dia · Caderno Amarelo · questão 171', url: 'https://download.inep.gov.br/educacao_basica/enem/provas/2010/dia2_caderno5_amarelo_com_gab.pdf' } },
  { q: 'Enem 2010, 2º dia, questão 172. Em 2006, a produção mundial de etanol foi 40 bilhões de litros. Brasil produziu 43% e os EUA, 45%. Em 2009, os EUA produzirão metade do que produziram em 2006. Para Brasil e EUA somarem 88% da produção mundial, qual deve ser aproximadamente o aumento percentual da produção brasileira?', a: ['22,5%.', '50,0%.', '52,3%.', '65,5%.', '77,5%.'], correct: 2, skill: 'Resolver problema de porcentagem', note: 'Questão real do Enem 2010. Em 2006, Brasil produziu 17,2 e EUA 18 bilhões. Em 2009, os EUA produzem 9; para atingir 35,2, o Brasil deve produzir 26,2. O acréscimo de 9 sobre 17,2 é cerca de 52,3%.', source: { label: 'Fonte oficial: Enem 2010 · 2º dia · Caderno Amarelo · questão 172', url: 'https://download.inep.gov.br/educacao_basica/enem/provas/2010/dia2_caderno5_amarelo_com_gab.pdf' } },
  { q: 'Enem 2010, 2º dia, questão 173. Em uma pesquisa, os tamanhos 35, 36, 37, 38 e 39 foram usados por, respectivamente, 6, 5, 3, 10 e 1 funcionárias. Escolhida uma funcionária que usa calçado maior que 36, a probabilidade de ela usar 38 é:', a: ['1/3.', '1/5.', '2/5.', '5/7.', '5/14.'], correct: 3, skill: 'Calcular probabilidade condicional', note: 'Questão real do Enem 2010. Condicionando a tamanhos acima de 36, há 3 + 10 + 1 = 14 funcionárias. Dez usam 38, então a probabilidade é 10/14 = 5/7.', source: { label: 'Fonte oficial: Enem 2010 · 2º dia · Caderno Amarelo · questão 173', url: 'https://download.inep.gov.br/educacao_basica/enem/provas/2010/dia2_caderno5_amarelo_com_gab.pdf' } },
  { q: 'Enem 2010, 2º dia, questão 174. João sai da cidade A, visita cinco cidades e retorna a A. Há 5! sequências possíveis, mas cada trajeto e seu trajeto simétrico têm o mesmo custo. Se ele gasta 1 min 30 s para examinar uma sequência e descartar a simétrica, qual é o tempo mínimo para examinar todos os casos necessários?', a: ['60 min.', '90 min.', '120 min.', '180 min.', '360 min.'], correct: 1, skill: 'Resolver contagem com simetria', note: 'Questão real do Enem 2010. Há 5! = 120 ordens. Como cada par simétrico tem o mesmo custo, bastam 60 análises. Cada uma dura 1,5 minuto: 60 × 1,5 = 90 minutos.', source: { label: 'Fonte oficial: Enem 2010 · 2º dia · Caderno Amarelo · questão 174', url: 'https://download.inep.gov.br/educacao_basica/enem/provas/2010/dia2_caderno5_amarelo_com_gab.pdf' } },
  { q: 'Enem 2010, 2º dia, questão 175. Um time marcou 0, 1, 2, 3, 4, 5 e 7 gols em 5, 3, 4, 3, 2, 2 e 1 partidas, respectivamente. Se X é a média, Y a mediana e Z a moda, então:', a: ['X = Y < Z.', 'Z < X = Y.', 'Y < Z < X.', 'Z < X < Y.', 'Z < Y < X.'], correct: 4, skill: 'Comparar média, mediana e moda', note: 'Questão real do Enem 2010. A moda é 0, pois aparece 5 vezes; a mediana é 2; a média é maior que 2. Portanto, Z < Y < X.', source: { label: 'Fonte oficial: Enem 2010 · 2º dia · Caderno Amarelo · questão 175', url: 'https://download.inep.gov.br/educacao_basica/enem/provas/2010/dia2_caderno5_amarelo_com_gab.pdf' } },
  { q: 'Enem 2010, 2º dia, questão 176. Dentro de Netuno cabem 58 Terras e dentro de Júpiter cabem 23 Netunos. Seguindo esse raciocínio, quantas Terras cabem dentro de Júpiter?', a: ['406.', '1 334.', '4 002.', '9 338.', '28 014.'], correct: 1, skill: 'Interpretar relações multiplicativas', note: 'Questão real do Enem 2010. Como um Júpiter comporta 23 Netunos e cada Netuno comporta 58 Terras, calculamos 23 × 58 = 1 334.', source: { label: 'Fonte oficial: Enem 2010 · 2º dia · Caderno Amarelo · questão 176', url: 'https://download.inep.gov.br/educacao_basica/enem/provas/2010/dia2_caderno5_amarelo_com_gab.pdf' } },
  { q: 'Enem 2010, 2º dia, questão 177. Cada 10 litros de óleo descartado em encanamentos pode contaminar 10⁷ litros de água potável. Se uma cidade descarta 1 000 litros de óleo por semana, quantos litros de água potável podem ser contaminados?', a: ['10⁻².', '10³.', '10⁴.', '10⁶.', '10⁹.'], correct: 4, skill: 'Operar com potências de dez', note: 'Questão real do Enem 2010. Mil litros correspondem a 100 grupos de 10 litros. Assim, 100 × 10⁷ = 10² × 10⁷ = 10⁹ litros.', source: { label: 'Fonte oficial: Enem 2010 · 2º dia · Caderno Amarelo · questão 177', url: 'https://download.inep.gov.br/educacao_basica/enem/provas/2010/dia2_caderno5_amarelo_com_gab.pdf' } },
  { q: 'Enem 2010, 2º dia, questão 178. Em uma sequência de linhas, os números são 1; depois 1, 2, 1; depois 1, 2, 3, 2, 1; e assim por diante. A soma dos números de cada linha segue uma regularidade. Qual é a soma da 9ª linha?', a: ['9.', '45.', '64.', '81.', '285.'], correct: 3, skill: 'Reconhecer padrão numérico', note: 'Questão real do Enem 2010. As somas das linhas são 1, 4, 9, 16, ...; isto é, quadrados perfeitos. A 9ª linha soma 9² = 81.', source: { label: 'Fonte oficial: Enem 2010 · 2º dia · Caderno Amarelo · questão 178', url: 'https://download.inep.gov.br/educacao_basica/enem/provas/2010/dia2_caderno5_amarelo_com_gab.pdf' } }
];

const officialEnem2010Source = (day, number) => ({ label: `Fonte oficial: Enem 2010 · ${day}º dia · Caderno Amarelo · questão ${number}`, url: `https://download.inep.gov.br/educacao_basica/enem/provas/2010/dia${day}_caderno${day === 1 ? 2 : 5}_amarelo_com_gab.pdf` });
const officialEnemItem = (day, number, q, a, correct, skill, note) => ({ q, a, correct, skill, note, source: officialEnem2010Source(day, number) });
const realEnem2010SubjectQuestions = {
  Português: [
    officialEnemItem(2, 106, 'O folclore é retrato da cultura de um povo. Considerando a tradição, qual alternativa NÃO representa uma dança folclórica brasileira?', ['Bumba-meu-boi.', 'Quadrilha das festas juninas.', 'Congado.', 'Balé.', 'Carnaval.'], 3, 'Reconhecer manifestações culturais', 'O balé utiliza música, bailarinos e profissionais para contar uma história em espetáculo, mas não é uma manifestação folclórica brasileira.'),
    officialEnemItem(2, 107, 'No verso “Cuiçá gemeu, será que era meu, quando ela passou por mim?”, a palavra “corasamborim” une “coração”, “samba” e “tamborim”. Esse recurso corresponde a:', ['estrangeirismo.', 'neologismo.', 'gíria.', 'regionalismo.', 'termo técnico.'], 1, 'Analisar formação de palavras', 'A criação de uma palavra nova pelos recursos do sistema da língua caracteriza um neologismo.'),
    officialEnemItem(2, 109, 'O chat proporciona diálogos instantâneos e interativos. Essa forma de comunicação ocorre porque:', ['possibilita diálogo sem exposição da identidade real, com uso de apelidos fictícios.', 'disponibiliza salas com assuntos pré-selecionados por autoridades.', 'seleciona conteúdos adequados à faixa etária.', 'garante a gravação das conversas.', 'limita participantes conectados.'], 0, 'Interpretar textos sobre comunicação digital', 'O texto destaca o uso de apelidos e a comunicação em tempo real, sem exigir a identidade real.'),
    officialEnemItem(2, 112, 'A notícia relata a operação do Ibama contra pesca ilegal, descrevendo redes incineradas e peixes apreendidos. Do ponto de vista de seus elementos constitutivos, a notícia:', ['apresenta argumentos contrários à pesca ilegal.', 'tem título que resume o texto.', 'informa uma ação, a finalidade e o resultado dessa ação.', 'dirige-se aos órgãos governamentais.', 'incentiva movimentos sociais.'], 2, 'Reconhecer estrutura do gênero notícia', 'A notícia apresenta o acontecimento, sua finalidade de preservação e os resultados da operação.'),
    officialEnemItem(2, 113, 'O texto apresenta dados da vida de Machado de Assis em ordem objetiva. Considerando os gêneros textuais, ele constitui uma:', ['narrativa ficcional.', 'representação generalizada de uma sociedade.', 'explicação argumentativa.', 'questão controversa sobre personalidade histórica.', 'apresentação da vida de uma personalidade, organizada por narração objetiva.'], 4, 'Identificar gêneros textuais', 'O texto é uma biografia breve: apresenta fatos da vida de uma personalidade com linguagem objetiva.')
  ],
  História: [
    officialEnemItem(1, 8, 'A transformação de matérias-primas em produtos passou por artesanato, manufatura e maquinofatura. No artesanato, o trabalhador:', ['seguia o ritmo das máquinas.', 'trabalhava geralmente sem máquinas e de modo diferente da produção em série.', 'usava fontes de energia abundantes para máquinas.', 'executava apenas parte do produto como assalariado.', 'era dirigido por técnicos e gerentes.'], 1, 'Compreender formas históricas de produção', 'No artesanato, o trabalho era predominantemente manual e o produtor não estava submetido à produção em série.'),
    officialEnemItem(1, 10, 'Os empreendimentos ferroviários, madeireiros e de colonização no Contestado geraram impactos sociais que contribuíram para a guerra. Entre eles estava:', ['a absorção dos trabalhadores rurais pelas serrarias.', 'o desemprego causado por máquinas.', 'a desorganização da economia tradicional dos posseiros e trabalhadores rurais.', 'a diminuição do poder dos coronéis.', 'o crescimento de conflitos entre operários e proprietários.'], 2, 'Analisar conflitos sociais no Brasil republicano', 'A expansão capitalista desorganizou a economia tradicional de posseiros e trabalhadores da região.'),
    officialEnemItem(1, 12, 'No início da Revolução Industrial inglesa, as novas fábricas e altos-fornos revelavam:', ['facilidade de estabelecer relações lucrativas.', 'métodos de planejamento urbano.', 'núcleos urbanos integrados por transporte.', 'grandiosidade arquitetônica das fábricas.', 'alto nível de exploração dos trabalhadores em aglomerados urbanos precários.'], 4, 'Relacionar industrialização e condições de trabalho', 'O texto associa o avanço industrial à exploração e às péssimas condições de moradia, saúde e higiene.'),
    officialEnemItem(1, 13, 'No contexto do Tratado de Petrópolis, o Acre tornou-se brasileiro devido:', ['à indenização paga pelo Brasil por sua anexação.', 'ao auxílio do Bolivian Syndicate aos emigrantes.', 'à crescente migração de brasileiros que exploravam seringais.', 'à presença de imigrantes estrangeiros.', 'à indenização paga por emigrantes brasileiros.'], 2, 'Analisar formação territorial brasileira', 'O fluxo de brasileiros ligados à borracha foi um fator central do conflito resolvido pelo Tratado de Petrópolis.'),
    officialEnemItem(1, 17, 'Entre as tradições dos povos Tupi-guarani, destacava-se:', ['aldeias politicamente independentes dirigidas por chefe eleito.', 'ritualização da guerra entre tribos e caráter semissedentário.', 'conquista de terras por operações militares.', 'economia pastoril sem agricultura.', 'desprezo por rituais antropofágicos.'], 1, 'Reconhecer sociedades indígenas no Brasil', 'O item relaciona as tradições tupi-guarani à guerra ritualizada e à organização social semissedentária.')
  ],
  Geografia: [
    officialEnemItem(1, 1, 'A técnica transformou também o mundo rural brasileiro. Uma consequência socioespacial desse processo é:', ['redução da concentração de terras.', 'aumento do aproveitamento de solos menos férteis.', 'ampliação do isolamento rural.', 'estagnação da fronteira agrícola.', 'diminuição do emprego formal.'], 1, 'Analisar modernização do espaço rural', 'A tecnificação permite ampliar a produção em áreas antes menos aproveitadas, inclusive solos menos férteis.'),
    officialEnemItem(1, 2, 'O gráfico sobre imóveis rurais brasileiros evidencia qual característica da estrutura fundiária?', ['Concentração de terras nas mãos de poucos.', 'Existência de poucas terras agricultáveis.', 'Domínio territorial dos minifúndios.', 'Primazia da agricultura familiar.', 'Debilidade dos plantations modernos.'], 0, 'Interpretar dados sobre estrutura fundiária', 'A maior parcela da área está associada a poucos imóveis grandes, indicando concentração fundiária.'),
    officialEnemItem(1, 3, 'A migração de trabalhadores rurais de Vila Maria para Primavera do Leste retrata fenômeno decorrente:', ['dos impactos sociais da modernização da agricultura.', 'da recomposição salarial rural.', 'da exigência de qualificação.', 'da diminuição da importância da agricultura.', 'da desvalorização das áreas rurais.'], 0, 'Relacionar migração e modernização agrícola', 'A modernização altera empregos e relações no campo, favorecendo deslocamentos de trabalhadores.'),
    officialEnemItem(1, 5, 'Processos erosivos nas encostas provocam reflexos nas áreas urbanas de baixada. Um exemplo é:', ['maior ocorrência de enchentes, pois rios assoreados comportam menos água.', 'contaminação da população por sedimentos.', 'desgaste urbano causado por redução do escoamento.', 'maior facilidade de captar água potável.', 'aumento de amebíase pelo escoamento.'], 0, 'Relacionar erosão e dinâmica urbana', 'O assoreamento diminui a capacidade dos rios e aumenta o risco de enchentes.'),
    officialEnemItem(1, 6, 'Em um processo erosivo em encosta, qual prática agrícola pode acelerá-lo?', ['Plantio direto.', 'Associação de culturas.', 'Curvas de nível.', 'Aração do topo ao vale.', 'Terraceamento.'], 3, 'Avaliar conservação do solo', 'Arar no sentido da declividade favorece o escoamento da água e intensifica a erosão.'),
    officialEnemItem(1, 7, 'Latitude e longitude são coordenadas geográficas porque formam:', ['uma relação entre distância do mapa e distância real.', 'paralelos verticais e meridianos horizontais.', 'linhas imaginárias que permitem localizar um ponto na superfície terrestre.', 'distância entre ponto e Greenwich/Equador.', 'forma de projeção cartográfica.'], 2, 'Interpretar coordenadas geográficas', 'Paralelos e meridianos são linhas imaginárias usadas para localizar pontos na superfície terrestre.')
  ],
  Biologia: [
    officialEnemItem(1, 59, 'O despejo de esgotos ricos em nutrientes pode causar eutrofização e escassez de oxigênio. Uma forma de evitar a diminuição de O₂ é:', ['aquecer as águas.', 'retirar do esgoto materiais ricos em nutrientes.', 'adicionar bactérias anaeróbicas.', 'substituir produtos não degradáveis.', 'aumentar a solubilidade dos dejetos.'], 1, 'Analisar impactos da eutrofização', 'Reduzir nutrientes no esgoto limita o crescimento excessivo de microrganismos e a queda de oxigênio.'),
    officialEnemItem(1, 61, 'O vazamento de petróleo na Baía de Guanabara afetou cadeia alimentar, trocas gasosas, fotossíntese e fauna. Essa situação ilustra:', ['independência humana do ambiente marinho.', 'necessidade de controle do efeito estufa.', 'interdependência entre formas de vida e habitat.', 'alta resistência do meio ambiente.', 'grande capacidade de adaptação animal.'], 2, 'Compreender relações ecológicas', 'A poluição afeta organismos, processos ecológicos e o habitat, evidenciando sua interdependência.'),
    officialEnemItem(1, 64, 'Pela teoria de Lamarck, a ausência de olhos em animais subterrâneos teria sido causada:', ['pela seleção natural.', 'pela falta de uso dos olhos, segundo a lei do uso e desuso.', 'por característica transmitida só à primeira geração.', 'por incorporação direta ao patrimônio genético.', 'por mutações selecionadas ao longo do tempo.'], 1, 'Diferenciar teorias evolutivas', 'Lamarck explicava a mudança pelo uso e desuso dos órgãos e pela herança de características adquiridas.'),
    officialEnemItem(1, 66, 'As microvilosidades intestinais aumentam a absorção de nutrientes porque sua função é:', ['manter o volume de absorção.', 'aumentar a superfície de absorção.', 'diminuir a velocidade de absorção.', 'aumentar o tempo de absorção.', 'manter a seletividade.'], 1, 'Relacionar estrutura celular e função', 'Dobras e microvilosidades ampliam a área de contato, favorecendo a absorção.'),
    officialEnemItem(1, 69, 'Bactérias podem sobreviver em ambientes aeróbicos e anaeróbicos. Essa capacidade está relacionada principalmente ao:', ['poder de adaptação por mudanças ambientais.', 'aumento de mutações.', 'diversidade morfológica.', 'alto poder de reprodução e nutrição heterotrófica.', 'alto poder de reprodução e diversidade metabólica.'], 4, 'Reconhecer diversidade metabólica', 'A diversidade de processos metabólicos permite a sobrevivência em condições com ou sem oxigênio.')
  ],
  Física: [
    officialEnemItem(1, 58, 'Ao puxar o êmbolo de uma seringa com água em ebulição, a água volta a ferver porque o deslocamento:', ['permite entrada de calor externo.', 'aquece por atrito.', 'aumenta o volume e o ponto de ebulição.', 'diminui a pressão interna e o ponto de ebulição.', 'diminui a densidade da água.'], 3, 'Relacionar pressão e mudança de estado', 'A diminuição da pressão reduz a temperatura de ebulição, permitindo que a água ferva novamente.'),
    officialEnemItem(1, 60, 'A fonte de energia geotérmica representada na figura é gerada principalmente:', ['pela circulação do magma no subsolo.', 'por erupções constantes de vulcões.', 'pelo sol agindo sobre águas.', 'pela queima de carvão.', 'por detritos e cinzas vulcânicas.'], 0, 'Identificar fontes de energia', 'A energia geotérmica aproveita o calor interno da Terra associado ao magma e às rochas quentes.'),
    officialEnemItem(1, 65, 'A célula a combustível hidrogênio/oxigênio produz energia elétrica. O processo:', ['transforma energia química em elétrica e forma água como principal subproduto.', 'converte energia química em térmica.', 'emite os mesmos gases de combustíveis fósseis.', 'retém gases poluentes.', 'converte energia potencial da água.'], 0, 'Relacionar transformações de energia', 'Na célula a combustível, a reação entre hidrogênio e oxigênio gera eletricidade e água.'),
    officialEnemItem(1, 58, 'Em pressão menor, o ponto de ebulição da água:', ['aumenta sempre.', 'não se altera.', 'depende apenas do volume.', 'diminui.', 'impede a vaporização.'], 3, 'Relacionar pressão e ebulição', 'A questão 58 mostra experimentalmente que reduzir a pressão permite ebulição em temperatura menor.'),
    officialEnemItem(1, 60, 'A energia geotérmica é considerada renovável por aproveitar:', ['o calor do interior da Terra.', 'a combustão do petróleo.', 'a radiação ultravioleta.', 'cinzas vulcânicas como combustível.', 'o vento da superfície.'], 0, 'Identificar fontes renováveis', 'A fonte aproveita calor subterrâneo, não combustíveis fósseis.')
  ],
  Química: [
    officialEnemItem(1, 63, 'Em medicamentos efervescentes, as etapas de ionização, dissociação iônica, formação de ácido e liberação de CO₂ ocorrem, respectivamente, em:', ['I, IV, I, II e III.', 'I, IV, III e II.', 'IV, III, II e II.', 'I, IV, II e III.', 'IV, I, III e II.'], 4, 'Interpretar transformações químicas', 'O gabarito oficial indica a sequência IV, I, III e II para as etapas descritas.'),
    officialEnemItem(1, 67, 'A energia solar pode ser armazenada em reação endotérmica e depois liberada. A reação CO(g) + 3H₂(g) + calor → CH₄(g) + H₂O(g) é estratégia:', ['insatisfatória, pois não absorve energia.', 'insatisfatória, por formar gases poluentes.', 'insatisfatória, por formar CO₂.', 'satisfatória, pois absorve calor e forma combustíveis que podem ser usados depois.', 'satisfatória, pois libera calor diretamente.'], 3, 'Analisar termoquímica e armazenamento de energia', 'A reação absorve energia solar e forma substâncias combustíveis para uso posterior.'),
    officialEnemItem(1, 68, 'A demanda bioquímica de oxigênio (DBO) aumenta em 1 mol de O₂ para cada mol de CH₂O. Para 10 mg de açúcar, qual é o aumento da DBO?', ['0,4 mg de O₂/L.', '1,7 mg de O₂/L.', '2,7 mg de O₂/L.', '9,4 mg de O₂/L.', '10,7 mg de O₂/L.'], 4, 'Resolver estequiometria em contexto ambiental', 'Pela proporção de massas molares, 10 mg de CH₂O correspondem a aproximadamente 10,7 mg de O₂.'),
    officialEnemItem(1, 63, 'Na efervescência de medicamentos, a formação de CO₂ é um exemplo de:', ['transformação química com liberação de gás.', 'mudança apenas de estado físico.', 'fusão do medicamento.', 'separação de mistura por filtração.', 'dissolução sem reação.'], 0, 'Reconhecer evidências de reação química', 'A liberação de gás, associada às reações descritas no item 63, é evidência de transformação química.'),
    officialEnemItem(1, 67, 'Uma reação endotérmica para armazenamento solar deve:', ['absorver energia durante a formação dos produtos.', 'liberar energia imediatamente.', 'usar apenas combustíveis fósseis.', 'impedir qualquer reação posterior.', 'formar somente água.'], 0, 'Identificar processos endotérmicos', 'Em processos endotérmicos, o sistema absorve energia, que pode ser armazenada nos produtos.')
  ]
};
function questionTextForDisplay(text) {
  return String(text).replace(/^\s*Enem\s+20\d{2}\s*,\s*\d+º\s*dia\s*,\s*questão\s+\d+\s*[.:–—-]\s*/i, '').trim();
}
function legacyQuestionPoolFor(subject, yearCode = schoolYear) {
  const profile = schoolYearProfile(yearCode);
  const bank = profile.stage !== 'Médio'
    ? gradeContent.buildFundamentalRound(subject, yearCode)
    : subject === 'Matemática' ? realEnem2010MathQuestions : realEnem2010SubjectQuestions[subject] || [];
  const fingerprints = new Set();
  return bank.filter((item) => !/\bgráfico\b|representada na figura|etapas?\s+(?:I|II|III|IV)[^?]*respectivamente|ocorrem,\s*respectivamente,\s*em/i.test(item.q)).map((item) => ({
    ...item,
    q: questionTextForDisplay(item.q),
    a: [...item.a],
    origin: profile.stage === 'Médio' ? 'Enem' : 'BNCC',
    schoolYear: profile.code,
    source: item.source ? { ...item.source } : undefined
  })).filter((item) => {
    const identity = profile.stage === 'Médio' && item.source?.label ? item.source.label : `${item.q}|${item.a[item.correct]}`;
    const fingerprint = identity.normalize('NFKC').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ').trim();
    if (fingerprints.has(fingerprint)) return false;
    fingerprints.add(fingerprint);
    return true;
  });
}
async function freshRoundFor(subject, yearCode, route) {
  if (!questionEngine?.buildRound) throw new Error('O banco de questões não foi carregado.');
  state.questionSequences ||= {};
  state.seenQuestionIds ||= [];
  state.seenQuestionFingerprints ||= [];
  try {
    const latestStoredState = mergeState(JSON.parse(localStorage.getItem(storageKey)));
    state.seenQuestionIds = [...new Set([...state.seenQuestionIds, ...latestStoredState.seenQuestionIds])];
    state.seenQuestionFingerprints = [...new Set([...state.seenQuestionFingerprints, ...latestStoredState.seenQuestionFingerprints])];
    state.questionSequences = mergeQuestionSequences(state.questionSequences, latestStoredState.questionSequences);
  } catch { /* O estado em memória continua válido quando o armazenamento está indisponível. */ }
  if (activeSupabaseUser && supabaseClient) {
    const { data: latestProfile, error: latestProfileError } = await fetchCloudProfile(activeSupabaseUser);
    if (latestProfileError || !latestProfile) throw new Error('Não foi possível conferir seu histórico na nuvem antes desta rodada. Tente novamente quando a conexão estiver estável.');
    const latestCloudState = mergeState(latestProfile.app_state);
    state.seenQuestionIds = [...new Set([...state.seenQuestionIds, ...latestCloudState.seenQuestionIds])];
    state.seenQuestionFingerprints = [...new Set([...state.seenQuestionFingerprints, ...latestCloudState.seenQuestionFingerprints])];
    state.questionSequences = mergeQuestionSequences(state.questionSequences, latestCloudState.questionSequences);
    const { data: latestHistory, error: latestHistoryError } = await fetchQuestionHistory(activeSupabaseUser);
    if (latestHistoryError) throw new Error('Não foi possível conferir as questões já utilizadas. Tente novamente quando a conexão estiver estável.');
    mergeReservedQuestionHistory(latestHistory);
  }
  const scope = `${yearCode}|${subject}`;
  let cursor = Number(state.questionSequences[scope]) || 0;
  let result = null;
  const rejectedIds = new Set();
  const rejectedFingerprints = new Set();
  for (let attempt = 0; attempt < 100; attempt++) {
    result = questionEngine.buildRound({
      subject,
      schoolYear: yearCode,
      topic: route.topicKey === '__geral__' ? '' : route.topic,
      phase: currentPhase,
      difficulty,
      curriculum,
      count: 10,
      cursor,
      seenIds: [...state.seenQuestionIds, ...rejectedIds],
      seenFingerprints: [...state.seenQuestionFingerprints, ...rejectedFingerprints],
      seedQuestions: legacyQuestionPoolFor(subject, yearCode)
    });
    if (!result || result.questions?.length !== 10) break;
    if (!activeSupabaseUser || !supabaseClient) break;
    const reservation = await reserveQuestionBatch(result.questions, subject, yearCode);
    if (reservation.reserved) break;
    if (!reservation.conflict) {
      console.warn('Não foi possível reservar o lote de questões:', reservation.error?.message || reservation.error);
      throw new Error('Não foi possível reservar questões inéditas na nuvem. Verifique a conexão e tente novamente.');
    }
    result.questions.forEach((question) => {
      rejectedIds.add(question.id);
      rejectedFingerprints.add(questionEngine.fingerprint(question));
    });
    cursor = result.nextCursor;
    const { data: refreshedHistory, error: refreshedHistoryError } = await fetchQuestionHistory(activeSupabaseUser);
    if (refreshedHistoryError) throw new Error('Houve uma disputa entre dispositivos e não foi possível atualizar o histórico. Tente novamente.');
    mergeReservedQuestionHistory(refreshedHistory);
    result = null;
  }
  if (!result || result.questions?.length !== 10) throw new Error('Não foi possível montar dez questões inéditas para esta rodada.');
  state.questionSequences[scope] = result.nextCursor;
  state.seenQuestionIds = [...new Set([...state.seenQuestionIds, ...result.questions.map((question) => question.id)])];
  state.seenQuestionFingerprints = [...new Set([...state.seenQuestionFingerprints, ...result.questions.map((question) => questionEngine.fingerprint(question))])];
  saveState();
  if (activeSupabaseUser && supabaseClient) {
    clearTimeout(remoteSaveTimer);
    const synced = await syncStateToSupabase();
    if (!synced) throw new Error('Não foi possível confirmar o histórico na nuvem. As questões foram reservadas neste dispositivo; tente novamente quando a conexão estiver estável.');
  }
  return result.questions;
}

function updateLearningRail() {
  const count = Math.min(state.answeredToday || 0, 5);
  const weekly = state.weekly || { answered: 0, goal: 50 };
  const weeklyPercent = Math.min(100, Math.round((weekly.answered / Math.max(weekly.goal, 1)) * 100));
  const railStreak = el('rail-streak-days');
  if (railStreak) railStreak.textContent = `${state.streakDays || 1} dia${(state.streakDays || 1) === 1 ? '' : 's'}`;
  if (el('rail-mission-count')) el('rail-mission-count').textContent = `${count}/5`;
  if (el('rail-mission-progress')) el('rail-mission-progress').style.width = `${count * 20}%`;
  if (el('rail-mission-copy')) el('rail-mission-copy').textContent = count === 5 ? 'Missão concluída!' : 'Responda 5 questões';
  if (el('rail-weekly-value')) el('rail-weekly-value').textContent = weekly.answered;
  if (el('rail-weekly-progress')) el('rail-weekly-progress').style.width = `${weeklyPercent}%`;
  if (el('rail-weekly-copy')) el('rail-weekly-copy').textContent = weekly.answered >= weekly.goal ? 'Meta semanal concluída. Excelente trabalho!' : `Faltam ${Math.max(weekly.goal - weekly.answered, 0)} questões para sua meta.`;
  if (el('rail-review-count')) el('rail-review-count').textContent = dueReviews().length;
}
function updateMission() { normalizeDay(); normalizeWeek(); const count = Math.min(state.answeredToday, 5); el('mission-count').textContent = `${count}/5`; el('mission-progress').style.width = `${count * 20}%`; el('mission-copy').textContent = count === 5 ? 'Missão cumprida. Muito bem!' : 'Responda 5 questões hoje'; updateStudySnapshot(); updateLearningRail(); }
function learnerName() { return state.userName || 'Estudante'; }
function updateHome() {
  el('top-name').textContent = learnerName();
  if (el('avatar-name')) el('avatar-name').textContent = learnerName();
  el('streak-days').textContent = state.streakDays || 1;
  el('energy-count').textContent = state.energy ?? 5;
  el('gem-count').textContent = Math.floor(state.totalPoints / 100);
  renderAvatarSurfaces();
  updateLearningRail();
}
function updateStudySnapshot() { const theme = currentTheme(), weekly = state.weekly || { answered: 0, goal: 50 }, percent = Math.min(100, Math.round((weekly.answered / weekly.goal) * 100)); if (el('weekly-theme-title')) { el('weekly-theme-title').textContent = theme.title; el('weekly-theme-copy').textContent = theme.copy; el('weekly-goal-copy').textContent = `${weekly.answered}/${weekly.goal} questões`; el('weekly-goal-progress').style.width = `${percent}%`; } if (el('nav-review-badge')) { const due = dueReviews().length; el('nav-review-badge').hidden = due === 0; el('nav-review-badge').textContent = due > 9 ? '9+' : due; } }
function renderDashboard() {
  el('avatar-name').textContent = learnerName(); el('profile-name').textContent = learnerName(); el('profile-points').textContent = `${state.totalPoints} pontos acumulados`; renderAvatarSurfaces();
  const totals = Object.values(state.subjectStats).reduce((sum, stats) => ({ correct: sum.correct + stats.correct, total: sum.total + stats.total }), { correct: 0, total: 0 }); const accuracy = totals.total ? `${Math.round((totals.correct / totals.total) * 100)}%` : '—'; el('accuracy-stat').textContent = accuracy; el('due-review-stat').textContent = dueReviews().length; el('weekly-stat').textContent = state.weekly?.answered || 0; el('focus-goal-copy').textContent = `Meta atual: ${state.weekly?.goal || 50} questões nesta semana. Você já concluiu ${state.weekly?.answered || 0}.`;
  const rewards = el('rewards-list'); rewards.innerHTML = '';
  const completedPhases = completedAvatarPhases();
  const avatarRewards = ['outfit', 'accessory'].flatMap((category) => avatarStudio.catalog[category].filter((item) => item.unlock > 0).map((item) => ({
    icon: item.icon || '✦',
    title: item.name,
    description: `Complete ${item.unlock} fase${item.unlock === 1 ? '' : 's'} para liberar`,
    unlocked: item.unlock <= completedPhases,
    value: item.unlock <= completedPhases ? 'Liberado' : `${item.unlock} fases`
  })));
  [...medals.map((medal) => ({ icon: medal.icon, title: medal.title, description: medal.description, unlocked: state.medals.includes(medal.id), value: 'Medalha' })), ...avatarRewards].forEach((reward) => { const row = document.createElement('div'); row.className = `reward ${reward.unlocked ? '' : 'locked'}`; row.innerHTML = `<div class="reward-icon">${reward.icon}</div><div><strong>${reward.title}</strong><span>${reward.description}</span></div><b>${reward.value}</b>`; rewards.append(row); });
  const progress = el('subject-progress'); progress.innerHTML = ''; const subjects = Object.entries(state.subjectStats);
  if (!subjects.length) progress.innerHTML = '<div class="empty-review">Complete uma rodada para ver sua evolução.</div>';
  subjects.sort((a, b) => b[1].total - a[1].total).forEach(([subject, stats]) => { const percent = Math.round((stats.correct / stats.total) * 100); const row = document.createElement('div'); row.className = 'subject-row'; row.innerHTML = `<div><span>${subject}</span><span>${percent}% de acertos</span></div><i><b style="width:${percent}%"></b></i>`; progress.append(row); });
  const review = el('review-list'); review.innerHTML = ''; const topics = Object.entries(state.topicErrors).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]).slice(0, 4);
  if (!topics.length) review.innerHTML = '<div class="empty-review">Ainda não há erros registrados. Continue praticando!</div>';
  topics.forEach(([topic, mistakes]) => { const row = document.createElement('div'); row.className = 'review-item'; const label = document.createElement('span'); label.textContent = topic; const value = document.createElement('span'); value.textContent = `${mistakes} erro${mistakes > 1 ? 's' : ''}`; row.append(label, value); review.append(row); });
  renderPlan(); renderNotebook(); renderSavedQuestions(); renderTeacherMaterials();
  el('personal-ranking').textContent = state.rounds ? `Seu melhor resultado é ${state.bestScore} pontos em ${state.rounds} desafio${state.rounds > 1 ? 's' : ''}.` : 'Complete sua primeira rodada para criar seu recorde.';
}
function renderPlan() { const picker = el('week-picker'); picker.innerHTML = ''; ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].forEach((day, index) => { const button = document.createElement('button'); button.type = 'button'; button.className = `day-button ${state.plan.days.includes(String(index)) ? 'selected' : ''}`; button.textContent = day; button.addEventListener('click', () => { const key = String(index); state.plan.days = state.plan.days.includes(key) ? state.plan.days.filter((item) => item !== key) : [...state.plan.days, key]; saveState(); renderPlan(); }); picker.append(button); }); el('daily-minutes').value = state.plan.minutes; }
function renderNotebook() {
  const box = el('error-notebook'); box.innerHTML = '';
  const entries = state.notebook.slice(0, 4);
  if (!entries.length) { box.innerHTML = '<div class="empty-review">Seu caderno aparecerá aqui quando houver uma questão para revisar.</div>'; return; }
  entries.forEach((entry) => {
    const row = document.createElement('div'); row.className = 'notebook-entry';
    const title = document.createElement('span'); title.textContent = `${entry.subject || 'Matéria'}: ${topicForEntry(entry)} · ${schoolYearLabel(entry.schoolYear || '6EF')}`;
    const date = document.createElement('span'); date.textContent = entry.nextReview <= today() ? 'Revisar hoje' : `Revisar em ${entry.nextReview.split('-').reverse().slice(0, 2).join('/')}`;
    row.append(title, date); box.append(row);
  });
}
function renderSavedQuestions() {
  const box = el('saved-questions'); if (!box) return; box.innerHTML = '';
  const entries = state.savedQuestions.filter((item) => item.favorite || item.difficult).slice(0, 6);
  if (!entries.length) { box.innerHTML = '<div class="empty-review">Marque uma questão como favorita ou difícil durante o quiz para encontrá-la aqui.</div>'; return; }
  entries.forEach((entry) => {
    const row = document.createElement('article'); row.className = 'saved-entry';
    row.innerHTML = `<div class="saved-icon">${entry.favorite ? '♥' : '⚑'}</div><div><strong>${escapeHTML(entry.q)}</strong><small>${escapeHTML(entry.subject || 'Matéria')} · ${schoolYearLabel(entry.schoolYear || '6EF')} · ${escapeHTML(topicForEntry(entry))} · ${entry.difficult ? 'revisar com atenção' : 'favorita'}</small></div><button type="button" aria-label="Remover item salvo">×</button>`;
    row.querySelector('button').addEventListener('click', () => { state.savedQuestions = state.savedQuestions.filter((item) => item.key !== entry.key); saveState(); renderSavedQuestions(); updateStudySnapshot(); });
    box.append(row);
  });
}
function renderReviewScreen() {
  const due = dueReviews(); el('review-due-count').textContent = due.length;
  const queue = el('review-queue'); queue.innerHTML = '';
  const entries = [...due, ...state.notebook.filter((entry) => entry.nextReview > today())].slice(0, 10);
  if (!entries.length) queue.innerHTML = '<article class="review-item-card empty">Você está em dia. Continue praticando novos assuntos!</article>';
  entries.forEach((entry) => {
    const row = document.createElement('article'); row.className = 'review-item-card';
    const date = entry.nextReview <= today() ? 'HOJE' : entry.nextReview.split('-').reverse().slice(0, 2).join('/');
    row.innerHTML = `<div class="review-date">${date}</div><div><strong>${escapeHTML(entry.subject || 'Matéria')}: ${escapeHTML(topicForEntry(entry))}</strong><span>${entry.step === 2 ? 'Revisão final' : entry.step === 1 ? 'Segunda revisão' : 'Primeira revisão'}</span></div><button type="button">Praticar</button>`;
    row.querySelector('button').addEventListener('click', () => startReview(entry)); queue.append(row);
  });
  const saved = el('review-saved-list'); saved.innerHTML = '';
  const savedItems = state.savedQuestions.filter((item) => item.favorite || item.difficult).slice(0, 8);
  if (!savedItems.length) saved.innerHTML = '<article class="review-item-card empty">Seus favoritos e questões difíceis aparecerão aqui.</article>';
  savedItems.forEach((entry) => {
    const row = document.createElement('article'); row.className = 'review-item-card';
    row.innerHTML = `<div class="review-date">${entry.favorite ? '♥' : '⚑'}</div><div><strong>${escapeHTML(entry.subject || 'Matéria')}: ${escapeHTML(topicForEntry(entry))}</strong><span>${entry.difficult ? 'Questão marcada como difícil' : 'Questão favorita'}</span></div><button type="button">Treinar</button>`;
    row.querySelector('button').addEventListener('click', () => startReview(entry)); saved.append(row);
  });
  updateStudySnapshot();
}
function startReview(entry) { const queued = state.notebook.find((item) => item.key === entry.key); if (queued) { const intervals = [3, 7, 14]; queued.step = Math.min((queued.step || 0) + 1, 2); queued.nextReview = futureDate(intervals[queued.step] || 14); state.reviewCount++; saveState(); } if (entry.schoolYear) setSchoolYear(entry.schoolYear); el('subject').value = entry.subject || 'Matemática'; el('topic').value = entry.topic || ''; renderTopicExamples(); renderPhaseMap(); updateMission(); currentPhase = 1; begin(1); }
function renderTeacherMaterials() { const list = el('teacher-material-list'); list.innerHTML = ''; state.materials.forEach((material) => { const row = document.createElement('div'); row.className = 'material-entry'; const title = document.createElement('strong'); title.textContent = material.title; const note = document.createElement('span'); note.textContent = material.note; row.append(title, note); list.append(row); }); }
function showToast(messages) { if (!messages.length) return; const toast = el('achievement-toast'); toast.hidden = false; toast.innerHTML = `<strong>${messages[0].icon} ${messages[0].title}</strong>${messages[0].description}`; }
function checkAchievements() { const earned = []; medals.forEach((medal) => { if (medal.test(state) && !state.medals.includes(medal.id)) { state.medals.push(medal.id); earned.push(medal); } }); return earned; }
function recordAnswer(question, right) {
  normalizeDay(); normalizeWeek(); state.answeredToday++; state.weekly.answered++; state.totalPoints += right ? (difficulty === 'Difícil' ? 150 : difficulty === 'Médio' ? 120 : 100) : 0;
  if (state.lastStudyDay !== today()) { const yesterday = futureDate(-1); state.streakDays = state.lastStudyDay === yesterday ? (state.streakDays || 0) + 1 : 1; state.lastStudyDay = today(); }
  const subject = question.subject; state.subjectStats[subject] ||= { correct: 0, total: 0 }; state.subjectStats[subject].total++; if (right) state.subjectStats[subject].correct++;
  const yearKey = question.schoolYear || schoolYear; state.yearStats[yearKey] ||= { correct: 0, total: 0 }; state.yearStats[yearKey].total++; if (right) state.yearStats[yearKey].correct++;
  if (right) { roundStreak++; state.bestStreak = Math.max(state.bestStreak, roundStreak); } else { const topic = topicForEntry(question); state.energy = Math.max(0, (state.energy ?? 5) - 1); roundStreak = 0; state.topicErrors[topic] = (state.topicErrors[topic] || 0) + 1; scheduleReview(question); }
  const earned = checkAchievements(); saveState(); updateMission(); updateHome(); return earned;
}

document.querySelectorAll('.choice-row').forEach((group) => group.addEventListener('click', (event) => { const button = event.target.closest('.choice'); if (!button) return; group.querySelectorAll('.choice').forEach((item) => item.classList.remove('selected')); button.classList.add('selected'); if (group.id === 'difficulty') difficulty = button.dataset.value; else quizMode = button.dataset.value; }));
el('curriculum').addEventListener('change', (event) => { curriculum = event.target.value; el('curriculum-hint').textContent = curriculumDescriptions[curriculum]; renderPhaseMap(); });
el('subject').addEventListener('change', () => { renderTopicExamples(); renderPhaseMap(); });
el('school-year').addEventListener('change', (event) => setSchoolYear(event.target.value));
el('subject-school-year').addEventListener('change', (event) => setSchoolYear(event.target.value));
el('topic').addEventListener('input', () => { renderPhaseMap(); updateTopicHint(); });
const appScreenIds = new Set(['auth-screen', 'subject-screen', 'setup-screen', 'quiz-screen', 'result-screen', 'dashboard-screen', 'review-screen']);
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('a11y-calm');
function activeScreenId() { return document.querySelector('.screen.active')?.id || 'auth-screen'; }
function screenNavigationKey(id) {
  if (id === 'subject-screen') return 'subjects';
  if (id === 'setup-screen' || id === 'quiz-screen' || id === 'result-screen') return 'trail';
  if (id === 'review-screen') return 'review';
  if (id === 'dashboard-screen') return 'profile';
  return '';
}
function updateScreenHistory(id, mode = 'push', extra = {}) {
  if (!window.history?.replaceState) return;
  try {
    if (mode === 'reset') navigationSessionId = createNavigationSessionId();
    const currentState = window.history.state || {};
    const sameSession = currentState.estudaNavigationSession === navigationSessionId;
    const currentDepth = sameSession && Number.isFinite(currentState.estudaDepth) ? currentState.estudaDepth : 0;
    const nextDepth = mode === 'reset' ? 0 : mode === 'push' ? currentDepth + 1 : currentDepth;
    const nextState = { ...currentState, estudaScreen: id, estudaDepth: nextDepth, estudaNavigationSession: navigationSessionId, estudaUserId: activeSupabaseUser?.id || null, estudaModal: null, ...extra };
    window.history[mode === 'push' ? 'pushState' : 'replaceState'](nextState, document.title);
  } catch (error) { console.warn('Histórico de navegação indisponível:', error); }
}
function historyStateIsCurrent(historyState = window.history?.state) {
  return historyState?.estudaNavigationSession === navigationSessionId && (historyState?.estudaUserId || null) === (activeSupabaseUser?.id || null);
}
function resetViewport(id, focusHeading = true) {
  requestAnimationFrame(() => {
    const screen = el(id);
    if (!screen?.classList.contains('active')) return;
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    if (!focusHeading) return;
    const heading = [...screen.querySelectorAll('h1, h2')].find((item) => !item.closest('[hidden]'));
    if (!heading) return;
    if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  });
}
function show(id, options = {}) {
  if (!appScreenIds.has(id) || !el(id)) return;
  const previousId = activeScreenId();
  const historyMode = options.historyMode || (previousId === id ? 'replace' : 'push');
  const focusedElement = document.activeElement;
  if (focusedElement && !el(id).contains(focusedElement)) focusedElement.blur?.();
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('active'));
  el(id).classList.add('active');
  document.body.dataset.screen = id;
  const activeNavigation = screenNavigationKey(id);
  const nav = el('app-nav');
  if (nav) {
    nav.hidden = ['auth-screen', 'quiz-screen'].includes(id);
    nav.querySelectorAll('button').forEach((button) => {
      const active = button.dataset.nav === activeNavigation;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
  }
  document.querySelectorAll('.side-menu [data-side-nav]').forEach((button) => {
    const active = button.dataset.sideNav === activeNavigation;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  const sideMenu = document.querySelector('.side-menu');
  if (sideMenu) {
    if (id === 'quiz-screen') sideMenu.setAttribute('inert', ''); else sideMenu.removeAttribute('inert');
  }
  if (options.historyMode !== 'none') updateScreenHistory(id, historyMode);
  if (options.resetScroll !== false) resetViewport(id, options.focusHeading !== false);
}
function navigateBack(fallback = 'setup-screen') {
  const depth = Number(window.history?.state?.estudaDepth || 0);
  if (historyStateIsCurrent() && depth > 0) window.history.back();
  else show(fallback, { historyMode: 'reset' });
}
function goToSubjects(options = {}) { el('adventure-overview').hidden = true; el('lesson-creator').hidden = false; show('subject-screen', options); }
function openAdventure() { const subject = el('subject').value; if (!subject) { el('subject').focus(); return; } curriculum = el('curriculum').value; el('lesson-creator').hidden = true; el('adventure-overview').hidden = false; renderPhaseMap(); resetViewport('setup-screen'); }
function openReview() { renderReviewScreen(); show('review-screen'); }
function setChoice(groupId, value) { const group = el(groupId); if (!group) return; group.querySelectorAll('.choice').forEach((button) => button.classList.toggle('selected', button.dataset.value === value)); if (groupId === 'difficulty') difficulty = value; else quizMode = value; }
function startEnemSimulation() { setSchoolYear('3EM'); el('subject').value = el('subject').value || 'Matemática'; el('topic').value = el('topic').value || 'proporcionalidade e porcentagem'; el('curriculum').value = 'Base Enem/Inep'; curriculum = 'Base Enem/Inep'; setChoice('difficulty', 'Médio'); setChoice('quiz-mode', 'Prova'); el('curriculum-hint').textContent = curriculumDescriptions[curriculum]; renderTopicExamples(); openAdventure(); }
function setQuestionBankStatus(message = '', error = false) {
  const status = el('question-bank-status'); if (!status) return;
  status.classList.toggle('error', error);
  status.innerHTML = error ? `<span aria-hidden="true">!</span><strong>${escapeHTML(message)}</strong>` : '<span aria-hidden="true">∞</span><strong>Banco inteligente sem repetição</strong> — centenas de exercícios por matéria e ano, com histórico salvo no seu perfil.';
}
async function begin(phaseOverride) {
  const route = currentRoute(), subject = route.subject, topic = route.topic;
  curriculum = el('curriculum').value;
  if (!el('subject').value) { el('subject').focus(); return; }
  renderAvatarUnlockResult([]);
  const progress = getPhaseProgress(route);
  currentPhase = phaseOverride || Math.min(progress.completed + 1, 4);
  current = 0; score = 0; hits = 0; roundStreak = 0;
  try { questions = await freshRoundFor(subject, schoolYear, route); }
  catch (error) {
    console.error('Não foi possível iniciar uma rodada inédita:', error);
    setQuestionBankStatus(error.message || 'Não foi possível montar a rodada inédita.', true);
    el('adventure-overview').hidden = true; el('lesson-creator').hidden = false; show('setup-screen');
    return;
  }
  setQuestionBankStatus();
  questions.forEach((question) => { question.subject = subject; question.topic = topic; question.curriculum = curriculum; question.schoolYear = schoolYear; question.phase = currentPhase; const axis = curriculum === 'Base Enem/Inep' ? ` Eixo Enem trabalhado: ${enemAxes[subject]}.` : ''; question.note = `${question.note} Ano escolar: ${schoolYearLabel()}. Orientação da trilha: ${curriculumDescriptions[curriculum]}${axis}`; });
  show('quiz-screen', { historyMode: activeScreenId() === 'result-screen' ? 'replace' : undefined }); renderQuestion();
}
function refreshQuestionTools(question) { const save = el('save-question'), difficult = el('mark-difficult'); save.classList.toggle('active', isMarked(question, 'favorite')); difficult.classList.toggle('active', isMarked(question, 'difficult')); save.textContent = isMarked(question, 'favorite') ? '♥ Salva' : '♡ Salvar'; difficult.textContent = isMarked(question, 'difficult') ? '⚑ Marcada' : '⚑ Marcar para revisar'; save.onclick = () => { saveQuestionMark(question, 'favorite'); refreshQuestionTools(question); }; difficult.onclick = () => { saveQuestionMark(question, 'difficult'); refreshQuestionTools(question); }; }
function renderQuestion() {
  const question = questions[current];
  resetViewport('quiz-screen');
  el('question-counter').textContent = `Questão ${current + 1} de 10`; el('progress-bar').style.width = `${(current + 1) * 10}%`; el('score').textContent = score;
  el('quiz-tag').textContent = question.origin === 'Enem' ? `Questão pública · Enem · ${schoolYearLabel(question.schoolYear)} · ${question.subject}` : question.origin === 'BNCC' ? `Prática curricular · ${schoolYearLabel(question.schoolYear)} · ${question.subject}` : question.origin === 'Autoral' ? `Questão inédita · ${schoolYearLabel(question.schoolYear)} · ${question.subject}` : `${quizMode === 'Prova' ? 'Modo prova' : question.curriculum} · ${schoolYearLabel(question.schoolYear)} · ${question.subject}`;
  el('quiz-skill').textContent = `Habilidade: ${questionSkill(question)}`; el('question-text').textContent = question.q;
  refreshQuestionTools(question);
  const answers = el('answers'); answers.innerHTML = ''; el('feedback').hidden = true; el('achievement-toast').hidden = true; el('next-question').hidden = true;
  if (question.kind === 'open') { answers.innerHTML = '<textarea id="open-response" class="open-response" placeholder="Escreva sua explicação aqui..."></textarea><button id="check-open" class="small-action" type="button">Ver guia de resposta</button>'; el('check-open').addEventListener('click', () => completeAlternate(true, question, true)); return; }
  if (question.kind === 'order') { const picked = []; question.steps.forEach((step) => { const button = document.createElement('button'); button.className = 'answer'; button.textContent = step; button.addEventListener('click', () => { picked.push(step); button.disabled = true; button.classList.add('selected-answer'); if (picked.length === question.steps.length) completeAlternate(picked.every((item, index) => item === question.correctOrder[index]), question); }); answers.append(button); }); return; }
  question.a.forEach((text, index) => { const button = document.createElement('button'); button.className = 'answer'; button.innerHTML = `<span class="letter">${'ABCDE'[index]}</span><span>${text}</span>`; button.addEventListener('click', () => answer(index)); answers.appendChild(button); });
}
function revealFeedback(feedback) {
  requestAnimationFrame(() => {
    feedback.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'nearest', inline: 'nearest' });
    feedback.focus({ preventScroll: true });
  });
}
function completeAlternate(right, question, open) { if (open) { const text = el('open-response').value.trim(); if (!text) return; } const rewards = recordAnswer(question, right); if (right) { score += 100; hits++; } el('score').textContent = score; const feedback = el('feedback'); feedback.hidden = false; feedback.className = `feedback ${right ? 'good' : ''}`; feedback.innerHTML = `<strong>${open ? 'Guia de resposta' : right ? '✓ Ordem correta!' : '↗ Quase lá!'}</strong>${question.note}`; if (rewards.length) showToast(rewards); el('next-question').hidden = false; el('next-question').innerHTML = current === 9 ? 'Ver meu resultado <span>→</span>' : 'Próxima questão <span>→</span>'; revealFeedback(feedback); }
function showFeedback(question, right, rewards, selectedIndex) {
  const feedback = el('feedback'), source = question.source || curriculumSources[question.curriculum]; feedback.hidden = false; feedback.className = `feedback ${right ? 'good' : ''}`;
  const optionComment = question.optionNotes?.[selectedIndex];
  feedback.innerHTML = `<strong>${right ? '✓ Resposta correta!' : '↗ Quase lá!'}</strong>${optionComment ? `<p class="option-correction">${escapeHTML(optionComment)}</p>` : question.note}${source ? `<a class="question-source" href="${source.url}" target="_blank" rel="noreferrer">${source.label}</a>` : ''}<div class="feedback-actions"><button type="button" data-explain="essential">Essencial</button><button type="button" data-explain="steps">Passo a passo</button><button type="button" data-explain="deeper">Aprofundar</button><button type="button" class="similar-action">Nova rodada inédita</button></div><p class="explanation-extra" hidden></p>`;
  const detail = feedback.querySelector('.explanation-extra'); const explanations = { essential: question.note, steps: `1. Identifique os dados e o que foi pedido. 2. Escolha a relação adequada. 3. Resolva sem pular etapas. 4. Confira se a resposta é coerente. Aplicando isso aqui: ${question.note}`, deeper: `Habilidade em foco: ${questionSkill(question)}. Tente criar um exemplo novo sobre ${topicForEntry(question)} e explique por que cada alternativa incorreta não resolve o problema.` };
  feedback.querySelectorAll('[data-explain]').forEach((button) => button.addEventListener('click', () => { feedback.querySelectorAll('[data-explain]').forEach((item) => item.classList.remove('selected')); button.classList.add('selected'); detail.hidden = false; detail.textContent = explanations[button.dataset.explain]; }));
  feedback.querySelector('.similar-action').addEventListener('click', () => begin(currentPhase)); if (rewards.length) showToast(rewards); revealFeedback(feedback);
}
function answer(index) {
  const question = questions[current], right = index === question.correct;
  document.querySelectorAll('.answer').forEach((button, answerIndex) => { button.disabled = true; if (answerIndex === question.correct) button.classList.add('correct'); if (answerIndex === index && !right) button.classList.add('wrong'); if (quizMode === 'Prova' && answerIndex === index) button.classList.add('selected-answer'); });
  if (right) { score += difficulty === 'Difícil' ? 150 : difficulty === 'Médio' ? 120 : 100; hits++; }
  const rewards = recordAnswer(question, right); el('score').textContent = score; showFeedback(question, right, rewards, index);
  const next = el('next-question'); next.hidden = false; next.innerHTML = current === 9 ? 'Ver meu resultado <span>→</span>' : 'Próxima questão <span>→</span>';
}
el('quiz-form').addEventListener('submit', (event) => { event.preventDefault(); openAdventure(); });
el('next-question').addEventListener('click', () => {
  if (current !== 9) { current++; renderQuestion(); return; }

  const route = currentRoute();
  const progress = getPhaseProgress(route);
  const passed = hits >= 7;
  const previousAvatarPhaseCount = completedAvatarPhases();
  state.rounds++;
  state.bestScore = Math.max(state.bestScore, score);

  if (passed) {
    progress.completed = Math.max(progress.completed, currentPhase);
    state.phaseProgress[route.key] = progress;
    resultAction = currentPhase < 4 ? 'nextPhase' : 'home';
  } else {
    resultAction = 'retry';
  }

  const avatarUnlocks = passed ? avatarStudio.unlockedBetween(previousAvatarPhaseCount, completedAvatarPhases()) : [];
  const earned = checkAchievements();
  saveState();
  updateHome();
  el('final-score').textContent = score;
  el('correct-count').textContent = hits;
  el('result-title').textContent = passed ? `Fase ${currentPhase} concluída!` : `Fase ${currentPhase}: tente novamente`;
  el('phase-result').textContent = passed ? `Você acertou ${hits}/10 e liberou ${currentPhase < 4 ? `a fase ${currentPhase + 1}` : 'toda a trilha'}!` : `Você acertou ${hits}/10. São necessários 7 acertos para avançar.`;
  el('result-message').textContent = passed ? 'Excelente trabalho: avance para a próxima etapa da trilha.' : 'Revise as explicações, pratique os erros e tente esta fase de novo.';
  el('restart').innerHTML = passed && currentPhase < 4 ? 'Ir para a próxima fase <span>→</span>' : passed ? 'Escolher nova trilha <span>↻</span>' : 'Refazer esta fase <span>↻</span>';
  renderAvatarUnlockResult(avatarUnlocks);
  if (earned.length) setTimeout(() => showToast(earned), 0);
  renderPhaseMap();
  show('result-screen', { historyMode: 'replace' });
});
el('restart').addEventListener('click', () => { updateMission(); if (resultAction === 'nextPhase') begin(currentPhase + 1); else if (resultAction === 'retry') begin(currentPhase); else { renderPhaseMap(); show('setup-screen', { historyMode: 'replace' }); } }); el('leave-quiz').addEventListener('click', () => { updateMission(); renderPhaseMap(); navigateBack('setup-screen'); });
el('open-dashboard').addEventListener('click', () => { renderDashboard(); show('dashboard-screen'); }); el('close-dashboard').addEventListener('click', () => { updateMission(); navigateBack('setup-screen'); });
el('save-plan').addEventListener('click', () => { state.plan.minutes = el('daily-minutes').value; saveState(); });
el('practice-notebook').addEventListener('click', openReview);
el('review-errors').addEventListener('click', openReview);
el('close-review').addEventListener('click', () => { updateMission(); navigateBack('setup-screen'); });
el('open-review-from-dashboard').addEventListener('click', openReview);
el('practice-due').addEventListener('click', () => { const entry = dueReviews()[0] || state.notebook[0] || state.savedQuestions[0]; if (entry) startReview(entry); });
el('start-enem-sim').addEventListener('click', startEnemSimulation);
function updateModalBackgroundState() {
  const anyModalOpen = !el('weekly-goal-modal').hidden || !el('avatar-studio-modal').hidden;
  document.body.classList.toggle('modal-open', anyModalOpen);
  document.querySelector('.app-shell')?.toggleAttribute('inert', anyModalOpen);
  el('app-nav')?.toggleAttribute('inert', anyModalOpen);
}
function openWeeklyGoalModal(options = {}) {
  const modal = el('weekly-goal-modal'), input = el('weekly-goal-input');
  weeklyGoalReturnFocus = document.activeElement;
  input.value = String(state.weekly?.goal || 50);
  el('weekly-goal-error').textContent = '';
  modal.hidden = false;
  updateModalBackgroundState();
  if (!options.fromHistory) updateScreenHistory(activeScreenId(), 'push', { estudaModal: 'weekly-goal' });
  setTimeout(() => { input.focus(); input.select(); }, 0);
}
function closeWeeklyGoalModal(options = {}) {
  if (!options.fromHistory && historyStateIsCurrent() && window.history.state?.estudaModal === 'weekly-goal') { window.history.back(); return; }
  el('weekly-goal-modal').hidden = true;
  updateModalBackgroundState();
  weeklyGoalReturnFocus?.focus?.();
}
el('edit-weekly-goal').addEventListener('click', openWeeklyGoalModal);
document.querySelectorAll('[data-close-weekly-goal]').forEach((button) => button.addEventListener('click', closeWeeklyGoalModal));
el('weekly-goal-modal').addEventListener('click', (event) => { if (event.target === el('weekly-goal-modal')) closeWeeklyGoalModal(); });
el('weekly-goal-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const goal = Number(el('weekly-goal-input').value);
  if (!Number.isFinite(goal) || goal < 5 || goal > 500) { el('weekly-goal-error').textContent = 'Digite um número entre 5 e 500.'; el('weekly-goal-input').focus(); return; }
  state.weekly.goal = Math.round(goal); saveState(); updateMission(); closeWeeklyGoalModal();
});
function openAvatarStudio(options = {}) {
  const modal = el('avatar-studio-modal');
  avatarStudioReturnFocus = document.activeElement;
  avatarDraft = avatarStudio.fitToUnlocks(state.avatarDesign, completedAvatarPhases());
  avatarCategory = 'skin';
  el('avatar-studio-status').textContent = state.avatarCreated ? 'Seu visual atual está pronto para receber novas ideias.' : 'Escolha cada parte e salve seu primeiro avatar.';
  modal.hidden = false;
  updateModalBackgroundState();
  if (!options.fromHistory) updateScreenHistory(activeScreenId(), 'push', { estudaModal: 'avatar-studio' });
  renderAvatarEditor();
  setTimeout(() => el('avatar-category-tabs')?.querySelector('[role="tab"]')?.focus(), 0);
}
function closeAvatarStudio(options = {}) {
  if (!options.fromHistory && historyStateIsCurrent() && window.history.state?.estudaModal === 'avatar-studio') { window.history.back(); return; }
  el('avatar-studio-modal').hidden = true;
  updateModalBackgroundState();
  avatarDraft = null;
  avatarStudioReturnFocus?.focus?.();
}
['open-avatar-studio-home', 'open-avatar-studio-profile', 'open-avatar-studio-result'].forEach((id) => el(id)?.addEventListener('click', openAvatarStudio));
document.querySelectorAll('[data-close-avatar-studio]').forEach((button) => button.addEventListener('click', closeAvatarStudio));
el('avatar-studio-modal').addEventListener('click', (event) => { if (event.target === el('avatar-studio-modal')) closeAvatarStudio(); });
el('save-avatar-design').addEventListener('click', () => {
  if (!avatarDraft) return;
  state.avatarDesign = avatarStudio.fitToUnlocks(avatarDraft, completedAvatarPhases());
  state.avatarDesignUpdatedAt = new Date().toISOString();
  state.avatarCreated = true;
  saveState();
  updateHome();
  if (activeScreenId() === 'dashboard-screen') renderDashboard();
  if (activeSupabaseUser && supabaseClient) void syncStateToSupabase();
  closeAvatarStudio();
});
document.addEventListener('keydown', (event) => {
  const avatarModal = el('avatar-studio-modal'), weeklyModal = el('weekly-goal-modal');
  const modal = !avatarModal.hidden ? avatarModal : !weeklyModal.hidden ? weeklyModal : null;
  if (!modal) return;
  if (event.key === 'Escape') { event.preventDefault(); modal === avatarModal ? closeAvatarStudio() : closeWeeklyGoalModal(); return; }
  if (event.key !== 'Tab') return;
  const focusable = [...modal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]')].filter((item) => !item.hidden);
  if (!focusable.length) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
el('app-nav').querySelectorAll('button').forEach((button) => button.addEventListener('click', () => {
  if (button.dataset.nav === 'subjects') goToSubjects();
  else if (button.dataset.nav === 'trail') show('setup-screen');
  else if (button.dataset.nav === 'review') openReview();
  else { renderDashboard(); show('dashboard-screen'); }
}));
document.querySelectorAll('[data-side-nav]').forEach((button) => button.addEventListener('click', () => {
  const destination = button.dataset.sideNav;
  if (destination === 'subjects') goToSubjects();
  else if (destination === 'trail') show('setup-screen');
  else if (destination === 'review') openReview();
  else { renderDashboard(); show('dashboard-screen'); }
}));
el('listen-question').addEventListener('click', () => { if (!('speechSynthesis' in window) || !questions[current]) return; speechSynthesis.cancel(); const speech = new SpeechSynthesisUtterance(questions[current].q); speech.lang = 'pt-BR'; speechSynthesis.speak(speech); });
function applyAccessibility() { document.body.classList.toggle('a11y-large', state.accessibility.font); document.body.classList.toggle('a11y-contrast', state.accessibility.contrast); document.body.classList.toggle('a11y-calm', state.accessibility.calm); }
document.querySelectorAll('.access-control').forEach((button) => button.addEventListener('click', () => { const key = button.dataset.access; state.accessibility[key] = !state.accessibility[key]; saveState(); applyAccessibility(); }));
el('toggle-accessibility').addEventListener('click', () => { state.accessibility.font = !state.accessibility.font; saveState(); applyAccessibility(); });
el('save-teacher-material').addEventListener('click', () => { const title = el('teacher-material-title').value.trim(), note = el('teacher-material-note').value.trim(); if (!title && !note) return; state.materials.unshift({ title: title || 'Orientação de estudo', note: note || 'Sem observações.' }); state.materials = state.materials.slice(0, 10); el('teacher-material-title').value = ''; el('teacher-material-note').value = ''; saveState(); renderTeacherMaterials(); });
el('toggle-creator').addEventListener('click', () => { el('adventure-overview').hidden = true; el('lesson-creator').hidden = false; });
document.querySelectorAll('.subject-card').forEach((card) => card.addEventListener('click', () => { const subject = card.dataset.subject; el('subject').value = subject; el('topic').value = ''; el('adventure-overview').hidden = true; el('lesson-creator').hidden = false; renderTopicExamples(); renderPhaseMap(); show('setup-screen'); }));
el('back-to-subjects').addEventListener('click', goToSubjects);
el('result-home').addEventListener('click', () => goToSubjects({ historyMode: 'replace' }));
window.addEventListener('popstate', (event) => {
  const weeklyModal = el('weekly-goal-modal'), avatarModal = el('avatar-studio-modal');
  if (!avatarModal.hidden && event.state?.estudaModal !== 'avatar-studio') { closeAvatarStudio({ fromHistory: true }); return; }
  if (!weeklyModal.hidden && event.state?.estudaModal !== 'weekly-goal') { closeWeeklyGoalModal({ fromHistory: true }); return; }
  if (!historyStateIsCurrent(event.state)) {
    show(activeSupabaseUser ? 'subject-screen' : 'auth-screen', { historyMode: 'reset' });
    return;
  }
  if (event.state?.estudaModal === 'avatar-studio') { if (avatarModal.hidden) openAvatarStudio({ fromHistory: true }); return; }
  if (event.state?.estudaModal === 'weekly-goal') { if (weeklyModal.hidden) openWeeklyGoalModal({ fromHistory: true }); return; }
  const requested = event.state?.estudaScreen;
  const fallback = activeSupabaseUser ? 'subject-screen' : 'auth-screen';
  const transientReady = requested === 'quiz-screen' ? questions.length === 10 && current < questions.length : requested === 'result-screen' ? questions.length === 10 && current === 9 : true;
  const destination = appScreenIds.has(requested) && transientReady && (activeSupabaseUser || requested === 'auth-screen') ? requested : fallback;
  if (destination === 'dashboard-screen') renderDashboard();
  if (destination === 'review-screen') renderReviewScreen();
  if (destination === 'setup-screen' || destination === 'subject-screen') renderPhaseMap();
  show(destination, { historyMode: 'none' });
});
function syncVirtualKeyboard() {
  const activeTag = document.activeElement?.tagName;
  const editing = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';
  document.body.classList.toggle('keyboard-open', editing && window.matchMedia('(max-width: 1024px)').matches);
}
window.visualViewport?.addEventListener('resize', syncVirtualKeyboard);
document.addEventListener('focusin', syncVirtualKeyboard);
document.addEventListener('focusout', () => setTimeout(syncVirtualKeyboard, 0));
function resetPasswordVisibility() {
  document.querySelectorAll('[data-password-target]').forEach((button) => {
    const input = el(button.dataset.passwordTarget);
    if (input) input.type = 'password';
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', 'Mostrar senha');
    const icon = button.querySelector('[aria-hidden="true"]'); if (icon) icon.textContent = '👁';
  });
}
function setAuthMode(mode, navigationOptions = {}) {
  const forms = { login: 'login-form', register: 'register-form', recovery: 'recovery-form', reset: 'new-password-form' };
  if (!forms[mode]) mode = 'login';
  Object.entries(forms).forEach(([name, id]) => { el(id).hidden = name !== mode; });
  const regularMode = mode === 'login' || mode === 'register';
  el('auth-switch').hidden = !regularMode;
  el('show-login').classList.toggle('selected', mode === 'login');
  el('show-register').classList.toggle('selected', mode === 'register');
  el('show-login').setAttribute('aria-selected', String(mode === 'login'));
  el('show-register').setAttribute('aria-selected', String(mode === 'register'));
  const copy = {
    login: ['Uma aventura de estudos começa aqui.', 'Entre para continuar suas fases, medalhas e evolução.'],
    register: ['Crie sua conta de estudante.', 'Seu progresso ficará protegido e disponível quando você entrar.'],
    recovery: ['Esqueceu sua senha?', 'Tudo bem. Enviaremos para seu e-mail um caminho seguro de volta.'],
    reset: ['Proteja sua nova conquista.', 'Escolha uma nova senha para recuperar sua conta.']
  };
  [el('auth-title').textContent, el('auth-subtitle').textContent] = copy[mode];
  if (mode === 'recovery') el('recovery-email').value = el('login-email').value.trim();
  resetPasswordVisibility();
  showAuthNotice('');
  show('auth-screen', { ...navigationOptions, focusHeading: false });
  const focusTargets = { login: 'login-email', register: 'register-name', recovery: 'recovery-email', reset: 'new-password' };
  setTimeout(() => el(focusTargets[mode])?.focus(), 0);
}
el('show-login').addEventListener('click', () => setAuthMode('login'));
el('show-register').addEventListener('click', () => setAuthMode('register'));
el('show-recovery').addEventListener('click', () => setAuthMode('recovery'));
document.querySelectorAll('[data-auth-back]').forEach((button) => button.addEventListener('click', () => setAuthMode('login')));
document.querySelectorAll('[data-password-target]').forEach((button) => button.addEventListener('click', () => {
  const input = el(button.dataset.passwordTarget); if (!input) return;
  const visible = input.type === 'text'; input.type = visible ? 'password' : 'text';
  button.setAttribute('aria-pressed', String(!visible));
  button.setAttribute('aria-label', visible ? 'Mostrar senha' : 'Ocultar senha');
  const icon = button.querySelector('[aria-hidden="true"]'); if (icon) icon.textContent = visible ? '👁' : '🙈';
}));
el('login-form').addEventListener('submit', loginUser);
el('register-form').addEventListener('submit', registerUser);
el('recovery-form').addEventListener('submit', requestPasswordReset);
el('new-password-form').addEventListener('submit', updateRecoveredPassword);
el('logout-user').addEventListener('click', logoutUser);
async function initializeApp() {
  populateSchoolYearControls(); setSchoolYear(state.schoolYear || '6EF', false); normalizeDay(); updateMission(); updateHome(); renderTopicExamples(); renderPhaseMap(); applyAccessibility();
  if (!supabaseClient) { showAuthNotice('Não foi possível carregar o serviço de acesso. Verifique sua conexão e atualize a página.', true); return; }
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event !== 'PASSWORD_RECOVERY') return;
    passwordRecoveryFlow = true;
    activeSupabaseUser = session?.user || null;
    setAuthMode('reset');
    showAuthNotice('Link confirmado. Agora escolha sua nova senha.');
  });
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) { showAuthNotice('Não foi possível restaurar sua sessão. Entre novamente.', true); return; }
  if (passwordRecoveryFlow) {
    if (data.session?.user) {
      activeSupabaseUser = data.session.user;
      setAuthMode('reset');
      showAuthNotice('Link confirmado. Agora escolha sua nova senha.');
    } else {
      setAuthMode('recovery');
      showAuthNotice('Este link expirou ou já foi utilizado. Solicite outro link.', true);
    }
    return;
  }
  if (data.session?.user) await activateUser(data.session.user);
}
updateScreenHistory('auth-screen', 'reset');
initializeApp();
