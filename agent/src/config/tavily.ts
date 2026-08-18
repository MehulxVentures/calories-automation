import { tavily } from "@tavily/core";

const tavilyClient = (apikey: string) => {
    tavily({ apiKey: apikey });
}

export default tavilyClient;