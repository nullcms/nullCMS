import { RootRoute } from "@/routes/__root";
import { createRoute } from "@tanstack/react-router";

export const IndexRoute = createRoute({
	getParentRoute: () => RootRoute,
	path: "/",
	component: Index,
});

function Index() {
	return <></>;
}
