#!/bin/zsh
# Double-click to package this folder as a zip to hand over.
# The zip lands on your Desktop and contains the tool plus all three docs.

cd "$(dirname "$0")" || exit 1

STAMP=$(date +%Y-%m-%d)
NAME="flat-rate-coupon-calculator-$STAMP"
OUT="$HOME/Desktop/$NAME.zip"

FILES=(
  README.md
  VERIFY.md
  RUNBOOK.md
  coupon-calculator.html
  open-calculator.command
  open-calculator.bat
  make-handoff-zip.command
)

missing=0
for f in $FILES; do
  [[ -f $f ]] || { echo "MISSING: $f"; missing=1 }
done
if (( missing )); then
  echo
  echo "Nothing was packaged. Restore the files listed above and try again."
  echo
  read "?Press return to close."
  exit 1
fi

TMP=$(mktemp -d) || exit 1
mkdir -p "$TMP/$NAME"
cp $FILES "$TMP/$NAME/"
chmod +x "$TMP/$NAME/open-calculator.command" "$TMP/$NAME/make-handoff-zip.command"

rm -f "$OUT"
(cd "$TMP" && zip -q -r "$OUT" "$NAME" -x "*.DS_Store")
rm -rf "$TMP"

echo "Packaged $#FILES files."
echo "  $OUT"
echo

# The zip carries whatever verification state the tool currently holds, so say
# which one is going out the door.
if grep -q 'date: "", by: "", booking: ""' coupon-calculator.html; then
  echo "NOTE: at least one blocker is still open."
  echo "The packaged tool shows the orange banner and labels every figure provisional."
  echo "Whoever receives this should start with VERIFY.md."
else
  echo "All blockers are recorded as closed. The packaged tool carries the provenance."
fi

echo
open -R "$OUT"
read "?Press return to close."
exit 0
