import { Suspense } from "react";
import { IntegrationPlaceholder } from "@/components/IntegrationPlaceholder";

import { DEMO_TALKS } from "@/lib/fixtures/talks";

export function generateStaticParams() {
  return DEMO_TALKS.map((t) => ({ sessionId: t.id }));
}

async function JoinPage({ params }: { params: PageProps<"/sessions/[sessionId]/join">["params"] }) {
  const { sessionId } = await params;
  return (
    <IntegrationPlaceholder
      title="Join session"
      owner="Part C (Screen 10, session companion)"
      contract={`/sessions/${sessionId}/join. Part A passes the talk id as the session id.`}
    />
  );
}

export default function Page(props: PageProps<"/sessions/[sessionId]/join">) {
  return (
    <Suspense fallback={null}>
      <JoinPage params={props.params} />
    </Suspense>
  );
}
