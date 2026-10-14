FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends docker.io ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY logic ./logic
COPY samples ./samples
COPY services/runner ./services/runner
COPY services/shared/domain.cjs ./services/shared/domain.cjs
ENV PORT=8080
EXPOSE 8080
CMD ["node","services/runner/index.cjs"]
