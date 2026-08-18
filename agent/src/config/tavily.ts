import { tavily } from "@tavily/core";

const tavilyClient = (apikey: string) => {
	return tavily({ apiKey: apikey });
}

export default tavilyClient;
