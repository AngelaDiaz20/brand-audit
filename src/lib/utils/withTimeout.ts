export async function withTimeout<T>(p: Promise<T>, ms: number, label = "task"): Promise<T> {
  return await Promise.race<T>([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout ${label} (${ms}ms)`)), ms)
    ),
  ]);
}
