import { CloudClient } from "chromadb";
import { OpenAIEmbeddingFunction } from "@chroma-core/openai";

const embeddingFunction = new OpenAIEmbeddingFunction({
  apiKey: process.env.OPENAI_API_KEY,
  modelName: "text-embedding-3-small",
});

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
