"use client";

export default function CommandStats({ commands = [] }) {
  if (!commands.length) return null;
  const max = commands[0]?.count ?? 1;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-kick-border bg-kick-panel p-4">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Comandos más usados</span>
        <p className="mt-0.5 text-[10px] text-neutral-600">Mensajes que empiezan con !</p>
      </div>

      <div className="flex flex-col gap-1">
        {commands.map(({ cmd, count }, i) => {
          const pct = (count / max) * 100;
          return (
            <div key={cmd} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-right font-mono text-[10px] text-neutral-600">{i + 1}</span>
              <div className="relative flex-1 overflow-hidden rounded">
                <div className="absolute inset-y-0 left-0 rounded bg-kick-green/15 transition-all duration-500"
                  style={{ width: `${pct}%` }} />
                <span className="relative font-mono text-xs font-semibold text-kick-green px-2 py-0.5 block">
                  {cmd}
                </span>
              </div>
              <span className="w-8 shrink-0 text-right font-mono text-xs text-neutral-400">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
