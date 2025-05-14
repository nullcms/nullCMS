import { FieldEditor } from "@/components/field-editor";
import { useConfig } from "@/components/providers/config-provider";
import { RootRoute } from "@/routes/__root";
import { Outlet, createRoute } from "@tanstack/react-router";
import { queryClient } from "../lib/client";
import { createApiClient } from "../components/providers/api-provider";
import type { RouterContext } from "../backoffice";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Header } from "../components/header";

// Create a query options object for the singleton data
const getSingletonQueryOptions = (name: string, apiUrl: string) => queryOptions({
  queryKey: ["singletons", name],
  queryFn: async () => {
    const apiClient = createApiClient(apiUrl);
    const response = await apiClient.get(`/api/singletons/${name}`);
    return response.data;
  }
});

export const SingletonEditRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/singleton/$name",
  loader: async ({ params, context }) => {
    const { name } = params;
    const { apiUrl } = (context as RouterContext).config;
    // Prefetch the singleton data using queryOptions
    await queryClient.ensureQueryData(getSingletonQueryOptions(name, apiUrl));
    return { name };
  },
  component: SingletonComponent,
});

function SingletonComponent() {
  const { name } = SingletonEditRoute.useParams();
  const { schema, apiUrl } = useConfig();
  
  const { data: singleton } = useSuspenseQuery(getSingletonQueryOptions(name, apiUrl));



  if (
    schema.singletons === undefined ||
    schema.singletons[name] === undefined
  ) {
    return <div>Singleton not found</div>;
  }

  return (
    <>
      <Header title={schema.singletons[name].title} isEditable />
      <FieldEditor schema={schema.singletons[name]} singleton={singleton} id={name} />
      <Outlet />
    </>
  );
}