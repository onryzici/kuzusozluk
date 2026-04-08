"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type Status = "loading" | "unsupported" | "denied" | "subscribed" | "unsubscribed";

export default function PushBildirimAyar() {
  const [status, setStatus] = useState<Status>("loading");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }

    // First ensure SW is registered, then check subscription
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setStatus(sub ? "subscribed" : "unsubscribed");
      })
      .catch(() => {
        setStatus("unsubscribed");
      });
  }, []);

  async function subscribe() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });

      const json = sub.toJSON();
      await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });

      setStatus("subscribed");
    } catch {
      // subscription failed silently
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch("/api/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }

      setStatus("unsubscribed");
    } catch {
      // unsubscription failed silently
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 border-t border-border pt-6">
      <h2 className="text-sm font-medium mb-1">push bildirimleri</h2>
      {status === "loading" ? (
        <p className="text-xs text-muted-foreground">yukleniyor...</p>
      ) : (
        <>
      <p className="text-xs text-muted-foreground mb-3">
        {status === "unsupported"
          ? "tarayiciniz push bildirimlerini desteklemiyor."
          : status === "denied"
            ? "bildirim izni reddedildi. tarayici ayarlarindan izin vermeniz gerekiyor."
            : status === "subscribed"
              ? "bildirimler acik. yeni bildirim geldiginde telefonunuza veya bilgisayariniza bildirim gelecek."
              : "bildirimleri acarseniz yeni etiketleme, yorum, begeni gibi bildirimleri aninda alirsiniz."}
      </p>

      {status !== "unsupported" && status !== "denied" && (
        <button
          onClick={status === "subscribed" ? unsubscribe : subscribe}
          disabled={loading}
          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
            status === "subscribed"
              ? "bg-muted text-muted-foreground hover:bg-muted/80"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          } disabled:opacity-50`}
        >
          {status === "subscribed" ? (
            <>
              <BellOff className="h-3 w-3" />
              {loading ? "kapatiliyor..." : "bildirimleri kapat"}
            </>
          ) : (
            <>
              <Bell className="h-3 w-3" />
              {loading ? "aciliyor..." : "bildirimleri ac"}
            </>
          )}
        </button>
      )}

      {status === "denied" && (
        <p className="text-[10px] text-muted-foreground mt-1">
          tarayici ayarlari &gt; site ayarlari &gt; bildirimler &gt; izin ver
        </p>
      )}
      </>
      )}
    </div>
  );
}
