# Multi-stage: the build stage needs the full node_modules/vite toolchain,
# but the actual served artifact is just static files - shipping the build
# stage's ~400MB of node_modules in the final image would be pure waste.
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Overridable at build time (see src/api/axios.js) - defaults to this
# project's existing local-dev API location if not provided.
ARG VITE_API_BASE_URL=http://127.0.0.1:5000/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
