import { BackofficeConfig } from '@/types/config';
import { createContext, PropsWithChildren, useContext } from 'react';

const ConfigContext = createContext<BackofficeConfig>({schema: {}});

interface ConfigProviderProps extends PropsWithChildren {
    config: BackofficeConfig
}

export const ConfigProvider = ({ children, config }: ConfigProviderProps) => {
    return (
        <ConfigContext.Provider value={config}>
            {children}
        </ConfigContext.Provider>
    )
}

export const useConfig = () => {
    return useContext(ConfigContext);
}