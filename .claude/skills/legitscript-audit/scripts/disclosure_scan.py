#!/usr/bin/env python3
"""Presence/absence scanner for the LegitScript audit.

Answers "does the required disclosure exist?" over the site source, the built
output, and production. It deliberately does NOT judge claims -- that is the
sibling skill's job, and a regex claim scanner would drown a deadline week in
false positives.

Emits scan.json (raw hits). The agent turns hits into findings.

Stdlib only, matching eBooks/_build/parse_docs.py.

    python disclosure_scan.py --src --built --live
    python disclosure_scan.py --validate docs/compliance/legitscript/2026-09-22/findings.json
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import re
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
CHECKS = os.path.join(HERE, "checks.json")
STANDARDS = os.path.join(HERE, "..", "references", "standards.md")

SITE = "https://wellpeps.com"
UA = "WellPeps-LegitScript-Audit/1.0 (+internal compliance check)"

STATUSES = {"open", "in-progress", "resolved", "accepted-risk", "not-applicable"}
SEVERITIES = {"S1", "S2", "S3"}
OWNERS = {"you-provide", "web-team", "lawyer", "pharmacy-partner", "provider-group"}


def load_checks() -> dict:
    with open(CHECKS, encoding="utf-8") as fh:
        return json.load(fh)


def register_ids() -> set[str]:
    """Every requirement ID declared in references/standards.md (`### LS...`)."""
    try:
        with open(STANDARDS, encoding="utf-8") as fh:
            return set(re.findall(r"^###\s+(LS[1-9]-[A-Z0-9-]+)\s*$", fh.read(), re.MULTILINE))
    except OSError:
        return set()


def expand(scope: str, scopes: dict) -> list[str]:
    """Resolve a named scope to a sorted list of real files."""
    out: list[str] = []
    for pattern in scopes.get(scope, []):
        out.extend(glob.glob(os.path.join(REPO, pattern), recursive=True))
    return sorted(set(out))


#: Lines carrying these markers are the draft-template scaffolding on the legal
#: pages. They must never satisfy a must_exist check -- "You provide: your exact
#: legal name, e.g. WellPeps, Inc., a Delaware corporation" is the ABSENCE of a
#: legal entity name, not its presence. Calibrated against a real false pass
#: 2026-09-22, where this one placeholder satisfied both LS1-LEGAL-ENTITY-NAMED
#: and LS5-STATES-DISCLOSED.
PLACEHOLDER = r"ph--you|ph--web|ph--legal|You provide:|Web team:|Lawyer:"


def search(paths: list[str], pattern: str, exclude: str | None = None) -> list[dict]:
    """Every matching line, with enough context for the agent to judge it."""
    rx = re.compile(pattern, re.IGNORECASE)
    ex = re.compile(exclude, re.IGNORECASE) if exclude else None
    hits: list[dict] = []
    for path in paths:
        try:
            with open(path, encoding="utf-8", errors="replace") as fh:
                for n, line in enumerate(fh, 1):
                    if ex is not None and ex.search(line):
                        continue
                    if rx.search(line):
                        hits.append({
                            "path": os.path.relpath(path, REPO).replace("\\", "/"),
                            "line": n,
                            "text": line.strip()[:300],
                        })
        except OSError as exc:
            hits.append({"path": path, "line": 0, "text": f"UNREADABLE: {exc}"})
    return hits


def run_checks(checks: dict, scopes: dict, only_built: bool) -> list[dict]:
    results = []
    for check in checks:
        scope = check["scope"]
        if only_built and scope != "built":
            continue
        if not only_built and scope == "built":
            continue

        if check["kind"] == "must_exist_per_program":
            per = {}
            for program, rel in check["programs"].items():
                path = os.path.join(REPO, rel)
                hits = search([path], check["pattern"], check.get("exclude")) if os.path.exists(path) else []
                per[program] = {"present": bool(hits), "hits": hits}
            missing = sorted(p for p, v in per.items() if not v["present"])
            results.append({
                "id": check["id"],
                "standard": check["standard"],
                "kind": check["kind"],
                "verdict": "FAIL" if missing else "PASS",
                "missing_programs": missing,
                "per_program": per,
                "hint": check["hint"],
            })
            continue

        paths = expand(scope, scopes)

        # must_exist asks "is the real thing present?", so template scaffolding is
        # excluded by default. must_not_exist often looks FOR that scaffolding, so
        # it never gets the default exclusion.
        exclude = check.get("exclude")
        if check["kind"] == "must_exist":
            exclude = f"{PLACEHOLDER}|{exclude}" if exclude else PLACEHOLDER

        hits = search(paths, check["pattern"], exclude)

        # A real list (e.g. states served) needs several distinct values, not one
        # stray mention. min_distinct counts unique matched strings.
        # group(0), not findall: a pattern with capture groups would otherwise
        # yield tuples (or just the group), and min_distinct would silently
        # measure the wrong thing.
        distinct = sorted({m.group(0).strip().lower() for h in hits
                           for m in re.finditer(check["pattern"], h["text"], re.IGNORECASE)})
        need = check.get("min_distinct", 1)

        if check["kind"] == "must_exist":
            verdict = "PASS" if len(distinct) >= need else "FAIL"
        elif check["kind"] == "must_not_exist":
            verdict = "FAIL" if hits else "PASS"
        else:  # report_only
            verdict = "REVIEW"

        results.append({
            "id": check["id"],
            "standard": check["standard"],
            "kind": check["kind"],
            "verdict": verdict,
            "files_scanned": len(paths),
            "hit_count": len(hits),
            "distinct_matches": distinct[:60],
            "min_distinct": need,
            "excluded": exclude,
            "hits": hits[:60],
            "truncated": len(hits) > 60,
            "hint": check["hint"],
        })
    return results


def fetch(url: str) -> dict:
    """One request, redirects NOT followed, so we can see each hop's scheme."""
    req = urllib.request.Request(url, headers={"User-Agent": UA}, method="GET")

    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **kw):
            return None

    ctx = ssl.create_default_context()
    opener = urllib.request.build_opener(NoRedirect, urllib.request.HTTPSHandler(context=ctx))
    try:
        with opener.open(req, timeout=20) as resp:
            body = resp.read(400_000).decode("utf-8", errors="replace")
            return {"status": resp.status, "location": resp.headers.get("Location"), "body": body}
    except urllib.error.HTTPError as exc:
        body = ""
        try:
            body = exc.read(400_000).decode("utf-8", errors="replace")
        except Exception:
            pass
        return {"status": exc.code, "location": exc.headers.get("Location"), "body": body}
    except Exception as exc:
        return {"status": 0, "location": None, "body": "", "error": str(exc)}


