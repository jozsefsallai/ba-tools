export const FRIEND_CODE_LENGTH = 8;

const FRIEND_CODE_PATTERN = /^[A-Z]{8}$/;

export function isValidFriendCode(friendCode: string): boolean {
  return FRIEND_CODE_PATTERN.test(friendCode);
}

export function sanitizeFriendCodeInput(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, FRIEND_CODE_LENGTH);
}
