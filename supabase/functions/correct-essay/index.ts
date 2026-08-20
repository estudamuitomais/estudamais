import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins = new Set([
  'https://estudamais.net',
  'https://www.estudamais.net',
  'https://app-estudo-one.vercel.app',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]);

function corsHeadersFor(request: Request) {
  const origin = request.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'https://www.estudamais.net',
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

const SCORE_VALUES = [0, 40, 80, 120, 160, 200];
const correctionSchema = {
  type: 'object', additionalProperties: false,
  required: ['title', 'summary', 'competencies', 'strengths', 'improvements', 'detailed_comment', 'rewritten_excerpt'],
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    competencies: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['score', 'feedback'],
        properties: { score: { type: 'integer', enum: SCORE_VALUES }, feedback: { type: 'string' } }
      }
    },
    strengths: { type: 'array', items: { type: 'string' } },
    improvements: { type: 'array', items: { type: 'string' } },
    detailed_comment: { type: 'string' },
    rewritten_excerpt: { type: 'string' }
  }
};

function json(request: Request, body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: corsHeadersFor(request) });
}

function readSupabasePublishableKey() {
  const legacy = Deno.env.get('SUPABASE_ANON_KEY');
  if (legacy) return legacy;
  const raw = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    return String(parsed.default || Object.values(parsed)[0] || '');
  } catch { return ''; }
}

function readSupabaseSecretKey() {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  const raw = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    return String(parsed.default || Object.values(parsed)[0] || '');
  } catch { return ''; }
}

function readOutputText(payload: any) {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  for (const output of payload?.output || []) {
    for (const content of output?.content || []) if (typeof content?.text === 'string') return content.text;
  }
  return '';
}

function containsPersonalData(text: string) {
  const email = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
  const phone = /(?:\+?55\s*)?(?:\(?\d{2}\)?[\s.-]*)?9?\d{4}[\s.-]*\d{4}\b/;
  const cpf = /\b\d{3}[.-]?\d{3}[.-]?\d{3}-?\d{2}\b/;
  return email.test(text) || phone.test(text) || cpf.test(text);
}

function validCorrection(value: any) {
  if (!value || typeof value !== 'object') return false;
  const textFields = ['title', 'summary', 'detailed_comment', 'rewritten_excerpt'];
  if (textFields.some((field) => typeof value[field] !== 'string' || !value[field].trim())) return false;
  if (!Array.isArray(value.competencies) || value.competencies.length !== 5) return false;
  if (value.competencies.some((item: any) => !SCORE_VALUES.includes(Number(item?.score)) || typeof item?.feedback !== 'string' || !item.feedback.trim())) return false;
  if (!Array.isArray(value.strengths) || !value.strengths.length || !Array.isArray(value.improvements) || !value.improvements.length) return false;
  return true;
}

function openAiErrorCode(status: number, type = '', code = '') {
  if (code === 'insufficient_quota' || type === 'insufficient_quota') return 'AI_BILLING_REQUIRED';
  if (status === 429) return 'AI_RATE_LIMITED';
  if (status === 401 || status === 403) return 'AI_NOT_CONFIGURED';
  if (status >= 500) return 'AI_UNAVAILABLE';
  return 'AI_INVALID_REQUEST';
}

function openAiHttpStatus(code: string) {
  if (code === 'AI_RATE_LIMITED') return 429;
  if (code === 'AI_BILLING_REQUIRED') return 402;
  if (code === 'AI_NOT_CONFIGURED') return 503;
  if (code === 'AI_INVALID_REQUEST') return 422;
  return 502;
}

