# Vercel staging

The Phase 1 site is hosted in the `salted-focaccia` project under the
`stevenzimmers-projects` Vercel account.

- Site: https://salted-focaccia-stevenzimmers-projects.vercel.app
- Dashboard: https://vercel.com/stevenzimmers-projects/salted-focaccia
- Project ID: `prj_ubqMzSDQBd4TL6RIf1pvVqWWyq5F`
- Framework: Next.js; Node.js 24.x; install: `npm ci`; build: `npm run build`.
- `NEXT_PUBLIC_SITE_URL` points to the staging site in Vercel's Production and
  Preview environments. Phase 2 requires the Sanity public configuration and a server-only Viewer token.

Vercel Authentication protects the staging site. Sign in with an account that has
access to the project. Search indexing remains disabled in the app metadata, and
checkout and special orders remain local previews.

Vercel's first deployment uses its Production environment to provide the stable
project URL. This project currently serves as staging; no custom domain is
attached, and the CMS is configured locally; Vercel still needs the environment values below before an authorized update.

## Updating staging

The initial deployment uploaded the checked local source through the Vercel
connector. The project is now connected to the GitHub repository
[`stevenzimmer/salted`](https://github.com/stevenzimmer/salted), and the local
`origin` remote points to that repository. At connection verification, the latest
ready deployment was still the initial source upload; no Git-triggered build had
run yet.

Pushes use the branch deployment settings configured in Vercel. Its Production
branch updates the stable staging URL; eligible other branches and pull requests
receive Preview deployments. Check the project's Git settings before changing
which branch updates the stable URL.

Before pushing updated source, run `npm run lint`, `npm run typecheck`,
`npm test`, and `npm run build`. Use a Preview deployment for review. Check
deployment readiness and hosted routes after each deployment.

The local `.vercel/project.json` links this working directory to the project for
future Vercel CLI use. It is gitignored. Upload only application source, build
configuration, `package.json`, and `package-lock.json`; exclude local environment
files, credentials, `.git`, `.next`, `node_modules`, and agent configuration.

Public launch still requires the decisions in [open-decisions.md](open-decisions.md)
and an explicit request before changing domains, indexing, or integrations.

## Phase 2 Sanity environment

Before a future authorized deployment, set these in the appropriate Vercel environments:

- `NEXT_PUBLIC_SANITY_PROJECT_ID`: the configured Sanity project.
- `NEXT_PUBLIC_SANITY_DATASET=production`.
- `NEXT_PUBLIC_SANITY_API_VERSION=2026-02-01` (fixed, not generated).
- `SANITY_API_READ_TOKEN`: Viewer role; server-only.
- `NEXT_PUBLIC_SITE_URL`: the exact deployment/canonical origin.

`SANITY_API_TOKEN` is supported as a server-only setup compatibility alias. Prefer the dedicated Viewer token in Vercel. Do not deploy `SANITY_API_WRITE_TOKEN`; it is needed only for the initial content seed. Environment changes require an authorized new deployment; this implementation does not deploy or push.

Localhost and the stable staged origin are configured in Sanity with credentials. Add exact per-preview origins only when needed; do not use `*.vercel.app`. Add the approved Salted production origin when a production domain is actually connected. The embedded Studio uses relative preview and Draft Mode URLs, so local, staging and future production use their own origin.

Open the Vercel-protected staging URL directly and sign in before using its Presentation iframe. Sanity project membership controls Studio editing. Test `/studio`, the authenticated preview handshake, publishing/live updates, image overlays and draft exit after deployment. Keep Studio and website non-indexable until launch approval.

## Phase 3 environment separation

This work does not push or deploy the website. Neon infrastructure setup is separate from Vercel deployment. Keep `.vercel/` and `.neon` local and gitignored.

| Variable                             | Development                                        | Preview / staged test                                                  | Later production                                           |
| ------------------------------------ | -------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| `COMMERCE_ENABLED`                   | `true` only during sandbox QA; saved default false | false until sandbox setup is complete, then explicitly enable for test | false until separate live launch approval/code gate review |
| `DATABASE_URL`                       | pooled intended app/dev branch                     | isolated preview/staging database, never production customer data      | pooled production branch                                   |
| `DATABASE_URL_UNPOOLED`              | direct migration URL                               | operator/CI migration secret; app does not need it                     | operator/CI migration secret                               |
| `TEST_DATABASE_URL`                  | separate migrated QA branch                        | test runner only                                                       | do not install                                             |
| `STRIPE_SECRET_KEY`                  | matching sandbox test key                          | matching sandbox test key                                              | distinct live restricted key after approval                |
| `STRIPE_WEBHOOK_SECRET`              | actual local CLI secret                            | sandbox endpoint secret for exact hosted origin                        | distinct live endpoint secret                              |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | matching test mode (unused by hosted redirect)     | matching sandbox, optional                                             | matching live mode, optional                               |
| `CRON_SECRET`                        | random 32+ chars                                   | unique per environment                                                 | separate random production secret                          |
| `NEXT_PUBLIC_SITE_URL`               | exact local origin/port                            | exact stable staged or preview origin                                  | approved canonical production origin                       |

Retain Phase 2 Sanity public configuration and server-only Viewer token. Do not put a Sanity Editor token or migration write token into Vercel. Published catalog validation uses read-only Sanity credentials; all database writes occur in server/operator code with private credentials. `SANITY_API_TOKEN` is a server-only compatibility alias, not a browser credential.

Before enabling staged **test** checkout: apply migrations to a dedicated staged database, publish/review active products/sizes and commerce copy, explicitly open Fridays with `commerce:pickup`, set sandbox key and hosted webhook secret, allow webhook delivery through deployment protection, schedule `/api/cron/commerce` every five minutes with bearer authorization, verify the Vercel plan supports the schedule, and authorize a deployment. Vercel cron runs on its Production deployments; Preview deployments need an external scheduler or operator runs of `commerce:reconcile`. Verify actual hosted Stripe events and paid-order state, then test checkout from the staged URL.

Stripe payment receipts are controlled in the matching Stripe Dashboard customer-email settings. Enable successful-payment receipts, confirm sender/business information, test receipt behavior, and review refund receipts if used. This app collects guest email but sends no custom messages. Phase 4 can consume confirmed orders and `notification_status=not_scheduled` with its own idempotent delivery records; the current phase never marks a custom email/SMS sent.

`NEXT_PUBLIC_SITE_URL` is embedded by Next at build time. Set the correct origin before building; changing only the `next start` environment cannot repair a mismatched built checkout origin.

## Unsubscribe setup

Before an authorized deployment of `/unsubscribe`, apply committed migration `0003_chubby_hulk.sql` with `npm run db:migrate` to that environment's database, and run `npm run cms:migrate-unsubscribe` with an operator-only Sanity write token. Review **Commerce Copy → Unsubscribe**. Once the deployed route works, run `npm run cms:migrate-unsubscribe -- --include-navigation` to append the footer link when its existing menu has room. Review **Site Settings → Footer Navigation**. The migration preserves existing/cleared copy and drafts; this post-deployment navigation step prevents broken links on older sites sharing the dataset.

The email form requires `DATABASE_URL`, the existing `CRON_SECRET` (32+ characters for private rate-limit buckets), Sanity read configuration and an exact `NEXT_PUBLIC_SITE_URL` at build time. It works with `COMMERCE_ENABLED=false`; keep the existing cron cleanup configured to remove old rate-limit records.

For future signed newsletter links, set `MARKETING_UNSUBSCRIBE_SECRET` to a dedicated stable random value of at least 32 characters. Local development already has a private generated key. Set different keys in Preview and eventual Production before generating links; never prefix the variable with `NEXT_PUBLIC_`. Keep a key stable while its links remain in circulation. Rotating it invalidates those links; the public email form remains available. No Resend or other email-provider setup is required to unsubscribe. This change does not deploy or enable newsletter sending.

## Manual-menu launch rollout

Apply migration `0004_typical_darwin.sql` on QA, then the intended application database before deploying updated code. Existing pickup dates default to `sanity_legacy` and do not become launch availability until explicitly opened with `npm run commerce:pickup -- open YYYY-MM-DD` after rollout. New orders are uncapped; old attempts default to reserved and keep their holds. Disable external legacy menu-sync jobs. The new cron never opens dates or writes catalog/inventory configuration. Retired CMS documents and legacy counters are retained, without changing shared published content or deleting orders. See [operator guide](manual-menu-launch.md).
