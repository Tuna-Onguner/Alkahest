import { window } from "vscode";
const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * A class to interact with the GeminiAI model
 * The only Google Generative AI model available as of Feb 2024 is "gemini-pro"
 *
 * Refer to the Google Generative AI documentation for further information:
 * https://ai.google.dev/docs
 */
export default class GeminiAI {
  private ggenai: any; // The Google Generative AI client
  private ggenmodel: any; // The model to use
  private initialized: boolean = false; // Whether the model has been initialized

  private static readonly geminiModelsInputTokenLimits: {
    [modelName: string]: number;
  } = {
    "gemini-pro": 30720,
    "gemini-1.5-pro-latest": 1048576,
    "gemini-pro-vision": 12288,
  };

  /**
   * Initialize the GeminiAI model
   * @param modelName The name of the model to use; "gemini-pro" by default since it's the only model available as of Feb 2024
   */
  constructor(modelName: string = "gemini-pro") {
    try {
      // Initialize the Google Generative AI client and get the model
      this.ggenai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); // Use the API key from the .env file
      this.ggenmodel = this.ggenai.getGenerativeModel({ model: modelName }); // Get the model
      this.initialized = true; // Set initialized to true
    } catch (error: any) {
      // Catch errors and log them, for example invalid API key
      const errorMessage = error.message;
      console.error("Error in GeminiAI constructor:", errorMessage); // Log the error message
      window.showInformationMessage(errorMessage); // Show the error message to the user
    }
  }

  /**
   * Request content from Gemini of Google Generative AI
   * @param prompt The prompt to send to the model
   * @param args Additional arguments to send to the model
   * @returns The response generated by the model or undefined if an error occurred
   */
  async request(prompt: string, ...args: any[]): Promise<string | undefined> {
    if (!this.initialized) {
      // If the model is not initialized, log an error and return undefined
      console.error("GeminiAI model not initialized");
      window.showInformationMessage("GeminiAI model not initialized");
    } else {
      try {
        const requestText = `${prompt}${args.join("")}`; // Join any additional arguments to the prompt

        // Check if the request text exceeds the token limit
        const modelName = this.ggenmodel.modelName;
        const tokenLimit = GeminiAI.geminiModelsInputTokenLimits[modelName];
        if (requestText.length > tokenLimit) {
          // If the request text exceeds the token limit, log an error and return undefined
          console.error(`Request text exceeds token limit for ${modelName}`);
          window.showInformationMessage(
            `Request text exceeds token limit for ${modelName}`
          );

          return undefined;
        }

        const response = await this.ggenmodel.generateContent(requestText); // Generate content

        return response?.response?.text(); // Return the response text
      } catch (error: any) {
        // Catch errors and log them, for example connection errors
        const errorMessage = error.message;
        console.error("Error in GeminiAI request:", errorMessage); // Log the error message
        window.showInformationMessage(errorMessage); // Show the error message to the user
      }
    }

    return undefined; // Return undefined if an error occurred
  }
}
