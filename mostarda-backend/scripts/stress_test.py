#!/usr/bin/env python3
"""
MOSTARDA — Motor de Estresse por Concorrência

Valida dois cenários críticos contra a API local:

  Cenário A (Fila Atômica de Telemetria):
    50 workers enviando PoPs simultaneamente → valida sequence_number
    incremental sem gaps ou duplicatas no SequenceService.

  Cenário B (Rate Limiting de Autenticação):
    20 requisições de login em 4s do mesmo IP → valida HTTP 429
    com cabeçalho Retry-After.

Uso:
  python scripts/stress_test.py                          # Teste completo
  python scripts/stress_test.py --users 100              # 100 PoP workers
  python scripts/stress_test.py --scenario pop           # Só Cenário A
  python scripts/stress_test.py --scenario ratelimit     # Só Cenário B
  python scripts/stress_test.py --base-url http://localhost:8000
"""

import argparse
import asyncio
import json
import statistics
import sys
import time
from dataclasses import dataclass, field
from typing import Optional


BASE_URL = "http://localhost:8000"


# ── Data Classes ──────────────────────────────────────


@dataclass
class RequestResult:
    status: int
    elapsed_ms: float
    body: Optional[dict] = None
    headers: Optional[dict] = None
    error: Optional[str] = None


@dataclass
class ScenarioResult:
    name: str
    total: int = 0
    success_200: int = 0
    rate_limited_429: int = 0
    errors: int = 0
    times_ms: list[float] = field(default_factory=list)
    sequences: list[int] = field(default_factory=list)
    has_retry_after: bool = False


# ── Helpers ───────────────────────────────────────────


def bold(text: str) -> str:
    return f"\033[1m{text}\033[0m"


def green(text: str) -> str:
    return f"\033[92m{text}\033[0m"


def red(text: str) -> str:
    return f"\033[91m{text}\033[0m"


def yellow(text: str) -> str:
    return f"\033[93m{text}\033[0m"


def cyan(text: str) -> str:
    return f"\033[96m{text}\033[0m"


def header(text: str):
    print()
    print("=" * 64)
    print(f"  {text}")
    print("=" * 64)


def divider():
    print("-" * 64)


# ── Authentication ────────────────────────────────────


async def register_user(client) -> tuple[str, str]:
    """Register a temp user for testing. Returns (access_token, user_id)."""
    import random
    import string

    suffix = "".join(random.choices(string.ascii_lowercase, k=6))
    payload = {
        "name": f"Stress Tester {suffix}",
        "email": f"stress.{suffix}@mostarda.test",
        "password": "Teste1234",
    }
    resp = await client.post(
        f"{BASE_URL}/api/v1/auth/register",
        json=payload,
    )
    data = resp.json()
    if resp.status_code != 200:
        print(f"  ⚠️ Register returned {resp.status_code}: {data}")
        # Try login instead (user may already exist)
        return await login_user(client, payload["email"], payload["password"])
    return data["access_token"], data.get("user_id", "unknown")


