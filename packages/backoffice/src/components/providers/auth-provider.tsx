import {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
    useCallback,
} from 'react';
import { useApi } from '@/components/providers/api-provider';
import { queryClient } from '@/lib/client';

// Types
interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    error: string | null;
    isLoading: boolean;
}

interface User {
    username: string;
    // Add other user properties as needed
}

interface AuthProviderProps {
    children: ReactNode;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider component
export function AuthProvider({ children }: AuthProviderProps) {
    const { apiClient } = useApi(); // Use the API client from ApiProvider
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [user, setUser] = useState<User | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [initialCheckDone, setInitialCheckDone] = useState<boolean>(false);

    // Check authentication status on mount
    const checkAuthStatus = useCallback(async () => {
        try {
            // We'll make a request to a protected endpoint to check if we're authenticated
            const response = await apiClient.get('/api/me');
            setUser(response.data);
            setIsAuthenticated(true);
        } catch (error) {
            setUser(null);
            setIsAuthenticated(false);
        } finally {
            setInitialCheckDone(true);
        }
    }, [apiClient]);

    useEffect(() => {
        checkAuthStatus();
    }, [checkAuthStatus]);

    useEffect(() => {
        const handleUnauthenticated = () => {
            setIsAuthenticated(false);
            setUser(null);
            queryClient.clear(); // Clear all query cache on logout
        };

        window.addEventListener('auth:unauthenticated', handleUnauthenticated);

        return () => {
            window.removeEventListener('auth:unauthenticated', handleUnauthenticated);
        };
    }, []);

    const login = async (username: string, password: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await apiClient.post('/auth/login', {
                username,
                password,
            });

            setUser(response.data);
            setIsAuthenticated(true);
            return response.data;
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Login failed';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setIsLoading(true);

        try {
            await apiClient.get('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
            setIsAuthenticated(false);
            setIsLoading(false);
            queryClient.clear(); // Clear all query cache on logout
        }
    };

    // Context value
    const value = {
        isAuthenticated,
        user,
        login,
        logout,
        error,
        isLoading,
    };

    // Only render children once we've checked authentication status
    if (!initialCheckDone) {
        return <div>Loading authentication...</div>; // Or your loading component
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use the auth context
export function useAuth() {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
}