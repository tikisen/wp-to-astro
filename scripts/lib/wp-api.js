// scripts/lib/wp-api.js
// Authenticated WP REST API client.
// Usage: const client = createClient(siteUrl, appPassword);
//        const pages = await fetchAll(client, '/wp/v2/pages');

/**
 * @param {string} siteUrl - e.g. 'https://example.com'
 * @param {string} appPassword - 'username:xxxx xxxx xxxx xxxx xxxx xxxx'
 */
export function createClient(siteUrl, appPassword) {
  const base = siteUrl.replace(/\/$/, '');
  const auth = 'Basic ' + Buffer.from(appPassword).toString('base64');
  return {
    async get(endpoint) {
      const url = `${base}/wp-json${endpoint}`;
      const res = await fetch(url, { headers: { Authorization: auth } });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`WP API ${endpoint} → ${res.status}: ${text.slice(0, 200)}`);
      }
      return res.json();
    },
    base,
    auth,
  };
}

/**
 * Fetch all pages of a paginated WP REST endpoint.
 * @param {ReturnType<typeof createClient>} client
 * @param {string} endpoint - e.g. '/wp/v2/pages'
 * @param {number} perPage
 */
export async function fetchAll(client, endpoint, perPage = 100) {
  const results = [];
  let page = 1;
  while (true) {
    const sep = endpoint.includes('?') ? '&' : '?';
    const batch = await client.get(`${endpoint}${sep}per_page=${perPage}&page=${page}`);
    if (!Array.isArray(batch) || batch.length === 0) break;
    results.push(...batch);
    if (batch.length < perPage) break;
    page++;
  }
  return results;
}

/**
 * Fetch a single post's meta value (requires auth).
 * Returns null if the meta key is not present.
 */
export async function fetchPostMeta(client, postId, metaKey) {
  try {
    const post = await client.get(`/wp/v2/posts/${postId}?context=edit`);
    return post.meta?.[metaKey] ?? null;
  } catch {
    return null;
  }
}
