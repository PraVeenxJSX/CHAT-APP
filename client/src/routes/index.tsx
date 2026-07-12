import { createFileRoute } from "@tanstack/react-router";
import ClientAppMount from "../components/ClientAppMount";

export const Route = createFileRoute("/")({
  component: ClientAppMount,
});
