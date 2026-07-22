# Pin the signed upstream image. Do not replace this with main/latest tags.
FROM ghcr.io/berriai/litellm:v1.93.0

COPY config.yaml /app/config.yaml

EXPOSE 4000

CMD ["--config", "/app/config.yaml", "--port", "4000"]
