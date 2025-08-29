#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GRN='\033[0;32m'
YEL='\033[1;33m'
NC='\033[0m'

echo -e "${YEL}==> RN 0.81 × VisionCamera 4.7.x Android autofix (v2: no annotations)${NC}"

ROOT="$(pwd)"
VC_DIR="$ROOT/node_modules/react-native-vision-camera/android/src/main/java/com/mrousavy/camera/react"

MANAGER="$VC_DIR/CameraViewManager.kt"
MODULE="$VC_DIR/CameraViewModule.kt"

if [[ ! -f "$MANAGER" || ! -f "$MODULE" ]]; then
  echo -e "${RED}Could not find:"
  echo "  $MANAGER"
  echo "  $MODULE${NC}"
  echo "Run this from project ROOT after 'npm i' so node_modules exists."
  exit 1
fi

backup_file () {
  local f="$1"
  if [[ -f "$f" && ! -f "${f}.bak_before_rn081_fix_v2" ]]; then
    cp "$f" "${f}.bak_before_rn081_fix_v2"
  fi
}

# 1) CameraViewManager.kt — cast .build() to MutableMap<String, Any>?
backup_file "$MANAGER"

# Try targeted line replace: the end of MapBuilder chain with .build()
if grep -nE '^\s*\.build\(\)\s*$' "$MANAGER" >/dev/null 2>&1; then
  # macOS/BSD sed fallback
  sed -i '' -e 's/^[[:space:]]*\.build()[[:space:]]*$/        .build() as MutableMap<String, Any>?/' "$MANAGER" 2>/dev/null || \
  sed -i -e 's/^[[:space:]]*\.build()[[:space:]]*$/        .build() as MutableMap<String, Any>?/' "$MANAGER"
  echo -e "${GRN}[+] CameraViewManager.kt: replaced .build() -> .build() as MutableMap<String, Any>?${NC}"
else
  # Fallback: replace last occurrence of ".build()" in getExportedCustomDirectEventTypeConstants block
  perl -0777 -pe 'BEGIN{$/=undef} s/(getExportedCustomDirectEventTypeConstants\(\)[\s\S]*?)\.build\(\)/\1.build() as MutableMap<String, Any>?/s' "$MANAGER" > "$MANAGER.tmp" && mv "$MANAGER.tmp" "$MANAGER"
  echo -e "${GRN}[+] CameraViewManager.kt: applied fallback cast in function block.${NC}"
fi

# 2) CameraViewModule.kt — currentActivity -> reactApplicationContext.currentActivity + import
backup_file "$MODULE"

# Ensure import present once
if ! grep -q 'import com.facebook.react.modules.core.PermissionAwareActivity' "$MODULE"; then
  awk 'NR==1{print;next} NR==2{print "import com.facebook.react.modules.core.PermissionAwareActivity"; print; next} {print}' "$MODULE" > "$MODULE.tmp" && mv "$MODULE.tmp" "$MODULE"
  echo -e "${GRN}[+] CameraViewModule.kt: added PermissionAwareActivity import.${NC}"
fi

# Replace currentActivity reference in canRequestPermission
perl -0777 -pe 'BEGIN{$/=undef} s/(fun\s+canRequestPermission\([^\)]*\)\s*:\s*Boolean\s*\{\s*[\s\S]*?val\s+activity\s*=\s*)currentActivity(\s+as\?\s+PermissionAwareActivity)/\1reactApplicationContext.currentActivity\2/s' "$MODULE" > "$MODULE.tmp" && mv "$MODULE.tmp" "$MODULE"
echo -e "${GRN}[+] CameraViewModule.kt: replaced currentActivity -> reactApplicationContext.currentActivity.${NC}"

# 3) (Optional) generate patch if patch-package exists
if npx --yes --quiet patch-package --help >/dev/null 2>&1; then
  npx patch-package react-native-vision-camera
  echo -e "${GRN}[OK] Generated ./patches/react-native-vision-camera+<version>.patch${NC}"
else
  echo -e "${YEL}patch-package not installed; skipping patch creation.${NC}"
fi

echo -e "${GRN}Done. Now run:${NC}"
echo "  cd android && ./gradlew clean && cd .. && npm run android"
