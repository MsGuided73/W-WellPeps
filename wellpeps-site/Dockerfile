# WellPeps marketing site — static build, served by nginx.
# Two stages: Node builds the static output, nginx serves it. No Node runtime
# in production. Build context is this directory (wellpeps-site) — in Coolify
# set the Base Directory to /wellpeps-site.

# --- Build stage -------------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

# Learning-center content is fetched from Supabase at BUILD time
# (src/lib/blog.ts), so these must be present as build args. In Coolify, add
# them as Build-time environment variables.
ARG SUPABASE_URL
ARG SUPABASE_PUBLISHABLE_KEY
ENV SUPABASE_URL=$SUPABASE_URL \
    SUPABASE_PUBLISHABLE_KEY=$SUPABASE_PUBLISHABLE_KEY

# Install deps from the lockfile first for layer caching.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Runtime stage -----------------------------------------------------------
FROM nginx:alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
