"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { UserPlus, KeyRound, Copy, Check } from "lucide-react";
import type { Role, UserStatus } from "@prisma/client";

import { ALL_ROLES, ROLE_LABEL } from "@/lib/rbac";
import {
  Alert,
  Button,
  Checkbox,
  Field,
  Input,
  Select,
} from "@/components/ui";
import {
  createMember,
  resetMemberPassword,
  updateMember,
  type MemberState,
} from "./actions";

function Submit({ label, icon }: { label: string; icon?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Working…" : <>{icon}{label}</>}
    </Button>
  );
}

/** Shows a one-time password with a copy button — it can't be retrieved later. */
function TempPassword({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);

  return (
    <div className="mt-2 flex items-center gap-2 rounded-md border border-line-2 bg-surface p-2">
      <code className="flex-1 select-all font-mono text-[13px] text-ink">
        {value}
      </code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          } catch {
            // Clipboard permission denied — the code is selectable anyway.
          }
        }}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12.5px] text-ink-2 hover:bg-surface-2"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function CreateMemberForm() {
  const [state, action] = useActionState<MemberState, FormData>(
    createMember,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      {state.ok && state.message ? (
        <Alert tone="ok" title={state.message}>
          {state.tempPassword ? (
            <>
              <p>
                Temporary password — copy it now, it won&apos;t be shown again.
                They&apos;ll be asked to change it on first sign-in. It has also
                been emailed to them.
              </p>
              <TempPassword value={state.tempPassword} />
            </>
          ) : null}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required htmlFor="m-name" error={state.errors?.name}>
          <Input id="m-name" name="name" required />
        </Field>
        <Field label="Email" required htmlFor="m-email" error={state.errors?.email}>
          <Input id="m-email" name="email" type="email" required />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Role" required htmlFor="m-role" error={state.errors?.role}>
          <Select id="m-role" name="role" defaultValue="MEMBER">
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Position"
          htmlFor="m-position"
          hint="e.g. Features Editor"
          error={state.errors?.position}
        >
          <Input id="m-position" name="position" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Class / year" htmlFor="m-class" error={state.errors?.classYear}>
          <Input id="m-class" name="classYear" />
        </Field>
        <Field
          label="Mobile number"
          htmlFor="m-phone"
          hint="Needed to reach them by urgent SMS. Local format is fine."
          error={state.errors?.phone}
        >
          <Input id="m-phone" name="phone" type="tel" placeholder="e.g. 024 412 3456" />
        </Field>
      </div>

      <Checkbox
        name="isExecutive"
        label="Show on the public About page as an executive"
      />

      <Submit label="Add member" icon={<UserPlus size={16} aria-hidden />} />
    </form>
  );
}

/* -------------------------------------------------------------------------- */

export function MemberRow({
  member,
  isSelf,
}: {
  member: {
    id: string;
    name: string;
    email: string;
    role: Role;
    status: UserStatus;
    position: string | null;
    phone: string | null;
    isExecutive: boolean;
    execOrder: number;
  };
  isSelf: boolean;
}) {
  const [resetState, resetAction] = useActionState<MemberState, FormData>(
    resetMemberPassword,
    {},
  );

  return (
    <div className="space-y-3 p-4">
      <form action={updateMember} className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input type="hidden" name="userId" value={member.id} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Role" htmlFor={`role-${member.id}`}>
            <Select
              id={`role-${member.id}`}
              name="role"
              defaultValue={member.role}
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Status" htmlFor={`status-${member.id}`}>
            <Select
              id={`status-${member.id}`}
              name="status"
              defaultValue={member.status}
            >
              <option value="ACTIVE">Active</option>
              <option value="INVITED">Invited</option>
              <option value="ARCHIVED">Archived (no access)</option>
            </Select>
          </Field>

          <Field label="Position" htmlFor={`pos-${member.id}`}>
            <Input
              id={`pos-${member.id}`}
              name="position"
              defaultValue={member.position ?? ""}
            />
          </Field>

          <Field
            label="Mobile"
            htmlFor={`phone-${member.id}`}
            hint={member.phone ? undefined : "None on file"}
          >
            <Input
              id={`phone-${member.id}`}
              name="phone"
              type="tel"
              placeholder="024 412 3456"
              defaultValue={member.phone ?? ""}
            />
          </Field>

          <Field
            label="Exec order"
            htmlFor={`order-${member.id}`}
            hint="Lower shows first"
          >
            <Input
              id={`order-${member.id}`}
              name="execOrder"
              type="number"
              min={0}
              max={999}
              defaultValue={member.execOrder}
            />
          </Field>
        </div>

        <div className="flex flex-col justify-end gap-2">
          <Checkbox
            name="isExecutive"
            label="Executive"
            defaultChecked={member.isExecutive}
          />
          <Submit label="Save" />
        </div>
      </form>

      <form action={resetAction} className="border-t border-line pt-3">
        <input type="hidden" name="userId" value={member.id} />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="secondary" size="sm">
            <KeyRound size={14} aria-hidden />
            Reset password
          </Button>
          {isSelf ? (
            <span className="text-[12.5px] text-ink-3">
              This is your own account.
            </span>
          ) : null}
        </div>

        {resetState.ok && resetState.tempPassword ? (
          <Alert tone="ok" className="mt-3">
            <p>{resetState.message} New temporary password:</p>
            <TempPassword value={resetState.tempPassword} />
          </Alert>
        ) : null}
        {resetState.errors?.form ? (
          <Alert tone="danger" className="mt-3">
            {resetState.errors.form}
          </Alert>
        ) : null}
      </form>
    </div>
  );
}
