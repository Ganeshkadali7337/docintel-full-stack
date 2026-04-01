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

// Fast intent detection — cheap call, max 5 tokens
// Returns 'general_chat' or 'knowledge_base'
export async function detectIntent(question) {
  console.log("[detectIntent] Detecting intent for:", question);

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

  const raw = response.choices[0]?.message?.content;
  const intent = raw?.trim().toLowerCase();
  console.log("[detectIntent] Raw response:", raw);
  console.log(
    "[detectIntent] Resolved intent:",
    intent === "general_chat" ? "general_chat" : "knowledge_base",
  );

  // Fallback to knowledge_base if response is unexpected
  return intent === "general_chat" ? "general_chat" : "knowledge_base";
}

// Build a minimal prompt for general messages — no document context attached
// Used when detectIntent() returns 'general_chat' to skip the RAG pipeline
export function buildDirectPrompt(question, conversationHistory) {
  console.log(
    "[buildDirectPrompt] Building direct prompt, history length:",
    conversationHistory.length,
  );

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

  console.log("[buildDirectPrompt] Total messages in prompt:", messages.length);
  return messages;
}

// Build the RAG prompt for single document Q&A
// Takes the user question, retrieved chunks, and conversation history
// Returns a messages array ready to send to OpenAI
export function buildRAGPrompt(question, chunks, conversationHistory) {
  console.log("[buildRAGPrompt] Building RAG prompt");
  console.log("[buildRAGPrompt] Chunks received:", chunks.length);
  console.log("[buildRAGPrompt] History length:", conversationHistory.length);

  // Build context string from retrieved chunks
  // Each chunk includes its page number for source attribution
  const context = chunks
    .slice(0, MAX_CONTEXT_CHUNKS)
    .map((chunk, index) => {
      const page = chunk.metadata?.pageNumber
        ? `Page ${chunk.metadata.pageNumber}`
        : `Chunk ${index + 1}`;
      return `[${page}]\n${chunk.metadata?.contentPreview || chunk.content}`;
    })
    .join("\n\n---\n\n");

  console.log("[buildRAGPrompt] Context length (chars):", context.length);

  const systemPrompt = `You are a helpful document assistant.

Intent rules:
- If the user sends a greeting, small talk, or a general message not related to the document
  (e.g. "hi", "hello", "thanks", "how are you"), respond naturally and conversationally.
  Do NOT say "I couldn't find information about that in this document" for greetings.
- If the user is asking about the document content, answer based ONLY on the document
  context provided below.
- If the user asks a document question whose answer is NOT in the context, say exactly:
  "I couldn't find information about that in this document."
- Never make up information not present in the context.
- When possible, mention which part of the document your answer comes from.
- Keep answers clear and concise.

Document Context:
${context}`;

  // Build messages array with conversation history for follow-up support
  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.slice(-6).map((msg) => ({
      role: msg.role.toLowerCase(),
      content: msg.content,
    })),
    { role: "user", content: question },
  ];

  console.log("[buildRAGPrompt] Total messages in prompt:", messages.length);
  console.log(
    "[buildRAGPrompt] System prompt length (chars):",
    systemPrompt.length,
  );

  return messages;
}

// Build the comparison prompt for multi-document Q&A
// Takes question and results from each document separately
// Returns messages array for OpenAI
export function buildComparePrompt(question, docResults) {
  console.log(
    "[buildComparePrompt] Building compare prompt for",
    docResults.length,
    "documents",
  );

  // Build per-document context sections
  const contextSections = docResults
    .map(({ documentName, matches }) => {
      if (!matches || matches.length === 0) {
        console.log(
          "[buildComparePrompt] No matches for document:",
          documentName,
        );
        return `Document: ${documentName}\nContent: No relevant information found in this document.`;
      }
      console.log(
        "[buildComparePrompt] Matches for",
        documentName,
        ":",
        matches.length,
      );
      const content = matches
        .map((match) => match.metadata?.contentPreview || "")
        .join("\n\n");
      return `Document: ${documentName}\nContent:\n${content}`;
    })
    .join("\n\n========\n\n");

  const systemPrompt = `You are a helpful document comparison assistant.
You have been given content from multiple documents.
Compare them based on the user's question.

Rules:
- Structure your response clearly with each document's answer
- Use the format: "**[Document Name]:** ..." for each document
- If a document doesn't contain relevant info say:
  "No relevant information found in [Document Name]"
- Never make up information not in the provided content
- End with a brief summary of key differences if relevant

Document Contents:
${contextSections}`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: question },
  ];

  console.log(
    "[buildComparePrompt] Total messages in prompt:",
    messages.length,
  );
  return messages;
}

// Stream a GPT-4o response
// Returns a ReadableStream that can be sent directly to the client
// onComplete callback receives the full response text when done
export async function streamLLMResponse(messages, onComplete) {
  console.log(
    "[streamLLMResponse] Starting stream with",
    messages.length,
    "messages",
  );
  console.log("[streamLLMResponse] Using model:", LLM_MODEL);

  const stream = await openai.chat.completions.create({
    model: LLM_MODEL,
    messages: messages,
    stream: true,
    temperature: 0.3,
    max_tokens: 1000,
  });

  let fullResponse = "";
  let chunkCount = 0;

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) {
            fullResponse += text;
            chunkCount++;
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`),
            );
          }
        }

        console.log(
          "[streamLLMResponse] Stream complete. Total chunks:",
          chunkCount,
        );
        console.log(
          "[streamLLMResponse] Full response length (chars):",
          fullResponse.length,
        );
        console.log("[streamLLMResponse] Full response:", fullResponse);

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
