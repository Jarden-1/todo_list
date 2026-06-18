import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/base.css";
import "./styles/ui-foundation.css";
import "./styles/todo-layout.css";
import "./styles/app-shell.css";
import "./styles/markdown.css";
import "./styles/settings.css";

createRoot(document.getElementById("root")!).render(<App />);
