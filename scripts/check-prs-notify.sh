#!/bin/bash
# Daily PR Status Checker with macOS Notification
# This script checks backlink PR status and shows a notification

cd /Users/scotthavird/Documents/GitHub/scotthavird/havoptic.com

# Check PR status using gh CLI
merged=0
open=0
closed=0

declare -a prs=(
  # Tier 1: Perfect Fit
  "jamesmurdza/awesome-ai-devtools:181"
  "sourcegraph/awesome-code-ai:80"
  "mahseema/awesome-ai-tools:516"
  "eudk/awesome-ai-tools:60"
  # Tier 2: Strong Fit
  "ripienaar/free-for-dev:3947"
  "agamm/awesome-developer-first:250"
  "athivvat/awesome-devtools:15"
)

for item in "${prs[@]}"; do
  repo="${item%:*}"
  pr="${item#*:}"
  state=$(gh pr view "$pr" --repo "$repo" --json state --jq '.state' 2>/dev/null || echo "ERROR")

  case $state in
    MERGED) ((merged++)) ;;
    OPEN) ((open++)) ;;
    CLOSED) ((closed++)) ;;
  esac
done

total=$((merged + open + closed))

# Build notification message
title="Havoptic Backlink PRs"
message="✅ Merged: $merged | 📤 Open: $open | ❌ Closed: $closed"

# Show macOS notification
osascript -e "display notification \"$message\" with title \"$title\""

# Also log to file for history
echo "$(date '+%Y-%m-%d %H:%M') - Merged: $merged, Open: $open, Closed: $closed" >> ~/Library/Logs/havoptic-pr-status.log
