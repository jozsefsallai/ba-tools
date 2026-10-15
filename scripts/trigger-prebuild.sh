#!/bin/sh

set -eu

SUBMODULE_NAME="mx-data-sync"
SUBMODULE_PATH="vendor/mx-data-sync"
ENTRY="$SUBMODULE_PATH/src/index.ts"

TOKEN="${MX_DATA_SYNC_TOKEN:-${TRIGGER_BUILD_MX_DATA_SYNC_TOKEN:-}}"
REF="${MX_DATA_SYNC_REF:-${TRIGGER_BUILD_MX_DATA_SYNC_REF:-main}}"

HAS_GIT=no
if [ -e .git ]; then
  HAS_GIT=yes
fi

echo "[mx-data-sync] $(git --version 2>/dev/null || echo 'git missing') | .git present: $HAS_GIT | token set: $([ -n "$TOKEN" ] && echo yes || echo no)"

if [ -z "$TOKEN" ]; then
  echo "[mx-data-sync] no token configured, skipping (the stub will be bundled)"
  exit 0
fi

SUBMODULE_URL="$(git config -f .gitmodules --get "submodule.$SUBMODULE_NAME.url")"

case "$SUBMODULE_URL" in
  git@github.com:*) HTTPS_URL="https://github.com/${SUBMODULE_URL#git@github.com:}" ;;
  *) HTTPS_URL="$SUBMODULE_URL" ;;
esac

HTTPS_URL="${MX_DATA_SYNC_REPO_URL:-$HTTPS_URL}"

AUTH_HEADER="Authorization: Basic $(printf 'x-access-token:%s' "$TOKEN" | base64 | tr -d '\n')"

if [ ! -f "$ENTRY" ]; then
  if [ "$HAS_GIT" = yes ]; then
    echo "[mx-data-sync] fetching the submodule at its pinned commit"
    git -c "http.extraHeader=$AUTH_HEADER" \
      -c "url.$HTTPS_URL.insteadOf=$SUBMODULE_URL" \
      submodule update --init --checkout "$SUBMODULE_PATH"
  else
    echo "[mx-data-sync] no .git directory, cloning '$REF' (the pinned commit is unknown)"
    rm -rf "$SUBMODULE_PATH"
    git -c "http.extraHeader=$AUTH_HEADER" \
      clone --depth 1 --branch "$REF" "$HTTPS_URL" "$SUBMODULE_PATH"
  fi
fi

if [ ! -f "$ENTRY" ]; then
  echo "[mx-data-sync] $ENTRY is missing after fetching the submodule" >&2
  exit 1
fi

echo "[mx-data-sync] installing dependencies"

pnpm --dir "$SUBMODULE_PATH" install --frozen-lockfile

echo "[mx-data-sync] ready ($(git -C "$SUBMODULE_PATH" rev-parse --short HEAD 2>/dev/null || echo 'unknown revision'))"
