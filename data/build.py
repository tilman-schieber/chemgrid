#!/usr/bin/env python3
"""Build data/elements.json, the single source of truth the game reads.

Sources:
  1. Bowserinator/Periodic-Table-JSON   name, symbol, number, mass, category, phase, period, group, block,
                                        density, melting and boiling points, electronegativity
  2. Wikidata                           year of discovery (P575)
  3. data/curated.json                  hand-kept lists (what an element is named after, where it was found ...)

Everything fetched is cached in data/raw/; delete a file there to refetch it.
Run: python3 data/build.py
"""
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).parent
RAW = HERE / "raw"
UA = "chemgrid-build/0.1 (personal hobby project)"
# Values for the superheavy elements are predictions, so the game does not use them.
LAST_MEASURED = 103


def fetch(url, cache_name, pause=0.05):
    path = RAW / cache_name
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        for attempt in range(6):
            try:
                with urllib.request.urlopen(req, timeout=60) as r:
                    path.write_bytes(r.read())
                break
            except urllib.error.HTTPError as e:
                if e.code == 404 or attempt == 5:
                    raise
                wait = int(e.headers.get("Retry-After") or 0) or 5 * (attempt + 1)
                print(f"  {cache_name}: HTTP {e.code}, waiting {wait}s", file=sys.stderr)
                time.sleep(wait)
            except OSError as e:
                if attempt == 5:
                    raise
                print(f"  retry {cache_name}: {e}", file=sys.stderr)
                time.sleep(2 * (attempt + 1))
        time.sleep(pause)
    return path.read_text()


def discovery_years():
    """Earliest discovery date Wikidata gives for each atomic number."""
    query = "SELECT ?z ?discovery WHERE { ?item wdt:P31 wd:Q11344; wdt:P1086 ?z; wdt:P575 ?discovery. }"
    url = "https://query.wikidata.org/sparql?format=json&query=" + urllib.parse.quote(query)
    years = {}
    for r in json.loads(fetch(url, "wikidata_discovery.json"))["results"]["bindings"]:
        z, date = int(r["z"]["value"]), r["discovery"]["value"]
        if r["discovery"].get("datatype") != "http://www.w3.org/2001/XMLSchema#dateTime":
            continue  # "unknown value" placeholders
        year = -int(date[1:5]) if date.startswith("-") else int(date[:4])
        years[z] = min(years.get(z, year), year)
    return years


def main():
    curated = json.loads((HERE / "curated.json").read_text())
    table = json.loads(fetch("https://raw.githubusercontent.com/Bowserinator/Periodic-Table-JSON/master/PeriodicTableJSON.json",
                             "ptable.json"))["elements"]
    table = [e for e in table if e["number"] <= 118]
    symbols = {e["symbol"] for e in table}

    problems = []
    for name, s in curated["sets"].items():
        members = s["members"]
        if len(set(members)) != s["expect"] or len(members) != len(set(members)):
            problems.append(f"curated set {name}: {len(set(members))} unique of {len(members)}, expected {s['expect']}")
        problems += [f"curated set {name}: unknown symbol {m}" for m in members if m not in symbols]
    if problems:
        sys.exit("\n".join(problems))

    years = discovery_years()
    out, report = [], []
    for e in table:
        sym, z = e["symbol"], e["number"]
        measured = z <= LAST_MEASURED
        year = curated["discovery_year_overrides"].get(sym, years.get(z))
        if year is None:
            report.append(f"no discovery year: {sym}")
        kelvin = lambda k: round(k - 273.15, 1) if (measured and k is not None) else None  # noqa: E731
        out.append({
            "id": sym,
            "name": e["name"],
            "number": z,
            "mass": round(e["atomic_mass"], 2),
            "category": e["category"] if measured else "unknown",
            "phase": e["phase"].lower() if measured else None,
            "period": e["period"],
            "group": e["group"] if e["category"] not in ("lanthanide", "actinide") else None,
            "block": e["block"],
            "density": e["density"] if measured else None,
            "melt": kelvin(e["melt"]),
            "boil": kelvin(e["boil"]),
            "electronegativity": e["electronegativity_pauling"] if measured else None,
            "discovered": year,
            "sets": sorted(k for k, s in curated["sets"].items() if sym in s["members"]),
        })

    (HERE / "elements.json").write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
    (HERE / "build-report.txt").write_text("\n".join(report) + "\n")
    print(f"wrote {len(out)} elements; {len(report)} notes in data/build-report.txt")


if __name__ == "__main__":
    main()
