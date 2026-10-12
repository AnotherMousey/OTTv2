FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openjdk-17-jdk-headless python3 g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY logic ./logic
COPY samples ./samples
ENV NODE_ENV=production SERVE_FRONTEND=false PORT=10000 OTTV2_PYTHON=python3 MATCH_WORKERS=1
EXPOSE 10000
CMD ["node", "logic/main.js"]
