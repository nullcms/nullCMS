import type { BackofficeConfig } from "@/types/config";
import { type PropsWithChildren, createContext, useContext } from "react";

const ConfigContext = createContext<BackofficeConfig>({
	schema: {},
	apiUrl: "",
});

interface ConfigProviderProps extends PropsWithChildren {
	config: BackofficeConfig;
}

export const ConfigProvider = ({ children, config }: ConfigProviderProps) => {
	return (
		<ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
	);
};

export const useConfig = () => {
	return useContext(ConfigContext);
};
