import type { RtcIceServer, RtcSignal } from "@fang-x/shared";
import { type KeyboardEvent, type PointerEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PlayerView, RtcHandler } from "../lib/useGame";
import { useRadio } from "../lib/useRadio";

interface RadioPanelProps {
  myId: string | null;
  players: PlayerView[];
  iceServers: RtcIceServer[];
  onSendRtc: (signal: RtcSignal, to?: string) => void;
  onSubscribeRtc: (handler: RtcHandler) => () => void;
}

/** Detektiv-Funk: Push-to-talk, nur für Detektive und nur während der Runde. */
export function RadioPanel({
  myId,
  players,
  iceServers,
  onSendRtc,
  onSubscribeRtc,
}: RadioPanelProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const radio = useRadio({
    myId,
    players,
    iceServers,
    sendRtc: onSendRtc,
    subscribeRtc: onSubscribeRtc,
  });

  const others = players.filter((p) => p.id !== myId && p.role !== "X");
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? "";
  const speakingNames = radio.speaking.map(nameOf).filter(Boolean);

  const press = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    radio.setTransmitting(true);
  };
  const release = () => radio.setTransmitting(false);
  const keyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if ((event.key === " " || event.key === "Enter") && !event.repeat) {
      event.preventDefault();
      radio.setTransmitting(true);
    }
  };
  const keyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === " " || event.key === "Enter") radio.setTransmitting(false);
  };

  return (
    <>
      <button
        type="button"
        className={`radio-fab${open ? " is-open" : ""}${radio.active ? " is-active" : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? t("radio.close") : t("radio.open")}
        aria-expanded={open}
        aria-controls="game-radio-window"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
        </svg>
        {radio.speaking.length > 0 && <span className="radio-live" aria-hidden="true" />}
      </button>

      {open && (
        <section className="radio-window" id="game-radio-window" aria-label={t("radio.title")}>
          <header className="chat-window-head">
            <strong>{t("radio.title")}</strong>
            <span className="chat-window-sub">{t("radio.onlyDetectives")}</span>
            <button
              type="button"
              className="chat-close"
              aria-label={t("radio.close")}
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </header>

          {!radio.active ? (
            <>
              <p className="radio-text">{t("radio.intro")}</p>
              {radio.error && (
                <p className="radio-error" role="alert">
                  {t(`radio.error.${radio.error}`)}
                </p>
              )}
              <button type="button" onClick={() => void radio.start()}>
                {t("radio.start")}
              </button>
              <small className="chat-hint">{t("radio.privacy")}</small>
            </>
          ) : (
            <>
              <button
                type="button"
                className={`radio-ptt${radio.transmitting ? " is-talking" : ""}`}
                onPointerDown={press}
                onPointerUp={release}
                onPointerCancel={release}
                onLostPointerCapture={release}
                onContextMenu={(event) => event.preventDefault()}
                onKeyDown={keyDown}
                onKeyUp={keyUp}
                onBlur={release}
              >
                {radio.transmitting ? t("radio.transmitting") : t("radio.hold")}
              </button>
              <p className="radio-status" aria-live="polite">
                {speakingNames.length > 0
                  ? t("radio.speaking", { names: speakingNames.join(", ") })
                  : t("radio.linked", { linked: radio.linked.length, total: others.length })}
              </p>
              <button type="button" className="secondary" onClick={radio.stop}>
                {t("radio.stop")}
              </button>
            </>
          )}
        </section>
      )}
    </>
  );
}
