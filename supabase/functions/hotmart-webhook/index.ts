import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type HotmartPlan = {
  planId: string;
  label: string;
};

type HotmartCredit = {
  amount: number;
  label: string;
};

const subscriptionOffers: Record<string, HotmartPlan> = {
  '30uc8atl': { planId: 'premium-monthly', label: 'Premium Mensal' },
  'a0e3ryfd': { planId: 'premium-annual', label: 'Premium Anual' },
  'vdqbfpv9': { planId: 'family-monthly', label: 'Familia Mensal' },
  '9i2k4f9f': { planId: 'family-annual', label: 'Familia Anual' },
};

const creditOffers: Record<string, HotmartCredit> = {
  '1bpijdg2': { amount: 10, label: '10 creditos' },
  'm3fy8v03': { amount: 25, label: '25 creditos' },
  'ey24917x': { amount: 60, label: '60 creditos' },
};

function readSupabaseSecretKey() {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;

  const raw = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (!raw) return '';

  try {
    const parsed = JSON.parse(raw);
    return parsed.default || Object.values(parsed)[0] || '';
  } catch {
    return '';
  }
}

function textFrom(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function normalizeStatus(payload: any) {
  return textFrom(
    payload?.data?.purchase?.status,
    payload?.purchase?.status,
    payload?.status,
    payload?.event,
    payload?.event_type,
  ).toUpperCase();
}

function normalizeEventId(payload: any) {
  const transaction = textFrom(
    payload?.data?.purchase?.transaction,
    payload?.purchase?.transaction,
    payload?.transaction,
  );
  const event = textFrom(payload?.id, payload?.event_id, payload?.event);
  return textFrom(payload?.id, payload?.event_id, transaction && event ? `${transaction}:${event}` : '', transaction);
}

function extractHotmartData(payload: any) {
  const offerCode = textFrom(
    payload?.data?.purchase?.offer?.code,
    payload?.data?.subscription?.plan?.id,
    payload?.purchase?.offer?.code,
    payload?.offer?.code,
    payload?.offer_code,
  );
  const productId = textFrom(
    payload?.data?.product?.id,
    payload?.product?.id,
    payload?.product_id,
  );
  return {
    eventId: normalizeEventId(payload),
    eventType: textFrom(payload?.event, payload?.event_type, 'UNKNOWN'),
    buyerEmail: textFrom(
      payload?.data?.buyer?.email,
      payload?.buyer?.email,
      payload?.buyer_email,
      payload?.email,
    ).toLowerCase(),
    productId,
    offerCode,
    status: normalizeStatus(payload),
  };
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'METHOD_NOT_ALLOWED' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  const expectedHottok = Deno.env.get('HOTMART_WEBHOOK_SECRET') || Deno.env.get('HOTMART_HOTTOK') || '';
  const receivedHottok = request.headers.get('X-HOTMART-HOTTOK') || request.headers.get('x-hotmart-hottok') || '';

  if (!expectedHottok || receivedHottok !== expectedHottok) {
    return new Response(JSON.stringify({ ok: false, error: 'INVALID_HOTTOK' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'INVALID_JSON' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = readSupabaseSecretKey();
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ ok: false, error: 'MISSING_SUPABASE_SECRETS' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  const data = extractHotmartData(payload);
  const plan = subscriptionOffers[data.offerCode];
  const credit = creditOffers[data.offerCode];

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: result, error } = await supabase.rpc('apply_hotmart_purchase', {
    p_event_id: data.eventId,
    p_event_type: data.eventType,
    p_buyer_email: data.buyerEmail,
    p_product_id: data.productId,
    p_offer_code: data.offerCode,
    p_status: data.status,
    p_plan_id: plan?.planId || '',
    p_plan_label: plan?.label || credit?.label || '',
    p_credit_amount: credit?.amount || 0,
    p_payload: payload,
  });

  if (error) {
    console.error('Erro ao aplicar pagamento Hotmart', error);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, result }), {
    headers: { 'content-type': 'application/json' },
  });
});
