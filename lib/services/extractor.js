// Text extraction service — pulls raw text from PDF and DOCX files
// Never throws — always returns { text, pageCount, error, warnings }

import pdfParse from "pdf-parse";
import mammoth from "mammoth";

// Extract text from a file buffer based on its MIME type
// Returns { text, pageCount, error, warnings } — error is null on success
export async function extractText(buffer, mimetype) {
  try {
    if (mimetype === "application/pdf") {
      return await extractFromPDF(buffer);
    }
    if (
      mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      return await extractFromDOCX(buffer);
    }
    return {
      text: null,
      pageCount: null,
      error: "Unsupported file type",
      warnings: [],
    };
  } catch (error) {
    return { text: null, pageCount: null, error: error.message, warnings: [] };
  }
}

// Extract text from a PDF buffer using pdf-parse v2 (PDFParse class API)
// Returns { text, pageCount, error, warnings }
async function extractFromPDF(buffer) {
  try {
    // pdf-parse v1 API — single call returns text, page count, and metadata
    // Try default first; fall back to older PDF.js (v1.9.426) for PDFs with
    // malformed XRef tables that the stricter default parser rejects
    let data;
    try {
      data = await pdfParse(buffer);
    } catch (parseError) {
      const isStructureError =
        parseError.message &&
        (parseError.message.includes("XRef") ||
          parseError.message.includes("Invalid PDF") ||
          parseError.message.includes("Bad") ||
          parseError.message.includes("stream"));
      if (isStructureError) {
        data = await pdfParse(buffer, { version: "v1.9.426" });
      } else {
        throw parseError;
      }
    }

    const text = data.text.trim();
    const warnings = [];

    // Tables and images in PDFs are skipped by pdf-parse automatically
    // We get the text content only — this is expected behavior
    // Unusual formatting may produce extra whitespace which the
    // chunker handles by filtering short fragments

    // Reject documents that have no readable text (e.g. scanned image PDFs)
    if (!text || text.length < 50) {
      return {
        text: null,
        pageCount: data.numpages || null,
        error:
          "Document appears to be empty or contains only images. Please upload a text-based PDF.",
        warnings: [],
      };
    }

    // Warn if PDF likely contains tables — pdf-parse has no table awareness
    // Heuristic: many short lines close together usually means a table
    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    const shortLines = lines.filter((l) => l.trim().length < 30);
    if (shortLines.length / lines.length > 0.4) {
      warnings.push(
        "This PDF may contain tables. Table formatting may be lost — answers involving tabular data may be less accurate.",
      );
    }

    return { text, pageCount: data.numpages || null, error: null, warnings };
  } catch (error) {
    return {
      text: null,
      pageCount: null,
      error: `Failed to read PDF: ${error.message}`,
      warnings: [],
    };
  }
}

// Extract text from a DOCX buffer using mammoth
// Returns { text, pageCount, error, warnings }
// Note: DOCX has no real page count — we estimate from word count
async function extractFromDOCX(buffer) {
  try {
    const warnings = [];

    // Run both extractions in parallel:
    // - convertToHtml to detect and extract tables properly
    // - extractRawText for clean plain text body
    const [htmlResult, rawResult] = await Promise.all([
      mammoth.convertToHtml({ buffer }),
      mammoth.extractRawText({ buffer }),
    ]);

    const rawText = rawResult.value.trim();

    if (!rawText || rawText.length < 50) {
      return {
        text: null,
        pageCount: null,
        error: "Document appears to be empty or contains no readable text.",
        warnings: [],
      };
    }

    // Extract tables from HTML output and convert to readable plain text
    // e.g. <tr><td>Name</td><td>Age</td></tr> → "Name | Age"
    const tableText = extractTablesFromHtml(htmlResult.value);
    if (tableText) {
      warnings.push(
        "Document contains tables. Table content has been extracted and appended for better accuracy.",
      );
    }

    // Combine raw body text + extracted table text
    const text = tableText ? `${rawText}\n\n${tableText}` : rawText;

    // Estimate page count — roughly 300 words per page
    const wordCount = text.split(/\s+/).length;
    const estimatedPages = Math.max(1, Math.ceil(wordCount / 300));

    // mammoth converts DOCX to plain text, skipping images and
    // complex formatting. Warnings are logged but don't stop extraction.
    if (rawResult.messages && rawResult.messages.length > 0) {
      console.log("Mammoth warnings (non-fatal):", rawResult.messages);
    }

    return { text, pageCount: estimatedPages, error: null, warnings };
  } catch (error) {
    return {
      text: null,
      pageCount: null,
      error: `Failed to read DOCX: ${error.message}`,
      warnings: [],
    };
  }
}

// Parse tables out of mammoth's HTML output into readable plain text rows
// e.g. "Name | Age\nJohn | 25\nJane | 30"
function extractTablesFromHtml(html) {
  if (!html || !html.includes("<table")) return null;

  const tableBlocks = [];

  // Pull each <table>...</table> block
  const tableMatches = html.match(/<table[\s\S]*?<\/table>/gi) || [];

  for (const table of tableMatches) {
    const rows = [];

    // Pull each <tr>...</tr>
    const rowMatches = table.match(/<tr[\s\S]*?<\/tr>/gi) || [];

    for (const row of rowMatches) {
      // Pull each <td> or <th> and strip inner HTML tags
      const cellMatches = row.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || [];
      const cells = cellMatches.map((cell) =>
        cell
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
          .trim(),
      );
      if (cells.length > 0) {
        rows.push(cells.join(" | "));
      }
    }

    if (rows.length > 0) {
      tableBlocks.push(rows.join("\n"));
    }
  }

  return tableBlocks.length > 0 ? tableBlocks.join("\n\n") : null;
}
