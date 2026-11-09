import { Suspense } from "react";
import { PresenterConsole } from "@/components/PresenterConsole";
import { LoadingState } from "@/components/ui";
import { WaitForState } from "@/components/WaitForState";
import { DEMO_TALKS } from "@/lib/fixtures/talks";

export function generateStaticParams() {
  return DEMO_TALKS.map((t) => ({ talkId: t.id }));
}

/** Screen 13: presenter console (laptop). */
async function PresenterPage({ params }: { params: PageProps<"/presenter/[talkId]">["params"] }) {
  const { talkId } = await params;
  return (
    <WaitForState>
      <PresenterConsole talkId={talkId} />
    </WaitForState>
  );
}

export default function Page(props: PageProps<"/presenter/[talkId]">) {
  return (
    <Suspense fallback={<LoadingState />}>
      <PresenterPage params={props.params} />
    </Suspense>
  );
}
