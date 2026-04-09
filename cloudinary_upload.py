#!/usr/bin/env python3
"""
cloudinary_upload.py — Uploads all local ad assets to Cloudinary and rewrites data.json.

Cloudinary applies:
  - Images: f_auto (WebP/AVIF), q_auto (smart compression)
  - Videos: f_auto (WebM/MP4), q_auto, vc_auto (H.265/H.264/VP9), streaming

USAGE
─────
    python3 cloudinary_upload.py

Run from the portfolio root directory. Safe to re-run — already-uploaded assets
are detected by public_id and skipped (no re-upload, no extra charge).

Requires environment variables (reads from .env.local):
    CLOUDINARY_CLOUD_NAME
    CLOUDINARY_API_KEY
    CLOUDINARY_API_SECRET
"""

import json
import os
import sys
import time

# ── Load .env.local ───────────────────────────────────────────────────────────
def load_env(path='.env.local'):
    if not os.path.exists(path):
        return
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, _, v = line.partition('=')
                os.environ.setdefault(k.strip(), v.strip())

load_env()

import cloudinary
import cloudinary.uploader
import cloudinary.api

# ── Configure ─────────────────────────────────────────────────────────────────
cloudinary.config(
    cloud_name = os.environ['CLOUDINARY_CLOUD_NAME'],
    api_key    = os.environ['CLOUDINARY_API_KEY'],
    api_secret = os.environ['CLOUDINARY_API_SECRET'],
    secure     = True,
)

CLOUD  = os.environ['CLOUDINARY_CLOUD_NAME']
DATA   = 'data.json'
PUBLIC = 'public'   # local public/ folder prefix to strip from paths

# Cloudinary URL builders
def image_url(public_id):
    return f'https://res.cloudinary.com/{CLOUD}/image/upload/f_auto,q_auto/{public_id}'

def video_url(public_id):
    # vc_auto → browser gets WebM/VP9 or H.264; q_auto:good balances quality vs size
    return f'https://res.cloudinary.com/{CLOUD}/video/upload/f_auto,q_auto:good,vc_auto/{public_id}'

# ── Check if already uploaded ─────────────────────────────────────────────────
def already_uploaded(public_id, resource_type):
    try:
        cloudinary.api.resource(public_id, resource_type=resource_type)
        return True
    except cloudinary.exceptions.NotFound:
        return False
    except Exception:
        return False

# ── Upload one asset ──────────────────────────────────────────────────────────
def upload_asset(local_src):
    """
    local_src: relative path as stored in data.json, e.g. 'assets/clients/DoorDash/ad.mp4'
    Returns the optimized CDN URL, or None on failure.
    """
    local_path = os.path.join(PUBLIC, local_src)
    if not os.path.exists(local_path):
        print(f'  ⚠  File not found: {local_path}')
        return None

    ext = os.path.splitext(local_src)[1].lower()
    is_video = ext in {'.mp4', '.mov', '.webm'}
    resource_type = 'video' if is_video else 'image'

    # Build a clean public_id from the path, stripping public/ prefix
    # e.g. assets/clients/DoorDash/ad_9x16.mp4 → portfolio/clients/DoorDash/ad_9x16
    rel = local_src  # already relative: 'assets/clients/...'
    public_id = 'portfolio/' + os.path.splitext(rel)[0]   # no extension
    public_id = public_id.replace('\\', '/')               # Windows safety

    # Skip if already on Cloudinary
    if already_uploaded(public_id, resource_type):
        url = video_url(public_id) if is_video else image_url(public_id)
        print(f'  ✓  (cached) {os.path.basename(local_src)}')
        return url

    print(f'  ↑  Uploading {os.path.basename(local_src)} ({resource_type}) …', end=' ', flush=True)
    t0 = time.time()
    try:
        result = cloudinary.uploader.upload(
            local_path,
            public_id      = public_id,
            resource_type  = resource_type,
            overwrite      = False,
            # Video-specific: enable adaptive streaming + quality
            **(dict(
                eager              = [{'streaming_profile': 'auto', 'format': 'mp4'}],
                eager_async        = True,
            ) if is_video else {}),
        )
        elapsed = time.time() - t0
        url = video_url(public_id) if is_video else image_url(public_id)
        print(f'done ({elapsed:.1f}s)')
        return url
    except Exception as e:
        print(f'FAILED: {e}')
        return None

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    with open(DATA, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Collect every asset src across clients + about
    total = 0
    done  = 0
    failed = []

    def process(obj, key):
        nonlocal total, done
        src = obj.get(key, '')
        if not src or src.startswith('http'):
            return  # already a URL or empty
        total += 1
        url = upload_asset(src)
        if url:
            obj[key] = url
            done += 1
        else:
            failed.append(src)

    # Clients
    for client in data.get('clients', []):
        print(f'\n── {client["name"]} ──')
        process(client, 'logo')
        process(client, 'igAvatar')
        for ad in client.get('ads', []):
            process(ad, 'src')

    # About
    about = data.get('about')
    if about:
        print(f'\n── About ──')
        process(about, 'logo')
        process(about, 'avatar')
        for m in about.get('media', []):
            process(m, 'src')

    # Write updated data.json
    with open(DATA, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')

    print(f'\n✓  Done — {done}/{total} assets uploaded to Cloudinary.')
    if failed:
        print(f'⚠  {len(failed)} failed:')
        for s in failed:
            print(f'   {s}')
    print('\ndata.json has been rewritten with Cloudinary URLs.')
    print('Run `git add data.json && git commit -m "chore: migrate assets to Cloudinary CDN" && git push` to deploy.')

if __name__ == '__main__':
    main()
