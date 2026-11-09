import { Suspense } from "react";
import { AlertDetail } from "@/components/AlertDetail";
import { LoadingState } from "@/components/ui";

async function AlertPage({ params }: { params: PageProps<"/alerts/[alertId]">["params"] }) {
  const { alertId } = await params;
  return <AlertDetail alertId={alertId} />;
}

export default function Page(props: PageProps<"/alerts/[alertId]">) {
  return (
    <Suspense fallback={<LoadingState />}>
      <AlertPage params={props.params} />
    </Suspense>
  );
}
