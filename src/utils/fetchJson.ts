export async function fetchJson<TSuccess, TError>(
  input: RequestInfo,
  init?: RequestInit
): Promise<TSuccess> {
  const res = await fetch(input, init);
  const data = (await res.json()) as TSuccess | TError;

  if (!res.ok) {
    const err = data as TError;
    throw err;
  }

  return data as TSuccess;
}
