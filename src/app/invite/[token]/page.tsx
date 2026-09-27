import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { acceptInvitesForUser, findInviteByToken } from "@/lib/org/members";
import { ROLE_LABELS, type RoleId } from "@/lib/org/plans";
import { SignInButton } from "@/components/SignInButton";

export const dynamic = "force-dynamic";

export default async function InvitePage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const invite = await findInviteByToken(token);
  const workspace = invite ? await prisma.workspace.findUnique({ where: { id: invite.workspace_id }, select: { name: true } }) : null;
  const session = await getServerSession(authOptions);

  // Signing in accepts open invites automatically; land on the dashboard.
  if (!invite && session?.user?.email) {
    const accepted = await prisma
      .$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM org_invite WHERE token = $1 AND accepted_at IS NOT NULL AND lower(email) = lower($2)`,
        token,
        session.user.email,
      )
      .catch(() => []);
    if (accepted.length > 0) redirect("/home");
  }

  if (invite && session?.user?.email && session.user.id) {
    if (session.user.email.toLowerCase() === invite.email.toLowerCase()) {
      await acceptInvitesForUser({ userId: session.user.id, email: session.user.email });
      redirect("/home");
    }
  }

  return (
    <main className="eye-shell eye-welcome">
      <header className="eye-top">
        <span className="eye-logo"><span className="eye-logo-mark" />Anitrya</span>
      </header>
      <section className="eye-onboard eye-panel">
        {!invite ? (
          <>
            <p className="eye-overline">Invitation</p>
            <h1 className="eye-onboard-title">This invitation has expired or was already used.</h1>
            <p className="eye-panel-text">Ask the person who invited you to send a new link.</p>
          </>
        ) : (
          <>
            <p className="eye-overline">You&apos;re invited</p>
            <h1 className="eye-onboard-title">Join {workspace?.name ?? "an organization"} on Anitrya</h1>
            <p className="eye-panel-text">
              Role: <strong>{ROLE_LABELS[invite.role as RoleId] ?? invite.role}</strong>. Sign in with Google as <strong>{invite.email}</strong> to accept.
            </p>
            {session?.user?.email && session.user.email.toLowerCase() !== invite.email.toLowerCase() ? (
              <p className="eye-message is-error">
                You&apos;re signed in as {session.user.email}. Sign in with {invite.email} to accept this invitation.
              </p>
            ) : null}
            <div className="eye-landing-actions">
              <SignInButton callbackUrl={`/invite/${token}`} label={`Continue with Google as ${invite.email}`} />
            </div>
          </>
        )}
      </section>
    </main>
  );
}
