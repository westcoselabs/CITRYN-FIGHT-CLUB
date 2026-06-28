import os, shutil, zipfile
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")
OUT = os.path.join(ROOT, "citryn-fight-club.zip")
CODE = ["index.html", "server.js", "game.js", "net.js", "strings.js"]
CHAR_DIRS = {"Brandon", "Garet", "Mo", "Steven", "Tom"}
CHAR_MAX_H = 480     # poses/sheets only ever render ~300px tall in-game
STAGE_MAX_W = 1280   # stages are drawn at 1280x720
RASTER = (".png", ".jpg", ".jpeg", ".webp")

if os.path.exists(DIST):
    shutil.rmtree(DIST)
os.makedirs(os.path.join(DIST, "assets"), exist_ok=True)
for f in CODE:
    shutil.copy2(os.path.join(ROOT, f), os.path.join(DIST, f))

def optimize(src, dst, rel):
    ext = os.path.splitext(src)[1].lower()
    if ext not in RASTER:
        shutil.copy2(src, dst); return
    try:
        im = Image.open(src)
    except Exception:
        shutil.copy2(src, dst); return
    top = rel.split("/")[1] if rel.startswith("assets/") and "/" in rel[7:] else ""
    w, h = im.size
    if top in CHAR_DIRS:
        if h > CHAR_MAX_H:
            nw = max(1, round(w * CHAR_MAX_H / h)); im = im.resize((nw, CHAR_MAX_H), Image.LANCZOS)
    else:
        if w > STAGE_MAX_W:
            nh = max(1, round(h * STAGE_MAX_W / w)); im = im.resize((STAGE_MAX_W, nh), Image.LANCZOS)
    if ext in (".jpg", ".jpeg"):
        im.convert("RGB").save(dst, quality=82, optimize=True)
    elif ext == ".webp":
        im.save(dst, quality=80, method=6)
    else:
        im.save(dst, optimize=True)

for r, _, files in os.walk(os.path.join(ROOT, "assets")):
    for fn in files:
        full = os.path.join(r, fn)
        rel = os.path.relpath(full, ROOT).replace(os.sep, "/")
        dst = os.path.join(DIST, rel.replace("/", os.sep))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        optimize(full, dst, rel)

# report + zip
# guard: the Higgsfield static host 404s any path containing a space
spaced = []
total = 0
for r, _, files in os.walk(DIST):
    for fn in files:
        if " " in fn:
            spaced.append(os.path.relpath(os.path.join(r, fn), DIST))
        total += os.path.getsize(os.path.join(r, fn))
if spaced:
    raise SystemExit("ABORT: filenames with spaces won't serve on Higgsfield:\n  " + "\n  ".join(spaced))
print("dist uncompressed: %.1f MB" % (total / 1048576))

if os.path.exists(OUT):
    os.remove(OUT)
z = zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED)
for r, _, files in os.walk(DIST):
    for fn in files:
        full = os.path.join(r, fn)
        arc = os.path.relpath(full, DIST).replace(os.sep, "/")
        z.write(full, arc)
z.close()
print("zip: %.1f MB" % (os.path.getsize(OUT) / 1048576))
