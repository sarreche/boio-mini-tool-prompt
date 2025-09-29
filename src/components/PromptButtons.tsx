

type PromptButtonProps = {
  preset: any;
  currentText: string;
  lang: "es" | "en";
  onApply: (value: string) => void;
};

export default function PromptButton({
  preset,
  currentText,
  lang,
  onApply,
}: PromptButtonProps) {
  return (
    <button
      onClick={() =>
        onApply(
          preset.build(currentText.trim() || (lang === "es" ? "(texto aquí)" : "(text here)"))
        )
      }
      className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
    >
      {preset.label}
    </button>
  );
}
