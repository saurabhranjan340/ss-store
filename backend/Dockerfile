FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate

EXPOSE 4000

CMD ["sh", "-c", "\
echo 'Starting SS Store API...' && \
node src/server.js & \
echo 'Running migrations in background...' && \
sleep 5 && npx prisma migrate deploy || echo 'Migration failed, continuing...' && \
wait \
"]
