import { LogoutButton } from "@/components/shared/LogoutButton";

type Props = {
  projectLabel: string;
  projectId: string | null;
};

export function SharedPageHeader({ projectLabel, projectId }: Props) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm text-white/45">Active project</div>
        <div className="mt-2 text-lg font-semibold text-white">{projectLabel}</div>
        {projectId ? (
          <div className="mt-1 text-sm text-white/45">{projectId}</div>
        ) : null}
      </div>

      <LogoutButton />
    </div>
  );
}