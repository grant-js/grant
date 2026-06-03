#!/bin/sh
set -e

# Named volumes mount with root-owned metadata; ensure the runtime user can write uploads.
# Skip when not root (e.g. Kubernetes securityContext.runAsUser): rely on fsGroup / volume mounts instead.
STORAGE_DIR="/app/apps/api/storage"
if [ "$(id -u)" = "0" ] && [ -d "$STORAGE_DIR" ]; then
  chown -R grantjs:grantjs "$STORAGE_DIR"
fi

cd /app/apps/api
exec su-exec grantjs:grantjs "$@"
