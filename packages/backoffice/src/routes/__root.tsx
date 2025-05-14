import { CmsSidebar } from "@/components/cms-sidebar";
import { LoginPage } from "@/components/login-page";
import { useAuth } from "@/components/providers/auth-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

export const RootRoute = createRootRoute({
	component: () => {
		const { isAuthenticated } = useAuth();

		if (!isAuthenticated) {
			return <LoginPage />;
		}

		return (
			<SidebarProvider>
					<div className="h-screen w-screen flex">
						<CmsSidebar />
						<div className="flex-1 flex flex-col">
							<Outlet />
						</div>
					</div>
					<TanStackRouterDevtools position={"bottom-right"} />
				<Toaster />
			</SidebarProvider>
		);
	},
});
