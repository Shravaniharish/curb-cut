"use client";

/**
 * Screen 9: other talks that fit. Same talk card as the plan and the search results, plus the walk time from where
 * the attendee is now. Only talks whose required needs are confirmed and that can be reached in time are listed.
 */
import { TalkCard } from "./TalkCard";
import { EmptyState, PrimaryButton, SecondaryButton } from "./ui";
import { ROUTES } from "@/lib/routes";
import { useApp } from "@/lib/store";
import type { TalkOption } from "@/lib/changes";

export function OtherOptionsList({ options }: { options: TalkOption[] }) {
  const { state, selectTalk, setCurrentRoute } = useApp();
  if (options.length === 0) {
    return (
      <EmptyState
        title="Nothing else today fits"
        actions={
          <>
            <SecondaryButton href={ROUTES.search}>Search all talks</SecondaryButton>
            <SecondaryButton href={ROUTES.plan}>Back to my plan</SecondaryButton>
          </>
        }
      >
        <p>
          No other talk today both confirms the needs you chose and can be reached from where you are before it
          starts. You can search every talk, or go back to your plan.
        </p>
      </EmptyState>
    );
  }
  return (
    <ul className="card-list">
      {options.map((option) => (
        <li key={option.talk.id}>
          <TalkCard talk={option.talk} why={option.why}>
            <p className="small" style={{ marginTop: "0.5rem" }}>
              <strong>
                {option.walkMinutes} {option.walkMinutes === 1 ? "minute" : "minutes"} from here
                {option.stepFree ? ", step-free" : ""}
              </strong>
            </p>
            <PrimaryButton
              href={ROUTES.route(option.talk.roomId)}
              onClick={() => {
                selectTalk(option.talk.id);
                setCurrentRoute({ fromId: state.currentLocationId, toId: option.talk.roomId, talkId: option.talk.id });
              }}
            >
              Take me there
            </PrimaryButton>
          </TalkCard>
        </li>
      ))}
    </ul>
  );
}
