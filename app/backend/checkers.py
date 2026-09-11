"""NameNest - Platform Name Availability Checkers"""

import re
import socket
import requests

BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

DOMAIN_TLDS = [".com", ".io", ".co", ".net", ".org", ".app", ".dev"]


def slugify(name: str) -> str:
    """Convert a name into a URL/handle-safe slug."""
    slug = name.strip().lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug


def is_valid_handle(name: str) -> bool:
    """Basic validation for a username/handle."""
    if not name:
        return False
    return bool(re.match(r"^[a-zA-Z0-9_-]{1,39}$", name))


def check_domain(name: str, tld: str = ".com") -> dict:
    """Check domain name availability using DNS resolution (best-effort)."""
    domain = f"{slugify(name)}{tld}"
    try:
        socket.gethostbyname(domain)
        available = False  # resolves -> likely taken
    except socket.gaierror:
        available = True  # no DNS record -> likely available
    except Exception:
        available = None  # unknown/error
    return {"platform": "domain", "name": domain, "available": available}


def check_all_domains(name: str) -> list:
    """Check the name across all configured TLDs."""
    return [check_domain(name, tld) for tld in DOMAIN_TLDS]


def check_github(name: str) -> dict:
    """Check GitHub username availability via the public API."""
    handle = slugify(name)
    try:
        resp = requests.get(
            f"https://api.github.com/users/{handle}",
            headers=BROWSER_HEADERS,
            timeout=5,
        )
        available = resp.status_code == 404
    except requests.RequestException:
        available = None
    return {"platform": "github", "name": handle, "available": available}


def _check_social_profile(platform: str, url_template: str, name: str) -> dict:
    handle = slugify(name)
    url = url_template.format(handle=handle)
    try:
        resp = requests.get(url, headers=BROWSER_HEADERS, timeout=5, allow_redirects=True)
        available = resp.status_code == 404
    except requests.RequestException:
        available = None
    return {"platform": platform, "name": handle, "available": available}


def check_all_social(name: str) -> list:
    """Check the name/handle across common social platforms."""
    platforms = {
        "twitter": "https://x.com/{handle}",
        "instagram": "https://www.instagram.com/{handle}/",
        "tiktok": "https://www.tiktok.com/@{handle}",
    }
    return [
        _check_social_profile(platform, template, name)
        for platform, template in platforms.items()
    ]


def check_google_play(name: str) -> dict:
    """Best-effort check for an app name on the Google Play Store."""
    query = slugify(name).replace("-", "+")
    try:
        resp = requests.get(
            f"https://play.google.com/store/search?q={query}&c=apps",
            headers=BROWSER_HEADERS,
            timeout=5,
        )
        taken = resp.status_code == 200 and name.lower() in resp.text.lower()
        available = not taken
    except requests.RequestException:
        available = None
    return {"platform": "google_play", "name": name, "available": available}


def check_uspto_trademark(name: str) -> dict:
    """Best-effort placeholder for a USPTO trademark search.

    NOTE: USPTO doesn't offer a simple public REST endpoint for this;
    this is a placeholder returning 'unknown' until a proper integration
    (e.g. USPTO TSDR/TESS API) is wired in.
    """
    return {"platform": "uspto_trademark", "name": name, "available": None}