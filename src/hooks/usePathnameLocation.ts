import { useLocation } from "react-router";

export const usePathnameLocation = () => {
  const pathname = useLocation().pathname;
  const pathnameWithoutSlash = pathname.slice(1);
  return pathnameWithoutSlash || "cv";
};
