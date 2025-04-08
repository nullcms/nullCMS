import { createRoute } from '@tanstack/react-router'
import { useConfig } from '@/components/providers/config-provider'
import {CollectionEditor} from "@/components/collection-editor";
import {RootRoute} from "@/routes/__root";

export const CollectionEditRoute = createRoute({
    getParentRoute: () => RootRoute,
    path: '/collection/$name/$id',
    component: PostComponent
})

function PostComponent() {
    const { name, id } = CollectionEditRoute.useParams()
    const { schema } = useConfig();

    if (schema.collections == undefined || schema.collections[name] == undefined) {
        return <div>Collection not found</div>
    }

    return <>
        <CollectionEditor schema={schema.collections[name]} id={id} collectionName={name} />
    </>
}