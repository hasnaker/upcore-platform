import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "@docusaurus/router";
import useIsBrowser from "@docusaurus/useIsBrowser";

/**
 * "Bu sayfa yardımcı oldu mu?" geri bildirim widget.
 *
 * - 👍 / 👎 tıklaması doğrudan analytics endpoint'e gider.
 * - Negatif oy verenden isteğe bağlı yorum alınır.
 * - Oy tekrarını önlemek için localStorage'a yazılır.
 * - Endpoint env (DOCS_FEEDBACK_ENDPOINT) yoksa navigator.sendBeacon yerine
 *   sessiz düşer ve console.info ile işaret bırakır.
 */

type Vote = "up" | "down";

type FeedbackPayload = {
  vote: Vote;
  path: string;
  comment?: string;
  locale: string;
  version: string;
  userAgent: string;
  timestamp: string;
};

const STORAGE_KEY = "upcore.docs.feedback.v1";
const ENDPOINT =
  (typeof process !== "undefined" &&
    (process.env.DOCS_FEEDBACK_ENDPOINT as string | undefined)) ||
  "/api/docs/feedback";

function readCache(): Record<string, Vote> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Vote>) : {};
  } catch {
    return {};
  }
}

function writeCache(map: Record<string, Vote>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota exceeded — sessiz düş */
  }
}

function detectVersion(pathname: string): string {
  const match = pathname.match(/\/docs\/(v\d+)(?:\/|$)/);
  return match ? match[1] : "current";
}

function detectLocale(): string {
  if (typeof document === "undefined") return "tr";
  const lang = document.documentElement.lang || "tr";
  return lang.split("-")[0];
}

async function sendFeedback(payload: FeedbackPayload): Promise<void> {
  const body = JSON.stringify(payload);
  if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    const blob = new Blob([body], { type: "application/json" });
    const ok = navigator.sendBeacon(ENDPOINT, blob);
    if (ok) return;
  }
  try {
    await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch (err) {
    // Analytics çökerse sessiz düş — UX'i kırmayız.
    if (typeof console !== "undefined") {
      console.info("[upcore-feedback] gönderim başarısız", err);
    }
  }
}

export default function FeedbackWidget(): JSX.Element | null {
  const isBrowser = useIsBrowser();
  const location = useLocation();
  const [vote, setVote] = useState<Vote | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showCommentBox, setShowCommentBox] = useState(false);

  const cacheKey = location.pathname;

  useEffect(() => {
    if (!isBrowser) return;
    const cache = readCache();
    if (cache[cacheKey]) {
      setVote(cache[cacheKey]);
      setSubmitted(true);
    } else {
      setVote(null);
      setSubmitted(false);
      setShowCommentBox(false);
      setComment("");
    }
  }, [cacheKey, isBrowser]);

  const payloadBase = useMemo(
    () => ({
      path: location.pathname,
      locale: detectLocale(),
      version: detectVersion(location.pathname),
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 180) : "ssr",
      timestamp: new Date().toISOString(),
    }),
    [location.pathname],
  );

  const handleVote = useCallback(
    async (next: Vote) => {
      if (!isBrowser || submitted) return;
      setVote(next);
      if (next === "down") {
        setShowCommentBox(true);
        return;
      }
      await sendFeedback({ ...payloadBase, vote: next });
      const cache = readCache();
      cache[cacheKey] = next;
      writeCache(cache);
      setSubmitted(true);
    },
    [isBrowser, submitted, payloadBase, cacheKey],
  );

  const handleSubmitNegative = useCallback(async () => {
    if (!vote) return;
    await sendFeedback({ ...payloadBase, vote, comment: comment.slice(0, 1000) });
    const cache = readCache();
    cache[cacheKey] = vote;
    writeCache(cache);
    setSubmitted(true);
    setShowCommentBox(false);
  }, [vote, comment, payloadBase, cacheKey]);

  if (!isBrowser) {
    return (
      <section className="upcore-feedback" aria-label="Geri bildirim">
        <p className="upcore-feedback__title">Bu sayfa yardımcı oldu mu?</p>
      </section>
    );
  }

  return (
    <section className="upcore-feedback" aria-label="Geri bildirim">
      <p className="upcore-feedback__title">Bu sayfa yardımcı oldu mu?</p>
      <div className="upcore-feedback__buttons" role="group">
        <button
          type="button"
          className="upcore-feedback__btn"
          data-vote="up"
          aria-pressed={vote === "up"}
          disabled={submitted}
          onClick={() => handleVote("up")}
        >
          <span aria-hidden="true">👍</span>
          <span>Evet</span>
        </button>
        <button
          type="button"
          className="upcore-feedback__btn"
          data-vote="down"
          aria-pressed={vote === "down"}
          disabled={submitted}
          onClick={() => handleVote("down")}
        >
          <span aria-hidden="true">👎</span>
          <span>Hayır</span>
        </button>
      </div>

      {showCommentBox && !submitted && (
        <div className="upcore-feedback__comment">
          <label htmlFor="upcore-feedback-comment" className="sr-only">
            Neyi geliştirelim?
          </label>
          <textarea
            id="upcore-feedback-comment"
            placeholder="Neyi geliştirelim? (opsiyonel, en fazla 1000 karakter)"
            value={comment}
            maxLength={1000}
            onChange={(e) => setComment(e.target.value)}
          />
          <button
            type="button"
            className="upcore-feedback__submit"
            onClick={handleSubmitNegative}
          >
            Geri bildirimi gönder
          </button>
        </div>
      )}

      {submitted && (
        <p className="upcore-feedback__thanks" role="status">
          Teşekkürler! Geri bildiriminiz alındı.
        </p>
      )}
    </section>
  );
}
