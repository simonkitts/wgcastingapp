# Backend Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY src ./src
COPY tsconfig.json ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY public ./public
COPY README.md ./
# Build frontend assets (for dev, not prod)
# RUN npm run build
EXPOSE 3001
CMD ["node", "server/index.js"]
