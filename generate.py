#!/usr/bin/env python3
"""
generate.py — Scans assets/clients/ and auto-writes data.js.

USAGE
─────
    python3 generate.py

Run from the portfolio root directory any time you add, remove, or rename assets.

FOLDER STRUCTURE
────────────────
    assets/clients/
        Suja Life/
            Logo/
                suja-logo.png   ← any image file in Logo/ becomes the client logo
            ad001.jpg           ← all other image/video files are treated as ads
            ad002.jpg
            ad003_4x5.jpg       ← include _4x5 or _story in the filename for ratio
            ad004_story.mp4     ← videos: include _story / _9x16 / _4x5 in name
            ad004_story-thumb.jpg  ← optional thumbnail: same name + -thumb
        Next Client/
            Logo/
                logo.png
            ...

ASPECT RATIO HINTS (optional filename suffixes)
────────────────────────────────────────────────
    Square 1:1   — default, no hint needed (or _sq, _1x1)
    Portrait 4:5 — _4x5  or  _port
    Story 9:16   — _story, _9x16, _reel

VIDEO THUMBNAILS (optional but recommended)
───────────────────────────────────────────
    ad004_story.mp4          ← video
    ad004_story-thumb.jpg    ← poster image shown before the video plays
    (same base name + -thumb suffix, any image extension)

OPTIONAL: info.json (add later if you want descriptions/services)
──────────────────────────────────────────────────────────────────
Drop an info.json in any client folder to add sidebar text and branding:

    {
        "description": "Your overview of the work with this client...",
        "services":    ["Static Ad Design", "Motion Graphics"],
        "igHandle":    "clienthandle",
        "color":       "#00c896"
    }

Without info.json the client name comes from the folder name and
the description/services will be blank until you add one.
"""

import json
import os
import sys

# ─── Config ──────────────────────────────────────────────────────────────────
CLIENTS_DIR = os.path.join('public', 'assets', 'clients')
ABOUT_DIR   = os.path.join('public', 'assets', 'about')
OUTPUT_FILE = 'data.json'

IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'}
VIDEO_EXTS = {'.mp4', '.mov', '.webm'}

THUMB_SUFFIXES = ['-thumb', '_thumb', '-poster', '_poster']  # kept for backward compat

# Checked against the END of the filename stem (before extension).
# e.g. "campaign-name_1x1.jpg" → 1:1
RATIO_HINTS = {
    '_1x1':    '1:1',
    '_4x5':    '4:5',
    '_9x16':   '9:16',
    '_1.91x1': '1.91:1',
}


# ─── Helpers ─────────────────────────────────────────────────────────────────

def detect_ratio(filename, default='1:1'):
    """Match ratio hints against the END of the filename stem.
    Accepts both underscore and space as the separator before the ratio,
    e.g. 'ad_4x5.mp4' and 'ad 4x5.mp4' both resolve to 4:5.
    """
    stem = os.path.splitext(filename)[0].lower()
    for hint, ratio in RATIO_HINTS.items():
        if stem.endswith(hint) or stem.endswith(hint.replace('_', ' ')):
            return ratio
    return default


def is_thumb(filename):
    stem = os.path.splitext(filename)[0]
    return any(stem.endswith(s) for s in THUMB_SUFFIXES)


def find_thumb(folder_path, video_filename):
    """Return the thumbnail filename for a video if one exists, else None."""
    stem = os.path.splitext(video_filename)[0]
    for suffix in THUMB_SUFFIXES:
        for ext in IMAGE_EXTS:
            candidate = stem + suffix + ext
            if os.path.exists(os.path.join(folder_path, candidate)):
                return candidate
    return None


def find_logo_by_suffix(logo_dir, suffix):
    """Find a logo ending in a specific suffix (e.g. '_clientpage', '_Instagram')."""
    if not os.path.isdir(logo_dir):
        return None
    for f in sorted(os.listdir(logo_dir)):
        if f.startswith('.'):
            continue
        stem = os.path.splitext(f)[0]
        ext  = os.path.splitext(f)[1].lower()
        if ext in IMAGE_EXTS and stem.endswith(suffix):
            return f
    return None


def find_logo_any(logo_dir):
    """Fall back: return the first image file in Logo/ regardless of name."""
    if not os.path.isdir(logo_dir):
        return None
    for f in sorted(os.listdir(logo_dir)):
        if f.startswith('.'):
            continue
        if os.path.splitext(f)[1].lower() in IMAGE_EXTS:
            return f
    return None


