# AGENTS.md

This file provides guidance to AI agents working on the Mailchimp app for Attio.

## Context

### What the app does

This app integrates Mailchimp with Attio via the Attio App SDK. It lets users subscribe contacts to Mailchimp audiences directly from Attio workflow automations.

### App SDK entry points in use

| Entry point | File(s) | Description |
| --- | --- | --- |
| Workflow block | `src/blocks/add-member-to-audience/` | Adds or updates a contact in a Mailchimp audience |

### Source folder structure

| Path | Description |
| --- | --- |
| `src/app.ts` | App entry point |
| `src/blocks/add-member-to-audience/` | "Add member to audience" workflow block (block, configurator, execute) |
| `src/mailchimp/` | Mailchimp API client, datacenter resolution, and error types |
| `src/server-functions/` | Server functions exposed to client-side block configurators |

### External service

- **Name:** Mailchimp Marketing API
- **API type:** REST
- **Auth:** OAuth 2 — access token stored via Attio's connection system
- **Docs:** https://mailchimp.com/developer/marketing/api/

## Environment

Code for the app may run either in a client-side or server-side context.

### Client-side code

Client-side code runs in the browser. However, it runs inside a safe sandbox, using a custom JS runtime. This means that:

- You MUST NOT render HTML tags directly e.g. `<div>Hello</div>`. Instead, you MUST only use components provided by the App SDK.
- You MUST NOT use custom styles or CSS. Only use the pre-styled components provided by the App SDK.
- You MUST NOT try to read the DOM directly.
- Some browser APIs may not be available.
- `fetch` calls are not allowed. You MUST NOT call `fetch` directly and should instead use `fetch` via server-side functions.

Files which render React components MUST use the `.tsx` extension.

### Server-side code

Server-side code runs in files ending in:

- `.server.ts`
- `.webhook.ts`
- `.event.ts`

Workflow block files will also run in the server (excluding configurators).

Code that any of the above files import will also run in a server-side environment.

Server-side code DOES NOT run in Node.js but instead in a custom JS runtime. While many Node.js APIs are supported, some are not and you may need to factor this into your decision to use certain packages.

## Using the Attio App SDK

Attio provides three packages to help you build apps:

1. `attio/client` - for client-side imports
2. `attio/server` - for server-side imports
3. `attio` - for shared/environment-agnostic imports

IMPORTANT: Before importing from these packages, you MUST always check one of the following to confirm that your import is correct:

1. Existing examples in the codebase
2. TypeScript type definitions and JSDoc strings for the package
3. The Attio SDK documentation

If you are unsure about an import, always check explicitly and do not guess.

## Coding guidelines

- You SHOULD use Zod to validate data from public APIs.
- You SHOULD only include properties in Zod schemas that we explicitly need.
- You SHOULD use try/catch around calls to `.json()`.
- You SHOULD use console.error to capture information about unexpected errors.
- You MUST NOT log sensitive information such as email addresses or passwords.
- You MUST handle API errors gracefully. Do not throw an error within a React component, but instead return a clear fallback UI.
- API wrappers MUST NOT leak transport-layer details (e.g. HTTP status codes) to callers — return a domain error such as `NOT_FOUND` instead. All Mailchimp calls return a `@attio/fetchable` result rather than throwing.
- When `getUserConnection()` / `getWorkspaceConnection()` is called, you MUST NOT wrap it in a try/catch. These functions throw special errors that power the connection dialogs in the UI.
- You SHOULD prefer named arguments over positional arguments when using 3 or more arguments.
- You MUST NOT use `any` when typing your code. Type errors MUST be fixed properly as usage of `any` is a likely source of bugs.
- You SHOULD order functions/values within code so that all values are defined before being used. Default export should go at the bottom of a file.

### App-specific guidelines

- **Datacenter routing:** Mailchimp routes API calls to a per-user datacenter. Before making any API call, `MailchimpClient` fetches the `/oauth2/metadata` endpoint to resolve the user's `dc` prefix or `api_endpoint`. This is handled automatically inside `MailchimpClient` — do not bypass it.
- **Subscriber hash:** Mailchimp identifies list members by an MD5 hash of their lowercased email address. Always lowercase the email before hashing (`md5(email.toLowerCase())`).
- **Add-or-update semantics:** `PUT /lists/{id}/members/{hash}` upserts members. Use `status_if_new: "subscribed"` so new members are subscribed without overwriting existing members' opt-out status.
- **OAuth metadata error detection:** The metadata endpoint returns HTTP 200 with `{"error": "..."}` for invalid tokens rather than a 4xx. Always check for the error body shape before trusting a 200 response.

### Error messages (user-facing)

- Never dump raw JSON, HTTP status codes, or square brackets in UI error messages.
- Never expose transport-layer details — say "Mailchimp: An unexpected error occurred." not "503 from Mailchimp".

### Testing

- Where appropriate, use Vitest to run tests.
- Aim to implement unit testing where it helps increase confidence in the correctness of code.
- Do not test React components using react testing library or similar.
- When passing functions/classes to describe, pass the value directly, do not specify a name in quotes e.g. `describe(myFn, () => {/* ... */})`, not `describe("myFn", () => {/* ... */})`.

## Validation

Run all checks from the `apps/mailchimp` directory or via Nx from the monorepo root:

```bash
# From monorepo root
pnpm exec nx run mailchimp:lint
pnpm exec nx run mailchimp:format:check
pnpm exec nx run mailchimp:test
pnpm exec nx run mailchimp:build
pnpm exec nx run mailchimp:knip

# From apps/mailchimp
pnpm run lint:fix
pnpm run format
pnpm run test
pnpm run build
pnpm run knip
```
