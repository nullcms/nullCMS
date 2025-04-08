import { NullBackoffice } from '@nullcms/backoffice';
import type { BackofficeConfig } from '@nullcms/backoffice';
import { schema } from "../../example-api/src/schemas"

import "@nullcms/backoffice/dist/index.css"

const config: BackofficeConfig = {
    title: 'Test Backoffice',
    basePath: '',
    apiUrl: "https://api.demo.nullcms.com",
    theme: {
        primaryColor: '#3b82f6',
        darkMode: false
    },
    schema
};

function App() {
    return (
        <NullBackoffice config={config} />
    );
}

export default App;