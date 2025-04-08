import {createRootRoute, Outlet} from '@tanstack/react-router'
import {TanStackRouterDevtools} from '@tanstack/react-router-devtools'
import { LoginPage } from "@/components/login-page";
import {useAuth} from "@/components/providers/auth-provider";
import {CmsSidebar} from "@/components/cms-sidebar";
import {SidebarProvider} from "@/components/ui/sidebar";
import {Toaster} from "@/components/ui/sonner";

export const RootRoute = createRootRoute({
    component: () => {
        const { isAuthenticated } = useAuth();

        if (!isAuthenticated) {
            return <LoginPage />
        }

        return (
            <SidebarProvider>
                <div className="h-screen w-screen flex">
                    <CmsSidebar/>
                    <Outlet/>
                </div>
                <TanStackRouterDevtools position={"bottom-right"}/>
                <Toaster />
            </SidebarProvider>
        )
    },
})