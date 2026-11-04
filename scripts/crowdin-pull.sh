#!/usr/bin/env bash
set -euo pipefail

api_url="https://api.crowdin.com/api/v2/projects/${CROWDIN_PROJECT_ID:?}/translations/builds"

crowdin_api() {
  curl --silent --show-error --fail-with-body --retry 3 \
    --header "Authorization: Bearer ${CROWDIN_PERSONAL_TOKEN:?}" \
    "$1"
}

build_id="$(
  crowdin_api "${api_url}?limit=500" |
    jq -r '[.data[].data | select(.status == "finished") | .id] | max // empty'
)"

if [[ -z "${build_id}" ]]; then
  echo "No finished Crowdin build found." >&2
  exit 1
fi

echo "Using Crowdin build ${build_id}."

download_url="$(crowdin_api "${api_url}/${build_id}/download" | jq -er '.data.url')"

workdir="$(mktemp -d)"
trap 'rm -rf "${workdir}"' EXIT

curl --silent --show-error --fail --retry 3 --output "${workdir}/build.zip" "${download_url}"

unzip -o -W "${workdir}/build.zip" \
  'src/i18n/translations/*/*.json' \
  -x 'src/i18n/translations/en/*'
