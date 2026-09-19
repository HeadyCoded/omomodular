#!/usr/bin/env bash
# omomodular installer for Omarchy / Arch. Re-runnable, no sudo.
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN="$HOME/.local/bin"
CONFDIR="${XDG_CONFIG_HOME:-$HOME/.config}/omomodular"
VENV="$HOME/.local/share/omomodular/venv"
HOOKDIR="$HOME/.config/omarchy/hooks/theme-set.d"
mkdir -p "$BIN" "$CONFDIR"

if command -v uv >/dev/null 2>&1; then
  uv venv "$VENV" >/dev/null
  uv pip install --python "$VENV/bin/python" -e "$REPO" >/dev/null
else
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install -q --upgrade pip
  "$VENV/bin/pip" install -q -e "$REPO"
fi

cat > "$BIN/omomodular" <<LAUNCH
#!/usr/bin/env bash
exec "$VENV/bin/omomodular" "\$@"
LAUNCH
chmod +x "$BIN/omomodular"
ln -sf "$REPO/scripts/omarchy-omomodular-theme" "$BIN/omarchy-omomodular-theme"

mkdir -p "$HOOKDIR" "$HOME/.local/share/applications"
install -m 0755 "$REPO/scripts/omomodular-theme.hook" "$HOOKDIR/omomodular-theme.hook"
"$BIN/omarchy-omomodular-theme" 2>/dev/null || echo "(theme.css will use the bundled fallback until an omarchy theme set)"
[ -f "$CONFDIR/config.toml" ] || { [ -f "$REPO/config.example.toml" ] && install -m 0600 "$REPO/config.example.toml" "$CONFDIR/config.toml"; }
[ -f "$REPO/omomodular.desktop" ] && install -m 0644 "$REPO/omomodular.desktop" "$HOME/.local/share/applications/omomodular.desktop"
command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
echo "omomodular installed."
