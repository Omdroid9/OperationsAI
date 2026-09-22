import { formatRelative } from "@/lib/format";
import type { Activity } from "@/types";

const TYPE_LABEL: Record<Activity["type"], string> = {
  NOTE: "Note",
  CALL: "Call",
  EMAIL: "Email",
  STAGE_CHANGE: "Stage",
  FOLLOW_UP: "Follow-up",
  SIGNAL: "Signal",
  SUMMARY: "Summary",
};

export function ActivityTimeline({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }

  return (
    <ol className="space-y-0">
      {activities.map((activity, index) => (
        <li key={activity.id} className="grid grid-cols-[96px_12px_1fr] gap-3">
          <div className="pt-0.5 text-right font-mono text-[11px] text-muted-foreground">
            {formatRelative(activity.createdAt)}
          </div>
          <div className="relative flex justify-center">
            <span className="mt-1.5 size-1.5 rounded-full bg-foreground/40" />
            {index < activities.length - 1 ? (
              <span className="absolute top-3 bottom-[-8px] w-px bg-border" />
            ) : null}
          </div>
          <div className="pb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-medium text-foreground">{TYPE_LABEL[activity.type]}</span>
              <span className="text-xs text-muted-foreground">{activity.createdBy}</span>
            </div>
            <p className="mt-0.5 text-sm text-foreground">{activity.content}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
