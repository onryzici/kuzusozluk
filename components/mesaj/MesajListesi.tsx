import Link from "next/link";
import { formatZamanOnce } from "@/lib/utils/format";

type Conversation = {
  username: string;
  avatarUrl: string | null;
  lastMessage: string;
  lastMessageAt: string;
  isOwnMessage: boolean;
  unreadCount: number;
};

export default function MesajListesi({
  conversations,
}: {
  conversations: Conversation[];
}) {
  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        Henüz mesajınız yok.
      </div>
    );
  }

  return (
    <div className="divide-y">
      {conversations.map((conv) => (
        <Link
          key={conv.username}
          href={`/mesajlar/${conv.username}`}
          className="flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
            {conv.username[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-sm font-medium ${
                  conv.unreadCount > 0 ? "text-primary" : "text-foreground"
                }`}
              >
                {conv.username}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatZamanOnce(conv.lastMessageAt)}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm text-muted-foreground truncate">
                {conv.isOwnMessage && (
                  <span className="text-muted-foreground/70">Sen: </span>
                )}
                {conv.lastMessage}
              </p>
              {conv.unreadCount > 0 && (
                <span className="shrink-0 inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  {conv.unreadCount}
                </span>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
