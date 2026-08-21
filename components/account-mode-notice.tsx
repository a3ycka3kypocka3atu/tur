export type AccountNoticeKind =
  | "local"
  | "role-mismatch"
  | "operator-required"
  | "profile-required"
  | "load-error";

const copy: Record<AccountNoticeKind, string> = {
  local:
    "This is an honest local preview. Account storage is not configured, and nothing on this page is written to a server.",
  "role-mismatch":
    "Your current session has an outdated role claim. Sign in again before using privileged tools.",
  "operator-required":
    "Operator access is required. This page does not grant or request elevated permissions.",
  "profile-required":
    "Create your travel profile first. Saved account records and interest requests are linked to that profile.",
  "load-error":
    "Veya could not load this account data. The page is not treating that failure as an empty result.",
};

export function AccountModeNotice({ kind }: { kind: AccountNoticeKind }) {
  return (
    <div className={`account-notice account-notice--${kind} inline-notice`} role="status">
      {copy[kind]}
    </div>
  );
}
