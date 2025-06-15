#!/bin/sh

if [ "$1" = "--prod" ]; then
  make build-production
else
  make build
fi
