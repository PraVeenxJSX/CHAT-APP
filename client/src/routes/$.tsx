import { createFileRoute } from "@tanstack/react-router";
import ClientAppMount from "../components/ClientAppMount";

// Splat: hand every non-index path (e.g. /register, /chat) to the
// react-router-dom App so its <Routes> can match them client-side.
export const Route = createFileRoute("/$")({
  component: ClientAppMount,
});