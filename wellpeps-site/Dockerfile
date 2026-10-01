# WellPeps marketing site — static build, served by nginx.
# Two stages: Node builds the static output, nginx serves it. No Node runtime
# in production. Build context is this directory (wellpeps-site) — in Coolify
# set the Base Directory to /wellpeps-site.

# --- Build stage -------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Learning-center content is fetched from Supabase at BUILD time
# (src/lib/blog.ts), so these must be present as build args. In Coolify, add
# them as Build-time environment variables.
ARG SUPABASE_URL
ARG SUPABASE_PUBLISHABLE_KEY
ENV SUPABASE_URL=$SUPABASE_URL \
    SUPABASE_PUBLISHABLE_KEY=$SUPABASE_PUBLISHABLE_KEY

# Draft legal pages (src/lib/legal-docs.ts): built only when this is "true". Set it as a
# Build-time variable on the client-preview deployment so counsel can review the documents
# in the site; leave it unset on the live site, where those pages must not exist.
ARG SHOW_DRAFT_PAGES
ENV SHOW_DRAFT_PAGES=$SHOW_DRAFT_PAGES

# Install deps from the lockfile first for layer caching.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Runtime stage -----------------------------------------------------------
FROM nginx:alpine AS runtime

# Private-preview gate. SITE_GATE_HASH is a RUNTIME env var in Coolify
# (node scripts/gate-hash.mjs "password"); empty = gate off. It is declared
# here so it is always defined, because the image's envsubst step only
# substitutes variables that exist. NGINX_ENVSUBST_FILTER restricts
# substitution to SITE_GATE_* so nginx's own $variables are never touched.
ENV SITE_GATE_HASH="" \
    NGINX_ENVSUBST_FILTER="^SITE_GATE_"

# The image renders /etc/nginx/templates/*.template into /etc/nginx/conf.d/
# at startup. Remove the stock default.conf so only ours is ever loaded.
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Refuses to start on a malformed SITE_GATE_HASH (runs before the template
# is rendered). CRs stripped in case of a Windows checkout.
COPY docker/18-site-gate-check.sh /docker-entrypoint.d/18-site-gate-check.sh
RUN sed -i 's/\r$//' /docker-entrypoint.d/18-site-gate-check.sh \
    && chmod 755 /docker-entrypoint.d/18-site-gate-check.sh

COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
