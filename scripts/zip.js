const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');

// Read version from repurposa.php
const pluginFile = fs.readFileSync(path.join(root, 'repurposa.php'), 'utf8');
const match = pluginFile.match(/^\s*\*\s*Version:\s*(.+)$/m);

if (!match) {
    console.error('Could not find Version in repurposa.php');
    process.exit(1);
}

const version = match[1].trim();
const zipName = `repurposa-${version}.zip`;
const distDir = path.join(root, 'dist');

console.log(`\nBuilding repurposa v${version}...\n`);

// Install composer deps (production only)
console.log('Installing composer dependencies...');
execSync('composer install --no-dev --optimize-autoloader', { cwd: root, stdio: 'inherit' });

// Build assets
console.log('\nBuilding assets...');
execSync('npm run build', { cwd: root, stdio: 'inherit' });

// Create dist directory
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
}

// Create zip
console.log(`\nCreating ${zipName}...`);
const zipPath = path.join(distDir, zipName);

if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
}

const excludes = [
    '.git/*',
    '.github/*',
    'node_modules/*',
    'src/*',
    'scripts/*',
    'dist/*',
    '.gitignore',
    'package.json',
    'package-lock.json',
    'composer.json',
    'composer.lock',
    'webpack.config.js',
    'postcss.config.js',
    'tsconfig.json',
    'vitest.config.ts',
    '.DS_Store',
];

// Create a temp folder named 'repurposa' so the zip extracts to the correct folder name.
const tmpDir = path.join(root, '..', 'repurposa-zip-tmp');
const tmpPlugin = path.join(tmpDir, 'repurposa');

if (fs.existsSync(tmpDir)) {
    execSync(`rm -rf "${tmpDir}"`);
}
fs.mkdirSync(tmpPlugin, { recursive: true });

const rsyncExcludes = excludes.map(e => `--exclude='${e}'`).join(' ');
execSync(`rsync -a ${rsyncExcludes} "${root}/" "${tmpPlugin}/"`, { stdio: 'inherit' });
execSync(`cd "${tmpDir}" && zip -r "${zipPath}" repurposa/`, { stdio: 'inherit' });
execSync(`rm -rf "${tmpDir}"`);

// Sync version to package.json
const pkgPath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
if (pkg.version !== version) {
    pkg.version = version;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`\nSynced package.json version to ${version}`);
}

console.log(`\n✓ Done! ${zipName} is in dist/\n`);
