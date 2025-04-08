import { CMSSchema } from "@nullcms/shared"

export interface BackofficeConfig {
    apiUrl: string;
    basePath?: string;

    // Basic customization
    title?: string;

    // Theming
    theme?: {
        primaryColor?: string;
        darkMode?: boolean;
    };

    schema: CMSSchema
}