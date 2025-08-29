#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GRN='\033[0;32m'
YEL='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YEL}==> Running RN 0.81 VisionCamera (4.7.x) Android fix...${NC}"

ROOT="$(pwd)"
VC_DIR="$ROOT/node_modules/react-native-vision-camera/android/src/main/java/com/mrousavy/camera/react"

MANAGER="$VC_DIR/CameraViewManager.kt"
MODULE="$VC_DIR/CameraViewModule.kt"

if [[ ! -f "$MANAGER" || ! -f "$MODULE" ]]; then
  echo -e "${RED}Could not find expected files:${NC}"
  echo "  $MANAGER"
  echo "  $MODULE"
  echo "Run this script from the project ROOT (where package.json exists) after installing node_modules."
  exit 1
fi

backup_file () {
  local f="$1"
  if [[ -f "$f" && ! -f "${f}.bak_before_rn081_fix" ]]; then
    cp "$f" "${f}.bak_before_rn081_fix"
  fi
}

# 1) CameraViewManager.kt: Map -> MutableMap cast on .build()
backup_file "$MANAGER"

if grep -q 'build() as MutableMap<String, Any>\?' "$MANAGER"; then
  echo -e "${GRN}[OK] Manager already patched (cast exists).${NC}"
else
  # Add @Suppress if missing (optional)
  if ! grep -q '@Suppress("UNCHECKED_CAST")' "$MANAGER"; then
    # Insert @Suppress above class declaration or imports
    awk '
      /class CameraViewManager/ && !added {
        print "@Suppress(\"UNCHECKED_CAST\")"
        added=1
      }
      { print }
    ' "$MANAGER" > "$MANAGER.tmp" && mv "$MANAGER.tmp" "$MANAGER"
    echo -e "${GRN}[+] Inserted @Suppress(\"UNCHECKED_CAST\").${NC}"
  fi

  # Replace the terminal .build() in the event map with cast
  # Only change the line that ends the chain with .build()
  if grep -q '^[[:space:]]*\.build()[[:space:]]*$' "$MANAGER"; then
    sed -i '' -e 's/^[[:space:]]*\.build()[[:space:]]*$/        .build() as MutableMap<String, Any>?/' "$MANAGER" 2>/dev/null || \
    sed -i -e 's/^[[:space:]]*\.build()[[:space:]]*$/        .build() as MutableMap<String, Any>?/' "$MANAGER"
    echo -e "${GRN}[+] Casted MapBuilder.build() -> MutableMap<String, Any>? in CameraViewManager.kt.${NC}"
  else
    # Fallback: replace last .build() in the block
    perl -0777 -pe 'BEGIN{$/=undef} s/(\.put\(AverageFpsChangedEvent\.EVENT_NAME[^\n]*\n[^\n]*\n[^\n]*?)\.build\(\)/\1.build() as MutableMap<String, Any>?/s' "$MANAGER" > "$MANAGER.tmp" && mv "$MANAGER.tmp" "$MANAGER"
    echo -e "${GRN}[+] Cast applied with fallback in CameraViewManager.kt.${NC}"
  fi
fi

# 2) CameraViewModule.kt: currentActivity -> reactApplicationContext.currentActivity
backup_file "$MODULE"

# Ensure PermissionAwareActivity import exists
if grep -q 'com.facebook.react.modules.core.PermissionAwareActivity' "$MODULE"; then
  echo -e "${GRN}[OK] PermissionAwareActivity import already present.${NC}"
else
  # Insert import after package and imports
  awk '
    NR==1 && $0 ~ /^package / { print; next }
    printed==0 && $0 ~ /^import / {
      print "import com.facebook.react.modules.core.PermissionAwareActivity"
      printed=1
    }
    { print }
  ' "$MODULE" > "$MODULE.tmp" && mv "$MODULE.tmp" "$MODULE"
  echo -e "${GRN}[+] Added PermissionAwareActivity import.${NC}"
fi

# Replace currentActivity reference
if grep -q 'reactApplicationContext\.currentActivity as\? PermissionAwareActivity' "$MODULE"; then
  echo -e "${GRN}[OK] Module already patched (reactApplicationContext.currentActivity).${NC}"
else
  # Replace only in canRequestPermission function
  perl -0777 -pe 'BEGIN{$/=undef} s/(fun\s+canRequestPermission\([^\)]*\)\s*:\s*Boolean\s*\{\s*[^}]*?val\s+activity\s*=\s*)currentActivity(\s+as\?\s+PermissionAwareActivity)/\1reactApplicationContext.currentActivity\2/s' "$MODULE" > "$MODULE.tmp" && mv "$MODULE.tmp" "$MODULE"
  echo -e "${GRN}[+] Replaced currentActivity -> reactApplicationContext.currentActivity in CameraViewModule.kt.${NC}"
fi

echo -e "${YEL}==> Creating patch with patch-package...${NC}"
# Ensure patch-package exists
if ! npx --yes --quiet patch-package --help >/dev/null 2>&1; then
  echo -e "${RED}patch-package is not installed. Install with:${NC}"
  echo "  npm i -D patch-package postinstall-postinstall"
  exit 1
fi

# Generate patch against the live module
npx patch-package react-native-vision-camera

echo -e "${GRN}All done!${NC}"
echo "A new patch should exist under ./patches/ for react-native-vision-camera."
