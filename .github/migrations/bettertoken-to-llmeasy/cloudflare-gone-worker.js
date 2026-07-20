const gonePaths = new Set([
  '/ai-tools/yingdao-ai-power',
  '/en/ai-tools/yingdao-ai-power',
  '/ru/ai-tools/yingdao-ai-power',
]);

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (!gonePaths.has(url.pathname)) {
      return fetch(request);
    }

    return new Response('Gone', {
      status: 410,
      headers: {
        'cache-control': 'public, max-age=3600',
        'content-type': 'text/plain; charset=UTF-8',
        'x-robots-tag': 'noindex',
      },
    });
  },
};
