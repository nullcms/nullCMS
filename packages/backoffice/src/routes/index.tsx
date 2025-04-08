import { createRoute} from '@tanstack/react-router'
import {RootRoute} from "@/routes/__root";
import {RichTextEditor} from "@/components/richtext";

export const IndexRoute = createRoute({
    getParentRoute: () => RootRoute,
    path: '/',
    component: Index
})


function Index() {
  return (
  <></>
  )
}
