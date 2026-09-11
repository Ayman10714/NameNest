from __future__ import annotations
from typing import List

PREFIXES = ["get", "try", "use", "my", "hey", "join", "the"]
SUFFIXES = ["app", "hq", "io", "labs", "hub", "co", "ify", "ly"]


def generate_variants(name: str, max_variants: int = 24) -> List[str]:
    name = name.strip().lower()
    variants: list[str] = []
    for p in PREFIXES: variants.append(f"{p}{name}")
    for s in SUFFIXES: variants.append(f"{name}{s}")
    variants += [f"{name}now", f"{name}ai", f"{name}xyz", f"real{name}"]
    seen, unique = set(), []
    for v in variants:
        if v not in seen and v != name:
            seen.add(v); unique.append(v)
    return unique[:max_variants]