// ==========================================
// 1. IMPORT OUR TOOLS
// ==========================================

require("dotenv").config();

const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");

// ==========================================
// 2. INITIALIZE THE SERVER, DATABASE & GEMINI
// ==========================================

const app = express();
const prisma = new PrismaClient();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ==========================================
// 3. MIDDLEWARE
// ==========================================

app.use(cors());
app.use(express.json());

// ==========================================
// 4. API ENDPOINTS
// ==========================================

// ------------------------------------------
// GET: Fetch all expenses
// ------------------------------------------

app.get("/api/expenses", async (req, res) => {
  try {
    const allExpenses = await prisma.expense.findMany();
    res.json(allExpenses);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to fetch expenses",
    });
  }
});

// ------------------------------------------
// POST: Add a new expense
// ------------------------------------------

app.post("/api/expenses", async (req, res) => {
  try {
    const { amount, category } = req.body;

    const newExpense = await prisma.expense.create({
      data: {
        amount: parseFloat(amount),
        category: category,
      },
    });

    res.json(newExpense);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to save expense",
    });
  }
});

// ------------------------------------------
// POST: Analyze receipt image using Gemini Vision
// ------------------------------------------

app.post("/api/scan-receipt", async (req, res) => {
  try {
    // Get image from frontend
    const { imageBase64 } = req.body;

    // Gemini Vision model
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    // Prompt
    const prompt = `
You are an expert accountant.

Look at this receipt image.

Extract:
1. Merchant Name
2. Total Amount Paid

Return ONLY valid JSON.

Example:
{
  "merchant": "Domino's",
  "amount": 550
}
`;

    // Image for Gemini
    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: "image/jpeg",
      },
    };

    // Send prompt + image
    const result = await model.generateContent([prompt, imagePart]);

    const aiResponse = result.response.text();

    console.log("🤖 GEMINI VISION SAYS:");
    console.log(aiResponse);

    res.json({
      result: aiResponse,
    });
  } catch (error) {
    console.error("Vision AI Error:", error);

    res.status(500).json({
      error: "Failed to scan receipt",
    });
  }
});

// ------------------------------------------
// POST: Analyze voice text using Gemini AI
// ------------------------------------------

app.post("/api/analyze", async (req, res) => {
  try {
    const spokenText = req.body.text;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `
You are an expert financial categorizer.

Read the following spoken text and extract:

1. amount
2. category

Return ONLY valid JSON.

Example:
{
  "amount": 500,
  "category": "Internet Bill"
}

Spoken Text:
"${spokenText}"
`;

    const result = await model.generateContent(prompt);

    const aiResponse = result.response.text();

    console.log("🤖 GEMINI AI SAYS:");
    console.log(aiResponse);

    res.json({
      result: aiResponse,
    });
  } catch (error) {
    console.error("AI Error:", error);

    res.status(500).json({
      error: "Failed to analyze text",
    });
  }
});

// ==========================================
// 5. HOME ROUTE
// ==========================================

app.get("/", (req, res) => {
  res.send("🚀 Kharcha-AI Backend is running!");
});

// ==========================================
// 6. START THE SERVER
// ==========================================

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running live on http://localhost:${PORT}`);
});
