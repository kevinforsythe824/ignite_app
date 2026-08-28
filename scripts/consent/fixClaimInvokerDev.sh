#!/usr/bin/env bash
# One-time DEV fix: allow Firebase callable clients to invoke claimParentalConsent (Gen2 Cloud Run).
# Required when Cloud Run rejects Firebase ID tokens with IAM 401 before the handler runs.
set -euo pipefail

PROJECT="wpf-bible-qizzing"
REGION="us-central1"
SERVICE="claimparentalconsent"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud CLI not found. Install: https://cloud.google.com/sdk/docs/install"
  echo "Then: gcloud auth login && gcloud config set project ${PROJECT}"
  exit 1
fi

echo "Granting roles/run.invoker to allUsers on ${SERVICE} (${PROJECT}/${REGION})…"
gcloud run services add-iam-policy-binding "${SERVICE}" \
  --region="${REGION}" \
  --project="${PROJECT}" \
  --member="allUsers" \
  --role="roles/run.invoker"

echo "Done. Retry claim on the simulator (ConsentClaimPending → Retry)."
