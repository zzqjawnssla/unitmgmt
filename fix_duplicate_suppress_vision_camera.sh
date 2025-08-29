#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GRN='\033[0;32m'
YEL='\033[1;33m'
NC='\033[0m'

echo -e "${YEL}==> Fixing duplicate @Suppress on CameraViewManager.kt ...${NC}"

ROOT="$(pwd)"
VC_DIR="$ROOT/node_modules/react-native-vision-camera/android/src/main/java/com/mrousavy/camera/react"
TARGET="$VC_DIR/CameraViewManager.kt"

if [[ ! -f "$TARGET" ]]; then
  echo -e "${RED}Cannot find: $TARGET${NC}"
  echo "Run this from your project root (where package.json exists) after installing node_modules."
  exit 1
fi

cp "$TARGET" "${TARGET}.bak_before_fix_duplicate_suppress"

# Merge duplicate @Suppress annotations into a single one
# 1) Capture existing @Suppress(...) arguments (if any) directly above the class
ARGS="$(awk '
  /@Suppress\(/ { sup_line=$0; next }
  /class[[:space:]]+CameraViewManager/ { if (sup_line != "") print sup_line; exit }
' "$TARGET" | sed -E 's/^[[:space:]]*@Suppress\((.*)\)[[:space:]]*$/\1/')"

if [[ -n "${ARGS}" ]]; then
  # Normalize spacing
  ARGS_CLEAN="$(echo "$ARGS" | sed -E 's/[[:space:]]+//g')"
  if [[ "$ARGS_CLEAN" == *"UNCHECKED_CAST"* ]]; then
    echo -e "${GRN}[OK] @Suppress already contains UNCHECKED_CAST; removing extra @Suppress if present...${NC}"
    # Remove any duplicate plain @Suppress("UNCHECKED_CAST") lines
    perl -0777 -pe 'BEGIN{$/=undef} s/\n\s*@Suppress\("UNCHECKED_CAST"\)\s*\n/\n/gs' "$TARGET" > "$TARGET.tmp" && mv "$TARGET.tmp" "$TARGET"
  else
    echo -e "${YEL}[~] Merging UNCHECKED_CAST into existing @Suppress(...)${NC}"
    # Replace the first @Suppress(...) with a merged one that includes UNCHECKED_CAST
    perl -0777 -pe 'BEGIN{$/=undef} s/@Suppress\(([^)]*)\)/@Suppress\(\1, "UNCHECKED_CAST"\)/s' "$TARGET" > "$TARGET.tmp" && mv "$TARGET.tmp" "$TARGET"
    # Remove any stray second @Suppress("UNCHECKED_CAST")
    perl -0777 -pe 'BEGIN{$/=undef} s/\n\s*@Suppress\("UNCHECKED_CAST"\)\s*\n/\n/gs' "$TARGET" > "$TARGET.tmp" && mv "$TARGET.tmp" "$TARGET"
    echo -e "${GRN}[+] Merged successfully.${NC}"
  fi
else
  echo -e "${YEL}[~] No existing @Suppress found above class; removing solitary duplicates if any...${NC}"
  perl -0777 -pe 'BEGIN{$/=undef} s/\n\s*@Suppress\("UNCHECKED_CAST"\)\s*\n(\s*class\s+CameraViewManager)/\n\1/s' "$TARGET" > "$TARGET.tmp" && mv "$TARGET.tmp" "$TARGET"
fi

echo -e "${YEL}==> (Optional) Re-create patch with patch-package...${NC}"
if npx --yes --quiet patch-package --help >/dev/null 2>&1; then
  npx patch-package react-native-vision-camera
  echo -e "${GRN}[OK] Regenerated patch under ./patches/.${NC}"
else
  echo -e "${YEL}patch-package not found; skipping patch creation.${NC}"
fi

echo -e "${GRN}Done.${NC}"
