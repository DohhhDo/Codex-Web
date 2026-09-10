import { AppError } from '@/shared/utils.js';

type ProfileDependencies = {
  getUser(): { id: number; username: string };
  read(key: string): string | null;
  write(key: string, value: string): void;
  readCodex(): Promise<{ authenticated: boolean; displayName?: string; avatarUrl?: string; email: string | null }>;
};

function invalidProfile(message: string): never {
  throw new AppError(message, { statusCode: 400, code: 'INVALID_PROFILE' });
}

function readAvatar(input: unknown): string | null {
  if (input === null) return null;
  if (typeof input !== 'string' || input.length > 1_400_000) invalidProfile('Avatar must be a PNG, JPEG or WebP image under 1 MB.');
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(input);
  if (!match) invalidProfile('Avatar must be a PNG, JPEG or WebP image.');
  const bytes = Buffer.from(match[2], 'base64');
  const valid = match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : match[1] === 'jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!valid || bytes.length > 1_048_576) invalidProfile('Avatar must be a valid image under 1 MB.');
  return input;
}

/** Used by the auth router to merge optional Codex claims with persistent display overrides. */
export function createWorkspaceProfileService(deps: ProfileDependencies) {
  async function getProfile() {
    const user = deps.getUser();
    const raw = deps.read(`workspace-profile:${user.id}`);
    const saved = raw ? JSON.parse(raw) as { displayName?: string | null; avatarUrl?: string | null } : {};
    const codex = await deps.readCodex().catch(() => ({ authenticated: false, email: null, displayName: undefined, avatarUrl: undefined }));
    const automaticName = codex.authenticated ? codex.displayName || (codex.email?.includes('@') ? codex.email.split('@')[0] : null) : null;
    const automaticDisplayName = automaticName || (user.username.startsWith('workspace-') ? 'Codex-Web' : user.username);
    const displayName = saved.displayName || automaticDisplayName;
    const avatarUrl = saved.avatarUrl || (codex.authenticated ? codex.avatarUrl : null) || null;
    return {
      id: user.id, username: displayName, displayName, automaticDisplayName, avatarUrl,
      customDisplayName: saved.displayName || null, customAvatarUrl: saved.avatarUrl || null,
      codex: { connected: codex.authenticated, displayName: codex.displayName || null, avatarUrl: codex.avatarUrl || null, email: codex.email },
    };
  }

  return {
    getProfile,
    async updateProfile(input: unknown) {
      if (!input || typeof input !== 'object' || Array.isArray(input)) invalidProfile('Invalid profile.');
      const body = input as Record<string, unknown>;
      if (Object.keys(body).some(key => key !== 'displayName' && key !== 'avatarUrl')) invalidProfile('Unknown profile field.');
      if (body.displayName !== null && (typeof body.displayName !== 'string' || !body.displayName.trim() || body.displayName.trim().length > 80)) {
        invalidProfile('Display name must contain 1–80 characters.');
      }
      const avatarUrl = readAvatar(body.avatarUrl);
      const user = deps.getUser();
      deps.write(`workspace-profile:${user.id}`, JSON.stringify({ displayName: typeof body.displayName === 'string' ? body.displayName.trim() : null, avatarUrl }));
      return getProfile();
    },
  };
}
