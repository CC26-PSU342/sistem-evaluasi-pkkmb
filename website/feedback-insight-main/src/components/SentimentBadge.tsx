import { Smile, Frown, Meh } from "lucide-react";
import { cn } from "@/lib/utils";

export type Sentiment = "positive" | "negative" | "neutral";

interface SentimentBadgeProps {
  sentiment: Sentiment;
  className?: string;
}

const config = {
  positive: {
    label: "Positif",
    icon: Smile,
    classes: "bg-sentiment-positive-bg text-sentiment-positive border-sentiment-positive/20",
  },
  negative: {
    label: "Negatif",
    icon: Frown,
    classes: "bg-sentiment-negative-bg text-sentiment-negative border-sentiment-negative/20",
  },
  neutral: {
    label: "Netral",
    icon: Meh,
    classes: "bg-sentiment-neutral-bg text-sentiment-neutral border-sentiment-neutral/20",
  },
};

export const SentimentBadge = ({ sentiment, className }: SentimentBadgeProps) => {
  const { label, icon: Icon, classes } = config[sentiment];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
        classes,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
};
