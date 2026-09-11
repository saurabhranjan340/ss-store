#!/usr/bin/env bash
set -euo pipefail
: "${API_URL:?Set API_URL, e.g. https://ss-store-api.example.com}"

printf 'health... '
curl --fail --silent --show-error "$API_URL/health" | jq -e '.success == true and .status == "ok"' >/dev/null
printf 'ok\nproducts... '
curl --fail --silent --show-error "$API_URL/api/products?take=1" | jq -e '.success == true' >/dev/null
printf 'ok\ncategories... '
curl --fail --silent --show-error "$API_URL/api/categories" | jq -e '.success == true' >/dev/null
printf 'all smoke checks passed\n'
