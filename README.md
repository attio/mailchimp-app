# Mailchimp

Attio app integrating with [Mailchimp](https://mailchimp.com) — an email marketing and audience management platform.

## Overview

This integration lets Attio users subscribe contacts to Mailchimp audiences directly from workflow automations. It uses the Mailchimp Marketing API with OAuth 2 authentication, automatically resolving each user's per-datacenter API endpoint.

## Features

- **Add member to audience** — subscribe or update a contact in a Mailchimp audience from an Attio workflow automation

## Setup

```bash
pnpm install
```

## Development

```bash
pnpm run dev
```

## Commands

| Command                 | Description              |
| ----------------------- | ------------------------ |
| `pnpm run dev`          | Start dev server         |
| `pnpm run build`        | Build + type-check       |
| `pnpm run lint`         | Run ESLint               |
| `pnpm run lint:fix`     | Run ESLint with auto-fix |
| `pnpm run format`       | Format with Prettier     |
| `pnpm run format:check` | Check formatting         |
| `pnpm run test`         | Run tests                |
| `pnpm run knip`         | Check for dead code      |

## Source folder structure

| Path | Description |
| --- | --- |
| `src/app.ts` | App entry point |
| `src/blocks/add-member-to-audience/` | "Add member to audience" workflow block |
| `src/mailchimp/` | Mailchimp API client, datacenter resolution, and error types |
| `src/server-functions/` | Server functions exposed to block configurators |
