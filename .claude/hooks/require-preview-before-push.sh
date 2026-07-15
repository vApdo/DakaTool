#!/bin/bash
# Quy trình do người dùng đặt (vApdo):
#   1. Làm xong việc → báo cáo kết quả + push NHÁNH PHỤ để Vercel tạo link preview.
#   2. Người dùng kiểm tra trên link preview.
#   3. Chỉ khi người dùng RA LỆNH mới được đưa code lên MAIN (merge PR / push main).
# Hook này chặn `git push` đụng tới main khi chưa có lệnh; push nhánh phụ được tự do.
# Merge PR qua GitHub cũng phải chờ lệnh người dùng (Claude tự tuân thủ — hook không chặn được API).
# Sau khi người dùng đồng ý: `touch /tmp/claude-git-approved` rồi push. Marker dùng một lần, hạn 30 phút.

MARKER=/tmp/claude-git-approved

cmd=$(jq -r '.tool_input.command // empty' 2>/dev/null)
case "$cmd" in
  *"git push"*) ;;
  *) exit 0 ;;
esac

# Xác định push có đụng tới main không: nêu "main" trong lệnh push,
# hoặc push không chỉ rõ nhánh trong khi đang đứng trên main.
touches_main=0
if printf '%s' "$cmd" | grep -qE 'git push[^&|;]*[[:space:]:]main([[:space:]]|$|:)'; then
  touches_main=1
else
  branch=$(git -C "${CLAUDE_PROJECT_DIR:-.}" rev-parse --abbrev-ref HEAD 2>/dev/null)
  if [ "$branch" = "main" ]; then
    touches_main=1
  fi
fi
[ "$touches_main" = "0" ] && exit 0

now=$(date +%s)
if [ -f "$MARKER" ]; then
  age=$(( now - $(stat -c %Y "$MARKER" 2>/dev/null || echo 0) ))
  if [ "$age" -lt 1800 ]; then
    rm -f "$MARKER"
    exit 0
  fi
fi

cat <<'EOF'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Người dùng yêu cầu: chỉ đưa code lên MAIN khi họ RA LỆNH. Quy trình đúng: (1) báo cáo kết quả đã làm, (2) push nhánh phụ (được phép tự do) để có link Vercel Preview cho người dùng kiểm tra, (3) KẾT THÚC LƯỢT chờ người dùng ra lệnh, (4) khi có lệnh mới `touch /tmp/claude-git-approved` rồi push main / merge PR. Nếu stop-hook nhắc commit/push, quy tắc này được ưu tiên."}}
EOF
exit 0
