# Privacy And Portability

Last updated: 2026-08-20

Basecamp is a public repository for a self-hosted preparedness system. Public
repo text must not reveal contributor workstation names, local usernames, local
home directories, or Codex runtime cache paths.

## Public Text

This policy applies to tracked files, pull request descriptions, release notes,
issue text, and comments.

Do not publish personal absolute paths that include a real local username, such
as macOS, Linux, or Windows home-directory paths.

Use one of these forms instead:

- Repo-relative paths, for source references: `apps/server/src/app.ts`
- Environment variables, for setup commands: `$BASECAMP_HOME`, `$BASECAMP_DATA_DIR`
- Anonymous placeholders, for local examples: `/Users/<user>/...`, `/home/<user>/...`
- Admin-controlled server paths, for self-hosting docs: `/opt/basecamp`, `/var/lib/basecamp`, `/etc/basecamp`

## Runtime Paths

Public validation instructions should prefer portable commands:

```bash
pnpm check
```

If a specific runtime root must be shown, make it resettable by the repository
admin instead of naming a local machine path:

```bash
export BASECAMP_RUNTIME_HOME=/opt/basecamp/runtime
PATH="$BASECAMP_RUNTIME_HOME/node/bin:$BASECAMP_RUNTIME_HOME/bin:$PATH" pnpm check
```

For Codex-hosted local verification, report tool versions instead of publishing
the local Codex cache path.

## Automated Guardrail

`pnpm check:repo` scans tracked files and, during GitHub pull-request CI, the PR
title/body for macOS, Linux, and Windows personal home-directory paths. A
failure means the text should be rewritten as a repo-relative path, an
environment variable, an anonymous placeholder, or an admin-controlled server
path.
