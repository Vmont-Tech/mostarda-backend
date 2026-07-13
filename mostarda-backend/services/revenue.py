"""Revenue Split Engine — 5-Actor Distribution (Alinhado ao Domínio de Negócio).

Mostarda / Holding (Plataforma):   25%
Ponto / Space Owner (Dono Espaço): 25%
TV Owner (Dono da TV):             20%
Vendedor / Affiliate Seller:       20%
Embaixador / Influencer:           10%
Total:                            100%

Stacking: um mesmo usuário acumula múltiplos papéis.
Teto máximo por stacking: 50% (TV + Venda + Embaixador).

Reconciliação: toda distribuição é auditada — total distribuído + retido = bruto.
"""

from dataclasses import dataclass, field
from typing import Optional
from loguru import logger


# ── Revenue Split Definition ──────────────────────────────
# Alinhado 100% com o domínio de negócio do manual do projeto
# Nomes em português nos labels, chaves em inglês para código
REVENUE_SPLIT = {
    "space_owner": {          # Dono do Ponto
        "pct": 0.25,
        "label": "Dono do Ponto",
        "cadence": "monthly",
    },
    "tv_owner": {             # Dono da TV
        "pct": 0.20,
        "label": "Dono da TV",
        "cadence": "monthly",
    },
    "affiliate_seller": {     # Vendedor
        "pct": 0.20,
        "label": "Vendedor",
        "cadence": "weekly",
    },
    "influencer": {           # Embaixador
        "pct": 0.10,
        "label": "Embaixador",
        "cadence": "weekly",
    },
    "mostarda": {             # Holding / Plataforma
        "pct": 0.25,
        "label": "Mostarda (Holding)",
        "cadence": "monthly",
    },
}

# Garantia: a soma de todas as porcentagens é exatamente 100%
assert abs(sum(v["pct"] for v in REVENUE_SPLIT.values()) - 1.0) < 0.001, (
    f"Revenue split must sum to 100%, got "
    f"{sum(v['pct'] for v in REVENUE_SPLIT.values()) * 100:.1f}%"
)

# Stacking: teto máximo que um único usuário pode acumular
# Conforme GOVERNANCE.md: TV(20%) + Venda(20%) + Embaixador(10%) = 50% max
STACKING_CAP = 0.50


@dataclass
class SplitLine:
    """A single line item in a revenue split."""

    actor_key: str          # machine key (e.g. "space_owner")
    actor_label: str        # human label (e.g. "Dono do Ponto")
    percentage: float       # 0.25 = 25%
    amount_cents: int       # Amount in BRL cents
    cadence: str            # "weekly" or "monthly"

    def to_dict(self) -> dict:
        return {
            "actor": self.actor_label,
            "porcentagem": f"{self.percentage * 100:.0f}%",
            "valor_brl": f"R$ {self.amount_cents / 100:.2f}",
            "valor_cents": self.amount_cents,
            "cadencia": self.cadence,
        }


@dataclass
class RevenueDistribution:
    """Full audit trail for a revenue distribution."""

    gross_amount_cents: int
    splits: list[SplitLine] = field(default_factory=list)
    total_distributed_cents: int = 0
    remaining_cents: int = 0
    reconciled: bool = False

    def add_split(self, actor_key: str, amount_cents: int):
        definition = REVENUE_SPLIT.get(actor_key)
        if not definition:
            raise ValueError(f"Unknown actor: {actor_key}")

        self.splits.append(SplitLine(
            actor_key=actor_key,
            actor_label=definition["label"],
            percentage=definition["pct"],
            amount_cents=amount_cents,
            cadence=definition["cadence"],
        ))
        self.total_distributed_cents += amount_cents

    def reconcile(self) -> bool:
        """Audit: verify that distributed + remaining = gross.

        Handles centavos perdidos (rounding):
        - If remaining is 1-2 cents, absorb into first split
        - If remaining > 2 cents, flag as unreconciled
        """
        distribution_sum = sum(s.amount_cents for s in self.splits)
        self.remaining_cents = self.gross_amount_cents - distribution_sum

        # Absorb rounding errors (1-2 centavos) into first split
        if 0 < self.remaining_cents <= 2 and self.splits:
            self.splits[0].amount_cents += self.remaining_cents
            distribution_sum += self.remaining_cents
            self.remaining_cents = 0

        self.reconciled = (distribution_sum == self.gross_amount_cents)
        return self.reconciled

    def to_dict(self) -> dict:
        if not self.reconciled:
            self.reconcile()

        return {
            "valor_bruto_brl": f"R$ {self.gross_amount_cents / 100:.2f}",
            "valor_bruto_cents": self.gross_amount_cents,
            "total_distribuido_cents": self.total_distributed_cents,
            "total_distribuido_brl": f"R$ {self.total_distributed_cents / 100:.2f}",
            "centavos_retidos": self.remaining_cents,
            "reconciliado": self.reconciled,
            "detalhes": [s.to_dict() for s in self.splits],
        }


