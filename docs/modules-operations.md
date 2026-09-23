# Appointment and pickup modules

The browser saves requests through `/api/modules/public/businesses/:slug/appointments`
or `/preorders`. Astro relays those calls to `/api/v1/public/...` in the Go API.
The API stores the record before the UI offers a WhatsApp link. Sending messages
remains manual; neither plan requires Meta credentials.

Owner screens live under `/dashboard/appointments`, `/dashboard/preorders`,
`/dashboard/modules`, and `/dashboard/billing`. `/plans` reads the current pricing
catalog from the API. The selected modules, capabilities, quota, and payment state
come from the backend; returning from Stripe never grants access by itself.

## Local verification

Start the API repository's dedicated Docker module stack and seed a local pilot
business with the Clerk development account's organization and user IDs. Start
the frontend with the same Clerk dev instance:

```sh
PUBLIC_API_BASE_URL=http://127.0.0.1:18080 pnpm dev --port 4321
pnpm check
pnpm test
pnpm build
```

Guest abuse protection uses `PUBLIC_TURNSTILE_SITE_KEY`; configure its matching
secret and approved hostname in the Go API. A blank site key is only appropriate
when the local API explicitly permits its development bypass. Public variables
are build-time values, including in Docker images.

Use test customers and pilot/sandbox billing. Exercise a saved request without
sending WhatsApp, owner confirmation, guest status refresh, cancellation, final
weight edits, and fulfillment. The Go repository owns concurrency, capacity,
quota, payment webhook, and PGMQ integration tests.

## Credentials and jobs

The BFF accepts only enumerated route/method combinations, checks mutation
origins, resolves owner identity/business on the server, and forwards no browser
authorization headers to public endpoints. It preserves API status codes,
idempotency keys, replay headers, and `Retry-After`.

Guest management uses a separate httpOnly cookie for each request. A recovery
link carries a token in its fragment, removes it before other page scripts run,
and validates it with the API before setting the cookie. Private request pages
are no-store/noindex/no-referrer, and their CSP restricts scripts and connections.
Do not log response bodies or recovery links. The API controls credential expiry;
expiry does not delete the business's record.

PGMQ runs in PostgreSQL with a separate Go worker. The frontend never accesses
the queue. Expiration and billing jobs update persisted API state, which screens
refresh while visible. Completed job cleanup is independent of appointment and
preorder history. No frontend scheduler or queue credentials are required.

Stripe account setup, recurring MXN prices, webhook registration, allowed return
origins, portal policy, and runtime credentials belong to the API deployment.
No Stripe secret or price ID belongs in this frontend bundle. Customer payments
to individual businesses remain outside the Openlocal subscription flow.
