/** Retry only transient upstream failures, under one shared request deadline. */
export async function fetchGemini(url: string, init: RequestInit, fetcher = fetch, pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))) {
  const signal = init.signal ?? AbortSignal.timeout(105000);
  for (let attempt = 0; ; attempt++) {
    let response: Response;
    try { response = await fetcher(url, { ...init, signal }); }
    catch (error) {
      if (signal.aborted || attempt >= 3 || !(error instanceof TypeError)) throw error;
      await pause(1000 * 2 ** attempt); continue;
    }
    // Gemini can briefly report UNAVAILABLE while capacity is being reassigned.
    // Four total attempts keep this bounded while making a manual second click unlikely.
    if (![500, 502, 503, 504].includes(response.status) || attempt >= 3) return response;
    await response.body?.cancel();
    await pause(1000 * 2 ** attempt);
  }
}
