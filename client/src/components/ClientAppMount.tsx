import { useEffect, useState } from "react";
import App from "../App";

// react-router-dom's BrowserRouter reads window.history when it renders,
// so App must only render in the browser. On the server we emit a shell
// and swap to the real tree after hydration.
export default function ClientAppMount() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div data-app-mount={isClient ? "client" : "ssr"}>
      {isClient ? (
        <App />
      ) : (
        <div
          style={{
            minHeight: "100vh",
            background: "#0a0a0f",
            color: "#e0e0ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <span style={{ opacity: 0.6, fontSize: 14, letterSpacing: 2 }}>
            LOADING…
          </span>
        </div>
      )}
    </div>
  );
}