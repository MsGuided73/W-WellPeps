#!/bin/sh
# Runs from the nginx image's /docker-entrypoint.d before templates are
# rendered (20-envsubst-on-templates.sh). SITE_GATE_HASH is pasted into
# nginx.conf verbatim, so anything other than empty or 64 lowercase hex chars
# (e.g. the raw password, or an upper-case hash that would lock everyone out)
# stops the container instead of producing a broken or unpassable gate.
set -eu

hash="${SITE_GATE_HASH:-}"

if [ -z "$hash" ]; then
    echo "$0: site gate OFF (SITE_GATE_HASH is empty)"
    exit 0
fi

if ! printf '%s' "$hash" | grep -Eq '^[0-9a-f]{64}$'; then
    echo "$0: ERROR: SITE_GATE_HASH must be empty or 64 lowercase hex characters; generate it with: node scripts/gate-hash.mjs \"password\"" >&2
    exit 1
fi

echo "$0: site gate ON"
