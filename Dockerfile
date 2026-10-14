FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY services ./services
COPY logic ./logic
COPY samples ./samples
ENV NODE_ENV=production PORT=10000
USER node
EXPOSE 10000
CMD ["node","services/api/index.cjs"]
