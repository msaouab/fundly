"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { GoalType } from "@/generated/prisma/enums";
import { createGoal } from "../actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const EMOJI_PRESETS = ["🚗", "🏠", "✈️", "💍", "📱", "🎓", "🏖️", "💰", "🎯", "🛵", "💻", "🐶"];

const GOAL_TYPE_OPTIONS: { value: GoalType; label: string }[] = [
  { value: "CAR", label: "Car" },
  { value: "HOUSE", label: "House" },
  { value: "VACATION", label: "Vacation" },
  { value: "EMERGENCY_FUND", label: "Emergency fund" },
  { value: "EDUCATION", label: "Education" },
  { value: "WEDDING", label: "Wedding" },
  { value: "DEVICE", label: "Device" },
  { value: "OTHER", label: "Other" },
];

type AddGoalModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCurrency?: string;
};

export function AddGoalModal({ open, onOpenChange, defaultCurrency = "MAD" }: AddGoalModalProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [emoji, setEmoji] = useState("🎯");
  const [name, setName] = useState("");
  const [type, setType] = useState<GoalType>("OTHER");
  const [targetAmount, setTargetAmount] = useState("");
  const [savedAmount, setSavedAmount] = useState("");
  const [monthlyContrib, setMonthlyContrib] = useState("");
  const [interestRate, setInterestRate] = useState("0");

  function reset() {
    setEmoji("🎯");
    setName("");
    setType("OTHER");
    setTargetAmount("");
    setSavedAmount("");
    setMonthlyContrib("");
    setInterestRate("0");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = parseFloat(targetAmount);
    const s = parseFloat(savedAmount) || 0;
    const m = parseFloat(monthlyContrib) || 0;
    const ir = parseFloat(interestRate) || 0;
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (!Number.isFinite(t) || t <= 0) {
      toast.error("Target amount must be positive.");
      return;
    }

    startTransition(async () => {
      const res = await createGoal({
        name: name.trim(),
        emoji,
        type,
        targetAmount: t,
        savedAmount: s,
        monthlyContrib: m,
        interestRate: ir,
        currency: defaultCurrency,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Goal created.");
      reset();
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New goal</DialogTitle>
          <DialogDescription>
            Save a plan to your account. Simulations stay on this device until you save a snapshot.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset className="space-y-2 border-0 p-0">
            <legend className="text-sm font-medium leading-none">Emoji</legend>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Emoji picker">
              {EMOJI_PRESETS.map((e) => (
                <button
                  key={e}
                  type="button"
                  className={cn(
                    "flex size-10 items-center justify-center rounded-lg border text-lg transition-colors",
                    emoji === e
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted",
                  )}
                  onClick={() => setEmoji(e)}
                >
                  {e}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="goal-name">Name</Label>
            <Input
              id="goal-name"
              name="goal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Used car fund"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-type">Type</Label>
            <Select name="goal-type" value={type} onValueChange={(v) => setType(v as GoalType)}>
              <SelectTrigger id="goal-type" aria-label="Goal type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOAL_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="goal-target">Target ({defaultCurrency})</Label>
              <Input
                id="goal-target"
                name="goal-target"
                inputMode="decimal"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="85000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-saved">Already saved ({defaultCurrency})</Label>
              <Input
                id="goal-saved"
                name="goal-saved"
                inputMode="decimal"
                value={savedAmount}
                onChange={(e) => setSavedAmount(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="goal-monthly">Monthly contribution ({defaultCurrency})</Label>
              <Input
                id="goal-monthly"
                name="goal-monthly"
                inputMode="decimal"
                value={monthlyContrib}
                onChange={(e) => setMonthlyContrib(e.target.value)}
                placeholder="2500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-rate">Annual interest % (optional)</Label>
              <Input
                id="goal-rate"
                name="goal-interest-rate"
                inputMode="decimal"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Create goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
