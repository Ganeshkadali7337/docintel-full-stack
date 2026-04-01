// Handles all GPT-4o interactions
// Builds RAG prompts and streams responses back to the client

import OpenAI from "openai";
import { LLM_MODEL, MAX_CONTEXT_CHUNKS } from "../utils/constants.js";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is not set");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Fast intent detection — cheap call, max 10 tokens
// Returns 'general_chat' or 'knowledge_base'
export async function detectIntent(question) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 10,
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `Classify the user message into exactly one of these two categories:
- general_chat -> greetings, small talk, thanks, how are you, yes/no replies
- knowledge_base -> any question or request about a document, topic, or information

Reply with only the category label, nothing else.`,
      },
      { role: "user", content: question },
    ],
  });

  const intent = response.choices[0]?.message?.content?.trim().toLowerCase();

  // Fallback to knowledge_base if response is unexpected
  return intent === "general_chat" ? "general_chat" : "knowledge_base";
}

// Build a minimal prompt for general messages — no document context attached
// Used when detectIntent() returns 'general_chat' to skip the RAG pipeline
export function buildDirectPrompt(question, conversationHistory) {
  const messages = [
    {
      role: "system",
      content:
        "You are a helpful document assistant. Respond naturally and conversationally.",
    },
    ...conversationHistory.slice(-6).map((msg) => ({
      role: msg.role.toLowerCase(),
      content: msg.content,
    })),
    { role: "user", content: question },
  ];

  return messages;
}

// Build the RAG prompt for single document Q&A
// Takes the user question, retrieved chunks, and conversation history
// Returns a messages array ready to send to OpenAI
export function buildRAGPrompt(question, chunks, conversationHistory) {
  // Limit chunks to MAX_CONTEXT_CHUNKS to avoid exceeding
  // GPT-4o context window. Even large documents are safe
  // because we only send the most relevant chunks.
  const context = chunks
    .slice(0, MAX_CONTEXT_CHUNKS)
    .map((chunk, index) => {
      const page = chunk.metadata?.pageNumber
        ? `Page ${chunk.metadata.pageNumber}`
        : `Chunk ${index + 1}`;
      return `[${page}]\n${chunk.metadata?.contentPreview || chunk.content}`;
    })
    .join("\n\n---\n\n");

  console.log("[buildRAGPrompt] Context for LLM:\n", context);

  const systemPrompt = `You are a precise document assistant. Your only job is to answer questions using the document context provided below.

Rules you MUST follow:
1. Answer ONLY from the document context. Do not use outside knowledge.
2. If the exact answer is in the context, give it directly and confidently — even if the text looks garbled or has spacing issues (e.g. "linkedin. com" means "linkedin.com", "ganeshkadali0@gmail. com" means "ganeshkadali0@gmail.com"). Clean up obvious extraction artifacts when presenting the answer.
3. If the answer is partially in the context, give what you can find and note what is missing.
4. ONLY say "I couldn't find information about that in this document." if the topic is genuinely absent from the context — not just because the text looks messy.
5. Never invent, guess, or add information not present in the context.
6. When answering, cite the page or section if identifiable.
7. Keep answers concise and direct.

Document Context:
${context}`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.slice(-6).map((msg) => ({
      role: msg.role.toLowerCase(),
      content: msg.content,
    })),
    { role: "user", content: question },
  ];

  return messages;
}

// Build the comparison prompt for multi-document Q&A
// Takes question and results from each document separately
// Returns messages array for OpenAI
export function buildComparePrompt(question, docResults, conversationHistory = []) {
  const contextSections = docResults
    .map(({ documentName, matches }) => {
      if (!matches || matches.length === 0) {
        return `Document: ${documentName}\nContent: No relevant information found in this document.`;
      }
      const content = matches
        .map((match) => match.metadata?.contentPreview || "")
        .join("\n\n");
      return `Document: ${documentName}\nContent:\n${content}`;
    })
    .join("\n\n========\n\n");

  console.log("[buildComparePrompt] Context for LLM:\n", contextSections);

  const systemPrompt = `You are a precise document comparison assistant.
You have been given extracted content from multiple documents.
For each document, read its content and summarize what is relevant to the user's question.
Then directly answer the user's question with a clear comparison across documents.

Respond using this structure:
**[Document Name]:** [What this document says about the topic. If the document genuinely has no relevant information, say "Not found in this document."]
(repeat for each document)
**Summary:** [1-3 sentences answering the user's question directly]

Rules:
- Do NOT say "Not found" if the document content actually has related information
- Base your answer ONLY on the provided document content — never invent or assume
- Keep each document section concise and factual

Document Contents:
${contextSections}`;

  const messages = [
    { role: "system", content: systemPrompt },
    // Inject last 6 messages of conversation history for follow-up support
    ...conversationHistory.slice(-6).map((msg) => ({
      role: msg.role.toLowerCase(),
      content: msg.content,
    })),
    { role: "user", content: question },
  ];

  return messages;
}

// Stream a GPT-4o response
// Returns a ReadableStream that can be sent directly to the client
// onComplete callback receives the full response text when done
export async function streamLLMResponse(messages, onComplete) {
  // Set a 30 second timeout for LLM responses
  // If OpenAI takes longer than this something is wrong
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error("LLM response timed out after 30 seconds")),
      30000,
    ),
  );

  const stream = await Promise.race([
    openai.chat.completions.create({
      model: LLM_MODEL,
      messages: messages,
      stream: true,
      temperature: 0.3,
      max_tokens: 1000,
    }),
    timeoutPromise,
  ]);

  let fullResponse = "";

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) {
            fullResponse += text;
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`),
            );
          }
        }

        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({ done: true })}\n\n`,
          ),
        );
        controller.close();

        if (onComplete) {
          await onComplete(fullResponse);
        }
      } catch (error) {
        console.error("[streamLLMResponse] Stream error:", error.message);
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({ error: error.message })}\n\n`,
          ),
        );
        controller.close();
      }
    },
  });

  return readableStream;
}
