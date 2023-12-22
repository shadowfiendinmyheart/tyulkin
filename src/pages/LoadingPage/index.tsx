import React from "react";

const loadingFrames = ["-", "—", "--", "——", "---", "———", "---", "——", "--", "—"];

// TODO: make fancy LoadingPage
const LoadingPage: React.FC = () => {
  const [loadingFrame, setLoadingFrame] = React.useState("");

  React.useEffect(() => {
    let i = 0;
    const intervalId = setInterval(() => {
      i = (i + 1) % loadingFrames.length;
      setLoadingFrame(loadingFrames[i]);
    }, 150);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div
      style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div>{loadingFrame}</div>
    </div>
  );
};

export default LoadingPage;
