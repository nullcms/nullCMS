import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Separator } from "@radix-ui/react-separator";
import { Nav } from "./nav";
import { useConfig } from "./providers/config-provider";

export function Navbar() {
	const { schema } = useConfig();
	const { logout } = useAuth();

	return (
		<>
			<div className={cn("flex h-[52px] items-center justify-center")} data-testid="title">
				nullCMS
			</div>
			<Separator />
			{schema.collections !== undefined ? (
				<>
					<span className="text-xs ml-2">Collections</span>
					<Nav
						isCollapsed={false}
						links={Object.keys(schema.collections).map((e) => ({
							to: "/collection/$slug",
							params: { slug: e },
							title:
								schema.collections !== undefined
									? schema.collections[e]?.title
									: "",
							label: "",
							variant: "ghost",
						}))}
					/>
					<Separator />
				</>
			) : null}
			{schema.singletons !== undefined ? (
				<>
					<span className="text-xs ml-2">Singletons</span>
					<Nav
						isCollapsed={false}
						links={Object.keys(schema.singletons).map((e) => ({
							to: "/singleton/$slug",
							params: { slug: e },
							title:
								schema.singletons !== undefined
									? schema.singletons[e].title
									: null,
							label: "",
							variant: "ghost",
						}))}
					/>
					<Separator />
				</>
			) : null}
			<div className="flex-1" />
			<Button
				onClick={() => logout()}
				className="w-full hover:cursor-pointer text-left"
				variant="ghost"
			>
				Logout
			</Button>
		</>
	);
}
