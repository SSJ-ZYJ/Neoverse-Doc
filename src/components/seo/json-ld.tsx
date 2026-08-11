interface JsonLdProps {
  data: Record<string, unknown>;
  id: string;
}

export function JsonLd({ data, id }: JsonLdProps) {
  const serialized = JSON.stringify(data).replace(/</g, '\\u003c');

  return (
    <script id={id} type="application/ld+json">
      {serialized}
    </script>
  );
}
