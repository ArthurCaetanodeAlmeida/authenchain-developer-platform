#!/usr/bin/env python3
import argparse, hashlib, json, re
from pathlib import Path

def verify(root, expected):
    root = Path(root)
    file = root / 'ARTIFACT_MANIFEST.json'
    if not re.fullmatch(r'[a-f0-9]{64}', expected) or hashlib.sha256(file.read_bytes()).hexdigest() != expected: raise ValueError('artifact_manifest_hash_mismatch')
    manifest = json.loads(file.read_text()); declared = set()
    for entry in manifest['files']:
        name = entry['path']; path = Path(name)
        if path.is_absolute() or '\\' in name or any(part in ['', '.', '..'] for part in name.split('/')) or name in declared: raise ValueError('unsafe_artifact_path')
        declared.add(name); candidate = root / path
        for parent in [candidate, *candidate.parents]:
            if parent == root.parent: break
            if parent.is_symlink(): raise ValueError('artifact_symlink')
        if not candidate.is_file() or candidate.stat().st_size != entry['bytes'] or hashlib.sha256(candidate.read_bytes()).hexdigest() != entry['sha256']: raise ValueError('artifact_hash_mismatch')
    actual = {str(file.relative_to(root)) for file in root.rglob('*') if file.is_file() and file.name != 'ARTIFACT_MANIFEST.json'}
    if not declared or actual != declared: raise ValueError('artifact_inventory_mismatch')
    return len(declared)
if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('directory'); parser.add_argument('expected'); args = parser.parse_args()
    print(json.dumps({'verifiedArtifactFiles':verify(args.directory,args.expected)}))
