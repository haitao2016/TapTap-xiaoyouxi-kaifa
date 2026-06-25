const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const WORK_DIR = '/workspace';
const LOG_FILE = path.join(WORK_DIR, 'git-sync.log');
const PID_FILE = path.join(WORK_DIR, 'git-sync.pid');
const SYNC_INTERVAL_MS = 60 * 60 * 1000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 10 * 1000;

function log(message) {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const logLine = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, logLine);
    process.stdout.write(logLine);
}

function runSync(command, options = {}) {
    try {
        const result = execSync(command, {
            cwd: WORK_DIR,
            ...options,
            stdio: ['ignore', 'pipe', 'pipe'],
            encoding: 'utf-8'
        });
        return { success: true, output: result.trim() };
    } catch (error) {
        return {
            success: false,
            output: error.stdout ? error.stdout.trim() : '',
            error: error.stderr ? error.stderr.trim() : ''
        };
    }
}

function ensureGitConfig() {
    const nameResult = runSync('git config user.name');
    if (!nameResult.success || !nameResult.output) {
        runSync('git config user.name "Auto Sync Bot"');
        runSync('git config user.email "autosync@local.dev"');
        log('Git user config initialized');
    }
}

function getCurrentBranch() {
    const result = runSync('git rev-parse --abbrev-ref HEAD');
    return result.success ? result.output : 'main';
}

function sleepSync(ms) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
    }
}

function pushWithRetry(branch) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        log(`Push attempt ${attempt}/${MAX_RETRIES}...`);
        
        const pushResult = runSync(`git push origin ${branch}`);
        if (pushResult.success) {
            log('Push successful');
            return true;
        }
        
        log(`Push failed on attempt ${attempt}: ${pushResult.error || pushResult.output}`);
        
        if (attempt < MAX_RETRIES) {
            log('Pulling with rebase and retrying...');
            runSync(`git fetch origin ${branch}`);
            const rebaseResult = runSync(`git rebase origin/${branch}`);
            if (!rebaseResult.success) {
                log('ERROR: Rebase failed, aborting');
                runSync('git rebase --abort');
                return false;
            }
            sleepSync(RETRY_DELAY_MS);
        }
    }
    
    log(`ERROR: Push failed after ${MAX_RETRIES} attempts`);
    return false;
}

function syncGit() {
    log('=== Starting git sync ===');

    if (!fs.existsSync(path.join(WORK_DIR, '.git'))) {
        log(`ERROR: ${WORK_DIR} is not a git repository`);
        return;
    }

    ensureGitConfig();

    const remoteCheck = runSync('git remote get-url origin');
    if (!remoteCheck.success) {
        log('ERROR: No remote origin configured');
        return;
    }

    const currentBranch = getCurrentBranch();
    log(`Current branch: ${currentBranch}`);

    runSync('git add -A');

    const hasChanges = runSync('git diff --cached --quiet');
    if (hasChanges.success) {
        log('No changes to commit');
        log('=== Sync completed (nothing to do) ===');
        return;
    }

    const changedFiles = runSync('git diff --cached --name-only');
    const fileCount = changedFiles.output ? changedFiles.output.split('\n').length : 0;
    log(`Changes detected: ${fileCount} file(s)`);

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const commitMsg = `Auto-sync: ${now}`;
    const commitResult = runSync(`git commit -m "${commitMsg}"`);
    
    if (!commitResult.success) {
        log(`ERROR: git commit failed: ${commitResult.error}`);
        return;
    }

    log(`Committed: ${commitMsg}`);

    pushWithRetry(currentBranch);

    log('=== Sync completed successfully ===');
}

function startDaemon() {
    if (fs.existsSync(PID_FILE)) {
        try {
            const oldPid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim());
            process.kill(oldPid, 0);
            log(`Daemon already running with PID ${oldPid}, stopping it first`);
            process.kill(oldPid, 'SIGTERM');
            setTimeout(() => {}, 1000);
        } catch (e) {
            log('No running daemon found, starting fresh');
        }
    }

    fs.writeFileSync(PID_FILE, String(process.pid));
    log(`Git sync daemon started (PID: ${process.pid}), syncing every hour...`);

    syncGit();

    setInterval(syncGit, SYNC_INTERVAL_MS);

    process.on('SIGTERM', () => {
        log('Received SIGTERM, shutting down...');
        if (fs.existsSync(PID_FILE)) {
            fs.unlinkSync(PID_FILE);
        }
        process.exit(0);
    });

    process.on('SIGINT', () => {
        log('Received SIGINT, shutting down...');
        if (fs.existsSync(PID_FILE)) {
            fs.unlinkSync(PID_FILE);
        }
        process.exit(0);
    });
}

if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--once')) {
        syncGit();
    } else if (args.includes('--stop')) {
        if (fs.existsSync(PID_FILE)) {
            const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim());
            try {
                process.kill(pid, 'SIGTERM');
                log(`Stopped daemon with PID ${pid}`);
                fs.unlinkSync(PID_FILE);
            } catch (e) {
                log(`Failed to stop daemon: ${e.message}`);
                fs.unlinkSync(PID_FILE);
            }
        } else {
            log('No PID file found, daemon may not be running');
        }
    } else if (args.includes('--status')) {
        if (fs.existsSync(PID_FILE)) {
            const pid = fs.readFileSync(PID_FILE, 'utf-8').trim();
            try {
                process.kill(parseInt(pid), 0);
                console.log(`Git sync daemon is running (PID: ${pid})`);
            } catch (e) {
                console.log('PID file exists but daemon is not running');
                fs.unlinkSync(PID_FILE);
            }
        } else {
            console.log('Git sync daemon is not running');
        }
    } else {
        startDaemon();
    }
}

module.exports = { syncGit };
