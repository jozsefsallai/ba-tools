import { CloudClient, type EmbeddingFunction } from "chromadb";

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

const embeddingFunction = new OpenAIEmbeddingFunction();

const client = new CloudClient({
  apiKey: process.env.CHROMA_API_KEY,
  tenant: process.env.CHROMA_TENANT_ID,
  database: process.env.CHROMA_DATABASE_NAME,
});

const summaryCollection = await client.getOrCreateCollection({
  name: "ba-main-story-summaries",
  metadata: {
    description:
      "Summaries or synopses of main story episodes in Blue Archive.",
  },
  embeddingFunction,
});

const dialogueCollection = await client.getOrCreateCollection({
  name: "ba-main-story-dialogues",
  metadata: {
    description: "Dialogue lines from main story episodes in Blue Archive.",
  },
  embeddingFunction,
});

export { client, summaryCollection, dialogueCollection };
