const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.getEmbeddings = async (text) => {
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  // outputDimensionality: 768 matches the existing Atlas Vector Search index's
  // configured dimension (the model's native output is 3072) - keeps the
  // index usable without a rebuild.
  const result = await model.embedContent({
    content: { parts: [{ text }] },
    outputDimensionality: 768,
  });
  return result.embedding.values; // Returns the float array
};

//For RAG
exports.generateAnswer = async (prompt) => {
  // Pinned to a concrete lite model (not "-latest", and not 2.5-flash-lite,
  // which 404s as deprecated for this account) for its higher free-tier
  // daily quota vs. the ~20/day the "gemini-flash-latest" alias resolved to.
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
};