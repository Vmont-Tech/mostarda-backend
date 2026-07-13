# ── MOSTARDA Backend — Production Dockerfile ──
# Multi-stage build: dependencies in build stage, runtime only in final image
# No --reload: production does not watch files
# HEALTHCHECK: container orchestration detects liveness
# Non-root user: defense in depth

# ── Stage 1: Build ─────────────────────────────────
FROM python:3.12-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Cache dependencies separately (Docker layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt


# ── Stage 2: Runtime ───────────────────────────────
FROM python:3.12-slim AS runtime

# Only runtime dependencies (no gcc, no build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 curl \
    && rm -rf /var/lib/apt/lists/* \
    && addgroup --system mostarda \
    && adduser --system --ingroup mostarda mostarda

# Copy installed packages from builder
COPY --from=builder /root/.local /home/mostarda/.local
ENV PATH=/home/mostarda/.local/bin:$PATH

WORKDIR /app

# Application code
COPY --chown=mostarda:mostarda . .

# Switch to non-root user
USER mostarda

EXPOSE 8000

# No --reload flag (production mode)
# Workers = 4 for parallel request handling
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
