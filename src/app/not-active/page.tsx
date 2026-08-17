import { CloudOff } from "lucide-react";

export default function NotActive() {
  return (
    <div className="luxe-bg grain relative grid min-h-screen place-items-center px-6">
      <div className="glass relative z-10 max-w-md rounded-3xl p-10 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/[0.04] ring-1 ring-inset ring-white/10">
          <CloudOff className="size-6 text-muted-foreground" />
        </span>
        <h1 className="mt-6 font-display text-2xl text-luxe">This academy is currently unavailable</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          The school you&rsquo;re trying to reach is not active right now. If you
          believe this is a mistake, please contact your institute.
        </p>
      </div>
    </div>
  );
}
