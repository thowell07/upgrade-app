import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ChatMessage } from "../types";

// Ensure API key is present
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("API_KEY is missing from environment variables");
}

const ai = new GoogleGenAI({ apiKey: apiKey || 'DUMMY_KEY' });

/**
 * Generates a new image based on the input image and a text prompt (Style or Edit).
 */
export const generateDesignedImage = async (
  base64Image: string,
  prompt: string
): Promise<string> => {
  try {
    // Strip header if present to get pure base64
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/jpeg', // Assuming JPEG for simplicity from canvas/input
            },
          },
          {
            text: prompt + " Maintain the structural integrity and perspective of the original room. High quality, photorealistic interior design render.",
          },
        ],
      },
      config: {
        // Nano banana models don't support responseMimeType or Schema
      }
    });

    // Parse response for image
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image data found in response");

  } catch (error) {
    console.error("Image generation failed:", error);
    throw error;
  }
};

/**
 * Chat with the consultant. Can see multiple images for context.
 */
export const chatWithConsultant = async (
  messages: ChatMessage[],
  contextImages: string[] = []
): Promise<string> => {
  try {
    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    // Strategy: Use gemini-3-pro-preview which supports multimodal inputs (text + multiple images).
    // We attach the images to the *current* user message to give context.
    
    const lastMessage = messages[messages.length - 1];
    
    // Construct the parts for the current turn
    const parts: any[] = [{ text: lastMessage.text }];

    // Attach all provided context images (up to a reasonable limit, e.g., 3-4)
    // to allow the model to see the "cohesive environment".
    contextImages.slice(0, 4).forEach(img => {
      const base64Data = img.replace(/^data:image\/\w+;base64,/, "");
      parts.unshift({
        inlineData: {
          data: base64Data,
          mimeType: 'image/jpeg'
        }
      });
    });

    const chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: "You are an expert Interior Design Consultant. You have access to photos of the user's space. If multiple photos are provided, treat them as different views of the same or related spaces. You are helpful, creative, and knowledgeable about design styles. Keep answers concise.",
      },
      history: history.slice(0, -1).map(h => ({
        role: h.role,
        parts: h.parts
      }))
    });

    const result = await chat.sendMessage({
      message: { parts }
    });

    return result.text || "I couldn't generate a response.";

  } catch (error) {
    console.error("Chat failed:", error);
    return "I'm having trouble connecting to the design server right now. Please try again.";
  }
};