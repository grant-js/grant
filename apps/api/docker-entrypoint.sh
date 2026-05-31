#!/bin/sh
set -e

# Named volumes mount with root-owned metadata; ensure the runtime user can write uploads.
STORAGE_DIR="/app/apps/api/storage"
if [ -d "$STORAGE_DIR" ]; then
  chown -R grantjs:grantjs "$STORAGE_DIR"
fi

cd /app/apps/api
exec su-exec grantjs:grantjs "$@"
