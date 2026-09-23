import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { App } from "./App";
import "./styles.css";

try {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('template_build_draft:')) localStorage.removeItem(key);
  }
} catch {
  // The editor will report storage errors when a new draft is created.
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught render error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px", color: "#f87171", background: "#0b1120", minHeight: "100vh", fontFamily: "sans-serif" }}>
          <h2 style={{ fontSize: "20px", marginBottom: "12px" }}>Đã xảy ra lỗi giao diện!</h2>
          <p style={{ color: "#cbd5e1", marginBottom: "20px" }}>{this.state.error?.message || "Không thể tải thành phần giao diện."}</p>
          <button
            onClick={() => {
              sessionStorage.clear();
              window.location.reload();
            }}
            style={{ padding: "10px 18px", borderRadius: "8px", background: "#2563eb", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600 }}
          >
            Tải lại ứng dụng & Đăng nhập lại
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
