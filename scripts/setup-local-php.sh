#!/bin/sh
# Local-only runtime bootstrap. Official Debian bookworm amd64 packages.
set -eu
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
runtime_dir="$project_dir/.tools/php82"
mkdir -p "$runtime_dir/downloads" "$runtime_dir/root"
for package in php8.2-cli php8.2-common php8.2-sqlite3; do
  curl --fail --location --max-time 120 \
    "https://deb.debian.org/debian/pool/main/p/php8.2/${package}_8.2.32-1~deb12u1_amd64.deb" \
    --output "$runtime_dir/downloads/$package.deb"
done
(cd "$runtime_dir/downloads" && sha256sum -c <<'HASHES'
c1ba9256b8a508cba18a0960b4d944a7e772fc4188d2a0e1be4999994db0df03  php8.2-cli.deb
2f7220eda0db4a467ff7708ff5cf71e9b3ae4c8c387a562973d558ed39945f99  php8.2-common.deb
3a51969d70cdbf594cc9a94f4da5f2200ac96d8436abe76b28a38507dd7a776f  php8.2-sqlite3.deb
HASHES
)
for package in php8.2-cli php8.2-common php8.2-sqlite3; do
  dpkg-deb -x "$runtime_dir/downloads/$package.deb" "$runtime_dir/root"
done
cat > "$runtime_dir/php" <<'WRAPPER'
#!/bin/sh
set -eu
runtime_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
mkdir -p "$runtime_dir/sessions"
chmod 700 "$runtime_dir/sessions"
exec "$runtime_dir/root/usr/bin/php8.2" -n \
  -d "session.save_path=$runtime_dir/sessions" \
  -d "extension_dir=$runtime_dir/root/usr/lib/php/20220829" \
  -d extension=pdo \
  -d extension=pdo_sqlite \
  -d extension=sqlite3 \
  -d extension=ctype \
  -d extension=tokenizer \
  "$@"
WRAPPER
chmod +x "$runtime_dir/php"
"$runtime_dir/php" -v
"$runtime_dir/php" -r 'echo json_encode(PDO::getAvailableDrivers()), PHP_EOL;'
