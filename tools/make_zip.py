import os, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "citryn-fight-club.zip")
ROOT_FILES = ["index.html", "logic.js", "game.js", "strings.js"]
ASSET_DIR = "assets"

if os.path.exists(OUT):
    os.remove(OUT)

z = zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED)
for f in ROOT_FILES:
    z.write(os.path.join(ROOT, f), f)  # arcname at root
for r, _, files in os.walk(os.path.join(ROOT, ASSET_DIR)):
    for fn in files:
        full = os.path.join(r, fn)
        arc = os.path.relpath(full, ROOT).replace(os.sep, "/")
        z.write(full, arc)
z.close()

zz = zipfile.ZipFile(OUT)
for n in sorted(zz.namelist()):
    print(n)
print("size MB:", round(os.path.getsize(OUT) / 1048576, 2))
