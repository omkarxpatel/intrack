"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteAccount } from "@/lib/account-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CONFIRM_WORD = "delete";

export function DeleteAccountCard() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      const result = await deleteAccount();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      // A full document load rather than router.push: the session row is gone
      // server-side, so this drops the auth context, the router cache, and the
      // dead cookie in one go instead of leaving a signed-in-looking shell.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/auth/sign-in";
    });
  }

  return (
    <div className="rounded-lg border border-destructive/40">
      <div className="p-6">
        <h3 className="font-semibold">Delete account</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Permanently deletes your account along with every application, status history, and saved
          role.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-destructive/40 bg-destructive/5 px-6 py-4">
        <p className="text-xs text-muted-foreground">This can&apos;t be undone.</p>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Delete account
        </Button>
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setTyped("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              Every application, status step, and saved role goes with it. There is no export and no
              undo — if you want a copy, close this and export first.
            </DialogDescription>
          </DialogHeader>

          <div>
            <Label htmlFor="confirm-delete" className="mb-1.5">
              Type <span className="font-medium text-foreground">{CONFIRM_WORD}</span> to confirm
            </Label>
            <Input
              id="confirm-delete"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              aria-label={`Type ${CONFIRM_WORD} to confirm`}
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={typed.trim().toLowerCase() !== CONFIRM_WORD || pending}
              onClick={onConfirm}
            >
              {pending ? "Deleting…" : "Delete everything"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
