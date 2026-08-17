# Multi-stage: the build stage needs the full node_modules/vite/typescript
# toolchain, but the actual served artifact is just static files - shipping
# the build stage's node_modules in the final image would be pure waste.
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Overridable at build time (see src/lib/api.ts) - defaults to this
# project's existing local-dev API location if not provided.
ARG VITE_API_BASE_URL=http://127.0.0.1:5000/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# tsc -b && vite build - the typecheck is folded into the build script
# itself (frontend/package.json), unlike client/'s plain `vite build`.
RUN npm run build

FROM nginx:1.27-alpine

LABEL org.opencontainers.image.source="https://github.com/Diya-R-Gowda/SupplyLens"

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
