import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { executeAuthorizedAction } from "@/lib/security/execution-authorizer";

/**
 * HARD SECURITY BOUNDARY: POST /api/execute
 *
 * Client can NEVER pass "approved": true, "role": "admin", or "action" to execute arbitrary tools.
 * Execution requires a cryptographically random, server-generated authorization token
 * that was created strictly by policy-engine.ts.
 */
export async function POST(req: Request) {
  try {
    const { user, workspace } = await requireAuth();
    const body = await req.json().catch(() => ({}));

    let { authorization_id, case_id, approve_and_execute } = body;

    // Human operator manual approval authorization flow
    if (approve_and_execute && case_id && !authorization_id) {
      const { Database } = await import("@/lib/db");
      const { authorizeHumanApproval } = await import("@/lib/security/execution-authorizer");
      const targetCase = Database.getCase(workspace.id, case_id);
      if (!targetCase) {
        return NextResponse.json({ success: false, error: "Target case not found." }, { status: 404 });
      }
      const humanAuthz = authorizeHumanApproval(targetCase, workspace.id, user.email || "human_ops");
      authorization_id = humanAuthz.authorization_id;
    }

    if (!authorization_id || !case_id) {
      return NextResponse.json(
        {
          success: false,
          error: "EXECUTION_NOT_AUTHORIZED: Missing mandatory authorization_id or case_id.",
        },
        { status: 403 }
      );
    }

    // Execute through the server-side security authorizer
    const result = await executeAuthorizedAction({
      authorizationId: authorization_id,
      caseId: case_id,
      workspaceId: workspace.id,
      consumer: approve_and_execute ? "HUMAN_OPERATOR_APPROVAL" : "API_DIRECT_ENDPOINT",
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    const status = err.message?.includes("EXECUTION_NOT_AUTHORIZED") || err.message?.includes("AUTHORIZATION_")
      ? 403
      : 500;
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Execution rejected at security boundary.",
      },
      { status }
    );
  }
}
