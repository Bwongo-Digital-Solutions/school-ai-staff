export const staff = {
  name: 'Mr. Okello',
  staffId: 'OKL-0248',
  pin: '1234',
  role: 'Class Teacher · P5 Blue',
  school: "Kampala Parents' School",
  lastSynced: '8:42',
};

export const initialRecentStudents = [
  {
    id: 'KPS-2024-0512',
    name: 'Amara Nakato',
    class: 'P5 Blue',
    initials: 'AN',
  },
  {
    id: 'KPS-2024-0447',
    name: 'Joel Tumwine',
    class: 'P5 Blue',
    initials: 'JT',
  },
];

export const classSnapshot = [
  {
    key: 'fees',
    label: 'Fees collected',
    value: '65%',
    icon: 'Coins',
    variant: 'gradient',
  },
  {
    key: 'average',
    label: 'Class average',
    value: '74%',
    icon: 'ChartLineUp',
    variant: 'gradient',
  },
  {
    key: 'attendance',
    label: 'Attendance today',
    value: '40/42',
    icon: 'CalendarCheck',
    variant: 'plain',
  },
  {
    key: 'flags',
    label: 'Open flags',
    value: '3',
    icon: 'WarningCircle',
    variant: 'plain',
  },
];

export default { staff, initialRecentStudents, classSnapshot };
