const { execSync } = require('child_process');
const path = require('path');

const WORK_DIR = '/workspace';
const LOG_FILE = path.join(WORK_DIR, 'git-sync.log');

function log(message) {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const logLine = `[${timestamp}] ${message}\n`;
    require('fs').appendFileSync(LOG_FILE, logLine);
    console.log(logLine.trim());
}

function runSync(command, options = {}) {
    try {
        const result = execSync(command, {
            ...options,
            stdio: ['ignore', 'pipe', 'pipe'],
            encoding: 'utf-8'
        });
        return { success: true, output: result.trim() };
    } catch (error) {
        return { success: false, output: error.stdout ? error.stdout.trim() : '', error: error.stderr ? error.stderr.trim() : '' };
    }
}

function syncGit() {
    log('=== Starting git sync ===');

    try {
        process.chdir(WORK_DIR);
    } catch (error) {
        log(`ERROR: Failed to enter directory ${WORK_DIR}: ${error.message}`);
        return;
    }

    const gitDirCheck = runSync('ls -la .git');
    if (!gitDirCheck.success) {
        log(`ERROR: ${WORK_DIR} is not a git repository`);
        return;
    }

    log('Fetching latest from origin...');
    const fetchResult = runSync('git fetch origin main');
    if (!fetchResult.success) {
        log(`ERROR: git fetch failed: ${fetchResult.error}`);
        return;
    }

    const diffRemote = runSync('git diff --quiet HEAD origin/main');
    if (diffRemote.success === false) {
        log('Remote has new commits, pulling with rebase...');
        const pullResult = runSync('git pull --rebase origin main');
        if (!pullResult.success) {
            log(`ERROR: git pull failed: ${pullResult.error}`);
            runSync('git rebase --abort');
            return;
        }
    }

    log('Adding files...');
    runSync('git add -A');

    const hasChanges = runSync('git diff --cached --quiet');
    if (hasChanges.success) {
        log('No changes to commit');
        log('=== Sync completed (nothing to do) ===');
        return;
    }

    const commitMsg = `Auto-sync: ${new Date().toISOString().replace('T', ' ').slice(0, 19)}`;
    const commitResult = runSync(`git commit -m "${commitMsg}"`);
    if (!commitResult.success) {
        log(`ERROR: git commit failed: ${commitResult.error}`);
        return;
    }

    log(`Committed: ${commitMsg}`);

    const pushResult = runSync('git push origin main');
    if (!pushResult.success) {
        log(`ERROR: git push failed: ${pushResult.error}`);
        log('Attempting to pull and rebase...');
        const retryPull = runSync('git pull --rebase origin main');
        if (retryPull.success) {
            log('Pull successful, retrying push...');
            const retryPush = runSync('git push origin main');
            if (retryPush.success) {
                log('Push successful after retry');
            } else {
                log(`ERROR: Push retry failed: ${retryPush.error}`);
            }
        } else {
            log(`ERROR: Pull retry failed: ${retryPull.error}`);
            runSync('git rebase --abort');
        }
        return;
    }

    log('Push successful');
    log('=== Sync completed successfully ===');
}

syncGit();

setInterval(syncGit, 60 * 60 * 1000);

log('Git sync daemon started, syncing every hour...');