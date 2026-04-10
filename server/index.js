import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/* ---------- CHAT RESPONSE ---------- */

app.post("/chat", async (req, res) => {

  try {


    const userMessage = req.body.message;

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "user", content: userMessage }
      ]
    });

    res.json({
      reply: response.choices[0].message.content
    });


  } catch (error) {


    console.error(error);

    res.status(500).json({
      error: "Something went wrong"
    });


  }

});

/* ---------- AI TITLE GENERATOR ---------- */

app.post("/generate-title", async (req, res) => {

  try {


    const userMessage = req.body.message;

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "user",
          content: `Generate a short chat title (max 5 words) for this query:


${userMessage}

Only return the title.`
        }
      ],
      max_tokens: 20
    });


    res.json({
      title: response.choices[0].message.content.trim()
    });


  } catch (error) {


    console.error(error);

    res.status(500).json({
      error: "Title generation failed"
    });


  }

});

/* ---------- SERVER ---------- */

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
