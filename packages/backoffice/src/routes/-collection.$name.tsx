import { CollectionsList } from "@/components/collections-list";
import { useConfig } from "@/components/providers/config-provider";
import { RootRoute } from "@/routes/__root";
import { createRoute } from "@tanstack/react-router";
import { Header } from "../components/header";
import { fa } from "@faker-js/faker";

export const CollectionRoute = createRoute({
	getParentRoute: () => RootRoute,
	path: "/collection/$name",
	component: PostComponent,
});

function PostComponent() {
	const { name } = CollectionRoute.useParams();
	const { schema } = useConfig();

	if (
		schema.collections === undefined ||
		schema.collections[name] === undefined
	) {
		return <div>Collection not found</div>;
	}

	return (
		<>
			<Header title={`${schema.collections[name].title}s`} isEditable={false} />
			<CollectionsList collectionId={name} />
		</>
	);
}
