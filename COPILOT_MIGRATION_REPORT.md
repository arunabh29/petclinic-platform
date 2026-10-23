# Claude Code to GitHub Copilot Migration Report

**Date:** 2026-10-23

## Summary

The migration adds Copilot-native project instructions, scoped instructions, custom agents, skills, and command hooks under `.github/`. No source file under `.claude/` or the root `CLAUDE.md` was modified, and no scripts, infrastructure, or AWS resources were executed or changed.

The source inventory is **28 files under `.claude/`**: 6 agents, 5 rules, 9 skills, 6 hook scripts, and 2 settings files. The root `CLAUDE.md` is an additional project-wide instruction source, for **29 source customization/configuration files total**.

## Inventory and Destination Plan

| Source purpose | Count | Copilot destination |
|---|---:|---|
| Project-wide instructions (`CLAUDE.md`) | 1 | `.github/copilot-instructions.md` |
| Path-scoped rules (`.claude/rules/`) | 5 | `.github/instructions/*.instructions.md` |
| Custom agents (`.claude/agents/`) | 6 | `.github/agents/*.agent.md` |
| Workflow skills (`.claude/skills/`) | 9 | `.github/skills/<name>/SKILL.md` |
| Hook settings and scripts | 7 | `.github/hooks/petclinic-safety.json` and `.github/hooks/petclinic-safety.cjs` |
| Local Claude settings | 1 | Not migrated; recorded below |

The original project MCP configuration, [`.mcp.json`](./.mcp.json), remains the source of MCP server definitions; it was not duplicated or changed.

## File-by-File Migration

