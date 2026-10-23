import productMarkUrl from "../../assets/branding/cs-app-icon.png";

interface ProductMarkProps {
  className?: string;
}

export function ProductMark({ className }: ProductMarkProps) {
  return (
    <img
      className={className}
      src={productMarkUrl}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
