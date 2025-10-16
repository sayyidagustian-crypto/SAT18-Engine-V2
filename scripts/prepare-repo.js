// scripts/prepare-repo.js
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const log = (message) => console.log(`[Prepare Repo] ${message}`);
const logError = (message) => console.error(`[Prepare Repo] ERROR: ${message}`);
const logSuccess = (message) => console.log(`[Prepare Repo] ✅ ${message}`);

function runCommand(command) {
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    logError(`Failed to execute: ${command}`);
    return false;
  }
}

function main() {
  log('Starting repository preparation for GitHub...');

  // Step 1: Ensure it's a Git repository
  if (!fs.existsSync(path.join(process.cwd(), '.git'))) {
    log('No .git directory found. Initializing a new Git repository...');
    if (!runCommand('git init')) return;
  } else {
    log('Existing Git repository found.');
  }

  // Step 2: Clear the Git cache completely.
  // This is the CRITICAL step to solve the problem of node_modules being tracked.
  log('Forcefully clearing the Git cache to respect the .gitignore file...');
  log('This will unstage all files. This is expected.');
  if (!runCommand('git rm -r --cached .')) {
      log('No cached files to remove, or an error occurred. Continuing...');
  };


  // Step 3: Add all files back. This time, it will respect .gitignore.
  log('Re-adding all files to the staging area. This will now correctly ignore node_modules...');
  if (!runCommand('git add .')) return;

  // Step 4: Create an initial commit if there are any changes
  log('Checking if a commit is needed...');
  try {
    // Check if there are staged changes. If not, `git diff` will exit with 0.
    // If there are, it will exit with 1, and the catch block will run.
    execSync('git diff --cached --quiet');
    log('No changes to commit. Your repository is likely already prepared.');
  } catch (error) {
    log('Changes detected. Creating initial commit...');
    if (!runCommand('git commit -m "Initial commit of SAT18 Engine v2"')) {
        logError('Could not create the initial commit. You may need to configure your git user name and email.');
        logError('Run: git config --global user.name "Your Name"');
        logError('Run: git config --global user.email "your.email@example.com"');
        return;
    }
  }

  logSuccess('Repository preparation complete!');
  console.log('\n--- NEXT STEPS ---');
  console.log('1. Go to GitHub and create a new, EMPTY repository.');
  console.log('2. Copy the commands from GitHub that look like this:');
  console.log('   git remote add origin https://github.com/your-username/your-repo-name.git');
  console.log('   git branch -M main');
  console.log('   git push -u origin main');
  console.log('3. Paste and run those commands here in your terminal.');
  console.log('------------------');
}

main();
