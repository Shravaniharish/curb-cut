import { Suspense } from "react";
import { SessionCompanion } from "@/components/SessionCompanion";
import { LoadingState } from "@/components/ui";
import { WaitForState } from "@/components/WaitForState";
import { DEMO_TALKS } from "@/lib/fixtures/talks";

export function generateStaticParams() {
  return DEMO_TALKS.map((t) => ({ sessionId: t.id }));
}

/** Screen 10. Part A passes the talk id as the session id. */
async function JoinPage({ params }: { params: PageProps<"/sessions/[sessionId]/join">["params"] }) {
  const { sessionId } = await params;
  return (
    <WaitForState>
      <SessionCompanion talkId={sessionId} />
    </WaitForState>
  );
}

export default function Page(props: PageProps<"/sessions/[sessionId]/join">) {
  return (
    <Suspense fallback={<LoadingState />}>
      <JoinPage params={props.params} />
    </Suspense>
  );
}
