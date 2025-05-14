"use client";

import { useConfig } from "@/components/providers/config-provider";
import { Button } from "@/components/ui/button";
import {
	Sidebar,
	SidebarContent,
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
import { ChevronLeft, ChevronRight, FileText, FolderOpen, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react"; // <-- add this

export function CmsSidebar() {
	const { open, toggleSidebar, setOpen } = useSidebar();
	const { schema } = useConfig();
	const [isMobile, setIsMobile] = useState(false);

	// Auto-collapse on mobile
	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768); // <768px is mobile
		};

		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	console.log(open, isMobile);

	useEffect(() => {
		if (isMobile) {
			setOpen(false);
		}
		else {
			setOpen(true);
		}
	}, [isMobile]);

	return (
		<AnimatePresence initial={false}>
			{!open ? (
				<motion.div
					key="collapsed"
					initial={{ opacity: 0, x: -20 }}
					animate={{ opacity: 1, x: 0 }}
					exit={{ opacity: 0, x: -20 }}
					transition={{ duration: 0.2 }}
					className="fixed bottom-2 left-2 z-50"
				>
					<Button
						variant="outline"
						size="sm"
						onClick={toggleSidebar}
						className="h-7 w-7 p-0"
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</motion.div>
			) : (
				<motion.div
					key="expanded"
					initial={{ width: 0, opacity: 0 }}
					animate={{ width: "fit-content", opacity: 1 }}
					exit={{ width: 0, opacity: 0 }}
					transition={{ type: "spring", stiffness: 300, damping: 30 }}
					className={`${isMobile ? "fixed inset-0 bg-background z-40" : ""}`}
				>
					<Sidebar collapsible="none" className="w-64 min-w-64 h-full">
						<SidebarHeader className="flex">
							<div className="flex gap-2 px-2 my-auto w-full">
								<h1 className="text-xl font-bold tracking-tighter font-mono" data-testid="title">
									nullCMS
								</h1>
								<Button
									variant="ghost"
									size="lg"
									onClick={toggleSidebar}
									className="h-7 w-7 p-0 ml-auto"
								>
									<ChevronLeft className="h-4 w-4" />
								</Button>
							</div>
						</SidebarHeader>
						<SidebarContent>
							{schema.collections && (
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
															<span>{schema.collections?.[e]?.title}</span>
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
							)}
							{schema.singletons && (
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
															<span>{schema.singletons?.[e]?.title}</span>
														</Link>
													</SidebarMenuButton>
												</SidebarMenuItem>
											))}
										</SidebarMenu>
									</SidebarGroupContent>
								</SidebarGroup>
							)}
						</SidebarContent>
						<SidebarRail />
					</Sidebar>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
