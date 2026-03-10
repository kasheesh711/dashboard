import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const securityAlignmentMigration = readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260310_security_alignment.sql"),
  "utf8",
);
const seedSql = readFileSync(path.join(process.cwd(), "supabase/seed.sql"), "utf8");

describe("supabase schema contract", () => {
  it("adds RLS coverage for the multi-student tables", () => {
    const requiredStatements = [
      "alter table students enable row level security;",
      "alter table student_testing_profiles enable row level security;",
      "alter table student_activity_items enable row level security;",
      "alter table student_competition_items enable row level security;",
      "alter table student_school_targets enable row level security;",
      "create policy students_select_internal_only",
      "create policy student_testing_profiles_select_internal_only",
      "create policy student_activity_items_select_internal_only",
      "create policy student_competition_items_select_internal_only",
      "create policy student_school_targets_select_internal_only",
    ];

    for (const statement of requiredStatements) {
      expect(securityAlignmentMigration).toContain(statement);
    }
  });

  it("keeps parent-facing projections student-aware and parent linkage bootstrapped", () => {
    expect(securityAlignmentMigration).toContain("create or replace view app.parent_portal_students");
    expect(securityAlignmentMigration).toContain("ms.student_id");
    expect(securityAlignmentMigration).toContain("t.student_id");
    expect(securityAlignmentMigration).toContain("update family_contacts");
    expect(securityAlignmentMigration).toContain("if 'parent'::app_role = any(resolved_roles) then");
  });

  it("seeds parent profiles and linked family contacts", () => {
    const parentEmails = [
      "lydia.chen@example.com",
      "suda.rattanachai@example.com",
      "rhea.singh@example.com",
      "eunji.park@example.com",
      "pim.wattan@example.com",
    ];

    for (const email of parentEmails) {
      expect(seedSql).toContain(email);
    }

    expect(seedSql).toContain("('66666666-6666-6666-6666-666666666661', 'parent')");
    expect(seedSql).toContain("insert into family_contacts (id, family_id, full_name, email, relationship, is_primary, user_id)");
  });
});
