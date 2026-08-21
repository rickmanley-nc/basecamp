# Basecamp Infrastructure

Infrastructure assets support Linux self-hosting, local-network operation,
containers, persistent volumes, backups, restore drills, monitoring, and
deployment documentation.

Basecamp must remain useful without internet access after deployment.

Operator-facing server and web installation requirements are tracked in
[Deployment Guide](../docs/ops/deployment.md).

## M6 Beta Files

- `compose.yml` - web, server, reverse proxy, persistent volumes, and backup job.
- `basecamp.env.example` - safe environment template.
- `server.Dockerfile` - API server and ops command image.
- `web.Dockerfile` - static web app image.
- `caddy/Caddyfile` - local reverse proxy rules.
- `nginx/web.conf` - static web container config.

Start from this directory after copying `basecamp.env.example` to
`basecamp.env` and replacing placeholder secrets:

```bash
docker compose --env-file basecamp.env up -d --build
```
