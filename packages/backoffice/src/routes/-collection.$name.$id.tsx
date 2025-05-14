import { CollectionEditor } from "@/components/collection-editor";
import { useConfig } from "@/components/providers/config-provider";
import { RootRoute } from "@/routes/__root";
import { createRoute } from "@tanstack/react-router";
import { Header } from "../components/header";

export const CollectionEditRoute = createRoute({
	getParentRoute: () => RootRoute,
	path: "/collection/$name/$id",
	component: PostComponent,
});

function PostComponent() {
	const { name, id } = CollectionEditRoute.useParams();
	const { schema } = useConfig();

	if (
		schema.collections === undefined ||
		schema.collections[name] === undefined
	) {
		return <div>Collection not found</div>;
	}

	return (
		<>
			<Header title={id} isEditable />
			<CollectionEditor
				schema={schema.collections[name]}
				id={id}
				collectionName={name}
			/>
		</>
	);
}
