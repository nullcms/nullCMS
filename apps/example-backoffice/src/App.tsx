import { NullBackoffice } from "@nullcms/backoffice";
import type { BackofficeConfig } from "@nullcms/backoffice";
import { schema } from "../../example-api/src/schemas";

import "@nullcms/backoffice/dist/index.css";

const config: BackofficeConfig = {
	title: "Test Backoffice",
	basePath: "",
	apiUrl: "http://localhost:3000",
	theme: {
		primaryColor: "#3b82f6",
		darkMode: false,
	},
	schema,
};

function App() {
	return <NullBackoffice config={config} />;
}

export default App;
