# Feature Branch Workflow

Create a new feature branch, implement the task with incremental commits, and open a PR.

## Arguments
- `$ARGUMENTS` - The feature description and branch name (e.g., "add-dark-mode: Add dark mode toggle to the app")

## Instructions

1. **Parse the arguments**: Extract the branch name (before the colon) and task description (after the colon) from: `$ARGUMENTS`
   - If no colon is present, use the entire argument as both branch name (kebab-cased) and description

2. **Create a feature branch**:
   - Run `git checkout -b <branch-name>` to create and switch to the new branch

3. **Plan the implementation**:
   - Analyze the task and create a todo list with all required steps
   - Break down the work into logical, committable chunks

4. **Implement with incremental commits**:
   - For each todo item:
     - Mark the todo as in_progress
     - Implement the changes
     - Mark the todo as completed
     - Stage the relevant files with `git add`
     - Commit with a descriptive message
     - Push to remote with `git push -u origin <branch-name>` (first push) or `git push` (subsequent)

5. **Create a Pull Request**:
   - Once all todos are complete, create a PR using `gh pr create`
   - Include a summary of all changes made
   - Return the PR URL to the user
