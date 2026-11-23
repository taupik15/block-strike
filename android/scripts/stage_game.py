#!/usr/bin/env python3
"""Stage the current BLOCK STRIKE web game in APK assets without re-uploading a separate copy to GitHub."""
import argparse
import pathlib
import shutil
import sys

FILES = ("index.html", "sw.js", "offline-assets.js", "manifest.webmanifest", "LICENSE", "ASSET_NOTICES.md", "cs16forge.txt", ".nojekyll")
DIRS = ("js", "css", "assets")

parser = argparse.ArgumentParser()
parser.add_argument("game_root", type=pathlib.Path)
parser.add_argument("destination", type=pathlib.Path)
args = parser.parse_args()
source, target = args.game_root.resolve(), args.destination.resolve()
if not (source / "index.html").is_file() or not (source / "assets").is_dir():
    sys.exit("ERROR: root must contain index.html and assets/. Apply WEAPON.1.1-C4 hotfix first.")
if target == source or any((source / name) == target or (source / name) in target.parents for name in DIRS):
    sys.exit("ERROR: source and target must differ")
if target.exists():
    shutil.rmtree(target)
target.mkdir(parents=True)
for path in FILES:
    file = source / path
    if file.is_file() and path != ".nojekyll":
        shutil.copy2(file, target / path)
for part in DIRS:
    if not (source / part).is_dir():
        sys.exit(f"ERROR: missing {part}/")
    shutil.copytree(source / part, target / part, symlinks=False)

# WebView already serves bundled assets offline. Disable Service Worker 'prepare all'\
# to avoid caching hundreds of MB a second time. Only the staged APK copy changes.
offline = target / "js" / "offline.js"
if offline.is_file():
    text = offline.read_text(encoding="utf-8")
    marker = " const supported='serviceWorker' in navigator && window.isSecureContext;"
    if marker not in text:
        sys.exit("ERROR: offline.js changed; inspect it before shipping the APK")
    replacement = ''' if(navigator.userAgent.includes('BlockStrikeAndroid/')) {
  show('Semua aset sudah ada di APK. Tidak perlu Prepare Offline.');
  if(button){button.disabled=true;button.textContent='INCLUDED IN APK';}
  if(refresh)refresh.addEventListener('click',()=>showRefresh('Untuk memperbarui game Android, instal APK versi terbaru.'));
  showRefresh('BLOCK STRIKE Android · paket aset offline.');
  return;
 }
''' + marker
    offline.write_text(text.replace(marker, replacement, 1), encoding="utf-8")

count = sum(1 for f in target.rglob('*') if f.is_file())
size = sum(f.stat().st_size for f in target.rglob('*') if f.is_file())
print(f"Staged {count} runtime files ({size/1024/1024:.1f} MiB) into {target}")
