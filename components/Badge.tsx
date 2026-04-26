import { colorEstado, labelEstado } from "@/lib/utils";

export function EstadoBadge({ estado }: { estado: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colorEstado(estado)}`}>
      {labelEstado(estado)}
    </span>
  );
}