def parse_info_txt(path):
    """
    Parse a plain-text info.txt file into a dict.

    Supported format:
        name: Client Name
        website: https://example.com
        ig_handle: clienthandle
        color: #A41034
        default_ratio: 1:1

        description:
        Multi-line description goes here.
        It can span as many lines as needed.

        services:
        Static Ad Design
        Motion Graphics
    """
    info = {}
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
    except OSError:
        return info

    SINGLE_KEYS = {'name', 'website', 'ig_handle', 'color', 'default_ratio', 'cta', 'brand_type'}
    mode = None
    desc_lines   = []
    service_lines = []

    for raw_line in content.splitlines():
        line    = raw_line.strip()
        lower   = line.lower()

        # Section headers
        if lower == 'description:':
            mode = 'description'
            continue
        if lower == 'services:':
            mode = 'services'
            continue

        if mode == 'description':
            desc_lines.append(raw_line.rstrip())
        elif mode == 'services':
            if line:
                service_lines.append(line)
        else:
            # key: value pairs
            if ':' in line:
                key, _, val = line.partition(':')
                key = key.strip().lower().replace(' ', '_')
                val = val.strip()
                if key in SINGLE_KEYS:
                    info[key] = val

    if desc_lines:
        info['description'] = '\n'.join(desc_lines).strip()
    if service_lines:
        info['services'] = service_lines

    return info


# ─── Build about ─────────────────────────────────────────────────────────────

def build_about():
    """Parse public/assets/about/ into the about object. Returns None if folder absent."""
    if not os.path.isdir(ABOUT_DIR):
        return None

    logo_dir = os.path.join(ABOUT_DIR, 'Logo')
    clientpage_file = find_logo_by_suffix(logo_dir, '_clientpage') or find_logo_any(logo_dir)
    instagram_file  = find_logo_by_suffix(logo_dir, '_Instagram')  or clientpage_file

    logo_url   = f'assets/about/Logo/{clientpage_file}' if clientpage_file else ''
    avatar_url = f'assets/about/Logo/{instagram_file}'  if instagram_file  else logo_url

    info = {}
    txt_path = os.path.join(ABOUT_DIR, 'info.txt')
    if os.path.exists(txt_path):
        info = parse_info_txt(txt_path)

    skip_files = {'info.txt', 'info.json', 'captions.json'}
    default_ratio = info.get('default_ratio', '1:1')

    try:
        all_files = sorted(
            f for f in os.listdir(ABOUT_DIR)
            if not f.startswith('.')
            and not os.path.isdir(os.path.join(ABOUT_DIR, f))
            and f not in skip_files
        )
    except OSError:
        all_files = []

    media = []
    for filename in all_files:
        if is_thumb(filename):
            continue
        ext = os.path.splitext(filename)[1].lower()
        rel_path = f'assets/about/{filename}'
        if ext in IMAGE_EXTS:
            media.append({'type': 'image', 'src': rel_path, 'ratio': detect_ratio(filename, default_ratio)})
        elif ext in VIDEO_EXTS:
            media.append({'type': 'video', 'src': rel_path, 'ratio': detect_ratio(filename, default_ratio)})

    return {
        'name':    info.get('name', 'James Bradley'),
        'handle':  info.get('ig_handle', 'jbradbixler'),
        'avatar':  avatar_url,
        'logo':    logo_url,
        'bio':     info.get('description', ''),
        'website': info.get('website', 'https://jbradbixler.com/'),
        'role':    info.get('brand_type', ''),
        'color':   info.get('color', '#1d1d1f'),
        'services': info.get('services', []),
        'media':   media,
    }


# ─── Build one client ─────────────────────────────────────────────────────────

