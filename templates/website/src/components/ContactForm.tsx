import { useEffect, useId, useRef, useState, useSyncExternalStore, type SubmitEvent } from "react"

import { Button } from "@/components/ui/button"
import { MESSAGE_MIN, submitContact, type ContactErrors, type ContactInput } from "@/lib/contact"

type Status = "idle" | "submitting" | "sent"
const FIELDS = ["name", "email", "message"] as const
const noSubscription = () => () => undefined

// The site's one React island. The page renders it on the server, so the form is visible before
// JavaScript runs; the submit button stays disabled until hydration, because without this code
// the form would have nowhere to send the message.
export function ContactForm() {
  // false while rendering on the server, true once the island runs in the browser
  const hydrated = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false
  )
  const [status, setStatus] = useState<Status>("idle")
  const [errors, setErrors] = useState<ContactErrors>({})
  const [sentTo, setSentTo] = useState("")
  const formRef = useRef<HTMLFormElement>(null)
  const sentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status === "sent") sentRef.current?.focus()
  }, [status])

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const input = Object.fromEntries(
      FIELDS.map((field) => {
        const value = data.get(field)
        return [field, typeof value === "string" ? value : ""]
      })
    ) as ContactInput

    setStatus("submitting")
    const result = await submitContact(input)
    if (result.ok) {
      setErrors({})
      setSentTo(result.name)
      setStatus("sent")
      return
    }
    setErrors(result.errors)
    setStatus("idle")
    const first = FIELDS.find((field) => result.errors[field])
    if (first) (formRef.current?.elements.namedItem(first) as HTMLElement | null)?.focus()
  }

  if (status === "sent") {
    return (
      <div
        ref={sentRef}
        tabIndex={-1}
        role="status"
        className="flex flex-col items-start gap-3 rounded-panel border border-line bg-success-soft p-6 outline-hidden"
      >
        <h2 className="t-heading-sm text-success-ink">Message received</h2>
        <p className="t-body-md text-ink">
          Thanks, {sentTo}. The demo handler checked your message and kept it in this page. Nothing
          was sent anywhere.
        </p>
        <Button variant="outline" size="lg" onClick={() => setStatus("idle")}>
          Write another message
        </Button>
      </div>
    )
  }

  const errorCount = Object.keys(errors).length
  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={onSubmit}
      data-hydrated={hydrated}
      className="flex flex-col gap-6"
    >
      <p aria-live="polite" className="t-body-sm text-danger-ink empty:hidden">
        {errorCount > 0 &&
          `Check the ${errorCount === 1 ? "highlighted field" : `${errorCount} highlighted fields`}.`}
      </p>
      <Field name="name" label="Name" autoComplete="name" error={errors.name} />
      <Field name="email" label="Email" type="email" autoComplete="email" error={errors.email} />
      <Field
        name="message"
        label="Message"
        hint={`At least ${MESSAGE_MIN} characters.`}
        multiline
        error={errors.message}
      />
      <div>
        <Button type="submit" size="lg" disabled={!hydrated || status === "submitting"}>
          {status === "submitting" ? "Sending…" : "Send message"}
        </Button>
      </div>
    </form>
  )
}

type FieldProps = {
  name: (typeof FIELDS)[number]
  label: string
  error?: string
  hint?: string
  type?: string
  autoComplete?: string
  multiline?: boolean
}

function Field({ name, label, error, hint, type = "text", autoComplete, multiline }: FieldProps) {
  const id = useId()
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ")
  const control = {
    id,
    name,
    required: true,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy || undefined,
    className:
      "w-full rounded-control border border-line-strong bg-surface px-3 py-2 text-base text-ink outline-none transition-colors duration-(--duration-fast) placeholder:text-ink-3 hover:border-ink-3 focus-visible:border-ink aria-invalid:border-danger aria-invalid:focus-visible:border-ink",
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="t-label-md text-ink">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="t-body-sm text-ink-3">
          {hint}
        </p>
      )}
      {multiline ? (
        <textarea rows={6} {...control} />
      ) : (
        <input type={type} autoComplete={autoComplete} {...control} />
      )}
      {error && (
        <p id={`${id}-error`} className="t-body-sm text-danger-ink">
          {error}
        </p>
      )}
    </div>
  )
}
