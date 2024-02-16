import axios from "axios";
import { window } from "vscode";

export interface OpenAIMessage {
  role: string; // "system", "user", "assistant", "bot" etc.
  content: string; // The actual message content
}

export default class OpenAI {
  private apiKey: any;
  private openaiURL: string;
  private openaiHeaders: any;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.openaiURL = "https://api.openai.com/v1/chat/completions";
    this.openaiHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  async request(
    messages: OpenAIMessage[],
    model: string = "gpt-3.5-turbo"
  ): Promise<string | undefined> {
    try {
      const response = await axios.post(
        this.openaiURL,
        {
          messages: messages,
          model: model,
        },
        {
          headers: this.openaiHeaders,
        }
      );
      return response.data.choices[0].message.content;
    } catch (error: any) {
      const errorMessage = error.message;
      console.error("Error in OpenAI request:", errorMessage);
      window.showErrorMessage(errorMessage);
      return undefined;
    }
  }
}
