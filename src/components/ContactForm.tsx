import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { sendContactEmail } from "@/lib/contact.functions";

function makeCaptcha() {
  return {
    a: Math.floor(Math.random() * 10) + 1,
    b: Math.floor(Math.random() * 10) + 1,
  };
}

export function ContactForm() {
  const send = useServerFn(sendContactEmail);
  const [captcha, setCaptcha] = useState(makeCaptcha);
  const [status, setStatus] = useState<
    { state: "idle" | "sending" | "sent" } | { state: "error"; message: string }
  >({ state: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setStatus({ state: "sending" });
    try {
      await send({
        data: {
          name: String(fd.get("name") ?? ""),
          email: String(fd.get("email") ?? ""),
          subject: String(fd.get("subject") ?? ""),
          message: String(fd.get("message") ?? ""),
          captchaAnswer: Number(fd.get("captchaAnswer") ?? 0),
          captchaA: captcha.a,
          captchaB: captcha.b,
        },
      });
      setStatus({ state: "sent" });
      form.reset();
      setCaptcha(makeCaptcha());
    } catch (err: any) {
      setStatus({ state: "error", message: err?.message ?? "Failed to send" });
      setCaptcha(makeCaptcha());
    }
  }

  const sending = status.state === "sending";

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-foreground/80">Name</span>
          <input
            name="name"
            required
            maxLength={100}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-foreground/80">Email</span>
          <input
            name="email"
            type="email"
            required
            maxLength={255}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-foreground/80">Subject</span>
        <input
          name="subject"
          required
          maxLength={200}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-foreground/80">Message</span>
        <textarea
          name="message"
          required
          maxLength={2000}
          rows={5}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-foreground/80">
          Captcha: what is {captcha.a} + {captcha.b}?
        </span>
        <input
          name="captchaAnswer"
          type="number"
          required
          inputMode="numeric"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring sm:w-32"
        />
      </label>
      <button
        type="submit"
        disabled={sending}
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {sending ? "Sending..." : "Send message"}
      </button>
      {status.state === "sent" && (
        <p className="text-sm text-green-600">Thanks — your message has been sent.</p>
      )}
      {status.state === "error" && (
        <p className="text-sm text-destructive">{status.message}</p>
      )}
    </form>
  );
}
