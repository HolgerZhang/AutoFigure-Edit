#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${NAMESPACE:-autofigure}"
IMAGE="${IMAGE:-registry.cn-shanghai.aliyuncs.com/holgercloud/autofigure-edit:v1.0.0}"

: "${ROBOFLOW_API_KEY:?ROBOFLOW_API_KEY is required}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
if [[ ! -d "$ROOT_DIR" ]]; then
  echo "Cannot resolve repo root: $ROOT_DIR" >&2
  exit 1
fi

kubectl -n "$NAMESPACE" create secret generic autofigure-roboflow \
  --from-literal=ROBOFLOW_API_KEY="$ROBOFLOW_API_KEY" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl -n "$NAMESPACE" apply -f "$SCRIPT_DIR/autofigure-deployment.yaml"
kubectl -n "$NAMESPACE" apply -f "$SCRIPT_DIR/autofigure-service.yaml"

# Optionally override the container image.
kubectl -n "$NAMESPACE" set image deployment/autofigure-edit autofigure="$IMAGE" >/dev/null 2>&1 || true

echo "Deployed."
echo "Access: <nodeIP>:31030"

