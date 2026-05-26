FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* ./
COPY packages ./packages
COPY apps/server ./apps/server
RUN npm install
RUN npm run build -w @jjk/game-core -w @jjk/shared-protocol -w @jjk/server

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/server ./apps/server
COPY package.json ./
ENV PORT=3001
EXPOSE 3001
CMD ["node", "apps/server/dist/index.js"]
