/** Generate an UNSIGNED operator template; populate pins ONLY from independent channels. */
import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { QL246_SYSTEMS } from './ql246-source-proof.mjs';

if (process.argv.length !== 4 || process.argv[2] !== '--output' || !process.argv[3]) {
  process.stderr.write('Usage: node ql246-create-trusted-challenge.mjs --output PRIVATE_OPERATOR_FILE.json\n');
  process.exitCode = 2;
} else {
  const issuedAt = Date.now();
  const template = {
    schema: 'rosevear.integration.ql246.trusted-pins.v1',
    challengeId: `np-ql246-${randomBytes(12).toString('hex')}`,
    challengeNonce: randomBytes(32).toString('base64url'),
    issuedAt,
    expiresAt: issuedAt + 3_600_000,
    sources: QL246_SYSTEMS.map(system => ({
      system, repository: '', sourceRevision: '', sha256: '',
      publicKeyFingerprintSha256: '',
      businessId: system === 'ai-data-platform' ? 'devilndove' : system,
      tenantId: ['yw', 'icamp'].includes(system) ? '' : null
    }))
  };
  try {
    await writeFile(resolve(process.argv[3]), JSON.stringify(template, null, 2) + '\n', {
      flag: 'wx', mode: 0o600
    });
    process.stdout.write('Created a private operator challenge template. No source proof, pin, or approval was invented.\n');
  } catch (error) {
    process.stderr.write(`Failed closed: ${error.message}\n`);
    process.exitCode = 2;
  }
}
