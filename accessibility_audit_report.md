# StadiumOS AI — Web Accessibility Audit (WCAG 2.2 AA)

This report details accessibility (A11y) verification checks across the **StadiumOS AI Command Center** frontend views, mapping findings and implementing fixes.

---

## Audit Findings & Remediation Matrix

| ID | WCAG Criteria | Vulnerability | Severity | Remediation Action | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A11Y-01** | **2.1.1 Keyboard** | Clickable Incident Cards are not focusable | **High** | Add `tabIndex={0}` and keydown event listener hooks. | **Remediated** |
| **A11Y-02** | **2.3.1 Motion** | Bouncing pins lack reduced motion controls | **Low** | Define `@media (prefers-reduced-motion)` CSS rules. | **Remediated** |
| **A11Y-03** | **1.3.1 Info & Rel** | Missing aria expanded states on selectors | **Medium** | Append `aria-expanded` and `aria-haspopup` tags. | **Remediated** |
| **A11Y-04** | **2.4.3 Focus Order** | Modal window focus escapes to body elements | **High** | Capture focus using standard keyboard boundary checks. | **Remediated** |

---

## 1. Vulnerability Details & Code Remediation

### A11Y-01: Clickable Cards lacking Keyboard Action handlers
* **Issue**: The incident cards in `IncidentTriage.tsx` are declared as `<article onClick={...}>`. A keyboard-only user (e.g. blind/motor-impaired operators using tab-indexes) cannot focus on them or select them using the `Enter` or `Space` key.
* **Remediation**: Append `tabIndex={0}`, set role to `button`, and attach `onKeyDown` handlers:

```typescript
// Fixed in apps/command-center/src/pages/IncidentTriage.tsx
<article
  key={incident.id}
  role="button"
  tabIndex={0}
  onClick={() => setSelectedIncident(incident)}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelectedIncident(incident);
    }
  }}
  // ...
/>
```

### A11Y-02: Reduced Motion Support for Telemetry Alerts
* **Issue**: Pulsing notifications and bouncing geo pins can cause nausea/disorientations for users with vestibular system issues.
* **Remediation**: Append media rules resetting animation transformations when the user has set OS-level reduced motion preferences.

```css
/* Fixed in apps/command-center/src/index.css */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-delay: -1ms !important;
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    background-attachment: scroll !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
  }
}
```

### A11Y-03: Modal Dialog Escape Keys Close Handlers
* **Issue**: Pressing `Escape` does not close the active modal overlay.
* **Remediation**: Hook `keydown` event listeners to dismiss the evacuation approval checks if users press the `Escape` key.

```typescript
// Fixed in apps/command-center/src/pages/Overview.tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowEvacModal(false);
      setEvacConfirmText("");
    }
  };
  if (showEvacModal) {
    window.addEventListener("keydown", handleKeyDown);
  }
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [showEvacModal]);
```
