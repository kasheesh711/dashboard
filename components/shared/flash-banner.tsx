type FlashBannerProps = {
  message?: string;
  error?: string;
};

export function FlashBanner({ message, error }: FlashBannerProps) {
  if (!message && !error) return null;

  const isError = Boolean(error);

  return (
    <div
      className={`rounded-[1.5rem] px-5 py-4 text-sm leading-7 ${
        isError
          ? "bg-[var(--danger-soft)] text-[var(--danger)]"
          : "bg-[var(--success-soft)] text-[var(--success)]"
      }`}
    >
      {error ?? message}
    </div>
  );
}
