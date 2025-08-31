#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 버전 타입: major, minor, patch
const versionType = process.argv[2] || 'patch';

// package.json 읽기
const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// 현재 버전 파싱
const currentVersion = packageJson.version;
const [major, minor, patch] = currentVersion.split('.').map(Number);

// 새 버전 계산
let newMajor = major;
let newMinor = minor;
let newPatch = patch;

switch (versionType) {
  case 'major':
    newMajor++;
    newMinor = 0;
    newPatch = 0;
    break;
  case 'minor':
    newMinor++;
    newPatch = 0;
    break;
  case 'patch':
    newPatch++;
    break;
  default:
    console.error('Invalid version type. Use: major, minor, or patch');
    process.exit(1);
}

const newVersion = `${newMajor}.${newMinor}.${newPatch}`;
const newVersionCode = newMajor * 10000 + newMinor * 100 + newPatch;

console.log(`Bumping version from ${currentVersion} to ${newVersion}`);
console.log(`Version code: ${newVersionCode}`);

// package.json 업데이트
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

// Android build.gradle 업데이트
const gradlePath = path.join(__dirname, '..', '..', 'android', 'app', 'build.gradle');
let gradleContent = fs.readFileSync(gradlePath, 'utf8');

gradleContent = gradleContent.replace(
  /versionCode\s+\d+/,
  `versionCode ${newVersionCode}`
);
gradleContent = gradleContent.replace(
  /versionName\s+"[\d.]+"/,
  `versionName "${newVersion}"`
);

fs.writeFileSync(gradlePath, gradleContent);

// iOS Info.plist 업데이트 (선택사항)
const infoPlistPath = path.join(__dirname, '..', '..', 'ios', 'unitmgmt', 'Info.plist');
if (fs.existsSync(infoPlistPath)) {
  let plistContent = fs.readFileSync(infoPlistPath, 'utf8');
  
  // CFBundleShortVersionString 업데이트
  plistContent = plistContent.replace(
    /<key>CFBundleShortVersionString<\/key>\s*<string>[\d.]+<\/string>/,
    `<key>CFBundleShortVersionString</key>\n\t<string>${newVersion}</string>`
  );
  
  // CFBundleVersion 업데이트
  plistContent = plistContent.replace(
    /<key>CFBundleVersion<\/key>\s*<string>\d+<\/string>/,
    `<key>CFBundleVersion</key>\n\t<string>${newVersionCode}</string>`
  );
  
  fs.writeFileSync(infoPlistPath, plistContent);
}

console.log('✅ Version bump complete!');
console.log(`📱 New version: ${newVersion} (${newVersionCode})`);

// Git 커밋 메시지 제안
console.log('\n💡 Suggested git commit:');
console.log(`git add -A && git commit -m "chore: bump version to ${newVersion}"`);
console.log(`git tag v${newVersion}`);