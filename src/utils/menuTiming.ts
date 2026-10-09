import { MenuItem, MenuTimeSlot } from '../types/pos';

export interface TimingCheckResult {
  isAvailable: boolean;
  isWithinHours: boolean;
  scheduleLabel: string;
  currentFormattedTime: string;
}

export function isMenuItemAvailableByTime(
  item: MenuItem,
  customTimeStr?: string | null
): TimingCheckResult {
  const timing = item.availabilityTiming;
  if (!timing || !timing.enabled) {
    return {
      isAvailable: true,
      isWithinHours: true,
      scheduleLabel: 'All Day',
      currentFormattedTime: '',
    };
  }

  const slots: MenuTimeSlot[] =
    timing.timeSlots && timing.timeSlots.length > 0
      ? timing.timeSlots
      : timing.startTime && timing.endTime
      ? [{ startTime: timing.startTime, endTime: timing.endTime, label: timing.label }]
      : [];

  if (slots.length === 0) {
    return {
      isAvailable: true,
      isWithinHours: true,
      scheduleLabel: 'All Day',
      currentFormattedTime: '',
    };
  }

  const scheduleLabel =
    timing.label ||
    slots.map((s) => s.label || `${s.startTime} - ${s.endTime}`).join(' & ');

  let currentMinutes: number;
  let formattedTime = '';

  if (customTimeStr) {
    const [h, m] = customTimeStr.split(':').map(Number);
    currentMinutes = h * 60 + m;
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const displayM = m < 10 ? `0${m}` : m;
    formattedTime = `${displayH}:${displayM} ${period}`;
  } else {
    const now = new Date();
    currentMinutes = now.getHours() * 60 + now.getMinutes();
    formattedTime = now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const checkSlotMinutes = (mins: number) => {
    return slots.some((slot) => {
      const [sh, sm] = slot.startTime.split(':').map(Number);
      const [eh, em] = slot.endTime.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;

      if (startMin <= endMin) {
        return mins >= startMin && mins <= endMin;
      } else {
        return mins >= startMin || mins <= endMin;
      }
    });
  };

  let isWithin = checkSlotMinutes(currentMinutes);

  // If using real clock and local time check doesn't match, also check IST (Asia/Kolkata)
  // because PRIMECENTURY RESTAURANT & CAFE is located in Gurugram, India
  if (!isWithin && !customTimeStr) {
    try {
      const istParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: 'numeric',
        minute: 'numeric',
      }).formatToParts(new Date());
      const h = parseInt(istParts.find((p) => p.type === 'hour')?.value || '0', 10);
      const m = parseInt(istParts.find((p) => p.type === 'minute')?.value || '0', 10);
      if (checkSlotMinutes(h * 60 + m)) {
        isWithin = true;
      }
    } catch {
      // ignore
    }
  }

  return {
    isAvailable: isWithin,
    isWithinHours: isWithin,
    scheduleLabel,
    currentFormattedTime: formattedTime,
  };
}