| Original file | Destination | Changes made | Compatibility issues | Validation status |
|---|---|---|---|---|
| `CLAUDE.md` | `.github/copilot-instructions.md` | Consolidated general architecture, AWS/environment details, service inventory, CI/CD, security requirements, common commands, and references to scoped instructions. | Details repeated in specialized rules are referenced rather than duplicated. K8s managed-by label differs between this source (`Helm`) and `.claude/rules/kubernetes.md` (`kubectl`); conflict preserved and flagged for review. | Migrated; links checked. |
| `.claude/settings.json` | `.github/hooks/petclinic-safety.json`; `.github/hooks/petclinic-safety.cjs` | Consolidated pre-tool safety checks and post-tool validation suggestions into Copilot `preToolUse`/`postToolUse` handlers. | Copilot can also discover `.claude/settings.json`. Running both the original Claude hooks and the new Copilot hooks may duplicate checks; original scripts also expect Claude's payload shape. Disable or select one hook source before relying on both. | Copilot hook schema added; runtime behavior not executed or verified. |
| `.claude/settings.local.json` | No direct destination; documented here | Kept local AWS environment/profile settings, Claude permission allow-list, and server enablement out of shared Copilot files. | Claude `permissions.allow` patterns have no direct equivalent established here. `.mcp.json` already holds project MCP definitions. AWS profile configuration remains machine-local. | Intentionally not migrated. |
| `.claude/agents/terraform-reviewer.md` | `.github/agents/terraform-reviewer.agent.md` | Kept Terraform review checklist, read-only role, and output format; mapped tools to `read` and `search`. | Claude model `haiku` omitted because it is not a documented portable Copilot model selection. | Frontmatter and destination checked. |
| `.claude/agents/doc-reviewer.md` | `.github/agents/doc-reviewer.agent.md` | Kept documentation checklist, cross-reference checks, read-only role, and output format; mapped tools to `read` and `search`. | Claude model `haiku` omitted. | Frontmatter and destination checked. |
| `.claude/agents/cost-reviewer.md` | `.github/agents/cost-reviewer.agent.md` | Kept cost scope, estimate template, and pricing rules; mapped tools to `read` and `search`. | Claude model `haiku` omitted. | Frontmatter and destination checked. |
| `.claude/agents/pipeline-reviewer.md` | `.github/agents/pipeline-reviewer.agent.md` | Kept pipeline security checklist, GitOps rules, patterns, and report format; mapped tools to `read` and `search`. | Claude model `haiku` omitted. | Frontmatter and destination checked. |
| `.claude/agents/security-auditor.md` | `.github/agents/security-auditor.agent.md` | Kept audit scope, read-only command restrictions, and report format; mapped `Bash` to Copilot `execute`. | Claude model `sonnet` omitted. Terminal use is constrained by instructions, not by a command-level allow-list. | Frontmatter and destination checked; runtime restrictions not exercised. |
| `.claude/agents/k8s-validator.md` | `.github/agents/k8s-validator.agent.md` | Kept validation checklist, read-only command restrictions, and report format; mapped `Bash` to Copilot `execute`. | Claude model `haiku` omitted. Terminal use is constrained by instructions, not by a command-level allow-list. | Frontmatter and destination checked; runtime restrictions not exercised. |
| `.claude/rules/docs.md` | `.github/instructions/docs.instructions.md` | Converted Claude `paths` to Copilot `applyTo`; retained documentation structure, writing, runbook, ADR, and security rules. | None identified. | Frontmatter and file pattern checked. |
| `.claude/rules/helm.md` | `.github/instructions/helm.instructions.md` | Converted `paths` to `applyTo`; retained chart, values, templates, validation, image, and startup conventions. | References `scripts/validate-helm.sh`, which is not present in the repository. | Frontmatter and file pattern checked; missing script recorded. |
| `.claude/rules/kubernetes.md` | `.github/instructions/kubernetes.instructions.md` | Converted `paths` to `applyTo`; retained directory, label, deployment, resource, image, startup, secret, namespace, and overlay requirements. | Its `app.kubernetes.io/managed-by: kubectl` conflicts with root `CLAUDE.md` saying Helm. Both source statements were retained. | Frontmatter and file pattern checked; conflict recorded. |
| `.claude/rules/pipelines.md` | `.github/instructions/pipelines.instructions.md` | Converted `paths` to `applyTo`; retained CI/CD architecture, job naming, OIDC, image tag, trigger, secret, and error-handling rules. | None identified. | Frontmatter and file pattern checked. |
| `.claude/rules/terraform.md` | `.github/instructions/terraform.instructions.md` | Converted `paths` to `applyTo`; retained module structure, naming, tags, variable, security, state, and workflow conventions. | None identified. | Frontmatter and file pattern checked. |
| `.claude/skills/terraform-plan/SKILL.md` | `.github/skills/terraform-plan/SKILL.md` | Kept environment selection, init/plan commands, destroy warning, and no-auto-apply rule. | Claude `disable-model-invocation` and `argument-hint` are not represented as documented Agent Skill frontmatter; explicit-request guidance was added, but it is not a hard invocation restriction. | Skill frontmatter and referenced paths checked. |
| `.claude/skills/smoke-test/SKILL.md` | `.github/skills/smoke-test/SKILL.md` | Kept read-only health-check workflow, service ports, result format, and production note. | Claude invocation controls are not portable. References absent `scripts/smoke-test.sh`; existing manual fallback is retained. | Skill frontmatter checked; missing script recorded. |
| `.claude/skills/logs/SKILL.md` | `.github/skills/logs/SKILL.md` | Kept read-only pod, event, log, and resource inspection steps and output template. | Claude invocation controls are not portable; explicit-request guidance was added. | Skill frontmatter checked. |
| `.claude/skills/terraform-apply/SKILL.md` | `.github/skills/terraform-apply/SKILL.md` | Kept saved-plan requirement, plan display, explicit confirmation, production warning, and no-auto-approve rule. | Claude invocation controls are not portable; explicit-request guidance was added. User confirmation remains required in the workflow. | Skill frontmatter checked; no apply was run. |
| `.claude/skills/deploy-dev/SKILL.md` | `.github/skills/deploy-dev/SKILL.md` | Kept context check, ArgoCD flow, Helm bootstrap fallback, startup order, and rollout verification. | Claude invocation controls are not portable; explicit-request guidance was added. | Skill frontmatter checked; no deployment was run. |
| `.claude/skills/rollback/SKILL.md` | `.github/skills/rollback/SKILL.md` | Kept revision inspection, production confirmation, rollback, verification, reverse ordering, and smoke-test suggestion. | Claude invocation controls are not portable; explicit-request guidance was added. | Skill frontmatter checked; no rollback was run. |
| `.claude/skills/review-terraform/SKILL.md` | `.github/skills/review-terraform/SKILL.md` | Kept review criteria/output and updated Claude-specific source references to Copilot instructions. | Claude `argument-hint` has no documented Skill equivalent; path remains documented in the skill body. | Frontmatter and relative instruction link checked. |
| `.claude/skills/deploy-prod/SKILL.md` | `.github/skills/deploy-prod/SKILL.md` | Kept explicit production confirmation, ArgoCD diff, sequential deployment, stop-on-failure, and post-deploy verification. | Claude invocation controls are not portable; explicit-request guidance was added. Confirmation remains a workflow requirement. | Skill frontmatter checked; no deployment was run. |
| `.claude/skills/security-scan/SKILL.md` | `.github/skills/security-scan/SKILL.md` | Kept target selection, Checkov MCP/CLI alternatives, severity categories, and read-only warning. | Claude invocation controls are not portable; explicit-request guidance was added. MCP tool name availability may differ in Copilot. | Skill frontmatter checked; no scan was run. |
| `.claude/hooks/block-destroy.sh` | `.github/hooks/petclinic-safety.cjs`; `.github/hooks/petclinic-safety.json` | Ported Terraform/Terragrunt destroy, apply-destroy, production namespace, and production resource delete checks to a Copilot pre-tool hook. | Copilot uses `toolName`/`toolArgs`; the handler checks `toolArgs.command`. Runtime tool argument shapes must be verified in a disposable Copilot session. | Static review only; source and migrated hook were not executed. |
| `.claude/hooks/block-dangerous-rm.sh` | `.github/hooks/petclinic-safety.cjs`; `.github/hooks/petclinic-safety.json` | Ported recursive forced deletion protections for infrastructure and project directories. | Depends on command being available as `toolArgs.command`; terminal tool variations may need coverage. | Static review only; source and migrated hook were not executed. |
| `.claude/hooks/suggest-validate.sh` | `.github/hooks/petclinic-safety.cjs`; `.github/hooks/petclinic-safety.json` | Ported Terraform, Kubernetes, Helm, and workflow validation suggestions to Copilot `postToolUse` additional context. | File argument keys vary by tool; handler recognizes `filePath`, `file_path`, and `path`. Runtime payloads must be verified. | Static review only; hook was not executed. |
| `.claude/hooks/block-secret-commit.sh` | `.github/hooks/petclinic-safety.cjs`; `.github/hooks/petclinic-safety.json` | Ported bulk-add and sensitive filename checks to Copilot pre-tool decisions. | Depends on terminal command being available as `toolArgs.command`; runtime argument shape must be verified. | Static review only; source and migrated hook were not executed. |
| `.claude/hooks/warn-apply-without-plan.sh` | `.github/hooks/petclinic-safety.cjs`; `.github/hooks/petclinic-safety.json` | Ported no-saved-plan warnings to Copilot's documented `ask` decision, while allowing saved `.out`/`.tfplan` plans. | Copilot documents `ask` for interactive approval flows; unattended sessions may not pause for confirmation. | Static review only; hook was not executed. |
| `.claude/hooks/block-mcp-destroy.sh` | `.github/hooks/petclinic-safety.cjs`; `.github/hooks/petclinic-safety.json` | Ported direct MCP `destroy` command checks alongside shell destroy checks. | Copilot MCP tool names/arguments may differ from the Claude matcher and require runtime verification. | Static review only; hook was not executed. |

