# Root-context Dockerfile for the WellPeps static marketing site.
# Coolify builds from the repo root by default, and the Astro app lives in
# wellpeps-site/, so every path below reaches into that subdirectory. (A twin
# Dockerfile at wellpeps-site/Dockerfile supports base-directory builds too.)
#
# Node builds the static output; nginx serves it. No Node runtime in prod.

# --- Build stage -------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Learning-center content is fetched from Supabase at BUILD time
# (src/lib/blog.ts), so these must be set as Build-time env vars in Coolify.
ARG SUPABASE_URL
ARG SUPABASE_PUBLISHABLE_KEY
ENV SUPABASE_URL=$SUPABASE_URL \
    SUPABASE_PUBLISHABLE_KEY=$SUPABASE_PUBLISHABLE_KEY

# Install deps from the lockfile first for layer caching.
COPY wellpeps-site/package.json wellpeps-site/package-lock.json ./
RUN npm ci

COPY wellpeps-site/ ./
RUN npm run build

# --- Runtime stage -----------------------------------------------------------
FROM nginx:alpine AS runtime

# Private-preview gate (same as wellpeps-site/Dockerfile; see its notes).
# SITE_GATE_HASH is a RUNTIME env var in Coolify; empty = gate off. It is
# declared here so it is always defined for the image's envsubst step, and
# NGINX_ENVSUBST_FILTER keeps nginx's own $variables untouched.
ENV SITE_GATE_HASH="" \
    NGINX_ENVSUBST_FILTER="^SITE_GATE_"

# The image renders /etc/nginx/templates/*.template into /etc/nginx/conf.d/ at
# startup. Remove the stock default.conf so only ours is ever loaded.
RUN rm -f /etc/nginx/conf.d/default.conf
COPY wellpeps-site/nginx.conf.template /etc/nginx/templates/default.conf.template

# Refuses to start on a malformed SITE_GATE_HASH (runs before the template is
# rendered). CRs stripped in case of a Windows checkout.
COPY wellpeps-site/docker/18-site-gate-check.sh /docker-entrypoint.d/18-site-gate-check.sh
RUN sed -i 's/\r$//' /docker-entrypoint.d/18-site-gate-check.sh \
    && chmod 755 /docker-entrypoint.d/18-site-gate-check.sh

COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
