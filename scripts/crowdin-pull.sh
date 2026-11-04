#!/usr/bin/env bash
set -euo pipefail

translations_dir="src/i18n/translations"
api_url="https://api.crowdin.com/api/v2/projects/${CROWDIN_PROJECT_ID:?}/translations/builds"

crowdin_api() {
  curl --silent --show-error --fail-with-body --retry 3 \
    --header "Authorization: Bearer ${CROWDIN_PERSONAL_TOKEN:?}" \
    "$1"
}

report() {
  echo "downloaded=$1" >> "${GITHUB_OUTPUT:-/dev/null}"
}

build="$(
  crowdin_api "${api_url}?limit=500" |
    jq -c '[.data[].data | select(.status == "finished")] | max_by(.id) // empty'
)"

if [[ -z "${build}" ]]; then
  echo "No finished Crowdin build found."
  report false
  exit 0
fi

build_id="$(jq -er '.id' <<< "${build}")"
build_time="$(date -d "$(jq -er '.createdAt' <<< "${build}")" +%s)"
commit_time="$(git log -1 --format=%ct -- "${translations_dir}")"

if [[ "${CROWDIN_FORCE:-false}" != "true" && "${build_time}" -le "${commit_time:-0}" ]]; then
  echo "Build ${build_id} is older than the last translation commit, skipping."
  report false
  exit 0
fi

echo "Using Crowdin build ${build_id}."

download_url="$(crowdin_api "${api_url}/${build_id}/download" | jq -er '.data.url')"

workdir="$(mktemp -d)"
trap 'rm -rf "${workdir}"' EXIT

curl --silent --show-error --fail --retry 3 --output "${workdir}/build.zip" "${download_url}"

unzip -o -W "${workdir}/build.zip" \
  "${translations_dir}/*/*.json" \
  -x "${translations_dir}/en/*"

remove_empty='walk(if type == "object" then with_entries(select(.value != "" and .value != {})) else . end)'
changed=false

while IFS= read -r file; do
  if jq "${remove_empty}" "${file}" > "${workdir}/cleaned.json" 2> /dev/null; then
    cp "${workdir}/cleaned.json" "${file}"
  fi

  if [[ "$(jq -c . "${file}" 2> /dev/null)" == "$(git show "HEAD:${file}" 2> /dev/null | jq -c . 2> /dev/null)" ]]; then
    git checkout -- "${file}"
  else
    changed=true
  fi
done < <(git ls-files --modified --others --exclude-standard -- "${translations_dir}")

if [[ "${changed}" == "false" ]]; then
  echo "Build ${build_id} has no translation changes."
fi

report "${changed}"
