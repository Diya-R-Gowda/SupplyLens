FROM node:22-alpine

WORKDIR /app

# Copy manifest files first so `npm ci` is only re-run when dependencies
# actually change, not on every source edit (Docker layer caching).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# No multi-stage build here - unlike the client, there's no build step
# (plain CommonJS Express served directly by node), so a second stage would
# only add complexity without shrinking the image.
ENV PORT=5000
EXPOSE 5000

CMD ["node", "index.js"]
