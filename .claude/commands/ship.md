# Ship Feature

Start working on a feature with a structured workflow: create branch, implement with tracked todos, and push incrementally.

## Arguments
- `$ARGUMENTS` - The feature description (e.g., "add user authentication" or "fix-login-bug: Fix the login timeout issue")

## Instructions

1. **Parse the arguments**:
   - If format is `branch-name: description`, extract both parts
   - Otherwise, derive branch name by kebab-casing the description
   - Prefix with `feature/` for new features or `fix/` for bug fixes

2. **Create the feature branch**:
   - Ensure on main and up to date: `git checkout main && git pull`
   - Create and switch to new branch: `git checkout -b <branch-name>`
   - Push branch to remote: `git push -u origin <branch-name>`

3. **Break down the work**:
   - Analyze the feature/fix requirements
   - Create a todo list with clear, atomic tasks
   - Each todo should represent a single committable unit of work

4. **Implement with incremental commits**:
   - For each todo item:
     - Mark the todo as `in_progress`
     - Implement the changes
     - Stage relevant files: `git add <files>`
     - Commit with descriptive message linking to the task
     - Push to remote: `git push`
     - Mark the todo as `completed`
   - Keep commits small and focused

5. **Create Pull Request**:
   - Once all todos are complete, create PR: `gh pr create`
   - Include summary of all changes
   - Reference any related issues

6. **Monitor CI**:
   - Watch for CI checks to complete: `gh pr checks --watch`
   - Report the PR URL and status to the user

## Tips
- Commit early and often
- Each commit should leave the codebase in a working state
- Write meaningful commit messages that explain "why" not just "what"