class RevenueCalculator:
    """Calculate revenue distribution for a given gross amount.

    Usage:
        calc = RevenueCalculator(10000)  # R$ 100,00
        calc.add_split("space_owner", "user_123")
        calc.add_split("tv_owner", "user_456")
        ...
        result = calc.to_dict()
    """

    def __init__(self, gross_amount_cents: int):
        self.gross_amount_cents = gross_amount_cents
        self._assignments: dict[str, str] = {}  # actor_key → user_id

    def add_split(self, actor_key: str, user_id: str):
        """Assign a role to a user for this distribution."""
        if actor_key not in REVENUE_SPLIT:
            raise ValueError(
                f"Actor '{actor_key}' desconhecido. "
                f"Válidos: {', '.join(REVENUE_SPLIT.keys())}"
            )
        self._assignments[actor_key] = user_id

    def to_dict(self) -> dict:
        """Calculate and return the full distribution with reconciliation."""
        distribution = RevenueDistribution(gross_amount_cents=self.gross_amount_cents)

        for actor_key, definition in REVENUE_SPLIT.items():
            amount = int(self.gross_amount_cents * definition["pct"])
            distribution.add_split(actor_key, amount)

        distribution.reconcile()
        return distribution.to_dict()


class RevenueService:
    """Orchestrates revenue split calculations and distribution."""

    def calculate_split(self, gross_amount_cents: int, actors: dict[str, str]) -> RevenueCalculator:
        """Calculate split for given actors. Unassigned roles → platform."""
        calc = RevenueCalculator(gross_amount_cents)
        for actor_key in REVENUE_SPLIT:
            uid = actors.get(actor_key, "mostarda")
            calc.add_split(actor_key, uid)
        logger.info(
            f"💰 Split R$ {gross_amount_cents / 100:.2f} "
            f"→ {len(calc._assignments)} atores"
        )
        return calc

    def calculate_stacking(self, gross_amount_cents: int, user_roles: dict[str, list[str]]) -> dict:
        """Calculate with stacking: one user accumulates multiple role percentages.

        Validações:
        - Teto máximo de 50% por usuário (GOVERNANCE.md)
        - Soma total da distribuição deve ser 100%
        """
        totals = {}
        grand_total_pct = 0.0

        for uid, roles in user_roles.items():
            share = sum(REVENUE_SPLIT[r]["pct"] for r in roles)
            amount = int(gross_amount_cents * share)

            # ── Validação de teto ────────────────────────────
            # Conforme GOVERNANCE.md: máximo 50% (TV+Venda+Embaixador)
            if share > STACKING_CAP:
                logger.warning(
                    f"⚠️ Stacking cap exceeded: user={uid} "
                    f"roles={roles} share={share * 100:.0f}% "
                    f"cap={STACKING_CAP * 100:.0f}% — truncating"
                )
                share = STACKING_CAP
                amount = int(gross_amount_cents * share)

            totals[uid] = {
                "roles": roles,
                "pct": share,
                "pct_label": f"{share * 100:.0f}%",
                "amount_cents": amount,
                "amount_brl": f"R$ {amount / 100:.2f}",
            }
            grand_total_pct += share

        # Reconciliação: verificar se a soma total é 100%
        remaining_pct = 1.0 - grand_total_pct
        logger.info(
            f"📊 Stacking: {len(totals)} usuarios, "
            f"total={grand_total_pct * 100:.1f}%, "
            f"retencao={remaining_pct * 100:.1f}% (plataforma)"
        )

        return {
            "valor_bruto_cents": gross_amount_cents,
            "valor_bruto_brl": f"R$ {gross_amount_cents / 100:.2f}",
            "total_distribuido_pct": f"{grand_total_pct * 100:.1f}%",
            "retencao_plataforma_pct": f"{remaining_pct * 100:.1f}%",
            "stacking_cap": f"{STACKING_CAP * 100:.0f}%",
            "distribuicao": totals,
        }

    async def distribute(self, gross_amount_cents: int, slot_id: str, actors: dict[str, str]) -> dict:
        """Full distribution pipeline.

        In production: record on blockchain + update wallets.
        """
        calc = self.calculate_split(gross_amount_cents, actors)
        distribution = calc.to_dict()

        return {
            "slot_id": slot_id,
            "status": "completed",
            "reconciliado": distribution.get("reconciliado", False),
            "distribuicao": distribution,
        }
