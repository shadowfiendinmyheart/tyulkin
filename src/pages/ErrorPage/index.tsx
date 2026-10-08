import React from "react";
import { useRouteError, isRouteErrorResponse } from "react-router";
import styles from "./styles.module.scss";

const errorAscii = ` _____ ____  ____   ___  ____
| ____|  _ \\|  _ \\ / _ \\|  _ \\
|  _| | |_) | |_) | | | | |_) |
| |___|  _ <|  _ <| |_| |  _ <
|_____|_| \\_\\_| \\_\\\\___/|_| \\_\\`;

const promptByStatus: Record<string, string> = {
  "401": "unauthorized",
  "403": "access_denied",
  "404": "not_found",
};
const defaultPrompt = "internal_error";

interface ErrorScreenProps {
  status: string;
  message?: string;
}

// works without a router, e.g. when the app fails before the router is rendered
export const ErrorScreen: React.FC<ErrorScreenProps> = ({ status, message }) => (
  <div className={styles.wrapper}>
    <pre className={styles.ascii}>{errorAscii}</pre>
    <div className={styles.status}>{status}</div>
    {message && <div className={styles.message}>{message}</div>}
    <div className={styles.prompt}>
      {promptByStatus[status] || defaultPrompt}
      <span className={styles.cursor} />
    </div>
  </div>
);

// errorElement of the routes
const ErrorPage: React.FC = () => {
  const error = useRouteError();

  let status = "500";
  let message = "";

  if (isRouteErrorResponse(error)) {
    status = String(error.status);
    message = error.data?.message || error.statusText;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return <ErrorScreen status={status} message={message} />;
};

export default ErrorPage;
