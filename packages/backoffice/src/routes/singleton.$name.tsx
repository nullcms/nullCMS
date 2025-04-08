import { createRoute, Outlet} from '@tanstack/react-router'
import { useConfig } from '@/components/providers/config-provider';
import { FieldEditor } from "@/components/field-editor";
import {RootRoute} from "@/routes/__root";

export const SingletonEditRoute = createRoute({
    getParentRoute: () => RootRoute,
    path: '/singleton/$name',
    component: PostComponent
})

function PostComponent() {
    const { name } = SingletonEditRoute.useParams()
    const {schema} = useConfig();

    if (schema.singletons == undefined || schema.singletons[name] == undefined) {
        return <div>Singleton not found</div>
    }

    return (<>
        <FieldEditor schema={schema.singletons[name]} id={name} />
        <Outlet />
    </>)
}