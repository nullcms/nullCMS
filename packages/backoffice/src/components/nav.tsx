"use client";

import { buttonVariants } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Link, type LinkProps } from "@tanstack/react-router";

interface NavLink extends LinkProps {
	title: string;
	label?: string;
	variant: "default" | "ghost";
}

interface NavProps {
	isCollapsed: boolean;
	links: NavLink[];
}

export function Nav({ links, isCollapsed }: NavProps) {
	return (
		<div
			data-collapsed={isCollapsed}
			className="group flex flex-col gap-4 py-2 data-[collapsed=true]:py-2"
		>
			<nav className="grid gap-1 px-2 group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-2">
				{links.map((link, _) => {
					const { title, label, variant, ...linkProps } = link;
					return isCollapsed ? (
						<Tooltip key={crypto.randomUUID()} delayDuration={0}>
							<TooltipTrigger asChild>
								<Link
									{...linkProps}
									className={cn(
										buttonVariants({ variant, size: "icon" }),
										"h-9 w-9",
										variant === "default" &&
											"dark:bg-muted dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-white",
									)}
								>
									<span className="sr-only">{title}</span>
								</Link>
							</TooltipTrigger>
							<TooltipContent side="right" className="flex items-center gap-4">
								{title}
								{label && (
									<span className="ml-auto text-muted-foreground">{label}</span>
								)}
							</TooltipContent>
						</Tooltip>
					) : (
						<Link
							{...linkProps}
							key={crypto.randomUUID()}
							className={cn(
								buttonVariants({ variant, size: "sm" }),
								variant === "default" &&
									"dark:bg-muted dark:text-white dark:hover:bg-muted dark:hover:text-white",
								"justify-start",
							)}
						>
							{title}
							{label && (
								<span
									className={cn(
										"ml-auto",
										variant === "default" && "text-background dark:text-white",
									)}
								>
									{label}
								</span>
							)}
						</Link>
					);
				})}
			</nav>
		</div>
	);
}
