// Small "确定" button rendered in the top-right of composer field popovers.
// Extracted so all popovers (参与人 / 项目 / 优先级 / 描述) share the same
// commit affordance — one place to restyle, guaranteed visual consistency.
interface PopoverConfirmButtonProps {
  onClick: () => void;
  label?: string;
}

export function PopoverConfirmButton({
  onClick,
  label = "确定",
}: PopoverConfirmButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
    >
      {label}
    </button>
  );
}
