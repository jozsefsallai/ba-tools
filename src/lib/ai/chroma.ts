import { CloudClient, type Collection, type EmbeddingFunction } from "chromadb";

class OpenAIEmbeddingFunction implements EmbeddingFunction {
  async generate(texts: string[]) {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: texts,
        model: "text-embedding-3-small",
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI embeddings request failed: ${response.status}`);
    }

    const body = (await response.json()) as {
      data: Array<{
        embedding: number[];
      }>;
    };

    return body.data.map((item) => item.embedding);
  }
}

const SUMMARY_COLLECTION = "ba-main-story-summaries";
const DIALOGUE_COLLECTION = "ba-main-story-dialogues";

type LoreCollections = {
  summaries: Collection;
  dialogues: Collection;
};

let collections: Promise<LoreCollections> | undefined;

async function connect(): Promise<LoreCollections> {
  const embeddingFunction = new OpenAIEmbeddingFunction();
  const client = new CloudClient({
    apiKey: process.env.CHROMA_API_KEY,
    tenant: process.env.CHROMA_TENANT_ID,
    database: process.env.CHROMA_DATABASE_NAME,
  });

  const [summaries, dialogues] = await Promise.all([
    client.getCollection({
      name: SUMMARY_COLLECTION,
      embeddingFunction,
    }),
    client.getCollection({
      name: DIALOGUE_COLLECTION,
      embeddingFunction,
    }),
  ]);

  return {
    summaries,
    dialogues,
  };
}

export function getLoreCollections(): Promise<LoreCollections> {
  if (!collections) {
    collections = connect().catch((err) => {
      collections = undefined;
      throw err;
    });
  }

  return collections;
}
