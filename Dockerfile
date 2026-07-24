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
COPY wellpeps-site/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
