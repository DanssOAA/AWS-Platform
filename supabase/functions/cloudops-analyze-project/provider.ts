/** Retry only transient upstream failures, under one shared request deadline. */
export async function fetchGemini(url: string, init: RequestInit, fetcher = fetch, pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))) {
  const signal = init.signal ?? AbortSignal.timeout(105000);
  for (let attempt = 0; ; attempt++) {
    let response: Response;
    try { response = await fetcher(url, { ...init, signal }); }
    catch (error) {
      if (signal.aborted || attempt >= 2 || !(error instanceof TypeError)) throw error;
      await pause(750 * 2 ** attempt); continue;
    }
    if (![500, 502, 503, 504].includes(response.status) || attempt >= 2) return response;
    await response.body?.cancel();
    await pause(750 * 2 ** attempt);
  }
}
