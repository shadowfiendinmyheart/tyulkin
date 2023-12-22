import { useLocation } from "react-router-dom";
import { RoutesValues } from "../router/interfaces";

export const usePathnameLocation = () => {
  const pathname = useLocation().pathname as RoutesValues;
  const pathnameWithoutSlash = pathname.slice(1);
  return pathnameWithoutSlash || "cv";
};
