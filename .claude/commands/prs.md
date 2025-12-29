# PR Status

Show the status of all pull requests for this repository.

## Instructions

Run the following commands to get PR status:

1. List all open PRs:
```bash
gh pr list --state open
```

2. List recently merged PRs (last 10):
```bash
gh pr list --state merged --limit 10
```

3. Show a summary with counts:
```bash
echo "=== Open PRs ===" && gh pr list --state open && echo "" && echo "=== Recently Merged ===" && gh pr list --state merged --limit 5 && echo "" && echo "=== Recently Closed ===" && gh pr list --state closed --limit 5
```

Present the results in a clear, readable format. Include:
- PR number
- Title
- Author
- Status (open/merged/closed)
- When it was created or merged
