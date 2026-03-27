# Stripe Production Setup

Para dejar operativo el cobro de planes en producción faltan estas configuraciones:

- Poner `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET`.
- Rellenar `STRIPE_PRO_PRICE_IDS`, `STRIPE_PREMIUM_PRICE_IDS` y `STRIPE_ENTERPRISE_PRICE_IDS` en formato `price_mensual,price_anual`, como está documentado en `.env.example`.

Notas:

- El primer valor de cada variable se usa para el ciclo mensual.
- El segundo valor se usa para el ciclo anual.
- El webhook de Stripe debe apuntar a `/api/webhooks/stripe`.
