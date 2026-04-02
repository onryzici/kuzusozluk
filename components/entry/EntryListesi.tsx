import EntryKart from "./EntryKart";

type Entry = {
  id: string;
  content: string;
  upvotes: number;
  downvotes: number;
  isEdited: boolean;
  createdAt: string;
  author: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
};

type EntryListesiProps = {
  entries: Entry[];
  startIndex: number;
};

export default function EntryListesi({ entries, startIndex }: EntryListesiProps) {
  return (
    <div className="space-y-4">
      {entries.map((entry, idx) => (
        <EntryKart
          key={entry.id}
          id={entry.id}
          content={entry.content}
          upvotes={entry.upvotes}
          downvotes={entry.downvotes}
          authorUsername={entry.author.username}
          authorAvatarUrl={entry.author.avatarUrl}
          createdAt={entry.createdAt}
          isEdited={entry.isEdited}
          entryNumber={startIndex + idx + 1}
        />
      ))}
    </div>
  );
}
