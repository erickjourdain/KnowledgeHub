import { createRouter } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen";
import type { AuthState } from "types/AuthState";

export interface MyRouterContext {
  auth: AuthState
  queryClient: QueryClient
}

export const queryClient = new QueryClient();

export const router = createRouter({
  routeTree,
  context: {
    auth: undefined!,
    queryClient: undefined!,
  } as MyRouterContext,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
