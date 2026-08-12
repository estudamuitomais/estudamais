# Integração Hotmart do Estuda+

Este arquivo documenta o fluxo final de pagamento:

1. O usuário clica em um plano ou pacote de créditos no Estuda+.
2. O checkout abre na Hotmart com o código de oferta correto.
3. A Hotmart envia o evento de compra para a Edge Function `hotmart-webhook`.
4. O Supabase valida o `X-HOTMART-HOTTOK`, registra o evento e libera o plano ou os créditos para o e-mail comprador.

## Produtos e ofertas

### Estuda+ Planos

- Produto Hotmart: `8296795`
- Premium Mensal: `30uc8atl`
- Premium Anual: `a0e3ryfd`
- Família Mensal: `vdqbfpv9`
- Família Anual: `9i2k4f9f`

### Créditos Estuda+

- Produto Hotmart: `8296816`
- 10 créditos: `1bpijdg2`
- 25 créditos: `m3fy8v03`
- 60 créditos: `ey24917x`

## Passos no Supabase

1. Abra o SQL Editor do projeto `wajefwcsnkwzetamjrwi`.
2. Rode o arquivo `hotmart-payments-migration.sql`.
3. Em Edge Functions > Secrets, cadastre uma variável:
   - `HOTMART_WEBHOOK_SECRET` com o mesmo valor do Hottok da Hotmart.

## Passos na Hotmart

1. Acesse Ferramentas > Webhook.
2. Crie uma configuração para eventos de compra e assinatura.
3. Use a URL:
   - `https://wajefwcsnkwzetamjrwi.supabase.co/functions/v1/hotmart-webhook`
4. Confirme que o header `X-HOTMART-HOTTOK` enviado pela Hotmart é o mesmo salvo no Supabase.

## Observações importantes

- O e-mail usado na compra precisa ser o mesmo e-mail cadastrado no Estuda+ para liberação automática.
- Se o e-mail não existir no app, o evento fica registrado como `pending_user`.
- Nunca coloque o `service_role` do Supabase no front-end do site.
