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
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
};