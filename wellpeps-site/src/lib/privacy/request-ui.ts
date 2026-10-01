/**
 * Binds the privacy request form (PrivacyRequestForm.astro) to request.ts.
 * Text is written with textContent only.
 */
import { PRIVACY_REQUEST_ENDPOINT } from './config';
import { buildMailto, submitRequest, type PrivacyRequestInput } from './request';

export function initRequestForm(): void {
  const form = document.querySelector<HTMLFormElement>('[data-pc-form]');
  if (!form) return;

  const privacyEmail = form.dataset.privacyEmail ?? '';
  const result = form.querySelector<HTMLElement>('[data-pc-form-result]');
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const agentBox = form.querySelector<HTMLElement>('[data-pc-agent-fields]');
  const agentToggle = form.querySelector<HTMLInputElement>('input[name="isAgent"]');

  const typeBoxes = () => Array.from(form.querySelectorAll<HTMLInputElement>('input[name="types"]'));

  function setErrors(errors: Record<string, string>): void {
    form!.querySelectorAll<HTMLElement>('[data-err]').forEach((el) => {
      const msg = errors[el.dataset.err ?? ''] ?? '';
      el.textContent = msg;
      el.hidden = msg === '';
    });
  }

  function showResult(message: string, kind: 'ok' | 'error', mailtoHref?: string): void {
    if (!result) return;
    result.replaceChildren();
    result.dataset.kind = kind;
    const p = document.createElement('p');
    p.textContent = message;
    result.append(p);
    if (mailtoHref) {
      const a = document.createElement('a');
      a.className = 'pc-btn pc-btn--secondary';
      a.href = mailtoHref;
      a.textContent = 'Open an email with my request';
      result.append(a);
    }
    result.hidden = false;
    result.focus();
  }

  agentToggle?.addEventListener('change', () => {
    if (agentBox) agentBox.hidden = !agentToggle.checked;
  });

  // Shortcut buttons on the panel and page: ?request=<type> pre-selects one.
  function preselect(id: string): void {
    const box = typeBoxes().find((b) => b.value === id);
    if (box) {
      box.checked = true;
      form!.scrollIntoView({ behavior: 'smooth', block: 'start' });
      box.focus();
    }
  }
  const wanted = new URLSearchParams(location.search).get('request');
  if (wanted) preselect(wanted);
  document.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-pc-request]');
    if (!btn) return;
    const id = btn.dataset.pcRequest ?? '';
    if (document.querySelector('[data-pc-form]')) {
      e.preventDefault();
      document.querySelector<HTMLDialogElement>('[data-privacy-dialog]')?.close();
      preselect(id);
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const input: PrivacyRequestInput = {
      fullName: String(data.get('fullName') ?? ''),
      email: String(data.get('email') ?? ''),
      state: String(data.get('state') ?? ''),
      types: typeBoxes().filter((b) => b.checked).map((b) => b.value),
      details: String(data.get('details') ?? ''),
      honeypot: String(data.get('homepage_url') ?? ''),
      agent: agentToggle?.checked
        ? {
            name: String(data.get('agentName') ?? ''),
            email: String(data.get('agentEmail') ?? ''),
            proofConfirmed: data.get('agentProof') === 'on',
          }
        : null,
    };

    setErrors({});
    if (result) result.hidden = true;
    if (submit) submit.disabled = true;
    let res: Awaited<ReturnType<typeof submitRequest>>;
    try {
      res = await submitRequest(input, { endpoint: PRIVACY_REQUEST_ENDPOINT });
    } catch {
      res = { ok: false, fallback: true, message: 'We could not send this from your browser. You can send it by email.' };
    } finally {
      if (submit) submit.disabled = false;
    }

    if (res.ok) {
      form.reset();
      if (agentBox) agentBox.hidden = true;
      const no = res.requestNo ? ` Your request number is ${res.requestNo}.` : '';
      showResult(
        `Thank you. We received your request.${no} We will confirm it by email within 10 business days. Please do not send health details by email.`,
        'ok',
      );
      return;
    }
    if (res.errors) {
      setErrors(res.errors);
      showResult(res.message ?? 'Please fix the highlighted items and try again.', 'error');
      return;
    }
    if (res.fallback && privacyEmail) {
      showResult(res.message ?? 'You can send your request by email.', 'error', buildMailto(privacyEmail, input));
      return;
    }
    if (res.message) showResult(res.message, 'error');
  });
}
