import { useLocation } from "react-router";
import { getPrompt, getPromptSegments } from "../commandHandlers/shell";

// "visitor@tyulkin ~/settings ❯": the prompt of the page's directory (TASK-60)
export const usePrompt = () => getPrompt(useLocation().pathname);

// the same prompt by segments, for the command line to color them (TASK-81)
export const usePromptSegments = () => getPromptSegments(useLocation().pathname);
