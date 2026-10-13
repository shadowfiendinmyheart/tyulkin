import { useLocation } from "react-router";
import { getPrompt } from "../commandHandlers/shell";

// "visitor@tyulkin:~/settings$": the prompt of the page's directory (TASK-60)
export const usePrompt = () => getPrompt(useLocation().pathname);
