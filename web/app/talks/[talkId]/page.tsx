import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { TalkDetails } from "@/components/TalkDetails";
import { DEMO_TALKS } from "@/lib/fixtures/talks";

export function generateStaticParams() {
  return DEMO_TALKS.map((t) => ({ talkId: t.id }));
}

async function TalkPage({ params }: { params: PageProps<"/talks/[talkId]">["params"] }) {
  const { talkId } = await params;
  return <TalkDetails talkId={talkId} />;
}

export default function Page(props: PageProps<"/talks/[talkId]">) {
  return (
    <Suspense fallback={<LoadingState />}>
      <TalkPage params={props.params} />
    </Suspense>
  );
}
