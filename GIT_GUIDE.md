# Git quickstart for this project (Windows PowerShell)

This repo already has a main branch. Below are the minimal, safe commands you’ll use daily.

## 0) One-time setup (if not configured)
Set your identity so commits work:

```powershell
# Replace with your info
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

Optionally enable helpful defaults:
```powershell
git config --global pull.rebase false   # default: merge when pulling
git config --global init.defaultBranch main
```

## 1) See what changed
```powershell
git status
```

## 2) Save work in small commits
Stage only what you intend to commit:
```powershell
# Stage specific files
git add client/src/components/DetailedResultsScreen.tsx client/src/lib/storage.ts

# Or stage everything except ignored files
git add -A
```
Commit with a clear message:
```powershell
git commit -m "feat: add detailed results screen and client storage utils"
```

## 3) Create a branch for features/fixes
```powershell
git switch -c feat/solo-leaderboard
# do work, then commit
```

## 4) Sync with remote (GitHub, etc.)
First add a remote (one time):
```powershell
# Replace URL with your repo
git remote add origin https://github.com/<you>/<repo>.git
```
Push your branch:
```powershell
git push -u origin feat/solo-leaderboard
```
Push updates next time with just:
```powershell
git push
```

Pull updates from main:
```powershell
git switch main
git pull
```

## 5) Merge a branch
After opening a PR and merging on GitHub, update local:
```powershell
git switch main
git pull
```
If merging locally:
```powershell
git switch main
git merge feat/solo-leaderboard
```

## 6) Keep your branch updated (optional but recommended)
```powershell
git switch feat/solo-leaderboard
git fetch origin
git rebase origin/main   # or: git merge origin/main
```
Resolve any conflicts, then continue:
```powershell
git rebase --continue
```

## 7) Useful tips
- Make commits small and focused.
- Write messages like:
  - "feat: ..." for new features
  - "fix: ..." for bug fixes
  - "docs: ..." for docs
  - "refactor: ..." for code moves/cleanup (no behavior change)
- Use `.gitignore` to keep build artifacts and secrets out of Git.

## 8) Back up current work now (optional)
Create a branch and push everything:
```powershell
git switch -c savepoint/2025-09-08
git add -A
git commit -m "chore: savepoint before further changes"
# If remote is set
# git push -u origin savepoint/2025-09-08
```