def build_client(folder_path, folder_name):
    base_url = f'assets/clients/{folder_name}'
    logo_dir = os.path.join(folder_path, 'Logo')

    # ── Logos — prefer suffix-tagged files, fall back to any image ──
    clientpage_file = find_logo_by_suffix(logo_dir, '_clientpage') or find_logo_any(logo_dir)
    instagram_file  = find_logo_by_suffix(logo_dir, '_Instagram')  or clientpage_file

    if not clientpage_file:
        print(f'  ⚠  {folder_name}: no Logo/ subfolder or no image inside it — logo will be blank')

    logo_url   = f'{base_url}/Logo/{clientpage_file}' if clientpage_file else ''
    avatar_url = f'{base_url}/Logo/{instagram_file}'  if instagram_file  else logo_url

    # ── info.txt (preferred) or info.json (fallback) ──
    info = {}
    txt_path  = os.path.join(folder_path, 'info.txt')
    json_path = os.path.join(folder_path, 'info.json')

    if os.path.exists(txt_path):
        info = parse_info_txt(txt_path)
    elif os.path.exists(json_path):
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                raw = json.load(f)
            # Normalise JSON keys to match txt format
            info = {
                'name':          raw.get('name', ''),
                'website':       raw.get('website', ''),
                'ig_handle':     raw.get('igHandle', ''),
                'color':         raw.get('color', '#ffffff'),
                'default_ratio': raw.get('defaultRatio', '1:1'),
                'description':   raw.get('description', ''),
                'services':      raw.get('services', []),
            }
        except json.JSONDecodeError as e:
            print(f'  ⚠  {folder_name}/info.json invalid — using defaults: {e}')

    # ── Optional per-ad captions ──
    captions = {}
    captions_path = os.path.join(folder_path, 'captions.json')
    if os.path.exists(captions_path):
        try:
            with open(captions_path, 'r', encoding='utf-8') as f:
                captions = json.load(f)
        except json.JSONDecodeError as e:
            print(f'  ⚠  {folder_name}/captions.json invalid — skipping captions: {e}')

    # ── Ads ──
    ads = []
    default_ratio = info.get('default_ratio', '1:1')
    skip_files = {'info.txt', 'info.json', 'captions.json'}

    try:
        all_files = sorted(
            f for f in os.listdir(folder_path)
            if not f.startswith('.')
            and not os.path.isdir(os.path.join(folder_path, f))
            and f not in skip_files
        )
    except OSError as e:
        print(f'  ✗  Could not read {folder_name}: {e}')
        return None

    for filename in all_files:
        if is_thumb(filename):
            continue
        ext      = os.path.splitext(filename)[1].lower()
        rel_path = f'{base_url}/{filename}'

        if ext in IMAGE_EXTS:
            ad = {'type': 'image', 'src': rel_path, 'ratio': detect_ratio(filename, default_ratio)}
        elif ext in VIDEO_EXTS:
            ad = {'type': 'video', 'src': rel_path, 'ratio': detect_ratio(filename, default_ratio)}
        else:
            continue

        if filename in captions:
            ad['caption'] = captions[filename]
        ads.append(ad)

    client_id = folder_name.lower().replace(' ', '-')

    return {
        'id':          client_id,
        'name':        info.get('name') or folder_name,
        'logo':        logo_url,
        'igAvatar':    avatar_url,
        'color':       info.get('color', '#ffffff'),
        'igHandle':    info.get('ig_handle') or client_id,
        'website':     info.get('website', ''),
        'description': info.get('description', ''),
        'services':    info.get('services', []),
        'cta':         info.get('cta', ''),
        'brandType':   info.get('brand_type', ''),
        'ads':         ads,
    }


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    if not os.path.isdir(CLIENTS_DIR):
        print(f'Error: {CLIENTS_DIR}/ not found.')
        print('Make sure you run this script from inside the portfolio/ folder.')
        sys.exit(1)

    folders = sorted(
        f for f in os.listdir(CLIENTS_DIR)
        if os.path.isdir(os.path.join(CLIENTS_DIR, f))
        and not f.startswith('_')
        and not f.startswith('.')
    )

    if not folders:
        print(f'No client folders found in {CLIENTS_DIR}/  (folders starting with _ are skipped).')
        sys.exit(0)

    print(f'Scanning {len(folders)} client folder(s) in {CLIENTS_DIR}/\n')

    clients = []
    for folder_name in folders:
        print(f'  {folder_name}')
        client = build_client(os.path.join(CLIENTS_DIR, folder_name), folder_name)
        if client:
            clients.append(client)
            img_count = sum(1 for a in client['ads'] if a['type'] == 'image')
            vid_count = sum(1 for a in client['ads'] if a['type'] == 'video')
            print(f'     → {len(client["ads"])} ad(s)  ({img_count} image, {vid_count} video)')

    about = build_about()
    if about:
        media_count = len(about['media'])
        print(f'\n  About: {about["name"]} (@{about["handle"]}) — {media_count} media file(s)')
    else:
        print(f'\n  About: (no public/assets/about/ folder found — skipped)')

    # Write data.json — { clients: [...], about: {...}|null }
    output = {'clients': clients, 'about': about}
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
        f.write('\n')

    total_ads = sum(len(c['ads']) for c in clients)
    print(f'\n✓  data.json written — {len(clients)} client(s), {total_ads} total ad(s)')


if __name__ == '__main__':
    main()
