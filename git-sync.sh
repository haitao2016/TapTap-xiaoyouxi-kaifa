#!/bin/bash

WORK_DIR="/workspace"
LOG_FILE="/workspace/git-sync.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

cd "$WORK_DIR" || {
    log "ERROR: Failed to enter directory $WORK_DIR"
    exit 1
}

if [ ! -d ".git" ]; then
    log "ERROR: $WORK_DIR is not a git repository"
    exit 1
fi

log "=== Starting git sync ==="

git fetch origin main >> "$LOG_FILE" 2>&1

if ! git diff --quiet HEAD origin/main; then
    log "Remote has new commits, pulling..."
    git pull --rebase origin main >> "$LOG_FILE" 2>&1
    if [ $? -ne 0 ]; then
        log "ERROR: git pull failed, aborting sync"
        git rebase --abort >> "$LOG_FILE" 2>&1
        exit 1
    fi
fi

git add -A

if git diff --cached --quiet; then
    log "No changes to commit"
    log "=== Sync completed (nothing to do) ==="
    exit 0
fi

COMMIT_MSG="Auto-sync: $(date '+%Y-%m-%d %H:%M:%S')"
git commit -m "$COMMIT_MSG" >> "$LOG_FILE" 2>&1

if [ $? -ne 0 ]; then
    log "ERROR: git commit failed"
    exit 1
fi

log "Committed: $COMMIT_MSG"

git push origin main >> "$LOG_FILE" 2>&1

if [ $? -ne 0 ]; then
    log "ERROR: git push failed"
    exit 1
fi

log "Push successful"
log "=== Sync completed successfully ==="
