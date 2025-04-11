import { FieldEditor } from "@/components/field-editor";
import { useConfig } from "@/components/providers/config-provider";
import { RootRoute } from "@/routes/__root";
import { Outlet, createRoute } from "@tanstack/react-router";

export const SingletonEditRoute = createRoute({
	getParentRoute: () => RootRoute,
	path: "/singleton/$name",
	component: PostComponent,
});

function PostComponent() {
	const { name } = SingletonEditRoute.useParams();
	const { schema } = useConfig();

	if (
		schema.singletons === undefined ||
		schema.singletons[name] === undefined
	) {
		return <div>Singleton not found</div>;
	}

	return (
		<>
			<FieldEditor schema={schema.singletons[name]} id={name} />
			<Outlet />
		</>
	);
}
