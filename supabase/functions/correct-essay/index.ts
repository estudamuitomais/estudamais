import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SCORE_VALUES = [0, 40, 80, 120, 160, 200];
const correctionSchema = {
  type: 'object', additionalProperties: false,
  required: ['title', 'summary', 'competencies', 'strengths', 'improvements', 'detailed_comment', 'rewritten_excerpt'],
  properties: {
    title: { type: 'string', minLength: 3, maxLength: 100 },
    summary: { type: 'string', minLength: 20, maxLength: 500 },
    competencies: {
      type: 'array', minItems: 5, maxItems: 5,
      items: {
        type: 'object', additionalProperties: false, required: ['score', 'feedback'],
        properties: { score: { type: 'integer', enum: SCORE_VALUES }, feedback: { type: 'string', minLength: 20, maxLength: 700 } }
      }
    },
    strengths: { type: 'array', minItems: 2, maxItems: 5, items: { type: 'string', minLength: 5, maxLength: 250 } },
    improvements: { type: 'array', minItems: 2, maxItems: 5, items: { type: 'string', minLength: 5, maxLength: 250 } },
    detailed_comment: { type: 'string', minLength: 80, maxLength: 1800 },
    rewritten_excerpt: { type: 'string', minLength: 30, maxLength: 900 }
  }
};

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
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

async function sha256(text: string) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const openAiKey = Deno.env.get('OPENAI_API_KEY') || '';
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ ok: false, error: 'SERVER_CONFIGURATION_ERROR' }, 500);
  if (!openAiKey) return json({ ok: false, error: 'AI_NOT_CONFIGURED' }, 503);

  const authHeader = request.headers.get('Authorization') || '';
  const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError || !userData.user) return json({ ok: false, error: 'AUTH_REQUIRED' }, 401);

  const body = await request.json().catch(() => ({}));
  const mode = body.mode === 'free' ? 'free' : 'enem';
  const theme = String(body.theme || '').trim();
  const essay = String(body.essay || '').trim();
  if (theme.length < 3 || theme.length > 300 || essay.length < 300 || essay.length > 12000) return json({ ok: false, error: 'INVALID_ESSAY' });
  if (containsPersonalData(essay)) return json({ ok: false, error: 'PERSONAL_DATA_DETECTED' });

  const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const [profileResult, grantResult, walletResult] = await Promise.all([
    service.from('profiles').select('is_admin, account_status').eq('id', userData.user.id).maybeSingle(),
    service.from('user_access_grants').select('access_level, essay_without_credits, expires_at').eq('user_id', userData.user.id).maybeSingle(),
    service.from('user_credit_wallets').select('credits').eq('user_id', userData.user.id).maybeSingle()
  ]);
  if (profileResult.error || grantResult.error || walletResult.error) return json({ ok: false, error: 'ACCESS_CHECK_FAILED' }, 503);
  const grantActive = Boolean(grantResult.data) && (!grantResult.data.expires_at || new Date(grantResult.data.expires_at).getTime() > Date.now());
  const essayIncluded = Boolean(profileResult.data?.is_admin && profileResult.data?.account_status === 'active')
    || Boolean(grantActive && (grantResult.data?.access_level === 'full' || grantResult.data?.essay_without_credits));
  if (!essayIncluded && (Number(walletResult.data?.credits) || 0) < 5) return json({ ok: false, error: 'INSUFFICIENT_CREDITS' });

  const moderationResponse = await fetch('https://api.openai.com/v1/moderations', {
    method: 'POST', headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'omni-moderation-latest', input: essay })
  });
  if (!moderationResponse.ok) return json({ ok: false, error: 'AI_UNAVAILABLE' }, 502);
  const moderation = await moderationResponse.json();
  if (moderation?.results?.[0]?.flagged) return json({ ok: false, error: 'UNSAFE_CONTENT' });

  const instructions = `Você é um corretor pedagógico brasileiro, acolhedor e rigoroso. Avalie uma redação de estudante segundo as cinco competências do Enem, com pontuações apenas em 0, 40, 80, 120, 160 ou 200. Considere o tema e o tipo de proposta. Dê orientações específicas, adequadas à idade e centradas no texto, sem humilhar, diagnosticar ou pedir dados pessoais. Na competência 5, avalie proposta de intervenção com respeito aos direitos humanos; em tema livre, adapte a análise e explique a adaptação. Não diga que a nota é oficial. O trecho aprimorado deve preservar a ideia do estudante, ser curto e servir apenas como exemplo de reescrita.`;
  const aiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: Deno.env.get('OPENAI_ESSAY_MODEL') || 'gpt-5-mini',
      store: false,
      instructions,
      input: `TIPO: ${mode === 'enem' ? 'Modelo Enem' : 'Tema livre'}\nTEMA: ${theme}\n\nREDAÇÃO:\n${essay}`,
      text: { format: { type: 'json_schema', name: 'essay_correction', strict: true, schema: correctionSchema } }
    })
  });
  if (!aiResponse.ok) {
    console.error('OpenAI correction failed', { status: aiResponse.status });
    return json({ ok: false, error: 'AI_UNAVAILABLE' }, 502);
  }

  let correction: any;
  try { correction = JSON.parse(readOutputText(await aiResponse.json())); }
  catch { return json({ ok: false, error: 'INVALID_AI_RESULT' }, 502); }
  if (!Array.isArray(correction?.competencies) || correction.competencies.length !== 5) return json({ ok: false, error: 'INVALID_AI_RESULT' }, 502);
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
    return json({ ok: false, error: 'FINALIZATION_FAILED' }, 500);
  }
  if (!finalized?.ok) return json(finalized);
  return json({
    ok: true,
    correction,
    credits_remaining: finalized.credits_remaining,
    credits_charged: Number(finalized.credits_charged) || 0,
    access_included: Number(finalized.credits_charged) === 0,
    correction_id: finalized.id
  });
});
