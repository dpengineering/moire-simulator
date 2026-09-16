#!/usr/bin/env python3
"""Bundle the moiré simulator into one self-contained HTML file.

Reads the individual source files in this directory and writes
``moire-standalone.html`` with all CSS, JavaScript, the gifenc library, and the
logo inlined -- suitable for pasting into a Google Sites embed or hosting as a
single file. Run it after changing any source file:

    python3 build-standalone.py
"""
import base64
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / "moire-standalone.html"

html = (ROOT / "index.html").read_text()
css = (ROOT / "styles.css").read_text()
js = (ROOT / "script.js").read_text()
gif = (ROOT / "gifenc.js").read_text()
expjs = (ROOT / "export-gif.js").read_text()
png = (ROOT / "DPEA_Logo.png").read_bytes()

data_uri = "data:image/png;base64," + base64.b64encode(png).decode("ascii")

# --- script.js: drop the cache-busting redirect (harmful inside an iframe) ---
assert "const imageContainer" in js
js = js[js.index("const imageContainer"):]

# Capture the inlined logo as the default image, apply it to both discs, and
# route every "DPEA_Logo.png?v=3" reference (the Same-Design fallback) to it.
anchor = 'const image2 = document.getElementById("image2");\n'
assert anchor in js
js = js.replace(
    anchor,
    anchor + "const DEFAULT_IMAGE = image1.src;\nimage2.src = DEFAULT_IMAGE;\n",
)
assert '"DPEA_Logo.png?v=3"' in js
js = js.replace('"DPEA_Logo.png?v=3"', "DEFAULT_IMAGE")

# --- gifenc + export-gif: strip the ES-module import/export so the code runs
# as a plain classic script inside an isolating IIFE ---
m = re.search(r"export\{([^}]*)\}", gif)
assert m, "gifenc export map not found"
needed = {"GIFEncoder", "quantize", "applyPalette"}
aliases = []
for pair in m.group(1).split(","):
    internal, _as, name = pair.strip().partition(" as ")
    if name in needed:
        aliases.append(f"{name}={internal}")
assert len(aliases) == len(needed), f"missing exports: {aliases}"
gif = gif[: m.start()] + gif[m.end():]
alias_stmt = "var " + ",".join(aliases) + ";"

expjs, n = re.subn(
    r'^\s*import\s+\{[^}]*\}\s+from\s+"\./gifenc\.js";\s*$',
    "",
    expjs,
    flags=re.MULTILINE,
)
assert n == 1, f"expected to strip exactly one import, stripped {n}"

combined = "(function(){\n" + gif + "\n" + alias_stmt + "\n" + expjs + "\n})();"

# --- assemble the HTML ---
html = html.replace(
    '<link rel="stylesheet" href="styles.css?v=3">',
    "<style>\n" + css + "\n</style>",
)
html = html.replace(
    '<img id="image1" class="image" src="DPEA_Logo.png?v=3"',
    '<img id="image1" class="image" src="' + data_uri + '"',
)
html = html.replace(
    '<img id="image2" class="image" src="DPEA_Logo.png?v=3"',
    '<img id="image2" class="image"',
)
html = html.replace(
    '<script src="script.js?v=3"></script>',
    "<script>\n" + js + "\n</script>",
)
html = html.replace(
    '<script type="module" src="export-gif.js?v=3"></script>',
    "<script>\n" + combined + "\n</script>",
)

# sanity: nothing external should remain referenced
leftovers = [
    ref
    for ref in ("styles.css", "script.js", "export-gif.js", "gifenc.js",
                "DPEA_Logo.png", "?v=3")
    if ref in html
]
if leftovers:
    print(f"ERROR: leftover external references: {leftovers}", file=sys.stderr)
    sys.exit(1)

OUT.write_text(html)
print(f"wrote {OUT.name} ({len(html):,} bytes)")
