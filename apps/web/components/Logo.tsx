import Image from "next/image";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/combogo-meet-icon.svg"
        alt="Combogó Unicap"
        width={140}
        height={53}
        priority
        className="h-8 w-auto dark:brightness-110"
      />
    </div>
  );
}
