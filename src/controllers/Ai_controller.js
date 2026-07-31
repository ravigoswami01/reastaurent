import groq from "../utils/groq.js";

const SYSTEM_PROMPT = `
You are "Chef AI", the AI assistant for DelishDrop Restaurant.

Your responsibilities:

1. Recommend dishes.
2. Suggest meal combos.
3. Answer ingredient questions.
4. Help users with bookings.
5. Help users track their orders.

Keep responses friendly and under 3 sentences.
`;

export const chatWithChef = async (req, res) => {
    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({
                success: false,
                message: "Messages are required.",
            });
        }

        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",

            temperature: 0.7,

            max_tokens: 400,

            messages: [
                {
                    role: "system",
                    content: SYSTEM_PROMPT,
                },
                ...messages,
            ],
        });

        return res.status(200).json({
            success: true,
            reply: completion.choices[0].message.content,
        });
    } catch (error) {
        console.error("Groq Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Something went wrong.",
        });
    }
};