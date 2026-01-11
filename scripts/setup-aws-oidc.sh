#!/bin/bash

# Load configuration from .env file if it exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Configuration with defaults
ROLE_NAME="${ROLE_NAME:-SlashMeetGitHubDeployRole}"
REPO="${REPO:-andysturrock/slashmeet}"
PROVIDER_URL="${PROVIDER_URL:-token.actions.githubusercontent.com}"
AUDIENCE="${AUDIENCE:-sts.amazonaws.com}"

# Thumbprints for the OIDC provider's SSL certificate.
# These are standard for GitHub Actions:
# 1. 6938fd4d98bab03faadb97b34396831e3780aea1
# 2. 1c58a3a8518e8759bf075b76b750d4f2df264fcd
# AWS often ignores these now in favor of root CA trust, but they are still required/supported by the API.
THUMBPRINTS="${THUMBPRINTS:-6938fd4d98bab03faadb97b34396831e3780aea1 1c58a3a8518e8759bf075b76b750d4f2df264fcd}"

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ $? -ne 0 ]; then
    echo "Error: Failed to get AWS Account ID. Are you logged in to AWS CLI?"
    exit 1
fi

echo "Using Account ID: $ACCOUNT_ID"

# 1. Create or verify OIDC Provider
echo "Checking for OIDC Provider..."
PROVIDER_ARN="arn:aws:iam::$ACCOUNT_ID:oidc-provider/$PROVIDER_URL"

if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$PROVIDER_ARN" >/dev/null 2>&1; then
    echo "OIDC Provider already exists."
else
    echo "Creating OIDC Provider..."
    aws iam create-open-id-connect-provider \
        --url "https://$PROVIDER_URL" \
        --client-id-list "$AUDIENCE" \
        --thumbprint-list $THUMBPRINTS
fi

# 2. Create Trust Policy JSON
cat <<EOF > trust-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "$PROVIDER_ARN"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "$PROVIDER_URL:aud": "$AUDIENCE"
        },
        "StringLike": {
          "$PROVIDER_URL:sub": "repo:$REPO:*"
        }
      }
    }
  ]
}
EOF

# 3. Create IAM Role
echo "Creating IAM Role: $ROLE_NAME..."
aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document file://trust-policy.json

# 4. Create or Update Scoped Permissions
echo "Creating or updating scoped IAM policy: SlashMeetDeployPolicy..."
POLICY_ARN="arn:aws:iam::$ACCOUNT_ID:policy/SlashMeetDeployPolicy"

if aws iam get-policy --policy-arn "$POLICY_ARN" >/dev/null 2>&1; then
    echo "Policy already exists, updating version..."
    # Get the current default version to check if we need to rotate (max 5 versions)
    VERSIONS_COUNT=$(aws iam list-policy-versions --policy-arn "$POLICY_ARN" --query 'Versions' --output json | grep -c "VersionId")
    if [ "$VERSIONS_COUNT" -ge 5 ]; then
        echo "Cleaning up oldest policy version..."
        OLDEST_VERSION=$(aws iam list-policy-versions --policy-arn "$POLICY_ARN" --query 'Versions[?IsDefaultVersion==`false`].VersionId' --output text | awk '{print $1}')
        aws iam delete-policy-version --policy-arn "$POLICY_ARN" --version-id "$OLDEST_VERSION"
    fi
    aws iam create-policy-version \
        --policy-arn "$POLICY_ARN" \
        --policy-document "file://scripts/deploy-policy.json" \
        --set-as-default
else
    echo "Creating new policy..."
    POLICY_ARN=$(aws iam create-policy \
        --policy-name "SlashMeetDeployPolicy" \
        --policy-document "file://scripts/deploy-policy.json" \
        --query 'Policy.Arn' --output text)
fi

echo "Hardening: Detaching AdministratorAccess if present..."
aws iam detach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn "arn:aws:iam::aws:policy/AdministratorAccess" 2>/dev/null

echo "Attaching policy to role: $ROLE_NAME..."
aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn "$POLICY_ARN"

# Final Output
ROLE_ARN="arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME"
echo "------------------------------------------------"
echo "Setup Complete!"
echo "Role ARN: $ROLE_ARN"
echo "------------------------------------------------"
echo "Please set this as the 'AWS_ROLE_TO_ASSUME' secret in GitHub."

# Cleanup
rm trust-policy.json
