"""Run local acceptance checks. All HTTP writes use disposable SQLite databases."""
import argparse
import os
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--exports', action='store_true', help='Also export Expo Web and native bundles (not APK/IPA)')
args = parser.parse_args()
env = dict(os.environ, EXPO_NO_TELEMETRY='1')
php = env.get('PHP_BIN', 'php')

def run(command, cwd=root):
    print('+ ' + ' '.join(map(str, command)), flush=True)
    subprocess.run(list(map(str, command)), cwd=cwd, env=env, check=True)

for path in sorted((root / 'web-php').rglob('*.php')):
    run([php, '-l', path])
run(['python3', root / 'web-php/tests/api_test.py', '-v'])
run([php, root / 'web-php/tests/web_render.php'])
run([php, root / 'web-php/tests/repository_test.php'])
run(['python3', root / 'scripts/integration_smoke.py'])
run(['npm', 'test'], root / 'app-mobile')
run(['npm', 'run', 'typecheck'], root / 'app-mobile')
if args.exports:
    run(['npm', 'run', 'export:web'], root / 'app-mobile')
    run(['npm', 'run', 'export:native'], root / 'app-mobile')
print('PASS: all requested local acceptance checks; physical-device testing is manual (see README).')
