#!/bin/bash

if [ "$VERCEL_ENV" = "production" ]; then
  pnpm dlx convex deploy --cmd 'pnpm run build'
else
  pnpm run build
fi
