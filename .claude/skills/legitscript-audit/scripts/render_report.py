#!/usr/bin/env python3
"""Render REGISTER.md and report.md from a findings.json.

findings.json is the source of truth; the markdown is generated. Never hand-edit
the markdown -- edit the findings and re-render, or the next run overwrites you.

    python render_report.py docs/compliance/legitscript/2026-09-22/findings.json
"""

from __future__ import annotations

import collections
import json
import os
import sys

EFFORT = {"S": 0, "M": 1, "L": 2}
OWNER_LABEL = {
    "you-provide": "WellPeps (Derek)",
    "web-team": "Web team",
    "lawyer": "Lawyer",
    "provider-group": "Provider group / Scriptful",
    "pharmacy-partner": "Pharmacy partner",
}
OWNER_ORDER = ["web-team", "you-provide", "lawyer", "provider-group", "pharmacy-partner"]
STANDARD_NAMES = {
    1: "Licensure & Business Registration",
    2: "Legal Compliance",
    3: "Prior Discipline and History",
    4: "Affiliates and Partners",
    5: "Patient Services",
    6: "Privacy",
    7: "Validity of Prescription",
    8: "Transparency",
    9: "Advertising",
}
PREAMBLE = [
    "WellPeps is applying for LegitScript Healthcare Merchant Certification as an",
    "established client on **Scriptful's Enterprise LegitScript Certification** — the",
    "dispensing pharmacies and prescribing physicians are already certified under it.",
    "",
    "That means the clinical and dispensing chain is largely pre-answered, and the work",
    "concentrates on WellPeps' own website and business transparency. **The standards",
    "currently failing are precisely the ones the enterprise certification does not",
    "cover.**",
]


def evidence_line(e: dict) -> str:
    if e["kind"] == "file":
        loc = f"`{e['path']}:{e.get('line', '')}`".replace(":`", "`")
        return f"{loc} — {e.get('quote') or e.get('note', '')}"
    if e["kind"] == "url":
        return f"{e['path']} — {e.get('note') or e.get('quote', '')}"
    return f"`{e['path']}` — {e.get('note', '')}"


def render_register(F: list[dict], run_id: str, today: str) -> str:
    by_status = collections.Counter(x["status"] for x in F)
    blockers = [x for x in F if x["blocks_application"] and x["status"] != "resolved"]

    out = ["# LegitScript certification register", "",
           f"**Run:** `{run_id}`  ·  **Last updated:** {today}", ""]
    out += PREAMBLE
    out += ["", f"## Where we stand ({len(F)} requirements checked)", "",
            "| Status | Count |", "|---|---|"]
    for k in ("open", "in-progress", "resolved", "accepted-risk", "not-applicable"):
        if by_status.get(k):
            out.append(f"| {k} | {by_status[k]} |")
    out += ["", f"**{len(blockers)} items block submission.**", "",
            "## Must be true before we submit", "",
            "Ordered by owner, then by effort. Everything here is unresolved.", ""]

    for owner in OWNER_ORDER:
        items = sorted((x for x in blockers if x["owner"] == owner),
                       key=lambda x: (EFFORT[x["remediation"]["effort"]], x["id"]))
        if not items:
            continue
        out += [f"### {OWNER_LABEL[owner]}  ({len(items)})", ""]
        for x in items:
            out.append(f"- **{x['title']}**  ")
            out.append(f"  `{x['id']}` · {x['severity']} · effort "
                       f"{x['remediation']['effort']} — {x['remediation']['action']}")
        out.append("")

    out += ["## Everything, by standard", "",
            "| ID | Std | Sev | Blocks | Status | Owner |", "|---|---|---|---|---|---|"]
    for x in sorted(F, key=lambda x: (x["standard"], x["id"])):
        out.append(f"| `{x['id']}` | {x['standard']} | {x['severity']} | "
                   f"{'yes' if x['blocks_application'] else '—'} | {x['status']} | {x['owner']} |")

    decisions = [x for x in F if x.get("note") and "decision" in x["note"].lower()]
    out += ["", "## Decisions we need from a person", ""]
    for x in decisions:
        out.append(f"- **{x['title']}** — {x['note']}")
    out += ["- **The draft legal pages: finish, or unpublish?** Unpublishing is a one-line",
            "  change and is strictly better than shipping visible placeholders. This is the",
            "  single biggest application risk and should not sit undecided.", "",
            "---", "",
            "Generated from `findings.json` by the `legitscript-audit` skill. Do not edit by",
            "hand — edit the findings and re-render.", ""]
    return "\n".join(out)


def render_report(F: list[dict], run_id: str, today: str) -> str:
    """Standard-organised view: the shape LegitScript's own correspondence uses."""
    out = ["# LegitScript readiness report", "",
           f"**Run:** `{run_id}`  ·  **Last updated:** {today}", ""]
    out += PREAMBLE
    out += ["",
            "Organised by standard, because the application form and any remediation letter",
            "are structured this way. For the work queue, see `../REGISTER.md`.", ""]

    for std in range(1, 10):
        items = sorted((x for x in F if x["standard"] == std),
                       key=lambda x: (x["status"] == "resolved",
                                      not x["blocks_application"], x["id"]))
        if not items:
            continue
        blocking = sum(1 for x in items if x["blocks_application"] and x["status"] != "resolved")
        out += [f"## Standard {std} — {STANDARD_NAMES[std]}", "",
                f"{len(items)} requirement(s) · {blocking} blocking", ""]
        for x in items:
            flag = " · **blocks submission**" if x["blocks_application"] and x["status"] != "resolved" else ""
            out += [f"### {x['title']}", "",
                    f"`{x['id']}` · {x['severity']} · {x['status']} · owner: "
                    f"{OWNER_LABEL[x['owner']]}{flag}", "",
                    f"**Now:** {x['current_state']}", "",
                    f"**Needed:** {x['required_state']}", "",
                    f"**Fix:** {x['remediation']['action']} (effort {x['remediation']['effort']})", ""]
            if x["remediation"].get("depends_on"):
                out += ["**Depends on:** " + ", ".join(f"`{d}`" for d in x["remediation"]["depends_on"]), ""]
            if x.get("handoff"):
                h = x["handoff"]
                out += [f"**Hands off to** `{h['skill']}` (mode `{h['mode']}`, target `{h['target']}`) — "
                        "the audit records the gap; the wording change is that skill's.", ""]
            if x.get("note"):
                out += [f"> {x['note']}", ""]
            if x.get("evidence"):
                out.append("**Evidence:**")
                out += [f"- {evidence_line(e)}" for e in x["evidence"]]
                out.append("")
    return "\n".join(out)


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__, file=sys.stderr)
        return 2
    path = sys.argv[1]
    with open(path, encoding="utf-8") as fh:
        F = json.load(fh)

    day_dir = os.path.dirname(os.path.abspath(path))
    root = os.path.dirname(day_dir)
    run_id = F[0]["run_id"] if F else "unknown"
    today = F[0]["last_seen"] if F else ""

    with open(os.path.join(root, "REGISTER.md"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(render_register(F, run_id, today))
    with open(os.path.join(day_dir, "report.md"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(render_report(F, run_id, today))

    blockers = sum(1 for x in F if x["blocks_application"] and x["status"] != "resolved")
    print(f"rendered {len(F)} findings ({blockers} blocking)")
    print(f"  {os.path.join(root, 'REGISTER.md')}")
    print(f"  {os.path.join(day_dir, 'report.md')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
