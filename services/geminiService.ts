
import { GoogleGenAI, Type } from "@google/genai";
import { Task } from "../types";

const API_KEY = process.env.API_KEY || "";

export const ai = new GoogleGenAI({ apiKey: API_KEY });

export const breakdownTask = async (taskTitle: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Break down the task "${taskTitle}" into 3-5 small, manageable, and encouraging steps. Be concise.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            steps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["steps"],
        },
      },
    });
    const result = JSON.parse(response.text);
    return result.steps;
  } catch (error) {
    console.error("Error breaking down task:", error);
    return [];
  }
};

export const categorizeTask = async (title: string): Promise<{ zone: Task['zone'], energy: Task['energyLevel'] }> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Categorize the task "${title}" into a Zone (self, work, home, social, other) and Energy Level (low, high).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            zone: { type: Type.STRING, enum: ['self', 'work', 'home', 'social', 'other'] },
            energy: { type: Type.STRING, enum: ['low', 'high'] },
          },
          required: ["zone", "energy"],
        },
      },
    });
    return JSON.parse(response.text);
  } catch {
    return { zone: 'other', energy: 'low' };
  }
};

export const getDailyReflection = async (tasks: Task[]): Promise<string> => {
  const completed = tasks.filter(t => t.completed).map(t => t.title).join(", ");
  const pending = tasks.filter(t => !t.completed).map(t => t.title).join(", ");
  
  const prompt = `Reflect on this user's garden of tasks today. 
  Finished: ${completed || "None yet"}
  Still Growing: ${pending || "None"}
  Write a 3-sentence poetic reflection. Be extremely kind. Focus on the effort and the beauty of small progress. Avoid making them feel bad about what isn't done. Use garden metaphors.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch {
    return "Your garden is beautiful just as it is. Every seed has its own time to bloom.";
  }
};

export const getTaskWateringTip = async (taskTitle: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The user is stuck on "${taskTitle}". Give them one tiny "watering tip"—a specific, very easy way to start right now that takes less than 2 minutes. Be warm.`,
    });
    return response.text;
  } catch {
    return "Just take one deep breath and set a timer for 2 minutes.";
  }
};

export const getKindSuggestion = async (tasks: Task[]): Promise<string> => {
  const taskListStr = tasks.filter(t => !t.completed).map(t => t.title).join(", ");
  const prompt = taskListStr 
    ? `I have these tasks: ${taskListStr}. Give me one short sentence of warm encouragement and suggest which one I should do first to feel good.`
    : "I have no tasks right now. Give me a very short, warm message about resting or finding something small to grow today.";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are SmartDo, a kind and supportive productivity companion. You hate dread and love small progress. Keep responses under 20 words.",
      }
    });
    return response.text || "You're doing great. Just start small.";
  } catch (error) {
    return "Take a deep breath. You've got this.";
  }
};
