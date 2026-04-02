import { formatTarih } from "@/lib/utils/format";

type MesajBalonuProps = {
  content: string;
  createdAt: string;
  senderUsername: string;
  isOwn: boolean;
};

export default function MesajBalonu({
  content,
  createdAt,
  senderUsername,
  isOwn,
}: MesajBalonuProps) {
  return (
    <div
      className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3`}
    >
      <div
        className={`max-w-[75%] rounded-lg px-4 py-2.5 ${
          isOwn
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {!isOwn && (
          <p className="text-xs font-medium mb-1 opacity-70">
            {senderUsername}
          </p>
        )}
        <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        <p
          className={`text-[10px] mt-1 ${
            isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
          }`}
        >
          {formatTarih(createdAt)}
        </p>
      </div>
    </div>
  );
}