## Related Script and Reference Checks

- `scripts/smoke-test.sh` is referenced by the smoke-test skill but does not exist. The skill retains its manual health-check fallback.
- `scripts/validate-helm.sh` is referenced by the Helm rule but does not exist. The rule retains explicit `helm template` and `helm lint` commands.
- The existing scripts `scripts/start-env.sh`, `scripts/env-status.sh`, and `scripts/stop-env.sh` are not referenced by these customizations and were not changed or executed.
- The root instructions link to `docs/technical-spec.md`, `docs/jira-backlog.md`, and `.mcp.json`; these paths exist.
- `.claude/settings.json` and its six referenced hook scripts remain unchanged.

## Compatibility Notes and Unresolved Items

1. **Claude hook discovery and duplicate execution:** VS Code's Copilot harness documentation lists repository `.claude/settings.json` as a hook source, as well as `.github/hooks/*.json`. Keeping the original files unchanged while adding a Copilot-native copy can run both sources. Before enabling/using the migrated hooks, choose a single active source or otherwise verify duplication behavior.
2. **Hook payloads:** Copilot hooks provide `toolName` and `toolArgs`; this migration reads command text from `toolArgs.command` and post-tool paths from `filePath`, `file_path`, or `path`. The hook was not executed because this task prohibits script execution, so event field coverage and block behavior remain unverified.
3. **Preview status:** VS Code documents Copilot hooks as Preview. This provides a documented equivalent but does not make the hook runtime behavior production-verified.
4. **Skill invocation controls:** The source uses `disable-model-invocation: true` and `argument-hint`. The documented Agent Skill frontmatter used here exposes `name` and `description`; it does not document equivalent controls. Explicit-request text is included in applicable skills, but it is not a hard model-invocation gate.
5. **Agent execution permissions:** Copilot tool mappings preserve read/search access and terminal access where source agents requested Bash. Read-only requirements remain in agent instructions, but `execute` is not restricted to the listed commands by the agent frontmatter.
6. **Claude model overrides:** `haiku` and `sonnet` values were omitted rather than guessed at Copilot model IDs.
7. **Kubernetes label discrepancy:** Root project guidance requires `app.kubernetes.io/managed-by=Helm`, while the source Kubernetes rule requires `kubectl`. Neither was silently rewritten.
8. **Local settings:** AWS profile/environment values and Claude command allow-lists are not copied into shared project files. No Copilot equivalent was established for the original allow-list.