async def login_user(client, email: str, password: str) -> tuple[Optional[str], str]:
    """Login and return (access_token, error_reason)."""
    resp = await client.post(
        f"{BASE_URL}/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    data = resp.json()
    if resp.status_code == 200:
        return data["access_token"], ""
    return None, f"HTTP {resp.status_code}: {data.get('detail', 'unknown')}"


# ── Scenario A: PoP Sequence Stress ───────────────────


async def send_pop(client, token: str, pop_id: int) -> RequestResult:
    """Send a single PoP to the API."""
    t0 = time.monotonic()
    try:
        resp = await client.post(
            f"{BASE_URL}/api/v1/blockchain/proof-of-play",
            json={
                "tv_id": f"tv_stress_{pop_id % 10}",
                "slot_id": f"slot_stress_{pop_id}",
                "campaign_id": f"camp_stress_{pop_id % 5}",
                "audience": pop_id * 10,
                "ts": int(time.time()),
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        elapsed = (time.monotonic() - t0) * 1000
        body = resp.json() if resp.text else {}
        return RequestResult(
            status=resp.status_code,
            elapsed_ms=elapsed,
            body=body,
            headers=dict(resp.headers),
        )
    except Exception as e:
        elapsed = (time.monotonic() - t0) * 1000
        return RequestResult(status=0, elapsed_ms=elapsed, error=str(e))


async def scenario_a(token: str, num_workers: int) -> ScenarioResult:
    """Cenário A: Múltiplos PoPs concorrentes → validar sequência atômica."""
    header(f"🧪 CENÁRIO A — Fila Atômica ({num_workers} PoPs concorrentes)")
    print(f"  Disparando {num_workers} requisições PoP em paralelo...")

    async with httpx.AsyncClient(timeout=30.0) as client:
        tasks = [send_pop(client, token, i) for i in range(num_workers)]
        results = await asyncio.gather(*tasks)

    result = ScenarioResult(name="Proof of Play — Concorrência")

    for r in results:
        result.total += 1
        result.times_ms.append(r.elapsed_ms)
        if r.status == 200:
            result.success_200 += 1
            seq = (r.body or {}).get("sequence", 0)
            if seq:
                result.sequences.append(seq)
        elif r.status == 429:
            result.rate_limited_429 += 1
        else:
            result.errors += 1

    # ── Validação de sequência ─────────────────────────
    validator_error = None
    if result.sequences:
        sorted_seqs = sorted(result.sequences)
        expected = list(range(sorted_seqs[0], sorted_seqs[-1] + 1))
        missing = sorted(set(expected) - set(sorted_seqs))
        duplicates = len(result.sequences) - len(set(result.sequences))

        print(f"\n  📊 Sequências coletadas: {len(result.sequences)}")
        print(f"     Min: {sorted_seqs[0]}  |  Max: {sorted_seqs[-1]}")
        print(f"     Gaps: {len(missing)}  |  Duplicatas: {duplicates}")

        if missing and len(missing) <= 10:
            validator_error = f"Gaps encontrados: {missing}"
            print(f"     {red('❌ VALIDAÇÃO: FALHOU — gaps detectados')}")
            print(f"     {red(f'       {validator_error}')}")
        elif missing:
            validator_error = f"{len(missing)} gaps encontrados (primeiros: {missing[:5]}...)"
            print(f"     {red('❌ VALIDAÇÃO: FALHOU — gaps detectados')}")
        elif duplicates > 0:
            validator_error = f"{duplicates} sequências duplicadas"
            print(f"     {red('❌ VALIDAÇÃO: FALHOU — duplicatas detectadas')}")
        else:
            print(f"     {green('✅ VALIDAÇÃO: OK — sem gaps, sem duplicatas')}")

        result.sequences = sorted_seqs
    else:
        validator_error = "Nenhuma sequência retornada"
        print(f"     {yellow('⚠️ VALIDAÇÃO: sem dados de sequência')}")

    return result


# ── Scenario B: Rate Limit Brute Force ────────────────


async def scenario_b() -> ScenarioResult:
    """Cenário B: >15 logins em <5s do mesmo IP → validar 429."""
    header("🧪 CENÁRIO B — Rate Limiting (força bruta)")
    print("  Disparando 20 requisições de login em 4 segundos...")

    result = ScenarioResult(name="Rate Limit — Força Bruta")
    credentials = {"email": "admin@mostarda.io", "password": "wrong_password_123"}

    async with httpx.AsyncClient(timeout=10.0) as client:
        t0 = time.monotonic()
        # Fire 20 concurrent login requests
        tasks = []
        for _ in range(20):
            tasks.append(
                client.post(
                    f"{BASE_URL}/api/v1/auth/login",
                    json=credentials,
                )
            )
        responses = await asyncio.gather(*tasks)
        elapsed_total = (time.monotonic() - t0) * 1000

        for resp in responses:
            result.total += 1
            result.times_ms.append(elapsed_total / 20)  # approximate per-request
            if resp.status_code == 200:
                result.success_200 += 1
            elif resp.status_code == 429:
                result.rate_limited_429 += 1
                retry = resp.headers.get("Retry-After")
                if retry:
                    result.has_retry_after = True
            else:
                result.errors += 1

    print(f"\n  📊 Requisições: {result.total}")
    print(f"     200 OK:     {result.success_200}")
    print(f"     429 Bloqueio: {result.rate_limited_429}")
    print(f"     Retry-After presente: {'✅ SIM' if result.has_retry_after else '❌ NÃO'}")

    # Validação
    if result.rate_limited_429 >= 10 and result.has_retry_after:
        print(f"     {green('✅ VALIDAÇÃO: OK — rate limit ativo com Retry-After')}")
    elif result.rate_limited_429 > 0 and not result.has_retry_after:
        print(f"     {yellow('⚠️ VALIDAÇÃO PARCIAL: 429 recebido mas sem Retry-After')}")
    elif result.rate_limited_429 == 0:
        print(f"     {red('❌ VALIDAÇÃO: FALHOU — nenhum 429 retornado. Rate limit inoperante?')}")
    else:
        print(f"     {red('❌ VALIDAÇÃO: FALHOU — menos de 10 bloqueios. Algo errado.')}")

    return result


# ── Report ─────────────────────────────────────────────


def print_report(a_result: ScenarioResult, b_result: ScenarioResult, duration: float):
    """Print a beautiful ASCII report table."""
    print()
    print(bold("=" * 64))
    print(bold("  🍅 MOSTARDA — RELATÓRIO DE ESTRESSE"))
    print(bold("=" * 64))

    # Compute stats
    def stats(times: list[float]) -> tuple:
        if not times:
            return (0, 0, 0)
        return (
            round(min(times), 1),
            round(statistics.mean(times), 1),
            round(max(times), 1),
        )

    a_min, a_avg, a_max = stats(a_result.times_ms)
    b_min, b_avg, b_max = stats(b_result.times_ms)

    print(f"""
{bold('📋 RESUMO GERAL')}
  Duração total:           {duration:.1f}s
  Workers PoP:             {a_result.total}

{bold('📊 CENÁRIO A — Sequência Atômica (PoP)')}
  Total requisições:       {a_result.total}
  ✅ 200 OK:               {a_result.success_200}  ({a_result.success_200 / max(a_result.total, 1) * 100:.0f}%)
  🟡 429 Rate Limit:       {a_result.rate_limited_429}
  ❌ Erros:                {a_result.errors}
  ⏱️  Tempo resposta:       min={a_min}ms  |  avg={a_avg}ms  |  max={a_max}ms
  🔢 Sequência mín/máx:    {a_result.sequences[0] if a_result.sequences else 'N/A'} / {a_result.sequences[-1] if a_result.sequences else 'N/A'}
  🔢 Total sequências:     {len(a_result.sequences)}
  🔢 Gaps:                 {max(0, (a_result.sequences[-1] - a_result.sequences[0] + 1) - len(a_result.sequences)) if len(a_result.sequences) > 1 else 'N/A'}

{bold('📊 CENÁRIO B — Rate Limit (Força Bruta)')}
  Total requisições:       {b_result.total}
  ✅ 200 OK (sucesso):     {b_result.success_200}
  🟡 429 Bloqueios:        {b_result.rate_limited_429}
  ❌ Erros:                {b_result.errors}
  ⏱️  Tempo resposta:       min={b_min}ms  |  avg={b_avg}ms  |  max={b_max}ms
  🛡️  Retry-After header:  {'✅ Presente' if b_result.has_retry_after else '❌ Ausente'}
""")

    # Final verdict
    a_pass = len(a_result.sequences) > 0 and (
        (a_result.sequences[-1] - a_result.sequences[0] + 1) == len(a_result.sequences)
        if len(a_result.sequences) > 1 else True
    )
    b_pass = b_result.rate_limited_429 >= 10 and b_result.has_retry_after

    print(bold("🏁 VEREDITO FINAL"))
    print(f"  {'✅' if a_pass else '❌'} Cenário A (Fila Atômica):     {'APROVADO' if a_pass else 'REPROVADO'}")
    print(f"  {'✅' if b_pass else '❌'} Cenário B (Rate Limit):       {'APROVADO' if b_pass else 'REPROVADO'}")
    print()


# ── Main ──────────────────────────────────────────────


async def main():
    parser = argparse.ArgumentParser(description="MOSTARDA — Motor de Estresse")
    parser.add_argument("--base-url", default=BASE_URL, help="API base URL")
    parser.add_argument(
        "--scenario", choices=["all", "pop", "ratelimit"],
        default="all", help="Which scenario to run",
    )
    parser.add_argument("--users", type=int, default=50, help="PoP workers (Cenário A)")
    args = parser.parse_args()

    global BASE_URL
    BASE_URL = args.base_url

    import httpx

    print()
    print(bold("🍅 MOSTARDA — Motor de Estresse por Concorrência"))
    print(f"  API: {cyan(BASE_URL)}")
    print(f"  Cenário A: {args.users} PoPs concorrentes")
    if args.scenario in ("all", "pop"):
        print(f"  Cenário B: 20 logins em 4s (força bruta)")
    print()

    t_start = time.monotonic()
    a_result = ScenarioResult(name="Proof of Play — Concorrência")
    b_result = ScenarioResult(name="Rate Limit — Força Bruta")

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Register a test user
        print("📝 Registrando usuário de teste...")
        token, _ = await register_user(client)

    if args.scenario in ("all", "pop"):
        a_result = await scenario_a(token, args.users)

    if args.scenario in ("all", "ratelimit"):
        b_result = await scenario_b()

    duration = time.monotonic() - t_start
    print_report(a_result, b_result, duration)


if __name__ == "__main__":
    asyncio.run(main())
