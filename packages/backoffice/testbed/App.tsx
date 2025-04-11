import { schema } from "../../../apps/example-api/src/schemas";
import { NullBackoffice } from "../src/backoffice";
import type { BackofficeConfig } from "../src/types/config";

const config: BackofficeConfig = {
	title: "Test Backoffice",
	basePath: "cms",
	theme: {
		primaryColor: "#3b82f6",
		darkMode: false,
	},
	schema,
	apiUrl: "http://localhost:4000",
};

function App() {
	return <NullBackoffice config={config} />;
}

export default App;
