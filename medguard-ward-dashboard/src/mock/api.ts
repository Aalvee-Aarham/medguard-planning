// Mock API: waits a little like a real server, and fails when the Dev panel says so.

export class MockError extends Error {}

export async function mockFetch<T>(data: T, opts: { forceError?: boolean; serverDown?: boolean; delay?: number } = {}): Promise<T> {
  await new Promise((r) => setTimeout(r, opts.delay ?? 600));
  if (opts.serverDown) throw new MockError('Hospital server unreachable');
  if (opts.forceError) throw new MockError('Could not load data');
  return structuredClone(data);
}
