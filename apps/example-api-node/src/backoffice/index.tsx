//@ts-ignore
import ReactDOM from "react-dom/client";
import { StrictMode } from "react";
import "@nullcms/backoffice/dist/index.css";
import { type BackofficeConfig, NullBackoffice } from "@nullcms/backoffice";
import { schema } from "../schema/index.js";

const config: BackofficeConfig = {
    title: "Test Backoffice",
    basePath: "/backoffice",
    apiUrl: "/",
    theme: {
        primaryColor: "#3b82f6",
        darkMode: false,
    },
    schema,
};

const rootElement = document.getElementById("root");
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <StrictMode>
            <NullBackoffice config={config} />
        </StrictMode>
    );
} else {
    console.error("Root element not found");
}