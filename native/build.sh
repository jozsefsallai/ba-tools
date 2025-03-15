#!/bin/sh

cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" ../public/wasm/wasm_exec.js

if [ "$1" = "--prod" ]; then
  make build-production
else
  make build
fi
