"""Private-loopback integration harness. Requires Node24 and PHP8.2+PDO SQLite."""
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import time

root = Path(__file__).resolve().parents[1]
php = os.environ.get('PHP_BIN', 'php')
with tempfile.TemporaryDirectory(prefix='nexo-integrated-') as directory:
    env = dict(os.environ, NEXO_DB_PATH=str(Path(directory) / 'nexo.sqlite'))
    subprocess.run([php, str(root / 'web-php/database/init.php')], env=env, check=True)
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    with (Path(directory) / 'server.log').open('w+') as log:
        server = subprocess.Popen([php, '-S', f'127.0.0.1:{port}', '-t', str(root / 'web-php/public'),
                                   str(root / 'web-php/public/router.php')], env=env, stdout=log, stderr=log)
        try:
            for _ in range(100):
                if server.poll() is not None:
                    raise RuntimeError('PHP exited before readiness')
                try:
                    with socket.create_connection(('127.0.0.1', port), timeout=.1):
                        break
                except OSError:
                    time.sleep(.02)
            else:
                raise RuntimeError('PHP readiness timeout')
            subprocess.run(['python3', str(root / 'web-php/tests/web_http.py'), '-v'],
                           env=dict(env, NEXO_WEB_BASE=f'http://127.0.0.1:{port}'), check=True)
            subprocess.run(['node', '--experimental-strip-types', str(root / 'scripts/integration-smoke.mjs')],
                           env=dict(env, NEXO_TEST_ORIGIN=f'http://127.0.0.1:{port}'), check=True)
        except Exception:
            log.seek(0)
            print(log.read())
            raise
        finally:
            server.terminate()
            server.wait(timeout=5)
