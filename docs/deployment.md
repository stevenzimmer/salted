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
