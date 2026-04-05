"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { parseEntryContent } from "@/lib/utils/entryParser";

type UserSuggestion = {
  username: string;
  displayName?: string;
};

type EntryEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  disabled?: boolean;
};

export default function EntryEditor({
  value,
  onChange,
  onSubmit,
  placeholder = "entry yaz...",
  rows = 5,
  maxLength = 5000,
  disabled = false,
}: EntryEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);

  // @ mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState<number>(0);
  const [mentionUsers, setMentionUsers] = useState<UserSuggestion[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // stats
  const lineCount = value ? value.split("\n").length : 0;
  const charCount = value ? value.length : 0;
  const wordCount = value ? value.trim().split(/\s+/).filter(Boolean).length : 0;

  // --- toolbar helpers ---

  function getTextarea(): HTMLTextAreaElement | null {
    return textareaRef.current;
  }

  function insertAtCursor(before: string, after: string = "") {
    const ta = getTextarea();
    if (!ta) return;
    ta.focus();

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);
    const insertion = before + selected + after;
    const newValue = value.slice(0, start) + insertion + value.slice(end);
    onChange(newValue);

    // set cursor position after React re-render
    const cursorPos = selected
      ? start + insertion.length
      : start + before.length;
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(cursorPos, cursorPos);
    });
  }

  function wrapSelection(wrapper: string) {
    const ta = getTextarea();
    if (!ta) return;
    ta.focus();

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);
    const newValue =
      value.slice(0, start) + wrapper + selected + wrapper + value.slice(end);
    onChange(newValue);

    const cursorPos = selected
      ? start + wrapper.length + selected.length + wrapper.length
      : start + wrapper.length;
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(cursorPos, cursorPos);
    });
  }

  function handleBkz() {
    insertAtCursor("(bkz: ", ")");
  }

  function handleStar() {
    wrapSelection("*");
  }

  function handleSpoiler() {
    const ta = getTextarea();
    if (!ta) return;
    ta.focus();
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);
    const newValue =
      value.slice(0, start) +
      "-spoiler-" +
      selected +
      "--spoiler--" +
      value.slice(end);
    onChange(newValue);

    const cursorPos = selected
      ? start + 9 + selected.length + 11
      : start + 9;
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(cursorPos, cursorPos);
    });
  }

  function handleMentionButton() {
    const ta = getTextarea();
    if (!ta) return;
    ta.focus();
    const start = ta.selectionStart;
    const newValue = value.slice(0, start) + "@" + value.slice(start);
    onChange(newValue);

    const cursorPos = start + 1;
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(cursorPos, cursorPos);
      // trigger mention detection
      setMentionQuery("");
      setMentionStart(start);
    });
  }

  function handleBold() {
    wrapSelection("**");
  }

  function handleItalic() {
    wrapSelection("*");
  }

  function handleLink() {
    insertAtCursor("[link metni](https://", ")");
  }

  function handleGorsel() {
    fileInputRef.current?.click();
  }

  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // reset input
    e.target.value = "";

    if (file.size > 2 * 1024 * 1024) {
      toast.error("dosya boyutu en fazla 2MB olabilir");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/gorsel", { method: "POST", body: formData });
      const json = await res.json();
      if (json.success) {
        insertAtCursor(`[görsel: ${json.data.url}]`, "");
        toast.success("görsel yüklendi");
      } else {
        toast.error(json.error?.message || "görsel yüklenemedi");
      }
    } catch {
      toast.error("görsel yüklenirken hata oluştu");
    } finally {
      setUploading(false);
    }
  }

  // --- @ mention detection ---

  function detectMention(text: string, cursorPos: number) {
    // look backwards from cursor for @ not preceded by a word char
    const before = text.slice(0, cursorPos);
    const match = before.match(/(^|[^a-zA-Z0-9_])@([a-zA-Z0-9_]*)$/);
    if (match) {
      const query = match[2];
      const atPos = cursorPos - query.length - 1;
      setMentionQuery(query);
      setMentionStart(atPos);
      setMentionIndex(0);
      return query;
    }
    setMentionQuery(null);
    setMentionUsers([]);
    return null;
  }

  // fetch users for mention
  const fetchUsers = useCallback(async (query: string) => {
    if (query.length < 1) {
      setMentionUsers([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/ara?q=${encodeURIComponent(query)}&tip=kullanici`
      );
      const json = await res.json();
      if (json.success && json.data) {
        const users: UserSuggestion[] = json.data
          .slice(0, 8)
          .map((u: { username: string; displayName?: string }) => ({
            username: u.username,
            displayName: u.displayName,
          }));
        setMentionUsers(users);
      } else {
        setMentionUsers([]);
      }
    } catch {
      setMentionUsers([]);
    }
  }, []);

  function handleTextareaChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const newValue = e.target.value;
    if (newValue.length > maxLength) return;
    onChange(newValue);

    const cursorPos = e.target.selectionStart;
    const query = detectMention(newValue, cursorPos);

    if (query !== null) {
      // calculate dropdown position
      updateDropdownPosition(e.target, cursorPos);

      // debounced fetch
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchUsers(query);
      }, 200);
    }
  }

  function updateDropdownPosition(
    ta: HTMLTextAreaElement,
    cursorPos: number
  ) {
    // approximate position: use a hidden mirror element approach
    // simpler approach: position relative to textarea
    const textBefore = value.slice(0, cursorPos);
    const lines = textBefore.split("\n");
    const currentLine = lines.length - 1;
    const lineHeight = 20; // approximate
    const charWidth = 7.5; // approximate for text-sm

    const top = Math.min((currentLine + 1) * lineHeight, ta.clientHeight);
    const lastLineLength = lines[lines.length - 1].length;
    const left = Math.min(lastLineLength * charWidth, ta.clientWidth - 200);

    setDropdownPos({ top: top + 4, left: Math.max(0, left) });
  }

  function selectMentionUser(username: string) {
    const ta = getTextarea();
    if (!ta || mentionQuery === null) return;

    // replace @query with @username
    const beforeAt = value.slice(0, mentionStart);
    const afterQuery = value.slice(mentionStart + 1 + (mentionQuery?.length || 0));
    const newValue = beforeAt + "@" + username + " " + afterQuery;
    onChange(newValue);

    const cursorPos = mentionStart + 1 + username.length + 1;
    setMentionQuery(null);
    setMentionUsers([]);

    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(cursorPos, cursorPos);
    });
  }

  function handleTextareaKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // mobil klavyede "gönder" veya desktop'ta Enter (shift olmadan) → submit
    if (e.key === "Enter" && !e.shiftKey && mentionQuery === null && onSubmit) {
      // allow if not in mention dropdown
      e.preventDefault();
      onSubmit();
      return;
    }

    if (mentionQuery !== null && mentionUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((prev) =>
          prev < mentionUsers.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((prev) =>
          prev > 0 ? prev - 1 : mentionUsers.length - 1
        );
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectMentionUser(mentionUsers[mentionIndex].username);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        setMentionUsers([]);
      }
    }
  }

  // close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setMentionQuery(null);
        setMentionUsers([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toolbarButtons = [
    { label: "bkz", onClick: handleBkz, title: "(bkz: ) ekle" },
    { label: "*", onClick: handleStar, title: "yildiz ile sar" },
    {
      label: "spoiler",
      onClick: handleSpoiler,
      title: "spoiler etiketi ekle",
    },
    { divider: true },
    { label: "@", onClick: handleMentionButton, title: "kullanici etiketle" },
    { divider: true },
    { label: "B", onClick: handleBold, title: "kalin yaz", bold: true },
    { label: "i", onClick: handleItalic, title: "italik yaz", italic: true },
    { divider: true },
    { label: "link", onClick: handleLink, title: "link ekle" },
    {
      label: uploading ? "yukluyor..." : "gorsel",
      onClick: handleGorsel,
      title: "telefon arsivinden veya bilgisayardan gorsel yukle",
      disabled: uploading,
    },
  ];

  return (
    <div className="space-y-0">
      {/* toolbar */}
      <div className="flex items-center gap-0.5 border border-b-0 rounded-t-md px-1.5 py-1 bg-muted/30 overflow-x-auto scrollbar-none flex-nowrap">
        {toolbarButtons.map((btn, idx) => {
          if ("divider" in btn && btn.divider) {
            return (
              <span
                key={`div-${idx}`}
                className="w-px h-4 bg-border mx-1"
              />
            );
          }
          return (
            <button
              key={btn.label}
              type="button"
              title={btn.title}
              onClick={btn.onClick}
              disabled={disabled || preview || btn.disabled}
              className={`px-1.5 py-0.5 text-xs rounded transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-40 disabled:cursor-not-allowed ${
                btn.bold ? "font-bold" : ""
              } ${btn.italic ? "italic" : ""}`}
            >
              {btn.label}
            </button>
          );
        })}

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setPreview(!preview)}
          className="px-1.5 py-0.5 text-xs rounded transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          {preview ? "duzenle" : "onizle"}
        </button>
      </div>

      {/* editor / preview */}
      <div className="relative">
        {preview ? (
          <div
            className="min-h-[120px] p-3 border rounded-b-md text-sm whitespace-pre-wrap entry-content bg-background"
            dangerouslySetInnerHTML={{
              __html: parseEntryContent(value || "onizleme bos"),
            }}
          />
        ) : (
          <>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleTextareaChange}
              onKeyDown={handleTextareaKeyDown}
              placeholder={placeholder}
              rows={rows}
              maxLength={maxLength}
              disabled={disabled || uploading}
              enterKeyHint={onSubmit ? "send" : "enter"}
              className="flex field-sizing-content min-h-16 w-full rounded-b-md border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 rounded-t-none resize-y dark:bg-input/30"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* @ mention dropdown */}
            {mentionQuery !== null && mentionUsers.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute z-50 bg-popover border border-border rounded-md shadow-lg py-1 min-w-[180px] max-h-[200px] overflow-y-auto"
                style={{
                  top: `${dropdownPos.top}px`,
                  left: `${dropdownPos.left}px`,
                }}
              >
                {mentionUsers.map((user, idx) => (
                  <button
                    key={user.username}
                    type="button"
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors ${
                      idx === mentionIndex
                        ? "bg-accent text-accent-foreground"
                        : "text-popover-foreground"
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectMentionUser(user.username);
                    }}
                  >
                    <span className="font-medium">@{user.username}</span>
                    {user.displayName && (
                      <span className="text-xs text-muted-foreground ml-2">
                        {user.displayName}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* stats bar */}
      <div className="flex items-center justify-between px-1 pt-1.5">
        <span className="text-xs text-muted-foreground">
          satir: {lineCount} &nbsp;&nbsp; karakter: {charCount}
        </span>
        <span className="text-xs text-muted-foreground">
          kelime: {wordCount}
        </span>
      </div>
    </div>
  );
}
