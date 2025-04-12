"use client";
import { useAuth } from "@/components/providers/auth-provider";
import { useConfig } from "@/components/providers/config-provider";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
	useSidebar,
} from "@/components/ui/sidebar";
import { Link } from "@tanstack/react-router";
import {
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	FileText,
	FolderOpen,
	Plus,
} from "lucide-react";

export function CmsSidebar() {
	const { state, toggleSidebar } = useSidebar();
	const { schema } = useConfig();
	const { logout } = useAuth();

	const isCollapsed = state === "collapsed";

	if (isCollapsed) {
		return (
			<Button
				variant="outline"
				size="sm"
				onClick={toggleSidebar}
				className="h-7 w-7 p-0 fixed bottom-2 left-2"
			>
				<ChevronRight className="h-4 w-4" />
			</Button>
		);
	}

	return (
		<Sidebar collapsible="none" className="w-64 min-w-64">
			<SidebarHeader className="flex">
				<div className="flex gap-2 px-2">
					<h1 className="text-lg font-bold w-full" data-testid="title">nullCMS</h1>
					<Button
						variant="ghost"
						size="sm"
						onClick={toggleSidebar}
						className="h-7 w-7 p-0"
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
				</div>
			</SidebarHeader>
			<SidebarContent>
				{schema.collections ? (
					<SidebarGroup>
						<SidebarGroupLabel>Collections</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{Object.keys(schema.collections).map((e) => (
									<SidebarMenuItem key={crypto.randomUUID()}>
										<SidebarMenuButton asChild>
											<Link
												className="[&.active]:bg-muted"
												to="/collection/$slug"
												params={{ slug: e }}
												activeOptions={{ exact: true }}
											>
												<FolderOpen className="h-4 w-4" />
												{schema.collections ? (
													<span>{schema.collections[e]?.title}</span>
												) : null}
											</Link>
										</SidebarMenuButton>
										<SidebarMenuAction>
											<Plus className="h-4 w-4" />
										</SidebarMenuAction>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				) : null}
				{schema.singletons ? (
					<SidebarGroup>
						<SidebarGroupLabel>Singletons</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{Object.keys(schema.singletons).map((e) => (
									<SidebarMenuItem key={e}>
										<SidebarMenuButton asChild>
											<Link
												className="[&.active]:bg-muted"
												to="/singleton/$slug"
												params={{ slug: e }}
											>
												<FileText className="h-4 w-4" />
												{schema.singletons ? (
													<span>{schema.singletons[e].title}</span>
												) : null}
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				) : null}
			</SidebarContent>

			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuButton
									tooltip="User Profile"
									className="hover:cursor-pointer"
								>
									<span>User</span>
									<ChevronDown className="ml-auto h-4 w-4" />
								</SidebarMenuButton>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="start"
								className="w-[--radix-popper-anchor-width]"
							>
								<DropdownMenuItem
									className="hover:cursor-pointer"
									onClick={() => logout()}
								>
									<span>Log out</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
