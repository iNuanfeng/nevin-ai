import { getServerDateTimeContext, isDateTimeQuery } from "@/lib/datetime-context";

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 12_000;

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&ensp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripHtml(text: string): string {
  return decodeHtmlEntities(text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function decodeDdgUrl(href: string): string {
  try {
    if (href.startsWith("//duckduckgo.com/l/?")) {
      const u = new URL(`https:${href}`);
      const target = u.searchParams.get("uddg");
      if (target) return decodeURIComponent(target);
    }
    if (href.startsWith("//")) return `https:${href}`;
    return href;
  } catch {
    return href;
  }
}

async function searchBingPublic(query: string, maxResults: number): Promise<WebSearchResult[]> {
  const hosts = ["https://cn.bing.com", "https://www.bing.com"];

  for (const host of hosts) {
    try {
      const url = `${host}/search?q=${encodeURIComponent(query)}&setlang=zh-CN`;
      const res = await fetchWithTimeout(url, {
        headers: {
          "User-Agent": BROWSER_UA,
          "Accept-Language": "zh-CN,zh;q=0.9",
          Accept: "text/html",
        },
      });
      if (!res.ok) continue;

      const html = await res.text();
      const results = parseBingHtml(html, maxResults);
      if (results.length > 0) return results;
    } catch {
      // try next host
    }
  }

  throw new Error("Bing public search failed");
}

function parseBingHtml(html: string, maxResults: number): WebSearchResult[] {
  const results: WebSearchResult[] = [];
  const blocks = html.split(/<li class="b_algo"/).slice(1);

  for (const block of blocks) {
    const chunk = block.split("</li>")[0] ?? block;
    const titleMatch = chunk.match(/<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    const snippetMatch =
      chunk.match(/<p class="b_lineclamp[^"]*"[^>]*>([\s\S]*?)<\/p>/) ??
      chunk.match(/<div class="b_caption"[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/);
    if (!titleMatch) continue;

    const url = titleMatch[1];
    if (!url.startsWith("http")) continue;

    results.push({
      title: stripHtml(titleMatch[2]),
      url,
      snippet: snippetMatch ? stripHtml(snippetMatch[1]) : "",
    });
    if (results.length >= maxResults) break;
  }

  return results;
}

async function searchSearXNG(query: string, maxResults: number): Promise<WebSearchResult[]> {
  const baseUrl = process.env.SEARXNG_URL?.replace(/\/$/, "");
  if (!baseUrl) return [];

  const url = `${baseUrl}/search?q=${encodeURIComponent(query)}&format=json&language=zh-CN`;
  const res = await fetchWithTimeout(url, {
    headers: { Accept: "application/json", "User-Agent": BROWSER_UA },
  });

  if (!res.ok) {
    throw new Error(`SearXNG search failed (${res.status})`);
  }

  const data = await res.json();
  return (data.results ?? []).slice(0, maxResults).map((item: { title?: string; url?: string; content?: string }) => ({
    title: item.title ?? "无标题",
    url: item.url ?? "",
    snippet: item.content ?? "",
  })).filter((item: WebSearchResult) => item.url);
}

async function searchBocha(query: string, maxResults: number): Promise<WebSearchResult[]> {
  const apiKey = process.env.BOCHA_API_KEY;
  if (!apiKey) return [];

  const res = await fetch("https://api.bochaai.com/v1/web-search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      count: maxResults,
      summary: true,
      freshness: "oneYear",
    }),
  });

  if (!res.ok) {
    throw new Error(`Bocha search failed (${res.status})`);
  }

  const data = await res.json();
  const items = data.webPages?.value ?? [];
  return items.slice(0, maxResults).map((item: { name?: string; url?: string; snippet?: string; summary?: string }) => ({
    title: item.name ?? "无标题",
    url: item.url ?? "",
    snippet: item.summary ?? item.snippet ?? "",
  })).filter((item: WebSearchResult) => item.url);
}

async function searchTavily(query: string, maxResults: number): Promise<WebSearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults,
      search_depth: "basic",
      include_answer: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`Tavily search failed (${res.status})`);
  }

  const data = await res.json();
  return (data.results ?? []).map((item: { title?: string; url?: string; content?: string }) => ({
    title: item.title ?? "无标题",
    url: item.url ?? "",
    snippet: item.content ?? "",
  })).filter((item: WebSearchResult) => item.url);
}

async function searchSerper(query: string, maxResults: number): Promise<WebSearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({ q: query, num: maxResults }),
  });

  if (!res.ok) {
    throw new Error(`Serper search failed (${res.status})`);
  }

  const data = await res.json();
  return (data.organic ?? []).slice(0, maxResults).map((item: { title?: string; link?: string; snippet?: string }) => ({
    title: item.title ?? "无标题",
    url: item.link ?? "",
    snippet: item.snippet ?? "",
  })).filter((item: WebSearchResult) => item.url);
}

