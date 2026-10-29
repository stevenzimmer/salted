# Vercel staging

The Phase 1 site is hosted in the `salted-focaccia` project under the
`stevenzimmers-projects` Vercel account.

- Site: https://salted-focaccia-stevenzimmers-projects.vercel.app
- Dashboard: https://vercel.com/stevenzimmers-projects/salted-focaccia
- Project ID: `prj_ubqMzSDQBd4TL6RIf1pvVqWWyq5F`
- Framework: Next.js; Node.js 24.x; install: `npm ci`; build: `npm run build`.
- `NEXT_PUBLIC_SITE_URL` points to the staging site in Vercel's Production and
  Preview environments. No integration secrets are needed for Phase 1.

Vercel Authentication protects the staging site. Sign in with an account that has
access to the project. Search indexing remains disabled in the app metadata, and
checkout and special orders remain local previews.

Vercel's first deployment uses its Production environment to provide the stable
project URL. This project currently serves as staging; no custom domain is
attached, and Phase 2 services are not configured.

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
