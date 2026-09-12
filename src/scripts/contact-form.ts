const STATUS_SENDING = "Enviando...";
const STATUS_SUCCESS = "¡Mensaje enviado!";
const STATUS_SERVER_ERROR = "Hubo un error al enviar. Intentalo de nuevo.";
const STATUS_NETWORK_ERROR = "Hubo un error de conexión. Intentalo de nuevo.";

const MIN_FORM_AGE_MS = 5000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type StatusType = "neutral" | "success" | "error";

export function initContactForm(): void {
  const form = document.querySelector<HTMLFormElement>("[data-contact-form]");
  if (!form) return;

  const status = form.querySelector<HTMLElement>("[data-contact-status]");
  const submitButton =
    form.querySelector<HTMLButtonElement>("button[type='submit']");
  const successBox =
    document.querySelector<HTMLElement>("[data-form-success]");

  const pageLoadedAt = Date.now();

  const setStatus = (message: string, type: StatusType): void => {
    if (!status) return;
    status.textContent = message;
    status.dataset.type = type;
    status.classList.remove("hidden");
    status.classList.remove("status-enter");
    void status.offsetWidth;
    status.classList.add("status-enter");
  };

  const showSuccess = (): void => {
    if (successBox) {
      form.classList.add("hidden");
      successBox.classList.remove("hidden");
      successBox.classList.remove("status-enter");
      void successBox.offsetWidth;
      successBox.classList.add("status-enter");
    } else {
      setStatus(STATUS_SUCCESS, "success");
    }
  };

  const isSpam = (formData: FormData): boolean => {
    const honeypot = formData.get("_gotcha");
    const filledHoneypot =
      typeof honeypot === "string" && honeypot.trim() !== "";
    const submittedTooFast = Date.now() - pageLoadedAt < MIN_FORM_AGE_MS;
    return filledHoneypot || submittedTooFast;
  };

  const finish = (): void => {
    form.dataset.submitting = "false";
    submitButton?.removeAttribute("disabled");
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (form.dataset.submitting === "true") return;

    form.dataset.submitting = "true";
    submitButton?.setAttribute("disabled", "");

    const formData = new FormData(form);

    if (isSpam(formData)) {
      showSuccess();
      form.reset();
      finish();
      return;
    }

    const email = String(formData.get("_replyto") ?? "").trim();
    if (!EMAIL_RE.test(email)) {
      setStatus("Ingresá un email válido.", "error");
      finish();
      return;
    }

    setStatus(STATUS_SENDING, "neutral");

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      if (response.ok) {
        showSuccess();
        form.reset();
      } else {
        const data = (await response.json().catch(() => null)) as
          | { errors?: { message?: string }[] }
          | null;
        setStatus(data?.errors?.[0]?.message ?? STATUS_SERVER_ERROR, "error");
      }
    } catch {
      setStatus(STATUS_NETWORK_ERROR, "error");
    } finally {
      finish();
    }
  });
}