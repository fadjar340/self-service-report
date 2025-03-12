#!/bin/sh
set -e

# Install gettext-base if missing (as root)
#if ! command -v envsubst >/dev/null; then
#    apt-get update -o Debug::pkgProblemResolver=yes -o Acquire::AllowInsecureRepositories=true
#    apt-get install -y --allow-unauthenticated gettext-base
#fi
#

# Process template with envsubst
envsubst < /tmp/init-template.sql > /tmp/init-db.sql
cp /tmp/init-db.sql /docker-entrypoint.initdb.d/

# Execute default entrypoint as postgres user
exec docker-entrypoint.sh postgres