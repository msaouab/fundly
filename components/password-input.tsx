"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const fieldClassName =
  "w-full rounded-lg border border-zinc-300 bg-white py-2 pl-3 pr-10 text-zinc-900 outline-none ring-teal-600/20 focus:border-teal-600 focus:ring-4 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-teal-500";

type PasswordInputProps = Omit<
  React.ComponentPropsWithoutRef<"input">,
  "type"
>;

export function PasswordInput({ id, className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        className={[fieldClassName, className].filter(Boolean).join(" ")}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 outline-offset-2 hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        aria-controls={id}
        aria-expanded={visible}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? (
          <EyeOff className="size-4 shrink-0" aria-hidden />
        ) : (
          <Eye className="size-4 shrink-0" aria-hidden />
        )}
      </button>
    </div>
  );
}
