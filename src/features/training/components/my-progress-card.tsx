import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Overview {
  total: number;
  done: number;
  inProgress: number;
  notStarted: number;
}

/** « Mon parcours » : anneau de progression (cours terminés / cours publiés) et légende. */
export function MyProgressCard({ overview }: { overview: Overview }) {
  const { total, done, inProgress, notStarted } = overview;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const ratio = total === 0 ? 0 : done / total;

  const legend = [
    { label: "En cours", value: inProgress, color: "bg-amber-400" },
    { label: "Terminés", value: done, color: "bg-success" },
    { label: "Non commencés", value: notStarted, color: "bg-slate-300" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mon parcours</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-5">
        <div className="relative size-28 shrink-0">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label={`${done} cours terminés sur ${total}`}>
            <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="10" className="stroke-slate-100" />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - ratio)}
              className="stroke-success"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-navy">
              {done}/{total}
            </span>
            <span className="text-[10px] text-slate-500">Cours terminés</span>
          </div>
        </div>
        <ul className="flex flex-1 flex-col gap-2 text-sm">
          {legend.map((item) => (
            <li key={item.label} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-slate-600">
                <span className={`size-2.5 rounded-full ${item.color}`} />
                {item.label}
              </span>
              <span className="font-semibold text-navy">{item.value}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
