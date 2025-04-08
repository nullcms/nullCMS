import {createRoute} from '@tanstack/react-router'
import { useConfig } from '@/components/providers/config-provider'
import {CollectionsList} from "@/components/collections-list";
import {RootRoute} from "@/routes/__root";

export const CollectionRoute = createRoute({
    getParentRoute: () => RootRoute,
    path: '/collection/$name',
    component: PostComponent
})

function PostComponent() {
    const { name } = CollectionRoute.useParams();
    const { schema } = useConfig();

    if (schema.collections == undefined || schema.collections[name] == undefined) {
        return <div>Collection not found</div>
    }

    return <>
        <CollectionsList collectionId={name} />
    </>
}