async function searchBrave(query: string, maxResults: number): Promise<WebSearchResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return [];

  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(maxResults));

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": apiKey,
    },
  });

  if (!res.ok) {
    throw new Error(`Brave search failed (${res.status})`);
  }

  const data = await res.json();
  return (data.web?.results ?? []).slice(0, maxResults).map((item: { title?: string; url?: string; description?: string }) => ({
    title: item.title ?? "无标题",
    url: item.url ?? "",
    snippet: item.description ?? "",
  })).filter((item: WebSearchResult) => item.url);
}

async function searchDuckDuckGo(query: string, maxResults: number): Promise<WebSearchResult[]> {
  // 优先尝试 JSON Instant Answer API（比 HTML 抓取更稳定）
  try {
    const apiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const apiRes = await fetchWithTimeout(apiUrl, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; NevinAI/1.0)" },
    });
    if (apiRes.ok) {
      const data = await apiRes.json();
      const results: WebSearchResult[] = [];
      if (data.AbstractText && data.AbstractURL) {
        results.push({
          title: data.Heading || "摘要",
          url: data.AbstractURL,
          snippet: data.AbstractText,
        });
      }
      for (const topic of data.RelatedTopics ?? []) {
        if (results.length >= maxResults) break;
        if (topic.Text && topic.FirstURL) {
          results.push({ title: topic.Text.slice(0, 80), url: topic.FirstURL, snippet: topic.Text });
        }
        for (const sub of topic.Topics ?? []) {
          if (results.length >= maxResults) break;
          if (sub.Text && sub.FirstURL) {
            results.push({ title: sub.Text.slice(0, 80), url: sub.FirstURL, snippet: sub.Text });
          }
        }
      }
      if (results.length > 0) return results.slice(0, maxResults);
    }
  } catch {
    // fall through to HTML
  }

  const res = await fetchWithTimeout(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; NevinAI/1.0)",
      Accept: "text/html",
    },
  });

  if (!res.ok) {
    throw new Error(`DuckDuckGo search failed (${res.status})`);
  }

  const html = await res.text();
  const results: WebSearchResult[] = [];
  const blockRegex = /<div class="result results_links[^"]*"[\s\S]*?<\/div>\s*<\/div>/g;
  const blocks = html.match(blockRegex) ?? [];

  for (const block of blocks) {
    const titleMatch = block.match(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
    if (!titleMatch) continue;
    results.push({
      title: stripHtml(titleMatch[2]),
      url: decodeDdgUrl(titleMatch[1]),
      snippet: snippetMatch ? stripHtml(snippetMatch[1]) : "",
    });
    if (results.length >= maxResults) break;
  }

  return results;
}

export function getWebSearchProvider(): string {
  if (process.env.BOCHA_API_KEY) return "bocha";
  if (process.env.TAVILY_API_KEY) return "tavily";
  if (process.env.SERPER_API_KEY) return "serper";
  if (process.env.BRAVE_SEARCH_API_KEY) return "brave";
  if (process.env.SEARXNG_URL) return "searxng";
  return "bing";
}

export async function searchWeb(query: string, maxResults = 5): Promise<WebSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // 日期/时间问题：服务器时间即权威答案，不依赖外部搜索
  if (isDateTimeQuery(trimmed)) {
    return [
      {
        title: "服务器当前时间",
        url: "server://local-time",
        snippet: getServerDateTimeContext(),
      },
    ];
  }

  const providers = [
    () => searchBocha(trimmed, maxResults),
    () => searchTavily(trimmed, maxResults),
    () => searchSerper(trimmed, maxResults),
    () => searchBrave(trimmed, maxResults),
    () => searchSearXNG(trimmed, maxResults),
    () => searchBingPublic(trimmed, maxResults),
    () => searchDuckDuckGo(trimmed, maxResults),
  ];

  let lastError: Error | null = null;
  for (const provider of providers) {
    try {
      const results = await provider();
      if (results.length > 0) return results;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  if (lastError) throw lastError;
  return [];
}

export function formatWebSearchForPrompt(results: WebSearchResult[], searchFailed = false): string {
  if (results.length === 0) {
    if (searchFailed) {
      return [
        "【联网搜索】",
        "已尝试联网检索但外部搜索引擎不可用（可能网络受限）。",
        "请明确告知用户：本次未能从外部搜索引擎获取结果；若问题涉及时效信息，请说明可能不是最新。",
        "不要假装已经联网，也不要编造搜索结果。",
      ].join("\n");
    }
    return [
      "【联网搜索】",
      "已尝试检索，但没有找到足够相关的结果。请基于已有知识回答；若涉及时效信息，请明确说明可能不是最新。",
      "不要假装已经联网，也不要编造搜索结果。",
    ].join("\n");
  }

  const body = results
    .map((item, index) => {
      const lines = [`${index + 1}. ${item.title}`];
      if (item.url && !item.url.startsWith("server://")) lines.push(`   链接: ${item.url}`);
      if (item.snippet) lines.push(`   摘要: ${item.snippet}`);
      return lines.join("\n");
    })
    .join("\n\n");

  return [
    "【联网搜索结果】",
    "以下结果基于用户当前这句话检索得到（或服务器时间）。请优先参考这些信息作答；不要编造未出现在结果中的事实。",
    "若用户问日期/时间，且结果中包含服务器当前时间，必须直接使用该时间回答，不要说无法联网。",
    body,
  ].join("\n\n");
}
