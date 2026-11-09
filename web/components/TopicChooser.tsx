"use client";

import { AccessibleCheckboxGroup } from "@/components/AccessibleCheckboxGroup";
import { useApp } from "@/lib/store";
import { TOPICS } from "@/lib/types";
import type { Topic } from "@/lib/types";

export function TopicChooser({ legend = "Topics" }: { legend?: string }) {
  const { state, updatePrefs } = useApp();
  return (
    <AccessibleCheckboxGroup
      legend={legend}
      options={TOPICS.map((t) => ({ id: t, label: t, checked: state.prefs.topics.includes(t) }))}
      onChange={(id, checked) =>
        updatePrefs((p) => {
          const topic = id as Topic;
          p.topics = checked ? [...new Set([...p.topics, topic])] : p.topics.filter((t) => t !== topic);
        })
      }
    />
  );
}