def run_live(live: dict) -> dict:
    """The only pass that catches repo-vs-production drift.

    A fix in src/ is not live until deployed, and a reviewer only ever sees
    production. Checks: no HTTPS->HTTP downgrade on any hop, no draft markers in
    the served HTML, and expected contact details actually present.
    """
    downgrades, forbidden, missing, chains = [], [], [], []

    for route in live["routes"]:
        url = SITE + route
        chain, seen = [], set()
        final_body = ""
        for _ in range(6):
            if url in seen:
                break
            seen.add(url)
            resp = fetch(url)
            chain.append({"url": url, "status": resp["status"], "location": resp.get("location")})
            if resp.get("error"):
                chain[-1]["error"] = resp["error"]
                break
            loc = resp.get("location")
            if resp["status"] in (301, 302, 307, 308) and loc:
                nxt = urllib.parse.urljoin(url, loc) if not loc.startswith("http") else loc
                if url.startswith("https://") and nxt.startswith("http://"):
                    downgrades.append({"route": route, "from": url, "to": nxt, "status": resp["status"]})
                url = nxt
                continue
            final_body = resp["body"]
            break
        chains.append({"route": route, "chain": chain})

        for cid, pattern in live["forbidden_html"].items():
            for m in re.finditer(pattern, final_body, re.IGNORECASE):
                s = max(0, m.start() - 90)
                forbidden.append({
                    "id": cid,
                    "route": route,
                    "match": m.group(0),
                    "context": re.sub(r"\s+", " ", final_body[s:m.end() + 90]).strip(),
                })
                break  # one example per route per check is enough

        for cid, pattern in live.get("expect_in_html", {}).items():
            if route == "/" and not re.search(pattern, final_body, re.IGNORECASE):
                missing.append({"id": cid, "route": route, "expected": pattern})

    return {
        "site": SITE,
        "https_downgrades": downgrades,
        "forbidden_html": forbidden,
        "expected_but_absent": missing,
        "redirect_chains": chains,
    }


