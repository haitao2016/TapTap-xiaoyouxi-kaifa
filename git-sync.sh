#!/bin/bash
set -euo pipefail

WORK_DIR="/workspace"
LOG_FILE="/workspace/git-sync.log"
MAX_RETRIES=3
RETRY_DELAY=10

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

cd "$WORK_DIR" || {
    log "ERROR: Failed to enter directory $WORK_DIR"
    exit 1
}

if [ ! -d ".git" ]; then
    log "ERROR: $WORK_DIR is not a git repository"
    exit 1
fi

if ! git config user.name > /dev/null 2>&1; then
    git config user.name "Auto Sync Bot"
    git config user.email "autosync@local.dev"
fi

log "=== Starting git sync ==="

if ! git remote get-url origin > /dev/null 2>&1; then
    log "ERROR: No remote 'origin' configured"
    exit 1
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
log "Current branch: $CURRENT_BRANCH"

push_with_retry() {
    local attempt=1
    while [ $attempt -le $MAX_RETRIES ]; do
        log "Push attempt $attempt/$MAX_RETRIES..."
        
        if git push origin "$CURRENT_BRANCH" >> "$LOG_FILE" 2>&1; then
            log "Push successful"
            return 0
        fi
        
        log "Push failed on attempt $attempt"
        
        if [ $attempt -lt $MAX_RETRIES ]; then
            log "Pulling with rebase and retrying..."
            git fetch origin "$CURRENT_BRANCH" >> "$LOG_FILE" 2>&1
            if ! git rebase "origin/$CURRENT_BRANCH" >> "$LOG_FILE" 2>&1; then
                log "ERROR: Rebase failed, aborting"
                git rebase --abort >> "$LOG_FILE" 2>&1
                return 1
            fi
            sleep $RETRY_DELAY
        fi
        
        attempt=$((attempt + 1))
    done
    
    log "ERROR: Push failed after $MAX_RETRIES attempts"
    return 1
}

git add -A

if git diff --cached --quiet; then
    log "No changes to commit"
    log "=== Sync completed (nothing to do) ==="
    exit 0
fi

CHANGED_COUNT=$(git diff --cached --name-only | wc -l)
log "Changes detected: $CHANGED_COUNT file(s)"

COMMIT_MSG="Auto-sync: $(date '+%Y-%m-%d %H:%M:%S')"
if git commit -m "$COMMIT_MSG" >> "$LOG_FILE" 2>&1; then
    log "Committed: $COMMIT_MSG"
else
    log "ERROR: git commit failed"
    exit 1
fi

push_with_retry

log "=== Sync completed successfully ==="
