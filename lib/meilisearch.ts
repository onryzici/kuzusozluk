import { Meilisearch } from "meilisearch";

const host = process.env.MEILISEARCH_HOST;
const apiKey = process.env.MEILISEARCH_API_KEY;

export const meili = host ? new Meilisearch({ host, apiKey }) : null;

export async function setupIndexes() {
  if (!meili) return;

  await meili.index("topics").updateSettings({
    searchableAttributes: ["title", "description"],
    filterableAttributes: ["entryCount", "dayCount"],
    sortableAttributes: ["entryCount", "dayCount", "createdAt"],
    rankingRules: ["words", "typo", "attribute", "sort", "exactness"],
  });

  await meili.index("entries").updateSettings({
    searchableAttributes: ["content", "authorUsername"],
    filterableAttributes: ["topicSlug", "createdAt"],
    sortableAttributes: ["createdAt"],
  });
}

export async function indexTopic(topic: {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  entryCount: number;
  dayCount: number;
  createdAt: Date;
}) {
  if (!meili) return;
  await meili.index("topics").addDocuments([
    { ...topic, createdAt: topic.createdAt.toISOString() },
  ]);
}

export async function indexEntry(entry: {
  id: string;
  content: string;
  topicSlug: string;
  authorUsername: string;
  createdAt: Date;
}) {
  if (!meili) return;
  await meili.index("entries").addDocuments([
    { ...entry, createdAt: entry.createdAt.toISOString() },
  ]);
}

export async function searchTopics(query: string, limit = 10) {
  if (!meili) return { hits: [], estimatedTotalHits: 0 };
  return meili.index("topics").search(query, { limit });
}

export async function searchEntries(query: string, limit = 10) {
  if (!meili) return { hits: [], estimatedTotalHits: 0 };
  return meili.index("entries").search(query, { limit });
}
