type Props = {
  title: string;
  connected: boolean;
  countLabel: string;
  countValue: number;
};

export function StatusCard(props: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="text-sm text-white/60">{props.title}</div>
      <div className="mt-2 text-lg font-semibold">
        {props.connected ? "Connected" : "Not connected"}
      </div>
      <div className="mt-2 text-sm text-white/70">
        {props.countLabel}: {props.countValue}
      </div>
    </div>
  );
}