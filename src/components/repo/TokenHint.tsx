"use client";

export function TokenHint({
  onOpenToken,
  children = "Yazmak için token gerekir.",
}: {
  onOpenToken: () => void;
  children?: string;
}) {
  return (
    <p className="text-sm leading-6 text-muted">
      {children}{" "}
      <button
        type="button"
        onClick={onOpenToken}
        className="font-medium text-focus underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        Token bağla
      </button>
    </p>
  );
}
