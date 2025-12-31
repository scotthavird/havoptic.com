# Merge PR

Squash merge the current PR into main, clean up, and verify deployment.

## Arguments
- `$ARGUMENTS` - Optional PR number (defaults to current branch's PR)

## Instructions

1. **Identify the PR to merge**:
   - If a PR number is provided in `$ARGUMENTS`, use that
   - Otherwise, get the PR for the current branch: `gh pr view --json number -q .number`

2. **Verify PR is ready**:
   - Check all CI checks have passed: `gh pr checks <PR_NUMBER>`
   - If checks are still pending, wait for them to complete
   - If checks failed, report the failure and stop

3. **Squash merge the PR**:
   - Run `gh pr merge <PR_NUMBER> --squash --delete-branch`
   - This merges, squashes commits, and deletes the remote branch

4. **Switch to main and pull**:
   - Run `git checkout main && git pull`

5. **Verify production deployment**:
   - List recent workflow runs: `gh run list --branch main --limit 1`
   - If the deploy is still in progress, wait for it
   - Confirm the production deploy succeeded

6. **Report completion**:
   - Confirm the PR was merged
   - Confirm production deployment status
   - Show the merge commit hash
