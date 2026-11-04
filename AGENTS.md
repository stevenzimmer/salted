# Salted Focaccia engineering conventions

- Use strict TypeScript and the Next.js App Router. Prefer React Server Components; add Client Components only for interaction or browser APIs.
- Use Tailwind CSS, shared CSS design tokens, and shadcn accessible primitives. Preserve the editorial cream/copper/charcoal design, with restrained accent colors.
- Build mobile first. Target WCAG AA with semantic HTML, descriptive labels, keyboard controls, visible focus, adequate contrast, and reduced-motion support.
- Sanity is authoritative for editorial content; keep it separate from presentation and never reintroduce hard-coded production copy. Mark draft recipes, reviews, ingredients, allergens, policies, and business copy clearly. Never invent final dietary, safety, sourcing, or founder claims.
- Keep uncertain rules configurable. See `docs/open-decisions.md` before introducing business assumptions.
- Prices are integer US cents. Never derive prices from browser-provided amounts in future production flows.
- A pickup date belongs to an entire order, never a cart line. One order has exactly one pickup date. Separate pickup dates require separate orders.
- Check complete-cart availability, including quantities, cutoff times, Pacific timezone, enabled dates, and inventory. Missing inventory means unavailable.
- Phase 1 must not create real orders, payments, inventory reservations, messages, or special-order submissions.
- Sanity owns editorial content. Postgres owns transactional orders, inventory, reservations, and delivery state. Never use Sanity as transactional order storage.
- Future Stripe webhook events are authoritative for payment completion. A redirect or local confirmation is never proof of payment.
- Validate external inputs and stored browser data. Never expose secrets through `NEXT_PUBLIC_*`, client imports, logs, or committed environment files.
- Avoid unnecessary dependencies and broad Client Component boundaries. Use npm and retain the lockfile.
- Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` for substantial changes. Test cart and availability rules when they change.
- Do not deploy or begin Phase 3 commerce integrations without an explicit request.
- Read `docs/deployment.md` before deployment work. Pushes to Vercel-connected branches can trigger deployments; require an explicit request to push or deploy.
- Keep `.vercel/` gitignored; its project configuration belongs to the local working directory.

## Sanity CMS conventions

- Model fixed editorial slots and curated singleton documents. Never introduce a generic page builder or reorderable page sections. Layout, page route patterns, fixed section CTA destinations, styling, and application behavior remain code-owned. Site navigation is the explicit exception: editors own its labels, links, and item order, with a maximum of seven items.
- Use centralized `defineQuery` GROQ queries, `sanityFetch` from `defineLive`, and generated query types. Regenerate and commit `schema.json` and `sanity.types.ts` after schema/query changes.
- Preserve Visual Editing source mapping in displayed text. Use stega-aware `hasText`, `hasCopy`, `hasPortableTextContent`, `hasImage`, and item checks. Clean only for presence checks, structural comparisons, metadata, URLs, analytics, and accessible names.
- Visible CMS fields remain optional. Cleared text removes the element, empty optional sections remove their wrappers, and removed images leave no empty aspect box or hard-coded fallback. Keep accessible programmatic labels when visible form/control labels are cleared.
- Meaningful images require editable alt text; decorative images use empty alt. Annotate images with document ID, document type and exact field path through the supported Visual Editing API.
- Keep Studio in its separate root layout. Do not mount website `SanityLive` or `VisualEditing` there. Mount Visual Editing on website routes only in Draft Mode.
- Protect Draft Mode with `defineEnableDraftMode`; never add an arbitrary public enable route. Keep `SANITY_API_READ_TOKEN` and the `SANITY_API_TOKEN` compatibility alias server-only. Do not pass an Editor token as a browser token.
- Sanity must never own transactional orders, inventory, reservations, payments, or delivery state. Missing preview inventory for a new CMS identity means unavailable.
- Seed data is a migration artifact only, never a frontend fallback. Preserve existing documents and editor drafts on reruns. Temporary QA drafts must be cleaned up without modifying editorial documents.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
