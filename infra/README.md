# Basecamp Infrastructure

Infrastructure assets support Linux self-hosting, local-network operation,
containers, persistent volumes, backups, restore drills, monitoring, and
deployment documentation.

Basecamp must remain useful without internet access after deployment.

Operator-facing server and web installation requirements are tracked in
[Deployment Guide](../docs/ops/deployment.md).

## M6 Beta Files

- `compose.yml` - web, server, reverse proxy, persistent volumes, backup job,
  and optional `postgres` profile for production-persistence validation.
- `basecamp.env.example` - safe environment template.
- `server.Dockerfile` - API server and ops command image.
- `web.Dockerfile` - static web app image.
- `caddy/Caddyfile` - local reverse proxy rules.
- `nginx/web.conf` - static web container config.

Start from this directory after copying `basecamp.env.example` to
`basecamp.env` and replacing placeholder secrets. The real env file is ignored
by git and is not auto-loaded by `compose.yml`; pass it explicitly on every
Compose command:

```bash
docker compose --env-file basecamp.env config --quiet
docker compose --env-file basecamp.env up -d --build
docker compose --env-file basecamp.env ps
```

PostgreSQL validation uses the optional profile:

```bash
docker compose --profile postgres --env-file basecamp.env run --rm postgres-tools pnpm ops:postgres:migrate
docker compose --profile postgres --env-file basecamp.env run --rm postgres-tools pnpm ops:postgres:status
```

For the cloud pilot profile, keep `BASECAMP_AUTH_MODE=local` and create the
first admin account after startup:

```bash
docker compose --env-file basecamp.env run --rm server pnpm ops:user:create
```

Set `BASECAMP_USER_USERNAME`, `BASECAMP_USER_PASSWORD`, and optionally
`BASECAMP_USER_DISPLAY_NAME` in the shell that runs the command. Do not commit
real credentials or tokens.

To revoke a pilot user's access, set `BASECAMP_USER_USERNAME` and run:

```bash
docker compose --env-file basecamp.env run --rm server pnpm ops:user:disable
```

When the real env file lives outside `infra/`, set `BASECAMP_CONFIG_SOURCE` in
that file to the absolute host path so backups can include the config file.