async function sha256(text: string) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeadersFor(request) });
  if (request.method !== 'POST') return json(request, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = readSupabasePublishableKey();
  const serviceKey = readSupabaseSecretKey();
  const openAiKey = Deno.env.get('OPENAI_API_KEY') || '';
  if (!supabaseUrl || !anonKey || !serviceKey) return json(request, { ok: false, error: 'SERVER_CONFIGURATION_ERROR' }, 500);
  if (!openAiKey) return json(request, { ok: false, error: 'AI_NOT_CONFIGURED' }, 503);

  const authHeader = request.headers.get('Authorization') || '';
  const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError || !userData.user) return json(request, { ok: false, error: 'AUTH_REQUIRED' }, 401);

  const body = await request.json().catch(() => ({}));
  const mode = body.mode === 'free' ? 'free' : 'enem';
  const theme = String(body.theme || '').trim();
  const essay = String(body.essay || '').trim();
  if (theme.length < 3 || theme.length > 300 || essay.length < 300 || essay.length > 12000) return json(request, { ok: false, error: 'INVALID_ESSAY' }, 400);
  if (containsPersonalData(essay)) return json(request, { ok: false, error: 'PERSONAL_DATA_DETECTED' }, 400);

  const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const [profileResult, grantResult, walletResult] = await Promise.all([
    service.from('profiles').select('is_admin, account_status').eq('id', userData.user.id).maybeSingle(),
    service.from('user_access_grants').select('access_level, essay_without_credits, expires_at').eq('user_id', userData.user.id).maybeSingle(),
    service.from('user_credit_wallets').select('credits').eq('user_id', userData.user.id).maybeSingle()
  ]);
  if (profileResult.error || grantResult.error || walletResult.error) return json(request, { ok: false, error: 'ACCESS_CHECK_FAILED' }, 503);
  const grantActive = Boolean(grantResult.data) && (!grantResult.data.expires_at || new Date(grantResult.data.expires_at).getTime() > Date.now());
  const essayIncluded = Boolean(profileResult.data?.is_admin && profileResult.data?.account_status === 'active')
    || Boolean(grantActive && (grantResult.data?.access_level === 'full' || grantResult.data?.essay_without_credits));
  if (!essayIncluded && (Number(walletResult.data?.credits) || 0) < 5) return json(request, { ok: false, error: 'INSUFFICIENT_CREDITS' }, 402);

  const moderationResponse = await fetch('https://api.openai.com/v1/moderations', {
    method: 'POST', headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'omni-moderation-latest', input: essay })
  });
  if (!moderationResponse.ok) {
    const moderationError = await moderationResponse.json().catch(() => ({}));
    const detail = moderationError?.error || {};
    console.error('OpenAI moderation failed', { status: moderationResponse.status, type: detail.type, code: detail.code });
    if (moderationResponse.status !== 429) {
      const errorCode = openAiErrorCode(moderationResponse.status, detail.type, detail.code);
      return json(request, { ok: false, error: errorCode }, openAiHttpStatus(errorCode));
    }
  } else {
    const moderation = await moderationResponse.json();
    if (moderation?.results?.[0]?.flagged) return json(request, { ok: false, error: 'UNSAFE_CONTENT' }, 400);
  }

  const instructions = `Você é um corretor pedagógico brasileiro, acolhedor e rigoroso. Avalie uma redação de estudante segundo as cinco competências do Enem, com pontuações apenas em 0, 40, 80, 120, 160 ou 200. Considere o tema e o tipo de proposta. Dê orientações específicas, adequadas à idade e centradas no texto, sem humilhar, diagnosticar ou pedir dados pessoais. Na competência 5, avalie proposta de intervenção com respeito aos direitos humanos; em tema livre, adapte a análise e explique a adaptação. Não diga que a nota é oficial. O trecho aprimorado deve preservar a ideia do estudante, ser curto e servir apenas como exemplo de reescrita. Se o texto contiver conteúdo perigoso, sexual envolvendo menores, incentivo à autolesão ou instruções de violência, não reproduza detalhes: responda de forma protetiva e oriente o estudante a procurar um adulto responsável.`;
  const primaryModel = Deno.env.get('OPENAI_ESSAY_MODEL') || 'gpt-5-mini';
  const fallbackModel = Deno.env.get('OPENAI_ESSAY_FALLBACK_MODEL') || 'gpt-4.1-mini';
  const buildAiRequest = (model: string) => ({
    method: 'POST',
    headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: 2500,
      instructions,
      input: `TIPO: ${mode === 'enem' ? 'Modelo Enem' : 'Tema livre'}\nTEMA: ${theme}\n\nREDAÇÃO:\n${essay}`,
      text: { format: { type: 'json_schema', name: 'essay_correction', strict: true, schema: correctionSchema } }
    })
  });
  let aiRequest = buildAiRequest(primaryModel);
  let aiResponse = await fetch('https://api.openai.com/v1/responses', aiRequest);
  if (aiResponse.status === 429) {
    const firstError = await aiResponse.clone().json().catch(() => ({}));
    const detail = firstError?.error || {};
    const quotaExhausted = detail.code === 'insufficient_quota' || detail.type === 'insufficient_quota';
    if (!quotaExhausted) {
      const retryAfter = Math.max(2, Math.min(12, Number(aiResponse.headers.get('retry-after')) || 4));
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      aiRequest = buildAiRequest(fallbackModel);
      aiResponse = await fetch('https://api.openai.com/v1/responses', aiRequest);
    }
  }
  if (!aiResponse.ok) {
    const aiError = await aiResponse.json().catch(() => ({}));
    const detail = aiError?.error || {};
    console.error('OpenAI correction failed', { status: aiResponse.status, type: detail.type, code: detail.code, param: detail.param });
    const errorCode = openAiErrorCode(aiResponse.status, detail.type, detail.code);
    return json(request, { ok: false, error: errorCode }, openAiHttpStatus(errorCode));
  }

  let correction: any;
  try { correction = JSON.parse(readOutputText(await aiResponse.json())); }
  catch { return json(request, { ok: false, error: 'INVALID_AI_RESULT' }, 502); }
  if (!validCorrection(correction)) return json(request, { ok: false, error: 'INVALID_AI_RESULT' }, 502);
  const totalScore = correction.competencies.reduce((sum: number, item: any) => sum + (SCORE_VALUES.includes(Number(item.score)) ? Number(item.score) : 0), 0);
  correction.total_score = totalScore;

  const normalizedEssay = essay.replace(/\s+/g, ' ');
  const submissionHash = await sha256(`${userData.user.id}|${mode}|${theme}|${normalizedEssay}`);
  const excerpt = normalizedEssay.slice(0, 220) + (normalizedEssay.length > 220 ? '…' : '');
  const wordCount = normalizedEssay.split(' ').filter(Boolean).length;
  const correctionId = crypto.randomUUID();
  const { data: finalized, error: finalizeError } = await service.rpc('finalize_essay_correction', {
    p_id: correctionId, p_user_id: userData.user.id, p_submission_hash: submissionHash,
    p_mode: mode, p_theme: theme, p_essay_excerpt: excerpt, p_word_count: wordCount,
    p_total_score: totalScore, p_correction: correction
  });
  if (finalizeError) {
    console.error('Essay finalization failed', { code: finalizeError.code });
    return json(request, { ok: false, error: 'FINALIZATION_FAILED' }, 500);
  }
  if (!finalized?.ok) return json(request, finalized);
  return json(request, {
    ok: true,
    correction,
    credits_remaining: finalized.credits_remaining,
    credits_charged: Number(finalized.credits_charged) || 0,
    access_included: essayIncluded || Number(finalized.credits_charged) === 0,
    correction_id: finalized.id
  });
});
