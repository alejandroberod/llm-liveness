import type { ComponentProps } from "react";

export default function OutlineButton({ className = "", ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={`inline-flex cursor-pointer items-center justify-center gap-[9px] rounded-lg border border-[#9184d9] bg-transparent font-medium text-[#d2cefd] transition-colors hover:bg-[rgba(145,132,217,.14)] active:bg-[rgba(145,132,217,.22)] disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent ${className}`}
      {...props}
    />
  );
}
