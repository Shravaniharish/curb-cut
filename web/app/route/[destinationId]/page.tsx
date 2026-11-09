import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { RouteView } from "@/components/RouteView";
import { createDemoVenue, destinations } from "@/lib/fixtures/venue";

export function generateStaticParams() {
  return destinations(createDemoVenue()).map((d) => ({ destinationId: d.id }));
}

async function RoutePage({ params }: { params: PageProps<"/route/[destinationId]">["params"] }) {
  const { destinationId } = await params;
  return <RouteView destinationId={destinationId} />;
}

export default function Page(props: PageProps<"/route/[destinationId]">) {
  return (
    <Suspense fallback={<LoadingState />}>
      <RoutePage params={props.params} />
    </Suspense>
  );
}
