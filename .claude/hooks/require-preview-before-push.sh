#!/bin/bash
# Chặn `git push` cho đến khi Claude đã gửi preview kết quả cho người dùng xem.
# Quy trình cho Claude: gửi preview (ảnh chụp màn hình app / file kết quả / diff)
# qua SendUserFile hoặc Artifact TRƯỚC, rồi `touch /tmp/claude-preview-approved`
# và chạy lại lệnh push. Marker hết hạn sau 30 phút và bị xóa sau mỗi lần push
# để lần push kế tiếp lại yêu cầu preview mới.

MARKER=/tmp/claude-preview-approved

cmd=$(jq -r '.tool_input.command // empty' 2>/dev/null)
case "$cmd" in
  *"git push"*) ;;
  *) exit 0 ;;
esac

now=$(date +%s)
if [ -f "$MARKER" ]; then
  age=$(( now - $(stat -c %Y "$MARKER" 2>/dev/null || echo 0) ))
  if [ "$age" -lt 1800 ]; then
    rm -f "$MARKER"
    exit 0
  fi
fi

cat <<'EOF'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Người dùng yêu cầu xem preview trước mỗi lần push. Hãy gửi preview kết quả cho họ TRƯỚC (ảnh chụp màn hình app đang chạy qua SendUserFile, file kết quả, hoặc mô tả diff kèm ảnh), sau đó chạy `touch /tmp/claude-preview-approved` rồi thực hiện lại lệnh push."}}
EOF
exit 0
