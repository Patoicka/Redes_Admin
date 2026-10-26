// Estado como píldora pequeña: fondo oscuro de etiqueta + texto de color.
// Verde/ámbar/rojo se reservan exclusivamente para estado en toda la app.
const VARIANTES = {
  ok: "bg-tag-ok text-ok",
  advertencia: "bg-tag-warn text-warn",
  critica: "bg-tag-danger text-danger",
  muted: "bg-card-2 text-ink-3",
} as const;

export type VariantePildora = keyof typeof VARIANTES;

interface Props {
  texto: string;
  variante: VariantePildora;
}

export default function Pildora({ texto, variante }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${VARIANTES[variante]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {texto}
    </span>
  );
}
