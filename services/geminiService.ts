import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export interface DailyMessage {
  reference: string;
  text: string;
}

export interface SearchResult {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export async function fetchChapterText(book: string, chapter: number): Promise<string> {
  const model = 'gemini-2.5-flash';
  const version = 'João Ferreira de Almeida';
  const prompt = `Forneça o texto completo de ${book} capítulo ${chapter} da Bíblia na versão ${version}. Formate a resposta como um único bloco de texto. Cada versículo deve começar em uma nova linha, seguido pelo número do versículo, um ponto e um espaço. Por exemplo: '1. No princípio, criou Deus os céus e a terra.'. Não inclua nenhum texto introdutório ou conclusivo, apenas o conteúdo do capítulo.`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    return response.text ?? "";
  } catch (error) {
    console.error("Error fetching from Gemini API:", error);
    // Relança o erro original para ser tratado pelo componente
    throw error;
  }
}

export async function fetchDailyMessage(): Promise<DailyMessage> {
  const model = 'gemini-2.5-flash';
  const prompt = `Forneça um versículo bíblico inspirador para ser a 'mensagem do dia'.`;
  
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reference: {
              type: Type.STRING,
              description: "A referência do versículo, por exemplo, 'João 3:16'"
            },
            text: {
              type: Type.STRING,
              description: "O texto completo do versículo."
            }
          },
          required: ["reference", "text"]
        }
      }
    });

    const jsonText = response.text.trim();
    const parsed = JSON.parse(jsonText);
    
    if (parsed.reference && parsed.text) {
      return parsed;
    } else {
      throw new Error("Resposta da API em formato inválido.");
    }

  } catch (error) {
    console.error("Error fetching daily message from Gemini API:", error);
    throw error;
  }
}

export async function searchBible(query: string): Promise<SearchResult[]> {
  const model = 'gemini-2.5-flash';
  const prompt = `Pesquise na Bíblia pela palavra-chave ou frase: "${query}". Retorne uma lista de versículos que contenham essa palavra-chave.`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              book: {
                type: Type.STRING,
                description: "O nome do livro da Bíblia."
              },
              chapter: {
                type: Type.NUMBER,
                description: "O número do capítulo."
              },
              verse: {
                type: Type.NUMBER,
                description: "O número do versículo."
              },
              text: {
                type: Type.STRING,
                description: "O texto completo do versículo."
              }
            },
            required: ["book", "chapter", "verse", "text"]
          }
        }
      }
    });

    const jsonText = response.text.trim();
    const parsed = JSON.parse(jsonText);
    return parsed as SearchResult[];

  } catch (error) {
    console.error("Error searching Bible from Gemini API:", error);
    throw error;
  }
}