def validate(path: str) -> int:
    """Schema gate. A violation fails the run -- fix findings, not the schema."""
    with open(path, encoding="utf-8") as fh:
        findings = json.load(fh)

    # The authoritative register is references/standards.md, NOT checks.json.
    # checks.json is only the subset that can be scanned mechanically; plenty of
    # requirements (document production, human decisions) are real register items
    # with no automatable check. Validating against checks.json would reject them.
    known = register_ids()
    if not known:
        print(f"FAIL: no requirement IDs found in {STANDARDS}", file=sys.stderr)
        return 1
    errors: list[str] = []
    seen: set[str] = set()
    required = ("id", "standard", "title", "severity", "blocks_application",
                "status", "owner", "current_state", "required_state",
                "first_seen", "last_seen", "run_id")

    if not isinstance(findings, list):
        print("FAIL: findings.json must be a JSON array", file=sys.stderr)
        return 1

    for i, f in enumerate(findings):
        tag = f.get("id", f"#{i}")
        for field in required:
            if field not in f:
                errors.append(f"{tag}: missing required field '{field}'")
        if f.get("id") in seen:
            errors.append(f"{tag}: duplicate id")
        seen.add(f.get("id"))

        fid = f.get("id", "")
        if not re.match(r"^LS[1-9]-[A-Z0-9-]+$", fid):
            errors.append(f"{tag}: id must match LS<1-9>-<SLUG>")
        elif fid not in known and not re.search(r"-X\d+$", fid):
            errors.append(f"{tag}: id not in the register and not an -X<n> novel finding")
        if re.search(r"\.(ts|astro|json):\d+", fid):
            errors.append(f"{tag}: id must not encode file:line")

        if f.get("standard") not in range(1, 10):
            errors.append(f"{tag}: standard must be 1-9")
        if f.get("severity") not in SEVERITIES:
            errors.append(f"{tag}: severity must be one of {sorted(SEVERITIES)}")
        if f.get("status") not in STATUSES:
            errors.append(f"{tag}: status must be one of {sorted(STATUSES)}")
        if f.get("owner") not in OWNERS:
            errors.append(f"{tag}: owner must be one of {sorted(OWNERS)}")
        if not isinstance(f.get("blocks_application"), bool):
            errors.append(f"{tag}: blocks_application must be a boolean")

        if f.get("status") == "accepted-risk" and not (f.get("decided_by") and f.get("decided_on")):
            errors.append(f"{tag}: accepted-risk requires decided_by and decided_on")
        if f.get("status") != "not-applicable" and not f.get("evidence"):
            errors.append(f"{tag}: evidence[] may be empty only for not-applicable")

        for e in f.get("evidence", []):
            if e.get("kind") not in ("file", "url", "doc"):
                errors.append(f"{tag}: evidence kind must be file|url|doc")

    if errors:
        print(f"FAIL: {len(errors)} schema violation(s) in {path}", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 1

    print(f"OK: {len(findings)} finding(s) valid in {path}")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="LegitScript audit disclosure scanner")
    ap.add_argument("--src", action="store_true", help="scan site source")
    ap.add_argument("--built", action="store_true", help="scan wellpeps-site/dist (needs a fresh build)")
    ap.add_argument("--live", action="store_true", help="scan production (catches repo-vs-prod drift)")
    ap.add_argument("--validate", metavar="FINDINGS", help="validate a findings.json and exit")
    ap.add_argument("--out", default=None, help="write scan.json here")
    args = ap.parse_args()

    if args.validate:
        return validate(args.validate)

    if not (args.src or args.built or args.live):
        args.src = True

    cfg = load_checks()
    scopes = cfg["_scopes"]
    out: dict = {"scanned_on": date.today().isoformat(), "repo": REPO, "passes": []}

    if args.src:
        out["src"] = run_checks(cfg["checks"], scopes, only_built=False)
        out["passes"].append("src")

    if args.built:
        dist = os.path.join(REPO, "wellpeps-site", "dist")
        if not os.path.isdir(dist):
            out["built_error"] = "wellpeps-site/dist missing - run `npm run build` first"
        else:
            out["built"] = run_checks(cfg["checks"], scopes, only_built=True)
            out["built_stale_warning"] = "dist/ may be stale; rebuild before trusting this pass"
        out["passes"].append("built")

    if args.live:
        out["live"] = run_live(cfg["live"])
        out["passes"].append("live")

    dest = args.out or os.path.join(REPO, "scan.json")
    with open(dest, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2)

    fails = []
    for key in ("src", "built"):
        for r in out.get(key, []):
            if r["verdict"] == "FAIL":
                fails.append(f"  {r['id']:<42} FAIL  ({key})")
    live = out.get("live", {})
    if live.get("https_downgrades"):
        fails.append(f"  {'LS6-SSL-END-TO-END':<42} FAIL  ({len(live['https_downgrades'])} HTTPS->HTTP downgrades live)")
    for f in live.get("forbidden_html", []):
        fails.append(f"  {f['id']:<42} FAIL  (live: {f['route']})")

    print(f"scan.json -> {dest}")
    print(f"passes: {', '.join(out['passes'])}")
    if fails:
        print(f"\n{len(fails)} failing check(s):")
        for line in sorted(set(fails)):
            print(line)
    else:
        print("\nno failing checks")
    return 0


if __name__ == "__main__":
    sys.exit(main())
