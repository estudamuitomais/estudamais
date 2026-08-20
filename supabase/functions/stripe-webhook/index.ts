import Stripe from 'npm:stripe@22.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cryptoProvider = Stripe.createSubtleCryptoProvider();

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

function metadataFrom(value: any) {
  return value?.metadata || {};
}

function textFrom(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return Response.json({ ok: false, error: 'METHOD_NOT_ALLOWED' }, { status: 405 });
  }

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || Deno.env.get('STRIPE_API_KEY') || '';
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET') || Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = readSupabaseSecretKey();
  if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    return Response.json({ ok: false, error: 'MISSING_SERVER_SECRETS' }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey);
  const signature = request.headers.get('Stripe-Signature') || request.headers.get('stripe-signature') || '';
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret, undefined, cryptoProvider);
  } catch {
    console.warn('Stripe webhook signature rejected');
    return Response.json({ ok: false, error: 'INVALID_SIGNATURE' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  async function applyPurchase(params: {
    buyerEmail?: string;
    customerId?: string;
    subscriptionId?: string;
    checkoutSessionId?: string;
    status?: string;
    planId?: string;
    planLabel?: string;
    creditAmount?: number;
    userId?: string;
  }) {
    const { data, error } = await supabase.rpc('apply_stripe_purchase', {
      p_event_id: event.id,
      p_event_type: event.type,
      p_buyer_email: params.buyerEmail || '',
      p_stripe_customer_id: params.customerId || '',
      p_stripe_subscription_id: params.subscriptionId || '',
      p_stripe_checkout_session_id: params.checkoutSessionId || '',
      p_status: params.status || 'unknown',
      p_plan_id: params.planId || '',
      p_plan_label: params.planLabel || '',
      p_credit_amount: params.creditAmount || 0,
      p_payload: event as unknown as Record<string, unknown>,
      p_user_id: params.userId || null,
    });
    if (error) throw error;
    return data;
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded' || event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = metadataFrom(session);
      const mode = session.mode;
      let subscriptionStatus = '';
      if (mode === 'subscription' && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(textFrom(session.subscription));
        subscriptionStatus = subscription.status;
      }
      await applyPurchase({
        buyerEmail: textFrom(session.customer_details?.email, session.customer_email, metadata.email),
        customerId: textFrom(session.customer),
        subscriptionId: textFrom(session.subscription),
        checkoutSessionId: session.id,
        status: event.type === 'checkout.session.async_payment_failed'
          ? 'failed'
          : mode === 'payment'
            ? textFrom(session.payment_status, session.status)
            : textFrom(subscriptionStatus, session.status),
        planId: textFrom(metadata.plan_id),
        planLabel: textFrom(metadata.plan_label),
        creditAmount: Number(metadata.credit_amount || 0),
        userId: textFrom(metadata.user_id, session.client_reference_id),
      });
    } else if (event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = textFrom((invoice as any).subscription);
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const metadata = metadataFrom(subscription);
        await applyPurchase({
          buyerEmail: textFrom((invoice as any).customer_email, metadata.email),
          customerId: textFrom(invoice.customer),
          subscriptionId,
          status: 'active',
          planId: textFrom(metadata.plan_id),
          planLabel: textFrom(metadata.plan_label),
          creditAmount: 0,
          userId: textFrom(metadata.user_id),
        });
      }
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const metadata = metadataFrom(subscription);
      await applyPurchase({
        buyerEmail: textFrom(metadata.email),
        customerId: textFrom(subscription.customer),
        subscriptionId: subscription.id,
        status: event.type === 'customer.subscription.deleted' ? 'canceled' : subscription.status,
        planId: textFrom(metadata.plan_id),
        planLabel: textFrom(metadata.plan_label),
        creditAmount: 0,
        userId: textFrom(metadata.user_id),
      });
    }
  } catch (error) {
    const failure = error as { code?: string };
    console.error('Erro ao aplicar evento Stripe', { code: failure.code, eventId: event.id, eventType: event.type });
    return Response.json({ ok: false, error: 'WEBHOOK_PROCESSING_FAILED' }, { status: 500 });
  }

  return Response.json({ ok: true, received: true });
});
