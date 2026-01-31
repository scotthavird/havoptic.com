# Quick Implementation

Implement a feature end-to-end: create branch, implement with incremental commits, create PR, wait for CI, merge to main, and verify deployment.

## Arguments
- `$ARGUMENTS` - The feature description and optional branch name (e.g., "add-dark-mode: Add dark mode toggle" or just "Fix the login bug")

## Instructions

1. **Parse the arguments**: Extract the branch name (before the colon) and task description (after the colon) from: `$ARGUMENTS`
   - If no colon is present, use the entire argument as both branch name (kebab-cased) and description
   - Auto-prefix with `feature/` or `fix/` based on the description

2. **Ensure starting from main**:
   - Run `git checkout main && git pull` to ensure we're on an up-to-date main branch

3. **Create a feature branch**:
   - Run `git checkout -b <branch-name>` to create and switch to the new branch

4. **Plan the implementation**:
   - Analyze the task and create a todo list with all required steps
   - Break down the work into logical, committable chunks

5. **Implement with incremental commits**:
   - For each todo item:
     - Mark the todo as in_progress
     - Implement the changes
     - Mark the todo as completed
     - Stage the relevant files with `git add`
     - Commit with a descriptive message
     - Push to remote with `git push -u origin <branch-name>` (first push) or `git push` (subsequent)

6. **Create a Pull Request**:
   - Once all todos are complete, create a PR using `gh pr create`
   - Include a summary of all changes made
   - Get the PR number from the output

7. **Wait for CI to pass**:
   - Run `gh pr checks <PR_NUMBER> --watch` to wait for all checks to complete
   - If checks failed, report the failure and stop (do not proceed to merge)

8. **Squash merge the PR**:
   - Run `gh pr merge <PR_NUMBER> --squash --delete-branch`
   - This merges, squashes commits, and deletes the remote branch

9. **Switch to main and pull**:
   - Run `git checkout main && git pull`

10. **Verify production deployment**:
    - List recent workflow runs: `gh run list --branch main --limit 1`
    - If the deploy is still in progress, wait for it
    - Confirm the production deploy succeeded

11. **Report completion**:
    - Confirm the PR was merged
    - Confirm production deployment status
    - Show the merge commit hash

## Tips
- This command is ideal for small, self-contained changes
- For larger features that need review, use `/feature` instead and merge manually
- If CI fails, you'll need to fix issues and use `/merge` separately after
