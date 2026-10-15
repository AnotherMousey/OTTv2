FROM node:26-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openjdk-17-jdk-headless python3 g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY logic ./logic
COPY services/runner/container.cjs ./services/runner/container.cjs
ENV NODE_ENV=production OTTV2_PYTHON=python3
USER 10001:10001
CMD ["node","services/runner/container.cjs"]
