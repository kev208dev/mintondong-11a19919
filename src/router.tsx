import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    scrollToTopSelectors: ["[data-app-scroll-container]"],
    defaultPreload: "intent",
    defaultPreloadStaleTime: 60_000,
    defaultPreloadDelay: 20,
  });

  return router;
};
