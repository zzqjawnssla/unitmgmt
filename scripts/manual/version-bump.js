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

// iOS project.pbxproj 업데이트 (직접 버전 설정)
const pbxprojPath = path.join(__dirname, '..', '..', 'ios', 'unitmgmt.xcodeproj', 'project.pbxproj');
if (fs.existsSync(pbxprojPath)) {
  let pbxprojContent = fs.readFileSync(pbxprojPath, 'utf8');
  
  // MARKETING_VERSION 업데이트 (모든 occurrence)
  pbxprojContent = pbxprojContent.replace(
    /MARKETING_VERSION = [\d.]+;/g,
    `MARKETING_VERSION = ${newVersion};`
  );
  
  // CURRENT_PROJECT_VERSION 업데이트 (모든 occurrence)  
  pbxprojContent = pbxprojContent.replace(
    /CURRENT_PROJECT_VERSION = \d+;/g,
    `CURRENT_PROJECT_VERSION = ${newVersionCode};`
  );
  
  fs.writeFileSync(pbxprojPath, pbxprojContent);
  console.log(`📱 iOS project.pbxproj updated: ${newVersion} (${newVersionCode})`);
}

// iOS Info.plist 업데이트 (fallback, Xcode 변수 방식)
const infoPlistPath = path.join(__dirname, '..', '..', 'ios', 'unitmgmt', 'Info.plist');
if (fs.existsSync(infoPlistPath)) {
  let plistContent = fs.readFileSync(infoPlistPath, 'utf8');
  
  // 하드코딩된 버전이 있다면 Xcode 변수로 변경
  plistContent = plistContent.replace(
    /<key>CFBundleShortVersionString<\/key>\s*<string>[\d.]+<\/string>/,
    `<key>CFBundleShortVersionString</key>\n\t<string>$(MARKETING_VERSION)</string>`
  );
  
  plistContent = plistContent.replace(
    /<key>CFBundleVersion<\/key>\s*<string>\d+<\/string>/,
    `<key>CFBundleVersion</key>\n\t<string>$(CURRENT_PROJECT_VERSION)</string>`
  );
  
  fs.writeFileSync(infoPlistPath, plistContent);
}

console.log('✅ Version bump complete!');
console.log(`📱 New version: ${newVersion} (${newVersionCode})`);

// Git 커밋 메시지 제안
console.log('\n💡 Suggested git commit:');
console.log(`git add -A && git commit -m "chore: bump version to ${newVersion}"`);
console.log(`git tag v${newVersion}`);