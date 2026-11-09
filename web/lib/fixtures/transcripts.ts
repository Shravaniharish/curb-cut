/**
 * DEMO FIXTURE. Canned transcripts for the session companion, replayed against the demo clock. Every line is
 * original synthetic text written for this demo; no real talk, speaker or conference text is quoted.
 */
import type { TranscriptChunk } from "../types";

function lines(talkId: string, every: number, items: [string, string][]): TranscriptChunk[] {
  return items.map(([speaker, text], i) => ({ talkId, offsetSec: i * every, speaker, text }));
}

export const DEMO_TRANSCRIPTS: TranscriptChunk[] = [
  ...lines("talk-supply-chain", 20, [
    ["Speaker", "Welcome, everyone. Today is about keeping your software supply chain safe without slowing your team down."],
    ["Speaker", "First, a quick picture. Every image you ship is built from many parts you did not write."],
    ["Speaker", "Each of those parts is a place where something can go wrong."],
    ["Speaker", "The goal is simple: know what is inside your image, and prove where it came from."],
    ["Speaker", "Step one is a software bill of materials. Think of it as an ingredients list for your container."],
    ["Speaker", "Step two is signing. A signature says this image came from our build system and nobody changed it."],
    ["Speaker", "Step three is checking the signature before the image is allowed to run in the cluster."],
    ["Speaker", "You can do all three inside the pipeline you already have. No extra meeting is needed."],
    ["Speaker", "Here is the order I suggest: start with the ingredients list, then sign, then enforce."],
    ["Speaker", "Enforce last, because if you block images on day one, people will look for a way around it."],
    ["Speaker", "Start in warning mode. Watch what would have been blocked for a week."],
    ["Speaker", "Then fix the noisy cases, and only then turn on blocking."],
    ["Speaker", "Let's take a short pause for questions before the demo."],
    ["Speaker", "In the demo I will sign one image, then try to run one that is not signed."],
  ]),
  ...lines("talk-observability", 20, [
    ["Speaker", "Hello and welcome. This talk assumes you have never set up observability before."],
    ["Speaker", "Observability means you can ask your system a new question without shipping new code."],
    ["Speaker", "There are three kinds of signal: logs, metrics and traces."],
    ["Speaker", "Logs tell you what happened. Metrics tell you how much. Traces tell you where the time went."],
    ["Speaker", "If you only pick one to start, pick traces for a slow request. They show the whole path."],
    ["Speaker", "OpenTelemetry gives you one way to collect all three, whatever tool you send them to."],
    ["Speaker", "Let's look at one slow request together and find where it waited."],
  ]),
  ...lines("talk-rbac", 20, [
    ["Speaker", "Hi everyone. RBAC sounds scary, but the idea is small: who can do what, where."],
    ["Speaker", "A Role is a list of allowed actions. A RoleBinding gives that list to someone."],
    ["Speaker", "Start with the smallest list that lets the job work. Add more only when something fails."],
    ["Speaker", "A ClusterRole works across the whole cluster, so be extra careful with those."],
    ["Speaker", "Let's read one real-looking Role line by line, in plain words."],
  ]),
  ...lines("talk-qa", 20, [
    ["Host", "Welcome to the open questions session on supply chain security."],
    ["Host", "We will take written questions first, so people who prefer not to speak go first."],
    ["Panelist", "A common question: do small teams need all of this? Start with the ingredients list. It is cheap."],
    ["Panelist", "Another one: what if a signing key leaks? Rotate it, and keep the list of trusted keys short."],
  ]),
];

export function transcriptFor(talkId: string): TranscriptChunk[] {
  return DEMO_TRANSCRIPTS.filter((c) => c.talkId === talkId);
}
