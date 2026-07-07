import { createHash } from 'node:crypto';

export function sha256Base64(input: string) {
  return createHash('sha256').update(input).digest('base64');
}

