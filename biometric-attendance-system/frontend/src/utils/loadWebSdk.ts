export async function loadWebSdk(): Promise<void> {
  const discoveryUrls = [
    'https://127.0.0.1:52181/get_connection',
    'https://localhost:52181/get_connection',
  ];

  for (const url of discoveryUrls) {
    try {
      const res = await fetch(url, { method: 'GET', cache: 'no-store' });
      if (!res.ok) continue;
      const json = await res.json();
      if (!json?.endpoint) continue;

      const ep = json.endpoint;
      const base = ep.split('?')[0].replace(/\/$/, '');
      const sdkCandidates = [
        `${base}/WebSdk.min.js`,
        `${base}/websdk.client.min.js`,
        `${base}/index.js`,
      ];

      for (const candidate of sdkCandidates) {
        try {
          const r = await fetch(candidate, { method: 'HEAD' });
          if (r.ok) {
            await new Promise<void>((resolve, reject) => {
              const s = document.createElement('script');
              s.src = candidate;
              s.onload = () => resolve();
              s.onerror = (e) => reject(e);
              document.head.appendChild(s);
            });
            console.log('[WebSdk] loaded from', candidate);
            return;
          }
        } catch (e) {}
      }
    } catch (err) {}
  }

  const local = '/modules/websdk/index.js';
  try {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = local;
      s.onload = () => resolve();
      s.onerror = (e) => reject(e);
      document.head.appendChild(s);
    });
    console.log('[WebSdk] loaded from local fallback', local);
    return;
  } catch (err) {
    console.error('[WebSdk] failed to load from discovery and local fallback', err);
    throw new Error('WebSdk not available: ensure Authentication Device Client is installed and running');
  }
}
