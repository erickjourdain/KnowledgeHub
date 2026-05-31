import { RouterProvider } from "@tanstack/react-router";
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from "./providers/authProvider";
import { router, queryClient } from "./router";
import { type MyRouterContext } from "./router";
import { WebSocketProvider } from "./providers/websocketProvider";

function InnerApp() {
  const auth = useAuth();
  const context: MyRouterContext = {
    auth,
    queryClient
  }
  return <RouterProvider
    router={router}
    context={context}
  />;
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <WebSocketProvider>
          <InnerApp />
        </WebSocketProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;