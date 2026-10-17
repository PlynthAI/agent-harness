// The contact form's rules and its mocked handler. Nothing here touches the network: replace
// `submitContact` with a call to a real endpoint when the site has one, and keep the rules.

export type ContactInput = { name: string; email: string; message: string }
export type ContactErrors = Partial<Record<keyof ContactInput, string>>
export type ContactResult = { ok: true; name: string } | { ok: false; errors: ContactErrors }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const MESSAGE_MIN = 20
export const MESSAGE_MAX = 2000

export function validateContact(input: ContactInput): ContactErrors {
  const errors: ContactErrors = {}
  const name = input.name.trim()
  const email = input.email.trim()
  const message = input.message.trim()

  if (!name) errors.name = "Enter your name."
  if (!email) errors.email = "Enter your email address."
  else if (!EMAIL.test(email)) errors.email = "Enter an email address like name@example.com."
  if (!message) errors.message = "Enter a message."
  else if (message.length < MESSAGE_MIN)
    errors.message = `Write at least ${MESSAGE_MIN} characters so we can help.`
  else if (message.length > MESSAGE_MAX)
    errors.message = `Keep the message under ${MESSAGE_MAX} characters.`

  return errors
}

export async function submitContact(input: ContactInput, delayMs = 400): Promise<ContactResult> {
  const errors = validateContact(input)
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  await new Promise((resolve) => setTimeout(resolve, delayMs))
  return { ok: true, name: input.name.trim() }
}