## Copilot Format References

- [VS Code custom instructions](https://code.visualstudio.com/docs/agent-customization/custom-instructions) — `.github/copilot-instructions.md` and `.github/instructions/*.instructions.md`, including `applyTo`.
- [VS Code custom agents](https://code.visualstudio.com/docs/agent-customization/custom-agents) — `.agent.md` files and tool identifiers.
- [VS Code Agent Skills](https://code.visualstudio.com/docs/agent-customization/agent-skills) — `SKILL.md` folders and supported discovery metadata.
- [VS Code agent hooks](https://code.visualstudio.com/docs/agent-customization/hooks) — repository hook files under `.github/hooks/`, command configuration, Copilot event payload compatibility, and the Preview status.
- [GitHub Copilot hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference) — command hook inputs, decisions, and outputs.

## Validation Results

| Check | Result |
|---|---|
| Source inventory | Pass — all 28 files under `.claude/` plus root `CLAUDE.md` inventoried |
| Original preservation | Pass — no original source file was edited |
| Copilot file locations and naming | Pass — workspace instructions, agents, skills, and hooks use documented locations |
| Frontmatter and hook JSON | Pass — required frontmatter fields and hook JSON structure checked |
| Relative links and source references | Pass — migrated Markdown links and referenced paths checked; the two absent scripts are explicitly reported above |
| Hook handler syntax | Pass — JavaScript parsed with `node --check`; the handler itself was not executed |
| Hook execution / disposable Copilot session | Not run — explicitly excluded by the safety requirements |
| Terraform, Kubernetes, Helm, AWS, deployment actions | Not run — explicitly excluded by the safety requirements |
