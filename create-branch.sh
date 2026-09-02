#!/bin/bash
# Usage: ./create-branch.sh <type: feature|bugfix> <ticket_number: e.g. 001> <short_description: e.g. mobile-app-infrastructure>

TYPE=${1:-feature}
TICKET=$2
DESC=$3

if [ -z "$TICKET" ] || [ -z "$DESC" ]; then
  echo "Usage: ./create-branch.sh <feature|bugfix> <ticket_number> <short-description>"
  echo "Example: ./create-branch.sh feature 001 mobile-app-infrastructure"
  exit 1
fi

# Standardize branch naming pattern: <type>/SPT-<TicketNumber>-<description>
BRANCH_NAME="${TYPE}/SPT-${TICKET}-${DESC}"
echo "Creating and checking out branch: ${BRANCH_NAME}"

# Switch to develop integration branch
if git show-ref --verify --quiet refs/heads/develop; then
  git checkout develop
else
  git checkout -b develop
fi

# Pull latest develop if remote origin exists
if git remote get-url origin >/dev/null 2>&1; then
  git pull origin develop 2>/dev/null || true
fi

# Create and checkout feature or bugfix branch
git checkout -b "${BRANCH_NAME}"
