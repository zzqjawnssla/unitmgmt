#!/bin/bash

# 통합 APK 빌드 스크립트 (모든 ARM 아키텍처 포함)
# x86/x86_64는 제외하여 용량 최적화

echo "🚀 Starting unified optimized APK build..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 프로젝트 루트 디렉토리 확인
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

# package.json에서 버전 추출
VERSION=$(grep '"version"' package.json | head -1 | cut -d'"' -f4)
echo -e "${YELLOW}📌 Building version: ${VERSION}${NC}"

# 1. Clean previous builds
echo -e "${YELLOW}📧 Cleaning previous builds...${NC}"
cd android
./gradlew clean
cd ..

# 2. Build unified release APK (splits disabled by default)
echo -e "${YELLOW}🔨 Building unified release APK...${NC}"
cd android
./gradlew assembleRelease

# 3. Check build result
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful!${NC}"
    
    # 4. Show APK information
    echo -e "\n${YELLOW}📱 Generated APK file:${NC}"
    
    # Find the generated APK
    APK_FILE=$(find app/build/outputs/apk/release -name "*.apk" | head -1)
    if [ -n "$APK_FILE" ]; then
        ls -lh "$APK_FILE"
        APK_SIZE=$(ls -lh "$APK_FILE" | awk '{print $5}')
        
        echo -e "\n${GREEN}→ Universal APK with ARM architectures${NC}"
        echo -e "  • Includes: armeabi-v7a (32-bit) + arm64-v8a (64-bit)"
        echo -e "  • Excludes: x86, x86_64 (emulator only)"
        echo -e "  • Compatible with 99%+ Android devices"
        
        # 5. Size comparison
        echo -e "\n${YELLOW}📊 Size Optimization Results:${NC}"
        echo -e "  Original APK size: ${RED}87MB${NC}"
        echo -e "  Optimized APK size: ${GREEN}$APK_SIZE${NC}"
        
        # 6. Installation instructions
        echo -e "\n${YELLOW}📲 Installation Instructions:${NC}"
        echo "  adb install $APK_FILE"
        
        # 7. Copy with version naming
        FINAL_APK_NAME="otums-v${VERSION}-release.apk"
        cp "$APK_FILE" "app/$FINAL_APK_NAME"
        echo -e "\n${YELLOW}📦 APK copied to:${NC}"
        echo "  android/app/$FINAL_APK_NAME"
    else
        echo -e "${RED}No APK file found!${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Build failed!${NC}"
    echo "Check the error messages above for details."
    exit 1
fi

cd ..

echo -e "\n${GREEN}✨ Optimization complete!${NC}"
echo -e "${YELLOW}Note: This APK includes both ARM architectures in a single file.${NC}"