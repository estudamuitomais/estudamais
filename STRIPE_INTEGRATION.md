# Integração Stripe do Estuda+

O app agora usa Stripe Checkout para planos e créditos.

## Produtos e preços criados no Stripe

Conta Stripe: `acct_1U46AgKIdxxvRLXb`

### Assinaturas

- Premium Mensal: `price_1U46DaKIdxxvRLXb8LswFm24` / `estuda_premium_monthly`
- Premium Anual: `price_1U46DjKIdxxvRLXbhvwOPR8B` / `estuda_premium_annual`
- Família Mensal: `price_1U46EMKIdxxvRLXbSyYiz4tx` / `estuda_family_monthly`
- Família Anual: `price_1U46EVKIdxxvRLXbW2NGCmNs` / `estuda_family_annual`

### Créditos de apostila

- 10 créditos: `price_1U46NAKIdxxvRLXblIpSULVk` / `estuda_credits_10`
- 25 créditos: `price_1U46NLKIdxxvRLXbMRVhiFU4` / `estuda_credits_25`
- 60 créditos: `price_1U46NUKIdxxvRLXbf1vka85V` / `estuda_credits_60`

## Edge Functions Supabase

- `create-stripe-checkout`: cria a sessão segura de Checkout para usuário logado.
- `stripe-webhook`: recebe eventos assinados do Stripe e libera plano/créditos.

URL do webhook:

```text
https://wajefwcsnkwzetamjrwi.supabase.co/functions/v1/stripe-webhook
```

Endpoint criado no Stripe:

- `we_1U46UjKIdxxvRLXbDmZ62tAa`

Eventos habilitados no webhook do Stripe:

- `checkout.session.completed`
- `invoice.paid`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Secrets obrigatórios no Supabase

Em Supabase > Edge Functions > Secrets, cadastre:

- `STRIPE_SECRET_KEY`: chave secreta da conta Stripe.
- `STRIPE_WEBHOOK_SIGNING_SECRET`: segredo de assinatura gerado pelo endpoint de webhook no Stripe.

Nunca coloque essas chaves no `app.js`, no GitHub ou no front-end.

## Como a liberação funciona

1. O usuário loga no Estuda+.
2. Clica em assinar ou comprar créditos.
3. O app chama `create-stripe-checkout`.
4. O Stripe abre o checkout.
5. Depois do pagamento, o Stripe chama `stripe-webhook`.
6. O Supabase registra o evento e libera assinatura ou créditos pelo e-mail do usuário.
