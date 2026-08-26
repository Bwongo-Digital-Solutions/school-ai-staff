const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const fullName = (s) =>
  `${(s && s.first_name) || ''} ${(s && s.last_name) || ''}`.trim();

export const initials = (s) =>
  ((((s && s.first_name) || '')[0] || '') + (((s && s.last_name) || '')[0] || '')).toUpperCase();

/** The card and the register carry one `full_name` rather than two columns. */
export const initialsOf = (name) =>
  String(name || '')
    .split(/\s+/)
    .map((word) => word[0] || '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const classOf = (s) => {
  const grade = s && s.grade_level != null ? s.grade_level : '—';
  const section = s && s.class_section ? ` · ${s.class_section}` : '';
  return `Grade ${grade}${section}`;
};

/** Backend statuses arrive as snake_case enum values ("no_invoices"). */
export const humanise = (value) =>
  String(value == null ? '' : value)
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase()) || '—';

/* Hermes ships without full Intl on every platform, so thousands separators
   are inserted directly rather than through toLocaleString. */
export const amount = (n) => {
  const rounded = Math.round(Number(n) || 0);
  const sign = rounded < 0 ? '-' : '';
  return sign + String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export const money = (n, currency = 'UGX') => `${currency || 'UGX'} ${amount(n)}`;

export const formatDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${day} ${MONTHS[parsed.getMonth()]} ${parsed.getFullYear()}`;
};

export const formatTime = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const dateTime = (value) => (value ? `${formatDate(value)} at ${formatTime(value)}` : '—');

/* The register and the gate log are keyed on the device's own day, not UTC, so a
   late-evening roll call in Kampala does not land on tomorrow's date. */
export const todayIso = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

export const gpaOf = (s) => Number((s && s.gpa) || 0).toFixed(2);

export const attendanceOf = (s) => `${Number((s && s.attendance_rate) || 0).toFixed(0)}%`;
